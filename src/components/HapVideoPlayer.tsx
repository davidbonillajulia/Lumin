// HapVideoPlayer.tsx
// High-performance WebGL renderer for HAP video clips.
// Uses S3TC (DXT1/DXT5) direct GPU upload via gl.compressedTexImage2D.
// Integrates C++ Native Addon via Electron IPC with standard browser JS/Wasm demuxer fallback.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { demuxHapMov, decodeHapFrame, HapMovieInfo } from "../utils/hapDemuxer";

interface HapVideoPlayerProps {
  url: string;
  playing: boolean;
  loop?: boolean;
  speed?: number;
  isMuted?: boolean;
  trackerId?: string;
  onTimeUpdate?: (time: number) => void;
  onProgressUpdate?: (time: number, duration: number) => void;
  onEnded?: () => void;
  onReady?: () => void;
  onError?: (err: string) => void;
  className?: string;
}

export const HapVideoPlayer: React.FC<HapVideoPlayerProps> = ({
  url,
  playing,
  loop = true,
  speed = 1.0,
  isMuted = true,
  trackerId,
  onTimeUpdate,
  onProgressUpdate,
  onEnded,
  onReady,
  onError,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const shaderProgramRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const bufferRef = useRef<WebGLBuffer | null>(null);

  // Movie state
  const [movieInfo, setMovieInfo] = useState<HapMovieInfo | null>(null);
  const [nativeHandle, setNativeHandle] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [duration, setDuration] = useState(0);
  const [fps, setFps] = useState(30.0);
  const [isReady, setIsReady] = useState(false);

  // Playback control refs to avoid effect re-triggering animation loops
  const playbackStateRef = useRef({
    currentTime: 0,
    playing: playing,
    loop: loop,
    speed: speed,
    lastFrameIndex: -1,
    lastTime: performance.now(),
    frameCount: 0,
    duration: 0,
    fps: 30.0,
    isYCoCg: false,
  });

  // Keep ref state updated
  useEffect(() => {
    playbackStateRef.current.playing = playing;
    playbackStateRef.current.loop = loop;
    playbackStateRef.current.speed = speed;
  }, [playing, loop, speed]);

  // Handle master-slave BroadCast Channel Sync integration
  useEffect(() => {
    if (typeof window === "undefined" || !trackerId) return;

    const bc = new BroadcastChannel("lumin-output");
    
    const handleSyncMessage = (e: MessageEvent) => {
      if (e.data?.type === "VIDEO_TIME_UPDATE" && e.data.payload?.trackerId === trackerId) {
        const payload = e.data.payload;
        playbackStateRef.current.currentTime = payload.currentTime;
        playbackStateRef.current.playing = payload.playing;
      }
    };

    bc.addEventListener("message", handleSyncMessage);
    return () => {
      bc.removeEventListener("message", handleSyncMessage);
      bc.close();
    };
  }, [trackerId]);

  // ============================================================================
  // WebGL Pipeline Setup
  // ============================================================================
  const initWebGL = useCallback((width: number, height: number, isYCoCg: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) {
      onError?.("WebGL is not supported by your browser/system.");
      return;
    }
    glRef.current = gl;

    // Check S3TC extension
    const ext =
      gl.getExtension("WEBGL_compressed_texture_s3tc") ||
      gl.getExtension("MOZ_WEBGL_compressed_texture_s3tc") ||
      gl.getExtension("WEBKIT_compressed_texture_s3tc");

    if (!ext) {
      onError?.("Direct GPU S3TC compressed texture decoding extension is not supported by this GPU.");
      return;
    }

    // Vertex Shader
    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vTexCoord;
      void main() {
        vTexCoord = aPosition * 0.5 + 0.5;
        vTexCoord.y = 1.0 - vTexCoord.y; // Flip texture
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Fragment Shader (Supports native YCoCg decoding for HAP-Q on GPU)
    const fsSource = `
      precision mediump float;
      uniform sampler2D uTexture;
      varying vec2 vTexCoord;
      uniform bool uIsYCoCg;
      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        if (uIsYCoCg) {
          float y = color.g;
          float co = color.b - 0.5;
          float cg = color.a - 0.5;
          float r = y + co - cg;
          float g = y + cg;
          float b = y - co - cg;
          gl_FragColor = vec4(r, g, b, 1.0);
        } else {
          gl_FragColor = color;
        }
      }
    `;

    // Compile helper
    const compileShader = (source: string, type: number): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Shader linking error:", gl.getProgramInfoLog(program));
      return;
    }
    shaderProgramRef.current = program;
    gl.useProgram(program);

    // Quad geometry (fill screen)
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    bufferRef.current = buffer;

    const posAttr = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Create HAP texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textureRef.current = texture;

    // Set uniform states
    const isYCoCgLoc = gl.getUniformLocation(program, "uIsYCoCg");
    gl.uniform1i(isYCoCgLoc, isYCoCg ? 1 : 0);
  }, [onError]);

  const frameQueueRef = useRef<Map<number, { data: Uint8Array; format: number }>>(new Map());
  const decodingInProgressRef = useRef<Set<number>>(new Set());

  // Cleanup WebGL resources and frame queue on unmount
  useEffect(() => {
    return () => {
      const gl = glRef.current;
      if (gl) {
        if (textureRef.current) gl.deleteTexture(textureRef.current);
        if (bufferRef.current) gl.deleteBuffer(bufferRef.current);
        if (shaderProgramRef.current) gl.deleteProgram(shaderProgramRef.current);
      }
      frameQueueRef.current.clear();
      decodingInProgressRef.current.clear();
    };
  }, []);

  // ============================================================================
  // File Loader (Dispatches Native N-API Addon or JS Demuxer fallback)
  // ============================================================================
  useEffect(() => {
    let active = true;
    let handleToClose: number | null = null;

    const loadMovie = async () => {
      try {
        setIsReady(false);
        const isElectron = typeof window !== "undefined" && (window as any).electron?.isElectron;
        let useNative = false;
        let meta: any = null;

        if (isElectron) {
          try {
            console.log("[HAP Engine] Attempting to open HAP file natively:", url);
            meta = await (window as any).electron.hapOpen(url);
            useNative = true;
          } catch (nativeErr) {
            console.warn("[HAP Engine] Native C++ Addon not loaded/failed. Gracefully falling back to Pure JS/Wasm Decoder:", nativeErr);
            useNative = false;
          }
        }

        if (useNative && meta) {
          if (!active) {
            await (window as any).electron.hapClose(meta.handle);
            return;
          }

          setNativeHandle(meta.handle);
          handleToClose = meta.handle;

          const calculatedDuration = meta.frameCount / meta.fps;
          setDimensions({ width: meta.width, height: meta.height });
          setDuration(calculatedDuration);
          setFps(meta.fps);

          playbackStateRef.current = {
            currentTime: 0,
            playing: playing,
            loop: loop,
            speed: speed,
            lastFrameIndex: -1,
            lastTime: performance.now(),
            frameCount: meta.frameCount,
            duration: calculatedDuration,
            fps: meta.fps,
            isYCoCg: meta.codec?.toLowerCase().includes("hapq") || meta.codec?.toLowerCase().includes("0x0c"),
          };

          initWebGL(meta.width, meta.height, playbackStateRef.current.isYCoCg);
          setIsReady(true);
          onReady?.();
        } else {
          // Browser Pure JS / WebAssembly Parser & Decoder fallback
          console.log("[HAP Engine] Fetching HAP movie for pure JS WebGL processing:", url);
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();

          if (!active) return;

          const movie = demuxHapMov(arrayBuffer);
          setMovieInfo(movie);

          const calculatedDuration = movie.frameCount / movie.fps;
          setDimensions({ width: movie.width, height: movie.height });
          setDuration(calculatedDuration);
          setFps(movie.fps);

          playbackStateRef.current = {
            currentTime: 0,
            playing: playing,
            loop: loop,
            speed: speed,
            lastFrameIndex: -1,
            lastTime: performance.now(),
            frameCount: movie.frameCount,
            duration: calculatedDuration,
            fps: movie.fps,
            isYCoCg: movie.codec?.toLowerCase().includes("hapq") || movie.codec?.toLowerCase().includes("0x0c"),
          };

          initWebGL(movie.width, movie.height, playbackStateRef.current.isYCoCg);
          setIsReady(true);
          onReady?.();
        }
      } catch (err: any) {
        console.error("[HAP Engine ERROR]", err);
        onError?.(err?.message || "Failed loading or demuxing HAP container.");
      }
    };

    loadMovie();

    return () => {
      active = false;
      if (handleToClose !== null && typeof window !== "undefined" && (window as any).electron) {
        (window as any).electron.hapClose(handleToClose).catch((err: any) => {
          console.warn("[HAP Engine] Failed to close native handle:", err);
        });
      }
    };
  }, [url, initWebGL, onError, onReady]);

  // ============================================================================
  // Decoder Loop / Thread (Fills RAM FrameQueue asynchronously)
  // ============================================================================
  useEffect(() => {
    if (!isReady) return;

    let active = true;
    const queue = frameQueueRef.current;
    const decoding = decodingInProgressRef.current;

    const decodeLoop = async () => {
      while (active) {
        const state = playbackStateRef.current;
        const currentFrameIndex = Math.min(
          state.frameCount - 1,
          Math.max(0, Math.floor(state.currentTime * state.fps))
        );

        // Preload / Buffer size: 12 frames ahead
        const bufferSize = 12;
        const targetIndices: number[] = [];
        for (let i = 0; i < bufferSize; i++) {
          let idx = currentFrameIndex + i;
          if (idx >= state.frameCount) {
            if (state.loop) {
              idx = idx % state.frameCount;
            } else {
              break;
            }
          }
          targetIndices.push(idx);
        }

        // RAM cleanup: prune old/unused frames
        for (const idx of queue.keys()) {
          if (!targetIndices.includes(idx) && idx !== state.lastFrameIndex) {
            queue.delete(idx);
          }
        }

        // Find the next index that needs decoding
        let frameToDecode = -1;
        for (const idx of targetIndices) {
          if (!queue.has(idx) && !decoding.has(idx)) {
            frameToDecode = idx;
            break;
          }
        }

        if (frameToDecode !== -1) {
          decoding.add(frameToDecode);
          try {
            let textureData: Uint8Array | null = null;
            let format = 0x83f3; // Default DXT5

            if (nativeHandle !== null) {
              const frame = await (window as any).electron.hapGetFrame(nativeHandle, frameToDecode);
              textureData = frame.data;
              format = frame.format;
            } else if (movieInfo) {
              const decoded = decodeHapFrame(movieInfo, frameToDecode);
              textureData = decoded.data;
              format = decoded.format;
            }

            if (textureData && active) {
              queue.set(frameToDecode, { data: textureData, format });
            }
          } catch (e) {
            console.error("[HAP Decoder Thread] Error decoding frame:", frameToDecode, e);
          } finally {
            decoding.delete(frameToDecode);
          }
        }

        // Yield execution to prevent blocking the CPU thread
        await new Promise((resolve) => setTimeout(resolve, 4));
      }
    };

    decodeLoop();

    return () => {
      active = false;
      queue.clear();
      decoding.clear();
    };
  }, [isReady, nativeHandle, movieInfo]);

  // ============================================================================
  // Playback & Frame Render Animation Loop (Synchronous Render Tick)
  // ============================================================================
  useEffect(() => {
    if (!isReady) return;

    let animId = 0;

    const renderTick = () => {
      const now = performance.now();
      const state = playbackStateRef.current;
      const deltaTime = (now - state.lastTime) / 1000.0;
      state.lastTime = now;

      // Update current playtime
      if (state.playing) {
        state.currentTime += deltaTime * state.speed;

        if (state.currentTime >= state.duration) {
          if (state.loop) {
            state.currentTime = state.currentTime % state.duration;
          } else {
            state.currentTime = state.duration;
            state.playing = false;
            onEnded?.();
          }
        }
      }

      onTimeUpdate?.(state.currentTime);
      onProgressUpdate?.(state.currentTime, state.duration);

      // Determine frame to upload
      const frameIndex = Math.min(
        state.frameCount - 1,
        Math.max(0, Math.floor(state.currentTime * state.fps))
      );

      // Blazing GPU Upload (Only push compressed blocks to VRAM on actual frame transitions)
      if (frameIndex !== state.lastFrameIndex) {
        const gl = glRef.current;
        if (gl) {
          const queuedFrame = frameQueueRef.current.get(frameIndex);

          if (queuedFrame) {
            state.lastFrameIndex = frameIndex;

            try {
              gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
              
              // Direct hardware upload to GPU texture memory bypassing Chromium decoder!
              gl.compressedTexImage2D(
                gl.TEXTURE_2D,
                0,
                queuedFrame.format,
                dimensions.width,
                dimensions.height,
                0,
                queuedFrame.data
              );
            } catch (e) {
              console.error("[HAP renderTick] Failed texture frame VRAM push:", e);
            }
          } else {
            // If the frame is not decoded yet, we keep rendering the previous texture already in VRAM.
            // This is exactly how Resolume avoids freezes and keeps rendering fluid.
          }
        }
      }

      // Draw the texture onto the screen (100% synchronous, never waiting)
      const gl = glRef.current;
      if (gl) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      animId = requestAnimationFrame(renderTick);
    };

    animId = requestAnimationFrame(renderTick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isReady, dimensions, onTimeUpdate, onProgressUpdate, onEnded]);

  return (
    <div className={`relative overflow-hidden w-full h-full flex items-center justify-center ${className}`}>
      <canvas
        id={trackerId ? `hap-canvas-${trackerId}` : undefined}
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
      {!isReady && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-xs text-neutral-400 gap-2">
          <span className="animate-spin h-4 w-4 border-2 border-neutral-600 border-t-white rounded-full" />
          <span>INJECTANDO TEXTURA HAP DIRECTA...</span>
        </div>
      )}
    </div>
  );
};
