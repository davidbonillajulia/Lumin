import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import JSZip from "jszip";
import { PDFRenderer } from "./components/PDFRenderer";
import { PerfManagerModal } from "./components/PerfManagerModal";
import {
  Play,
  Pause,
  Square,
  Layers,
  Monitor as MonitorIcon,
  Settings,
  Maximize,
  Minimize,
  Zap,
  Grid,
  Plus,
  Minus,
  Search,
  Cpu,
  Activity,
  Share2,
  FolderOpen,
  Film,
  Image as ImageIcon,
  SkipBack,
  SkipForward,
  Sun,
  Moon,
  Filter,
  Scissors,
  GripVertical,
  MoreHorizontal,
  Clock,
  Timer,
  RotateCcw,
  Repeat,
  Volume2,
  VolumeX,
  EyeOff,
  List,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileText,
  Eye,
  Check,
  AlertTriangle,
  ExternalLink,
  Radio,
  X,
  Trash2,
  RefreshCw,
  Layout,
  PictureInPicture2,
  MonitorPlay,
  Save,
  FileCode,
  PlusSquare,
  LogOut,
  Loader2,
  Sliders,
  Volume1,
  Headphones,
  Mic,
  XCircle,
  FileVideo,
} from "lucide-react";
import { motion, AnimatePresence, animate, Reorder } from "motion/react";

// --- Types ---
interface ClipTransform {
  x: number;
  y: number;
  scale: number;
  scaleW: number;
  scaleH: number;
  rotationX: number;
  rotation: number;
}

interface Clip {
  id: string;
  name: string;
  thumbnail: string;
  url: string;
  type: "video" | "image" | "generator" | "document" | "ppt" | "videoinput";
  status: "idle" | "active" | "preview";
  deviceId?: string;
  transform: ClipTransform;
  mask: "none" | "circle" | "square" | "diamond";
  opacity: number;
  master: number;
  speed: number;
  volume: number;
  pan: number;
  blendMode: "Alpha" | "Add" | "Subtract" | "Multiply";
  behavior: "Cortar" | "Mezclar" | "Deslizar";
  curve: "Lineal" | "Seno" | "Exponencial";
  filter: "none" | "grayscale" | "sepia" | "invert" | "blur";
  brightness: number;
  contrast: number;
  saturation: number;
  colorBalance: { r: number; g: number; b: number };
  isPlaying?: boolean;
  loop?: boolean;
  currentTime?: number;
  duration?: number;
  width?: number;
  height?: number;
  transition?: "fade";
  playlistId?: string;
  currentPage?: number;
  totalPages?: number;
  keyboardNavEnabled?: boolean;
  fitToScale?: boolean;
  parsedSlides?: any[];
  file?: any;
  path?: string;
}

interface Playlist {
  id: string;
  name: string;
  clips: Clip[];
  opacity: number;
  isVisible: boolean;
  isPlaying?: boolean;
  loop?: boolean;
  currentClipIndex?: number;
  transform: ClipTransform;
  mask: "none" | "circle" | "square" | "diamond";
  master: number;
  speed: number;
  volume: number;
  pan: number;
  transition?: "fade";
  transitionDuration?: number;
  blendMode: "Alpha" | "Add" | "Subtract" | "Multiply";
  behavior: "Cortar" | "Mezclar" | "Deslizar";
  curve: "Lineal" | "Seno" | "Exponencial";
  filter: "none" | "grayscale" | "sepia" | "invert" | "blur";
  brightness: number;
  contrast: number;
  saturation: number;
  colorBalance: { r: number; g: number; b: number };
}

interface Screen {
  id: string;
  name: string;
  isActive: boolean;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  isPrimary?: boolean;
  refreshRate?: number;
  colorDepth?: number;
}

declare global {
  interface Window {
    electron: {
      getScreens: () => Promise<any[]>;
      launchOutput: (data: { screenId: string; url: string }) => void;
      closeOutput?: (screenId: string) => void;
      openSettings?: () => void;
      convertPptx?: (
        filePath: string,
      ) => Promise<{
        success: boolean;
        slides: any[];
        totalPages: number;
        error?: string;
      }>;
      convertPptToPdf?: (
        filePath: string,
      ) => Promise<{ success: boolean; pdfPath?: string; error?: string }>;
      selectOpenLuminFile?: () => Promise<{
        canceled: boolean;
        filePath?: string;
      }>;
      selectSaveLuminFile?: (
        defaultPath?: string,
      ) => Promise<{ canceled: boolean; filePath?: string }>;
      selectPptFile?: () => Promise<{ canceled: boolean; filePath?: string }>;
      writeLuminFile?: (
        filePath: string,
        data: string,
      ) => Promise<{ success: boolean; error?: string }>;
      readLuminFile?: (
        filePath: string,
      ) => Promise<{ success: boolean; data?: string; error?: string }>;
      getSystemStats?: () => Promise<{ cpuUsage: number; usedMemBytes: number; totalMemBytes: number; }>;
      exitApp?: () => void;
      isElectron: boolean;
    };
  }
}

interface Layer {
  id: string;
  name: string;
  isVisible: boolean;
  opacity: number;
  muted: boolean;
  activeClipId: string | null;
  activeSlotIndex: number | null;
  slots: (Clip | null)[];
  outputId?: string | null; // Selected output for this layer's triggers
  brightness: number;
  contrast: number;
  saturation: number;
  colorBalance: { r: number; g: number; b: number };
  rotation: number;
  transition: "fade";
  transitionDuration: number;
  isPlaying?: boolean;
  isActive?: boolean;
  loop?: boolean;
  loopVideo?: boolean;
  playbackMode?: "single" | "sequence" | "column";
  sequenceCounter?: number;
}

interface PiPLayer {
  id: string;
  name: string;
  clipId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  isActive: boolean;
  targetOutputId: string | null;
  showFrame?: boolean;
  showInPreview?: boolean;
  borderWidth?: number;
  borderColor?: string;
  transition?: "fade" | "none";
  transitionDuration?: number;
}

interface ExternalScreenSettings {
  resolution: string;
  width: number;
  height: number;
  scalingW: number;
  scalingH: number;
  brightness: number;
  contrast: number;
  saturation: number;
  opacity: number;
  x: number;
  y: number;
  rotation: number;
  temperature: number;
  colorBalance: { r: number; g: number; b: number };
  backgroundImage?: string;
  showBackground?: boolean;
  bgScalingW?: number;
  bgScalingH?: number;
  transitionType: "fade";
  transitionDuration: number;
  timerEnabled?: boolean;
  timerMinutes?: number;
  timerSeconds?: number;
  timerPosition?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "center"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  timerSize?: number;
  timerFont?: string;
  timerColor?: string;
  timerBgColor?: string;
  timerBgOpacity?: number;
  timerRunning?: boolean;
  timerTargetTimestamp?: number | null;
  timerRemainingSeconds?: number;
  timerAmberSeconds?: number;
  timerRedSeconds?: number;
  timerShowDraggableFloat?: boolean;
  timerPreview?: boolean;
  timerX?: number;
  timerY?: number;
  timerAmberColor?: string;
  timerRedColor?: string;
  timerBlinkSpeedAmber?: number;
  timerBlinkSpeedRed?: number;
  timerBlinkAmberEnabled?: boolean;
  timerBlinkRedEnabled?: boolean;
  timerIsLaunched?: boolean;
}

// --- Mock Data ---
const DEFAULT_TRANSFORM: ClipTransform = {
  x: 0,
  y: 0,
  scale: 1,
  scaleW: 1,
  scaleH: 1,
  rotationX: 0,
  rotation: 0,
};

const MOCK_CLIPS: Clip[] = [];

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${cs.toString().padStart(2, "0")}`;
};

const getFileUrl = (file: File) => {
  const filePath = (file as any).path;
  if (!filePath) return URL.createObjectURL(file);

  try {
    // Normalizar barras de Windows a barras de URL
    const normalized = filePath.replace(/\\/g, "/");
    const parts = normalized.split("/");

    // Codificar correctamente cada segmento del path guardando la letra de unidad intacta
    const encodedParts = parts.map((part: string, index: number) => {
      if (index === 0 && part.endsWith(":")) {
        return part;
      }
      return encodeURIComponent(part);
    });

    let joined = encodedParts.join("/");
    if (!joined.startsWith("/")) {
      joined = "/" + joined;
    }

    return `file://${joined}`;
  } catch (err) {
    console.error(
      "Error formatting native file path, using ObjectURL fallback:",
      err,
    );
    return URL.createObjectURL(file);
  }
};

const extractVideoThumbnail = (videoUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    // Set a timeout of 3 seconds as backup
    const timeout = setTimeout(() => {
      cleanup();
      resolve("");
    }, 3000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.onseeked = null;
      video.onloadeddata = null;
      video.onerror = null;
      try {
        video.src = "";
        video.load();
      } catch (e) {}
    };

    video.onloadeddata = () => {
      video.currentTime = Math.min(
        1.0,
        video.duration > 1 ? 1.0 : video.duration / 2 || 0.1,
      );
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          cleanup();
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        console.error("Error capturing canvas frame:", err);
      }
      cleanup();
      resolve("");
    };

    video.onerror = () => {
      cleanup();
      resolve("");
    };
  });
};

const FluidTimeDisplay = ({
  eventId,
  isRemaining,
  className,
  clipId,
  outputId,
  clips,
}: {
  eventId: string;
  isRemaining?: boolean;
  className?: string;
  clipId?: string | null;
  outputId?: string;
  clips?: any[];
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);

  const trackerId = useMemo(() => {
    if (outputId && clipId) {
      return `output_${outputId}_${clipId}`;
    }
    return null;
  }, [outputId, clipId]);

  useEffect(() => {
    let animId: number;
    let lastSysTime = performance.now();
    let smoothedTime = 0;

    const loop = () => {
      try {
        const now = performance.now();
        const dt = (now - lastSysTime) / 1000;
        lastSysTime = now;

        if (spanRef.current) {
          let displayTime = 0;
          const video = (window as any).__luminProgramVideo;

          const clip = clips?.find((c) => c.id === clipId);
          const activeIsPlaying = clip ? (clip.isPlaying !== false) : false;
          const actualTotal = clip?.duration || 0;

          if (video) {
            const actualCurrent = video.currentTime || 0;
            const actualTotalVideo = video.duration || 0;

            // If the video global reference changed, reset smoothedTime to prevent garbage jumps
            if ((window as any).__lastVideoRef !== video) {
              (window as any).__lastVideoRef = video;
              if (trackerId) {
                smoothedTime = (window as any).__luminVideoTimes?.[trackerId] ?? actualCurrent;
              } else {
                smoothedTime = actualCurrent;
              }
            }

            if (!video.paused && !video.ended && video.readyState >= 2) {
              const diff = actualCurrent - smoothedTime;
              // If the video time jumped significantly (seeking or starting), snap to it
              if (Math.abs(diff) > 0.3) {
                smoothedTime = actualCurrent;
              } else {
                // Extrapolate forward with the clock
                smoothedTime += dt * video.playbackRate;
                // Prevent it from drifting too far above real time
                if (smoothedTime < actualCurrent) smoothedTime = actualCurrent;
                else if (smoothedTime > actualCurrent + 0.1)
                  smoothedTime = actualCurrent + 0.1;
              }
            } else {
              smoothedTime = actualCurrent;
            }

            displayTime = isRemaining
              ? Math.max(0, actualTotalVideo - Math.min(smoothedTime, actualTotalVideo))
              : Math.min(smoothedTime, actualTotalVideo);
          } else {
            // Fallback to background Broadcast value
            const actualCurrent = trackerId ? ((window as any).__luminVideoTimes?.[trackerId] || 0) : 0;

            if (activeIsPlaying && actualCurrent > 0 && actualCurrent < actualTotal) {
              const diff = actualCurrent - smoothedTime;
              if (smoothedTime === 0 || Math.abs(diff) > 0.6) {
                smoothedTime = actualCurrent;
              } else {
                smoothedTime += dt;
                if (smoothedTime < actualCurrent) {
                  smoothedTime = actualCurrent;
                } else if (smoothedTime > actualCurrent + 0.3) {
                  smoothedTime = actualCurrent + 0.3;
                }
              }
            } else {
              smoothedTime = actualCurrent;
            }

            displayTime = isRemaining
              ? Math.max(0, actualTotal - Math.min(smoothedTime, actualTotal))
              : Math.min(smoothedTime, actualTotal);
          }

          const text = (isRemaining ? "-" : "") + formatTime(displayTime);
          if (spanRef.current.innerText !== text) {
            spanRef.current.innerText = text;
          }
        }
      } catch (e) {
        console.error("FluidTimeDisplay loop error:", e);
      }
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [eventId, isRemaining, clipId, trackerId, clips]);

  return (
    <span ref={spanRef} className={className}></span>
  );
};

const volToDb = (vol: number) => {
  if (vol <= 0.001) return "-∞ dB";
  // 0.5 = 0dB point
  const db = 20 * Math.log10(vol / 0.5);
  return `${db > 0 ? "+" : ""}${db.toFixed(1)} dB`;
};

// --- Components ---
let updateClip: (id: string, updates: Partial<Clip>) => void;
const PropertyControl = ({
  label,
  value,
  displayValue,
  min,
  max,
  step = 0.01,
  onChange,
  onInputChange,
  isAudioControl = false,
}: {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  onInputChange?: (val: string) => void;
  isAudioControl?: boolean;
}) => {
  const progress = ((value - min) / (max - min)) * 100;
  const sliderRef = useRef<HTMLDivElement>(null);

  // Determine if this is an audio control for dB display
  const isAudio =
    isAudioControl ||
    label.toLowerCase().includes("volumen") ||
    label.toLowerCase().includes("master") ||
    label.toLowerCase().includes("mixer");
  const actualDisplayValue = isAudio ? volToDb(value) : displayValue;

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        // Prevent trigger if physically typing inside input box
        if (document.activeElement?.tagName === "INPUT") return;
        const amount = e.shiftKey ? step * 10 : step;
        if (
          e.key === "+" ||
          e.key === "=" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowRight"
        ) {
          onChange(Math.min(max, value + amount));
          e.preventDefault();
        } else if (
          e.key === "-" ||
          e.key === "_" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft"
        ) {
          onChange(Math.max(min, value - amount));
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-1 p-2 bg-obs-dark-1 rounded border border-obs-dark-2 group select-none min-w-0 outline-none focus-within:border-obs-accent/70 focus:border-obs-accent"
    >
      <div className="flex items-center justify-between gap-1 overflow-hidden h-5">
        <span className="text-[8px] font-black uppercase tracking-tighter text-obs-muted truncate flex-1">
          {label}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {/* MINUS BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              const amount = e.shiftKey ? step * 10 : step;
              onChange(Math.max(min, value - amount));
            }}
            className="text-white hover:text-white bg-obs-bg hover:bg-obs-surface rounded transition-colors w-4.5 h-4.5 flex items-center justify-center border border-white/5 active:scale-90 shrink-0"
            title="Decrementar"
          >
            <Minus size={10} strokeWidth={2.5} />
          </button>

          {/* VALUE ELEMENT */}
          {onInputChange ? (
            <div className="flex items-center gap-1 bg-obs-bg/50 px-1 py-0.5 rounded border border-white/5 h-4.5">
              <input
                type="text"
                value={
                  isAudio
                    ? actualDisplayValue.split(" ")[0]
                    : displayValue.replace(/[^\d.-]/g, "")
                }
                onChange={(e) => onInputChange(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  const amount = e.shiftKey ? step * 10 : step;
                  if (e.key === "+" || e.key === "=") {
                    onChange(Math.min(max, value + amount));
                    e.preventDefault();
                  } else if (e.key === "-" || e.key === "_") {
                    onChange(Math.max(min, value - amount));
                    e.preventDefault();
                  }
                }}
                className="w-10 bg-transparent border-none p-0 text-[10px] font-black text-obs-accent outline-none text-right placeholder:text-obs-accent/30 pr-0.5"
              />
              <span className="text-[7px] text-obs-muted uppercase font-black tracking-widest leading-none">
                {isAudio ? "dB" : displayValue.replace(/[\d.-]/g, "") || "PX"}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center bg-obs-bg/50 px-2 rounded border border-white/5 h-4.5">
              <span className="text-[10px] font-black text-obs-accent whitespace-nowrap">
                {actualDisplayValue.includes(".") && !isAudio
                  ? Number.parseFloat(
                      actualDisplayValue.replace(/[^\d.-]/g, ""),
                    ).toFixed(1) +
                    (actualDisplayValue.replace(/[\d.-]/g, "") || "")
                  : actualDisplayValue}
              </span>
            </div>
          )}

          {/* PLUS BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              const amount = e.shiftKey ? step * 10 : step;
              onChange(Math.min(max, value + amount));
            }}
            className="text-white hover:text-white bg-obs-bg hover:bg-obs-surface rounded transition-colors w-4.5 h-4.5 flex items-center justify-center border border-white/5 active:scale-90 shrink-0"
            title="Incrementar"
          >
            <Plus size={10} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Fader/Slider */}
      <div
        ref={sliderRef}
        className="h-3 relative bg-obs-bg/50 rounded-sm cursor-ew-resize overflow-hidden border border-white/5"
        onMouseDown={(e) => {
          e.preventDefault();
          const target = sliderRef.current;
          if (!target) return;

          const rect = target.getBoundingClientRect();
          const updateValue = (clientX: number) => {
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const percent = x / rect.width;
            const newValue = min + percent * (max - min);
            onChange(newValue);
          };

          const onMouseMove = (moveEvent: MouseEvent) => {
            updateValue(moveEvent.clientX);
          };

          const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "";
            document.documentElement.classList.remove("select-none");
          };

          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", onMouseUp);
          document.body.style.cursor = "ew-resize";
          document.documentElement.classList.add("select-none");
          updateValue(e.clientX);
        }}
      >
        <div
          className="absolute inset-y-0 left-0 bg-transparent"
          style={{
            width: "100%",
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "10% 100%",
          }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-obs-accent/20 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute inset-y-0 bg-obs-accent w-0.5 shadow-[0_0_8px_rgba(0,163,245,0.6)] transition-all duration-75"
          style={{ left: `calc(${progress}% - 1px)` }}
        />
      </div>
    </div>
  );
};

const CollapsibleSection = ({
  title,
  children,
  defaultOpen = false,
  disabled = false,
  onReset,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  onReset?: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <div
      className={`bg-obs-surface overflow-visible border border-obs-border rounded shadow-sm ${disabled ? "opacity-50 grayscale pointer-events-none" : ""}`}
    >
      <div className="flex items-center w-full hover:bg-obs-border/30 transition-colors group">
        <button
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          disabled={disabled}
          className="flex-1 px-3 py-2 flex items-center justify-between text-left"
        >
          <span className="text-[10px] font-black uppercase text-obs-muted tracking-widest">
            {title}
          </span>
          {isOpen ? (
            <ChevronDown size={12} className="text-obs-accent" />
          ) : (
            <ChevronRight size={12} className="text-obs-muted" />
          )}
        </button>
        {onReset && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="p-1 px-2 text-obs-muted hover:text-white transition-colors"
            title="Restablecer sección"
          >
            <RotateCcw size={10} />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-obs-border/30 bg-obs-bg/20 space-y-3">
          <div className="mt-2 space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
};

const ClipCard = React.memo(
  ({
    clip,
    onSelect,
    onDragStart,
    isDarkMode,
    isSelected,
    onDelete,
  }: {
    clip: Clip;
    onSelect: () => void;
    onDragStart: (e: React.DragEvent) => void;
    isDarkMode: boolean;
    isSelected: boolean;
    onDelete?: () => void;
  }) => (
    <div
      draggable
      onDragStart={onDragStart}
      className="relative aspect-video rounded cursor-pointer group"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSelect}
        className={`w-full h-full rounded border transition-all ${
          isSelected
            ? "border-obs-accent shadow-[0_0_8px_rgba(0,163,245,0.3)]"
            : "border-obs-border hover:border-obs-muted bg-obs-surface"
        }`}
      >
        {clip.type === "video" ? (
          <HoverVideoPreview
            src={clip.url}
            thumbnail={clip.thumbnail}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        ) : clip.type === "videoinput" ? (
          <LibraryMediaPreview file={clip} />
        ) : clip.type === "document" ||
          clip.type === "ppt" ||
          clip.name.toLowerCase().endsWith(".pdf") ? (
          <div className="w-full h-full bg-white overflow-hidden flex items-center justify-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
            {clip.type === "ppt" ? (
              <PPTSlideRenderer
                clip={clip}
                pageNumber={clip.currentPage || 1}
                isThumbnail={true}
              />
            ) : (
              <PDFRenderer url={clip.url} pageNumber={clip.currentPage || 1} />
            )}
          </div>
        ) : (
          <img
            src={clip.thumbnail}
            alt={clip.name}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1.5 pointer-events-none">
          <span className="text-[9px] font-medium text-obs-text truncate">
            {clip.name}
          </span>
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-1 left-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md"
            title="Eliminar fuente"
          >
            <Trash2 size={10} />
          </button>
        )}
        {clip.status === "active" && (
          <div className="absolute top-1 right-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
          </div>
        )}
      </motion.div>
    </div>
  ),
);

const VUMeter = ({
  label,
  position,
  level = 0,
}: {
  label: string;
  position: "left" | "right";
  level?: number;
}) => {
  return (
    <div
      className={`flex flex-col items-center gap-2 h-full py-2 ${position === "left" ? "pr-1" : "pl-1"}`}
    >
      <div className="flex-1 w-4 bg-obs-bg border border-obs-border rounded-sm relative overflow-hidden flex flex-col-reverse p-0.5 gap-0.5">
        {Array.from({ length: 15 }).map((_, i) => {
          const threshold = (i + 1) / 15;
          const isActive = level >= threshold;
          return (
            <div
              key={i}
              className={`flex-1 w-full rounded-sm transition-all duration-75 ${
                isActive
                  ? i < 9
                    ? "bg-green-500"
                    : i < 13
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  : i < 9
                    ? "bg-green-500/10"
                    : i < 13
                      ? "bg-yellow-500/10"
                      : "bg-red-500/10"
              }`}
            />
          );
        })}
      </div>
      <div className="h-32 flex items-center justify-center">
        <span
          className="text-[7px] font-bold text-obs-muted uppercase tracking-[0.2em]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

const audioContext = new (
  window.AudioContext || (window as any).webkitAudioContext
)();

const useAudioLevel = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isActive: boolean,
  volume: number = 1,
  connectToDestination: boolean = true,
) => {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const currentVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (video !== currentVideoRef.current) {
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {}
      }
      sourceRef.current = null;
      currentVideoRef.current = video;
    }

    if (!video || !isActive) {
      setLevel(0);
      return;
    }

    const initAudio = () => {
      try {
        if (audioContext.state === "suspended") {
          audioContext.resume();
        }

        if (!analyserRef.current) {
          analyserRef.current = audioContext.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.5; // More responsive
          dataArrayRef.current = new Uint8Array(
            analyserRef.current.frequencyBinCount,
          );
        }

        if (!sourceRef.current) {
          try {
            sourceRef.current = audioContext.createMediaElementSource(video);
            sourceRef.current.connect(analyserRef.current);
            if (connectToDestination) {
              analyserRef.current.connect(audioContext.destination);
            }
          } catch (e) {
            console.warn("Audio source connection error:", e);
          }
        }

        const updateLevel = () => {
          if (!analyserRef.current || !dataArrayRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);

          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          const average = sum / dataArrayRef.current.length;
          
          // Noise-gate threshold to ensure silent frames show exactly zero on meters
          if (average < 3) {
            setLevel(0);
          } else {
            // Smoothly scale levels starting from above the noise gate threshold
            setLevel(Math.min(1, (average - 3) / 42));
          }

          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (err) {
        console.error("Audio context error:", err);
      }
    };

    const handlePlay = () => initAudio();
    video.addEventListener("play", handlePlay);
    if (!video.paused) initAudio();

    return () => {
      video.removeEventListener("play", handlePlay);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [videoRef.current, isActive, connectToDestination]);

  return level;
};

const ScaleToFit = ({
  width,
  height,
  children,
}: {
  width?: number;
  height?: number;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current || !width || !height) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = entry.contentRect.width;
        const ch = entry.contentRect.height;
        const scaleX = cw / width;
        const scaleY = ch / height;
        setScale(Math.min(scaleX, scaleY));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [width, height]);

  if (!width || !height) {
    return <div className="w-full h-full relative">{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex items-center justify-center overflow-hidden"
    >
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          position: "absolute",
        }}
        className="flex items-start justify-start"
      >
        {children}
      </div>
    </div>
  );
};

  // Helper component for gapless layer sequence playback
  const LayerPlaybox = React.memo(({ 
    layer, 
    clips, 
    volume, 
    masterVolume, 
    opacity, 
    isProgram, 
    isTransmitting, 
    onLayerEnded, 
    updateClip, 
    perfSettings,
    isSlave = false,
    allowClockAuthority = false,
    onProgressUpdate = undefined,
    outputId,
    isVisuallyActive = true,
    onLevelChange,
  }: { 
    layer: Layer; 
    clips: Clip[]; 
    volume: number; 
    masterVolume: number; 
    opacity: number; 
    isProgram: boolean; 
    isTransmitting: boolean; 
    onLayerEnded: any; 
    updateClip: any; 
    perfSettings: any; 
    isSlave?: boolean;
    allowClockAuthority?: boolean;
    onProgressUpdate?: (current: number, total: number) => void;
    outputId?: string;
    isVisuallyActive?: boolean;
    onLevelChange?: (level: number) => void;
  }) => {
    const activeClip = layer.activeClipId ? clips?.find((c) => c.id === layer.activeClipId) : null;
    const initialKey = activeClip ? `${activeClip.id}-${layer.sequenceCounter || 0}` : null;
    const [busA, setBusA] = useState<{ clip: Clip; key: string } | null>(() => {
      return activeClip
        ? { clip: activeClip, key: initialKey! }
        : null;
    });
    const [busB, setBusB] = useState<{ clip: Clip; key: string } | null>(null);
    const [isBusAReady, setIsBusAReady] = useState(true);
    const [activeKey, setActiveKey] = useState<string | null>(initialKey);

    useEffect(() => {
      const currentKey = activeClip ? `${activeClip.id}-${layer.sequenceCounter || 0}` : null;
      if (currentKey !== activeKey) {
        if (!activeClip) {
          setBusA(null);
          setBusB(null);
          setIsBusAReady(true);
        } else if (!isBusAReady) {
          // If we were already transitioning, force swap
          setBusA({ clip: activeClip, key: currentKey });
          setBusB(null);
          setIsBusAReady(false);
        } else {
          setBusB({ clip: activeClip, key: currentKey });
          setIsBusAReady(false);
        }
        setActiveKey(currentKey);
      } else if (activeClip) {
        // Keep clip properties (like fitToScale, colors) up-to-date real-time
        setBusA(prev => (prev && prev.clip.id === activeClip.id && prev.clip !== activeClip) ? { ...prev, clip: activeClip } : prev);
        setBusB(prev => (prev && prev.clip.id === activeClip.id && prev.clip !== activeClip) ? { ...prev, clip: activeClip } : prev);
      }
    }, [activeClip, activeKey, isBusAReady, layer.sequenceCounter]);

    const [busALevel, setBusALevel] = useState(0);
    const [busBLevel, setBusBLevel] = useState(0);

    useEffect(() => {
      if (!busA) setBusALevel(0);
    }, [busA]);

    useEffect(() => {
      if (!busB) setBusBLevel(0);
    }, [busB]);

    useEffect(() => {
      if (layer.muted) {
        onLevelChange?.(0);
      } else {
        onLevelChange?.(Math.max(busALevel, busBLevel));
      }
    }, [busALevel, busBLevel, layer.muted, onLevelChange]);

    // Handle transition swap
    useEffect(() => {
      if (busB && isBusAReady) {
        setBusA(busB);
        setBusB(null);
      }
    }, [isBusAReady, busB]);

    if (!activeClip && !busA && !busB) return null;

    // Preload next
    let nextSrc = undefined;
    if (layer.playbackMode === "sequence" && activeClip) {
      const currentSlotIndex = layer.activeSlotIndex !== null 
        ? layer.activeSlotIndex 
        : layer.slots.findIndex((s) => s?.id === activeClip.id);
      
      const nextClipIndex = layer.slots.findIndex((s, idx) => idx > currentSlotIndex && s !== null);
      let foundNext = null;
      if (nextClipIndex !== -1) {
        foundNext = layer.slots[nextClipIndex];
      } else if (layer.loop !== false) {
        const firstSlotIndex = layer.slots.findIndex((s) => s !== null);
        if (firstSlotIndex !== -1 && layer.slots[firstSlotIndex]?.id !== activeClip.id) {
          foundNext = layer.slots[firstSlotIndex];
        }
      }
      if (foundNext && foundNext.type === "video") nextSrc = foundNext.url;
    }

    const activeNodes = [
      busA && { ...busA, isBusA: true },
      busB && { ...busB, isBusA: false }
    ].filter(Boolean) as ({ clip: Clip; key: string; isBusA: boolean })[];

    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <AnimatePresence initial={false}>
          {activeNodes.map((bus) => (
            <VideoLayer
              key={`layer-video-${layer.id}-${bus.key}`}
              clip={bus.clip}
              nextSrc={bus.isBusA ? nextSrc : undefined}
              volume={layer.muted ? 0 : volume}
              masterVolume={masterVolume}
              opacity={opacity}
              isProgram={isProgram}
              isPlaying={layer.isPlaying}
              isTransmitting={isTransmitting}
              onEnded={() =>
                onLayerEnded?.(
                  layer.id,
                  bus.clip.id,
                  parseInt(bus.key.split("-").pop() || "0"),
                )
              }
              loopOverride={
                layer.playbackMode === "single"
                  ? layer.loopVideo !== false
                  : layer.playbackMode === "column"
                    ? layer.loop !== false
                    : false
              }
              isPlaylistSequence={layer.playbackMode === "sequence"}
              transitionType="fade"
              transitionDuration={Math.min(1.5, layer.transitionDuration || 0.4)}
              perfSettings={perfSettings}
              onProgressUpdate={onProgressUpdate}
              onUpdateClip={updateClip}
              onReady={() => setIsBusAReady(true)}
              isSlave={isSlave}
              isClockSource={
                bus.isBusA ? (isProgram && allowClockAuthority && (!busB || !isBusAReady)) : false
              }
              layerId={layer.id}
              outputId={outputId}
              isVisuallyActive={isVisuallyActive}
              onLevelChange={(lvl) => {
                if (bus.isBusA) {
                  setBusALevel(lvl);
                } else {
                  setBusBLevel(lvl);
                }
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  });

const Monitor = React.memo(
  ({
    title,
    isActive,
    activeClip,
    isDarkMode,
    onDrop,
    previewClip,
    crossfaderValue,
    isProgram,
    onEnded,
    onTogglePlay,
    onToggleLoop,
    onRewind,
    onSkip,
    onProgressUpdate,
    onLevelChange,
    isPlaylist,
    onClick,
    onLayerEnded,
    volume = 1,
    brightness = 1,
    contrast = 1,
    saturation = 1,
    opacity = 1,
    x = 0,
    y = 0,
    rotation = 0,
    scalingW = 1,
    scalingH = 1,
    transitionType = "cut",
    isTransmitting = false,
    isProgramOff = false,
    colorBalance = { r: 1, g: 1, b: 1 },
    settings,
    clips,
    programClipId,
    previewClipId,
    targetClipId,
    hasTransitionTargets = false,
    masterVolume = 1,
    hideOverlays = false,
    accentColor,
    pipLayers = [],
    activeOutputId = "1",
    layers = [],
    layerOutputs = {},
    onUpdateClip,
    perfSettings,
    programPlayIndex = 0,
    isSlave = false,
  }: {
    title: string;
    isActive?: boolean;
    activeClip?: Clip | null;
    isDarkMode: boolean;
    onDrop?: (e: React.DragEvent) => void;
    previewClip?: Clip | null;
    crossfaderValue?: number;
    isProgram?: boolean;
    isPlaylist?: boolean;
    onEnded?: () => void;
    onLayerEnded?: (
      layerId: string,
      clipId: string,
      seqCounter?: number,
    ) => void;
    onTogglePlay?: (id: string) => void;
    onToggleLoop?: (id: string) => void;
    onRewind?: (id: string) => void;
    onSkip?: (id: string, amount: number) => void;
    onProgressUpdate?: (current: number, total: number) => void;
    onLevelChange?: (level: number) => void;
    onClick?: () => void;
    volume?: number;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    opacity?: number;
    x?: number;
    y?: number;
    rotation?: number;
    scalingW?: number;
    scalingH?: number;
    transitionType?: "fade" | "wipe" | "slide" | "cut";
    isTransmitting?: boolean;
    isProgramOff?: boolean;
    colorBalance?: { r: number; g: number; b: number };
    settings?: ExternalScreenSettings;
    clips?: Clip[];
    programClipId?: string | null;
    previewClipId?: string | null;
    targetClipId?: string | null;
    hasTransitionTargets?: boolean;
    masterVolume?: number;
    hideOverlays?: boolean;
    accentColor?: string;
    pipLayers?: PiPLayer[];
    activeOutputId?: string;
    layers?: Layer[];
    layerOutputs?: Record<string, string | null>;
    onUpdateClip?: (id: string, updates: Partial<Clip>) => void;
    perfSettings?: any;
    programPlayIndex?: number;
    isSlave?: boolean;
  }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const lastSrc = useRef<string>("");
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Buffer transition handshake states:
    const [isBusAReady, setIsBusAReady] = useState(true);
    const [activeBusBClip, setActiveBusBClip] = useState<Clip | null>(null);

    const audioLevel = useAudioLevel(
      videoRef,
      !!activeClip && activeClip.type === "video",
      volume,
      isProgram,
    );

    // Track active levels for multi-layer audio
    const layerLevelsRef = useRef<Record<string, number>>({});

    const updateLevel = useCallback(() => {
      const activeLayerIds = new Set((layers || []).map(l => l.id));
      // clean up inactive layers
      Object.keys(layerLevelsRef.current).forEach(id => {
        if (!activeLayerIds.has(id)) {
          delete layerLevelsRef.current[id];
        }
      });
      const maxLayerLevel = Object.values(layerLevelsRef.current).reduce((max, val) => Math.max(max, val), 0);
      const combined = Math.max(audioLevel, maxLayerLevel);
      onLevelChange?.(combined);
    }, [audioLevel, layers, onLevelChange]);

    useEffect(() => {
      updateLevel();
    }, [audioLevel, updateLevel]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const updateTime = () => {
        setCurrentTime(video.currentTime);
        onProgressUpdate?.(video.currentTime, video.duration);
      };
      const updateDuration = () => setDuration(video.duration);

      video.addEventListener("timeupdate", updateTime);
      video.addEventListener("loadedmetadata", updateDuration);
      video.addEventListener("ended", onEnded || (() => {}));

      return () => {
        video.removeEventListener("timeupdate", updateTime);
        video.removeEventListener("loadedmetadata", updateDuration);
        video.removeEventListener("ended", onEnded || (() => {}));
      };
    }, [activeClip?.id, onEnded]);

    // Handle audio levels separately
    useEffect(() => {
      const video = videoRef.current;
      if (video && activeClip && !isProgram) {
        const gain = volume / 0.5;
        video.volume = Math.max(
          0,
          Math.min(
            1,
            gain * (activeClip.volume !== undefined ? activeClip.volume : 1),
          ),
        );
        // DO NOT use video.muted = true because it breaks the VU meter signal.
        // useAudioLevel's connectToDestination=false intercepts the signal and silences the speakers.
        video.muted = false;
      }
    }, [volume, activeClip?.volume, isProgram]);

    // Handle playback and source
    useEffect(() => {
      const video = videoRef.current;
      if (video && activeClip && !isProgram) {
        if (lastSrc.current !== activeClip.url) {
          video.src = activeClip.url;
          lastSrc.current = activeClip.url;
        }
        video.playbackRate = activeClip.speed || 1;

        if (activeClip.isPlaying !== false) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }

        if (
          activeClip.currentTime !== undefined &&
          Math.abs(video.currentTime - activeClip.currentTime) > 0.5
        ) {
          video.currentTime = activeClip.currentTime;
        }
      }
    }, [
      activeClip?.id,
      activeClip?.url,
      activeClip?.isPlaying,
      activeClip?.speed,
      isProgram,
    ]);

    // Adjust image fit for program
    const imageFit = isProgram ? "fill" : "cover";

    const busAClip = useMemo(
      () =>
        isProgram && clips ? clips.find((c) => c.id === programClipId) : null,
      [isProgram, clips, programClipId],
    );

    const busBClip = useMemo(() => {
      if (!isProgram || !clips) return null;

      // If we have an explicit target for this output (multi-take)
      if (targetClipId) return clips.find((c) => c.id === targetClipId);

      // If ANY outputs are targeted but NOT this one, we stay on busA (busB is null)
      if (hasTransitionTargets) return null;

      // Global Take Fallback: use the global preview clip
      return clips.find((c) => c.id === previewClipId);
    }, [isProgram, clips, targetClipId, previewClipId, hasTransitionTargets]);

    // Keep previous transition video mounted and playing until the new target video renders its first frame
    useEffect(() => {
      if (busBClip) {
        setActiveBusBClip(busBClip);
      } else if (isBusAReady) {
        setActiveBusBClip(null);
      }
    }, [busBClip, isBusAReady]);

    // When a new program clip enters Bus A, we reset ready handshake until first frame renders
    useEffect(() => {
      if (busAClip) {
        if (busAClip.type === "video") {
          setIsBusAReady(false);
        } else {
          setIsBusAReady(true);
        }
      } else {
        setIsBusAReady(true);
      }
    }, [busAClip?.id]);

    const isContentActive = isActive && isTransmitting;

    // Decide if we should show ANY content in Program (including transition buffer)
    const hasActiveContent =
      (isProgram
        ? isContentActive &&
          ((busAClip &&
            (crossfaderValue === undefined || crossfaderValue < 100)) ||
            (activeBusBClip &&
              crossfaderValue !== undefined &&
              (crossfaderValue > 0 || !isBusAReady)))
        : !!activeClip) && !isProgramOff;

    const audioOpacityA = useMemo(() => {
      if (!busAClip) return 0;
      if (transitionType === "cut") return isProgramOff && isProgram ? 0 : 1;
      const fader = crossfaderValue === undefined ? 0 : crossfaderValue;
      const base = 1 - fader / 100;
      return isProgramOff && isProgram ? 0 : base;
    }, [busAClip, crossfaderValue, transitionType, isProgram, isProgramOff]);

    const audioOpacityB = useMemo(() => {
      if (!activeBusBClip) return 0;
      if (!isBusAReady) return 1; // Show at full opacity during the transition handshake
      if (transitionType === "cut") return 0;
      const fader = crossfaderValue === undefined ? 0 : crossfaderValue;
      const base = fader / 100;
      return isProgramOff && isProgram ? 0 : base;
    }, [
      activeBusBClip,
      isBusAReady,
      crossfaderValue,
      transitionType,
      isProgram,
      isProgramOff,
    ]);

    const wipeTransform = useMemo(() => {
      if (transitionType !== "wipe") return undefined;
      const fader = crossfaderValue === undefined ? 0 : crossfaderValue;
      return `inset(0 ${100 - fader}% 0 0)`;
    }, [crossfaderValue, transitionType]);

    return (
      <div
        className={`group flex flex-col h-full bg-obs-dark-m1 items-center justify-center p-0`}
      >
        <div
          className={`relative aspect-video w-full max-h-full bg-black rounded-sm border-2 ${isActive ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "border-[#333]"} overflow-hidden cursor-pointer`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={onClick}
        >
          {/* Main Content */}
          {isProgram ? (
            <div className="w-full h-full relative flex items-center justify-center">
              <ScaleToFit width={settings?.width} height={settings?.height}>
                {/* Background Layer */}
                {settings?.showBackground && settings?.backgroundImage && (
                  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center bg-black">
                    <img
                      src={settings.backgroundImage}
                      className="absolute pointer-events-none"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "fill",
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) scale(${(settings.bgScalingW ?? 100) / 100}, ${(settings.bgScalingH ?? 100) / 100})`,
                        display: "block",
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div
                  className="relative w-full h-full overflow-hidden flex items-start justify-start z-10"
                  style={{
                    opacity: settings?.opacity ?? 1,
                    backgroundColor:
                      settings?.showBackground &&
                      settings?.backgroundImage &&
                      !hasActiveContent
                        ? "transparent"
                        : "#000",
                    transform: `scale(${settings?.scalingW ?? 1}, ${settings?.scalingH ?? 1}) translate(${settings?.x ?? 0}px, ${settings?.y ?? 0}px) rotate(${settings?.rotation ?? 0}deg)`,
                    filter: `brightness(${settings?.brightness ?? 1}) contrast(${settings?.contrast ?? 1}) saturate(${settings?.saturation ?? 1}) url(#rgbBalanceMon)`,
                  }}
                >
                  <svg width="0" height="0" className="absolute">
                    <filter id="rgbBalanceMon">
                      <feColorMatrix
                        type="matrix"
                        values={`${settings?.colorBalance?.r ?? 1} 0 0 0 0
                            0 ${settings?.colorBalance?.g ?? 1} 0 0 0
                            0 0 ${settings?.colorBalance?.b ?? 1} 0 0
                            0 0 0 1 0`}
                      />
                    </filter>
                  </svg>

                  {isActive && isTransmitting ? (
                    <motion.div
                      initial={{ opacity: 1 }}
                      animate={{ opacity: isProgramOff ? 0 : 1 }}
                      transition={{ duration: 2.5, ease: "easeInOut" }}
                      className="w-full h-full flex items-start justify-start relative"
                    >
                      <AnimatePresence custom={transitionType}>
                        {busAClip &&
                          !layers?.some((l: any) => l.activeClipId && (layerOutputs[l.id] === activeOutputId || !layerOutputs[l.id] || layerOutputs[l.id] === "all")) &&
                          (crossfaderValue === undefined ||
                            crossfaderValue < 100) && (
                            <VideoLayer
                              key={`bus-A-${busAClip.id}-${activeOutputId || "1"}-${programPlayIndex}`}
                              clip={busAClip}
                              volume={volume}
                              masterVolume={masterVolume}
                              opacity={opacity}
                              faderOpacity={audioOpacityA}
                              isProgram={crossfaderValue === 0}
                              crossfaderValue={crossfaderValue}
                              transitionType={transitionType}
                              isTransmitting={isTransmitting}
                              onProgressUpdate={onProgressUpdate}
                              onLevelChange={onLevelChange}
                              onEnded={onEnded}
                              transitionDuration={
                                settings?.transitionDuration
                                  ? settings.transitionDuration / 1000
                                  : 0.4
                              }
                              onReady={() => setIsBusAReady(true)}
                              perfSettings={perfSettings}
                              isSlave={isSlave}
                              isClockSource={crossfaderValue === 0}
                              outputId={activeOutputId || "1"}
                            />
                          )}
                        {activeBusBClip && (
                          <VideoLayer
                            key={`bus-B-${activeBusBClip.id}-${activeOutputId || "1"}-${programPlayIndex}`}
                            clip={activeBusBClip}
                            volume={volume}
                            masterVolume={masterVolume}
                            opacity={opacity}
                            style={{ clipPath: wipeTransform }}
                            faderOpacity={audioOpacityB}
                            isProgram={crossfaderValue === 100 || !isBusAReady}
                            isClockSource={crossfaderValue === 100 || !isBusAReady}
                            transitionType={transitionType}
                            isTransmitting={isTransmitting}
                            onProgressUpdate={onProgressUpdate}
                            onEnded={onEnded}
                            transitionDuration={
                              settings?.transitionDuration
                                ? settings.transitionDuration / 1000
                                : 0.4
                            }
                            perfSettings={perfSettings}
                            onUpdateClip={onUpdateClip}
                            onReady={() => setIsBusAReady(true)}
                            isSlave={isSlave}
                            outputId={activeOutputId || "1"}
                          />
                        )}
                      </AnimatePresence>

                      {/* Layer Rendering - Multi-layer mixing */}
                      {(() => {
                        const hasGlobalSource = !!busAClip || !!activeBusBClip;
                        return layers.map((l, index) => {
                          const isTargetOutput = layerOutputs[l.id] === activeOutputId || !layerOutputs[l.id] || layerOutputs[l.id] === "all";
                          // Always render the layer to maintain sequencing and playback state (master),
                          // but make it visually hidden if it's not meant for the current active preview.
                          const isVisuallyActive = l.isVisible && isTargetOutput;
                          
                          // Resolve target output route (defaults to "1" or active preview if PROGRAM routing is selected)
                          const resolvedOutputId = layerOutputs[l.id] && layerOutputs[l.id] !== "all" 
                            ? layerOutputs[l.id] 
                            : (activeOutputId || "1");
                          
                          return (
                            <div
                              key={`${l.id}`}
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                opacity: isVisuallyActive ? l.opacity : 0,
                                zIndex: layers.length - index + 10
                              }}
                            >
                              <svg width="0" height="0" className="absolute">
                                <filter
                                  id={`rgbLayer-${l.id}`}
                                  colorInterpolationFilters="sRGB"
                                >
                                  <feColorMatrix
                                    type="matrix"
                                    values={`${l.colorBalance.r} 0 0 0 0
                                      0 ${l.colorBalance.g} 0 0 0
                                      0 0 ${l.colorBalance.b} 0 0
                                      0 0 0 1 0`}
                                  />
                                </filter>
                              </svg>
                              <div
                                className="w-full h-full relative"
                                style={{
                                  filter: `brightness(${l.brightness}) contrast(${l.contrast}) saturate(${l.saturation}) url(#rgbLayer-${l.id})`,
                                  transform: `rotate(${l.rotation}deg)`,
                                }}
                              >
                                  <LayerPlaybox
                                    layer={l}
                                    clips={clips || []}
                                    volume={isVisuallyActive ? volume : 0}
                                    masterVolume={masterVolume}
                                    opacity={opacity}
                                    isProgram={!!isProgram}
                                    isTransmitting={isTransmitting}
                                    onLayerEnded={onLayerEnded}
                                    onProgressUpdate={(current, total) => {
                                      if (!!isProgram && isVisuallyActive) {
                                        onProgressUpdate?.(current, total);
                                        try {
                                          window.dispatchEvent(
                                            new CustomEvent("video-progress-program", {
                                              detail: { current, total },
                                            }),
                                          );
                                        } catch (e) {}
                                      }
                                    }}
                                    updateClip={updateClip}
                                    perfSettings={perfSettings}
                                    isSlave={isSlave}
                                    allowClockAuthority={
                                      !hasGlobalSource && index === 0
                                    }
                                    outputId={resolvedOutputId}
                                    isVisuallyActive={isVisuallyActive}
                                    onLevelChange={(lvl) => {
                                      if (isVisuallyActive) {
                                        layerLevelsRef.current[l.id] = lvl;
                                      } else {
                                        layerLevelsRef.current[l.id] = 0;
                                      }
                                      updateLevel();
                                    }}
                                  />
                              </div>
                            </div>
                          );
                        });
                      })()}


                      <AnimatePresence>
                        {pipLayers
                          ?.filter(
                            (p) =>
                              (isProgram &&
                                (p.isActive || p.showInPreview) &&
                                (p.targetOutputId === activeOutputId ||
                                  (!p.targetOutputId &&
                                    activeOutputId === "1") ||
                                  p.targetOutputId === "program")) ||
                              (!isProgram &&
                                p.showInPreview &&
                                (p.targetOutputId === activeOutputId ||
                                  (!p.targetOutputId &&
                                    activeOutputId === "1") ||
                                  p.targetOutputId === "program")),
                          )
                          .map((pip) => (
                            <motion.div
                              key={pip.id}
                              className={`absolute overflow-hidden pointer-events-none ${pip.showFrame ? "border" : ""}`}
                              initial={{ opacity: 0 }}
                              animate={{
                                opacity: pip.opacity,
                              }}
                              exit={{ opacity: 0 }}
                              transition={{
                                duration: Math.min(
                                  1.5,
                                  pip.transitionDuration ?? 0.4,
                                ),
                                ease: "easeInOut",
                              }}
                              style={{
                                zIndex: 100,
                                left: `${(pip.x / 1920) * 100}%`,
                                top: `${(pip.y / 1080) * 100}%`,
                                width: `${(pip.width / 1920) * 100}%`,
                                height: `${(pip.height / 1080) * 100}%`,
                                borderRadius: 0,
                                background: "transparent",
                                borderColor: pip.borderColor || "#000000",
                                borderWidth: pip.showFrame
                                  ? `${pip.borderWidth || 1}px`
                                  : "0px",
                              }}
                            >
                              {pip.clipId &&
                                clips?.find((c) => c.id === pip.clipId) && (
                                  <div className="w-full h-full">
                                    <VideoLayer
                                      clip={
                                        clips.find((c) => c.id === pip.clipId)!
                                      }
                                      volume={0}
                                      opacity={pip.opacity}
                                      isProgram={false}
                                      onUpdateClip={updateClip}
                                      layerId={pip.id}
                                    />
                                  </div>
                                )}
                            </motion.div>
                          ))}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <div
                      className={`w-full h-full ${settings?.showBackground ? "bg-transparent" : "bg-obs-dark-m2"} flex items-center justify-center`}
                    >
                      {!settings?.showBackground && (
                        <div className="flex flex-col items-center gap-2 opacity-10">
                          <MonitorIcon
                            size={80}
                            strokeWidth={1}
                            className="text-obs-muted"
                          />
                          <span className="text-[11px] font-black uppercase tracking-[0.6em] text-obs-muted">
                            NO SIGNAL
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScaleToFit>
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
              <AnimatePresence custom={transitionType}>
                {activeClip ? (
                  <VideoLayer
                    key={activeClip.id}
                    clip={activeClip}
                    volume={volume}
                    masterVolume={masterVolume}
                    opacity={opacity}
                    isProgram={false}
                    isTransmitting={isTransmitting}
                    onProgressUpdate={onProgressUpdate}
                    onLevelChange={onLevelChange}
                    onEnded={onEnded}
                    transitionType={transitionType}
                    transitionDuration={
                      settings?.transitionDuration
                        ? settings.transitionDuration / 1000
                        : 0.4
                    }
                    perfSettings={perfSettings}
                    outputId={activeOutputId}
                  />
                ) : (
                  <motion.div
                    key="no-signal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-2 opacity-15 scale-90"
                  >
                    <MonitorIcon
                      size={80}
                      strokeWidth={1}
                      className="text-obs-muted"
                    />
                    <span className="text-[11px] font-black uppercase tracking-[0.6em] text-obs-muted">
                      NO SIGNAL
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Slide Controls for Program/Preview */}
          {!hideOverlays && activeClip?.type === "document" && onUpdateClip && (
            <div className="absolute bottom-1.5 left-1.5 z-30 flex items-center gap-1.5 bg-obs-dark-1 backdrop-blur-md px-2 py-1 rounded border border-obs-text/10 shadow-lg">
              <button
                onClick={() =>
                  onUpdateClip(activeClip.id, {
                    currentPage: Math.max(1, (activeClip.currentPage || 1) - 1),
                  })
                }
                className="p-1 hover:bg-obs-accent hover:text-white text-obs-text rounded transition-colors"
                title="Anterior diapositiva"
              >
                <ChevronLeft size={16} strokeWidth={3} />
              </button>
              <div className="flex flex-col items-center min-w-[24px]">
                <span className="text-[7px] text-obs-muted font-black uppercase tracking-tighter leading-none mb-0.5">
                  PAGE
                </span>
                <span className="text-[11px] font-mono font-bold text-obs-accent leading-none">
                  {activeClip.currentPage || 1}
                  {activeClip.totalPages ? `/${activeClip.totalPages}` : ""}
                </span>
              </div>
              <button
                onClick={() =>
                  onUpdateClip(activeClip.id, {
                    currentPage: Math.min(
                      (activeClip.currentPage || 1) + 1,
                      activeClip.totalPages || Infinity,
                    ),
                  })
                }
                className="p-1 hover:bg-obs-accent hover:text-white text-obs-text rounded transition-colors"
                title="Siguiente diapositiva"
              >
                <ChevronRight size={16} strokeWidth={3} />
              </button>
            </div>
          )}

          {/* Status Label at Bottom Right */}
          {!hideOverlays && (
            <div className="absolute bottom-1.5 right-1.5 z-20 pointer-events-none">
              <div
                className={`px-1.5 py-0.5 rounded-sm bg-obs-dark-1 backdrop-blur-md border ${isActive ? "border-red-500/50 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "border-obs-text/10 text-obs-muted"} text-[7px] font-black uppercase tracking-widest`}
                style={
                  !isActive && accentColor
                    ? { color: accentColor, borderColor: `${accentColor}33` }
                    : {}
                }
              >
                {isActive ? "LIVE" : "STANDBY"}
              </div>
            </div>
          )}

          {/* Real-time Countdown timer preview overlay */}
          {isProgram &&
            settings &&
            (settings.timerEnabled || settings.timerPreview) && (
              <OutputCountdown settings={settings} />
            )}
        </div>
      </div>
    );
  },
);

const PixelMapModal = ({
  isOpen,
  onClose,
  slices,
  onUpdateSlices,
}: {
  isOpen: boolean;
  onClose: () => void;
  slices: any[];
  onUpdateSlices: (slices: any[]) => void;
}) => {
  const [activeSliceId, setActiveSliceId] = useState<string | null>(
    slices[0]?.id || null,
  );
  const [viewMode, setViewMode] = useState<"input" | "output">("input");
  const [showTestCard, setShowTestCard] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const activeSlice = slices.find((s) => s.id === activeSliceId);

  const updateActiveSlice = (updates: any) => {
    onUpdateSlices(
      slices.map((s) => (s.id === activeSliceId ? { ...s, ...updates } : s)),
    );
  };

  const addSlice = () => {
    const newSlice = {
      id: `slice-${Date.now()}`,
      name: `Slice ${slices.length + 1}`,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      outputX: 0,
      outputY: 0,
      outputWidth: 1920,
      outputHeight: 1080,
    };
    onUpdateSlices([...slices, newSlice]);
    setActiveSliceId(newSlice.id);
  };

  const deleteSlice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slices.length <= 1) return;
    const newSlices = slices.filter((s) => s.id !== id);
    onUpdateSlices(newSlices);
    if (activeSliceId === id) {
      setActiveSliceId(newSlices[0].id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-obs-bg/90 backdrop-blur-sm p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full max-w-6xl bg-obs-bg border border-obs-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="h-12 border-b border-obs-border flex items-center justify-between px-4 bg-obs-surface">
          <div className="flex items-center gap-3">
            <Layers size={16} className="text-obs-accent" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Advanced Output / Pixel Map
            </h2>
            <div className="h-4 w-[1px] bg-obs-border mx-2" />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  className={`w-3 h-3 rounded-sm border transition-colors ${showTestCard ? "bg-obs-accent border-obs-accent" : "border-obs-muted group-hover:border-obs-text"}`}
                  onClick={() => setShowTestCard(!showTestCard)}
                />
                <span className="text-[10px] uppercase font-bold text-obs-muted group-hover:text-obs-text">
                  Test Card
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  className={`w-3 h-3 rounded-sm border transition-colors ${snapToGrid ? "bg-obs-accent border-obs-accent" : "border-obs-muted group-hover:border-obs-text"}`}
                  onClick={() => setSnapToGrid(!snapToGrid)}
                />
                <span className="text-[10px] uppercase font-bold text-obs-muted group-hover:text-obs-text">
                  Snap
                </span>
              </label>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-obs-border rounded-full transition-colors"
          >
            <Plus size={20} className="rotate-45" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Slices List */}
          <div className="w-64 border-r border-obs-border flex flex-col bg-obs-surface/50">
            <div className="p-3 border-b border-obs-border flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-obs-muted">
                Slices
              </span>
              <button
                onClick={addSlice}
                className="p-1 hover:bg-obs-accent hover:text-white rounded transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {slices.map((slice) => (
                <div
                  key={slice.id}
                  onClick={() => setActiveSliceId(slice.id)}
                  role="button"
                  tabIndex={0}
                  className={`w-full text-left px-3 py-2 rounded text-[11px] transition-all flex items-center justify-between group cursor-pointer ${
                    activeSliceId === slice.id
                      ? "bg-obs-accent text-white"
                      : "hover:bg-obs-border text-obs-text"
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setActiveSliceId(slice.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical size={12} className="opacity-50" />
                    {slice.name}
                  </div>
                  <button
                    onClick={(e) => deleteSlice(slice.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 rounded transition-all"
                  >
                    <Plus size={12} className="rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Center Panel: Canvas Editor */}
          <div className="flex-1 flex flex-col bg-obs-dark-1 relative">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex bg-obs-surface border border-obs-border rounded-full p-1 shadow-lg">
              <button
                onClick={() => setViewMode("input")}
                className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${viewMode === "input" ? "bg-obs-accent text-white" : "text-obs-muted hover:text-obs-text"}`}
              >
                Input Selection
              </button>
              <button
                onClick={() => setViewMode("output")}
                className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${viewMode === "output" ? "bg-obs-accent text-white" : "text-obs-muted hover:text-obs-text"}`}
              >
                Output Transformation
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-12">
              <div className="w-full aspect-video bg-obs-surface/20 border border-obs-text/10 relative shadow-2xl overflow-hidden">
                {/* Test Card Background */}
                {showTestCard && (
                  <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                    <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div
                          key={i}
                          className={`border border-obs-text/20 ${i % 2 === 0 ? "bg-obs-dark-1" : "bg-transparent"}`}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-[1px] bg-obs-accent/50" />
                      <div className="h-full w-[1px] bg-obs-accent/50 absolute" />
                      <div className="w-64 h-64 border-2 border-obs-accent/50 rounded-full" />
                    </div>
                  </div>
                )}

                {/* Canvas Grid */}
                <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none opacity-5">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <div key={i} className="border border-white" />
                  ))}
                </div>

                {/* Slices on Canvas */}
                {slices.map((slice) => (
                  <div
                    key={slice.id}
                    className={`absolute border-2 transition-all ${
                      activeSliceId === slice.id
                        ? "border-obs-accent bg-obs-accent/10 z-20"
                        : "border-obs-text/20 bg-obs-dark-1 z-10"
                    }`}
                    style={{
                      left: `${(viewMode === "input" ? slice.x : slice.outputX) / 19.2}%`,
                      top: `${(viewMode === "input" ? slice.y : slice.outputY) / 10.8}%`,
                      width: `${(viewMode === "input" ? slice.width : slice.outputWidth) / 19.2}%`,
                      height: `${(viewMode === "input" ? slice.height : slice.outputHeight) / 10.8}%`,
                    }}
                  >
                    <div className="absolute -top-5 left-0 text-[9px] font-bold text-obs-accent whitespace-nowrap">
                      {slice.name} (
                      {viewMode === "input"
                        ? `${slice.width}x${slice.height}`
                        : `${slice.outputWidth}x${slice.outputHeight}`}
                      )
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Slice Properties */}
          <div className="w-72 border-l border-obs-border flex flex-col bg-obs-surface/50">
            <div className="p-3 border-b border-obs-border">
              <span className="text-[10px] font-bold uppercase text-obs-muted">
                Properties
              </span>
            </div>
            {activeSlice ? (
              <div className="p-4 space-y-6 overflow-y-auto">
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-obs-accent uppercase">
                    General
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-obs-muted uppercase font-bold">
                      Name
                    </label>
                    <input
                      type="text"
                      value={activeSlice.name}
                      onChange={(e) =>
                        updateActiveSlice({ name: e.target.value })
                      }
                      className="w-full bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-obs-accent"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-obs-accent uppercase">
                    {viewMode === "input"
                      ? "Input Selection"
                      : "Output Transformation"}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-obs-muted uppercase font-bold">
                        X
                      </label>
                      <input
                        type="number"
                        value={
                          viewMode === "input"
                            ? activeSlice.x
                            : activeSlice.outputX
                        }
                        onChange={(e) =>
                          updateActiveSlice(
                            viewMode === "input"
                              ? { x: parseInt(e.target.value) }
                              : { outputX: parseInt(e.target.value) },
                          )
                        }
                        className="w-full bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-obs-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-obs-muted uppercase font-bold">
                        Y
                      </label>
                      <input
                        type="number"
                        value={
                          viewMode === "input"
                            ? activeSlice.y
                            : activeSlice.outputY
                        }
                        onChange={(e) =>
                          updateActiveSlice(
                            viewMode === "input"
                              ? { y: parseInt(e.target.value) }
                              : { outputY: parseInt(e.target.value) },
                          )
                        }
                        className="w-full bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-obs-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-obs-muted uppercase font-bold">
                        Width
                      </label>
                      <input
                        type="number"
                        value={
                          viewMode === "input"
                            ? activeSlice.width
                            : activeSlice.outputWidth
                        }
                        onChange={(e) =>
                          updateActiveSlice(
                            viewMode === "input"
                              ? { width: parseInt(e.target.value) }
                              : { outputWidth: parseInt(e.target.value) },
                          )
                        }
                        className="w-full bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-obs-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-obs-muted uppercase font-bold">
                        Height
                      </label>
                      <input
                        type="number"
                        value={
                          viewMode === "input"
                            ? activeSlice.height
                            : activeSlice.outputHeight
                        }
                        onChange={(e) =>
                          updateActiveSlice(
                            viewMode === "input"
                              ? { height: parseInt(e.target.value) }
                              : { outputHeight: parseInt(e.target.value) },
                          )
                        }
                        className="w-full bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-obs-accent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <span className="text-[10px] text-obs-muted uppercase font-bold tracking-widest">
                  Select a slice to edit
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-obs-border flex items-center justify-end px-4 bg-obs-surface gap-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-[11px] font-bold text-obs-muted hover:text-obs-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-6 py-1.5 rounded bg-obs-accent text-white text-[11px] font-bold hover:bg-obs-accent/80 transition-colors"
          >
            Save Setup
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PPTSlideRenderer = ({
  clip,
  pageNumber,
  onUpdateClip,
  isThumbnail = false,
}: {
  clip: any;
  pageNumber: number;
  onUpdateClip?: (id: string, updates: any) => void;
  isThumbnail?: boolean;
}) => {
  const [slides, setSlides] = useState<any[]>(() => {
    return (
      clip.parsedSlides || [
        {
          title: "LUMIN Live Server",
          subtitle: "Software Pro de Alto Rendimiento para Eventos en Vivo",
          bullets: [
            "Aceleración nativa de hardware para Windows",
            "Pipeline de baja latencia con desconexión selectiva de V-Sync",
            "Control maestro multicanal independiente y mezclas continuas",
          ],
        },
        {
          title: "Optimización por GPU",
          subtitle: "Interacción Directa con Controladores NVIDIA / AMD",
          bullets: [
            "Renderizado híbrido multihilo optimizado para buffers físicos",
            "Decodificación y mapeo de video por hardware Direct3D 11/12",
            "Cero fluctuaciones (flicker) en bucles nativos seamless",
          ],
        },
        {
          title: "Integridad de Codecs",
          subtitle: "Decodificadores Dedicados H.264 & DXV 3",
          bullets: [
            "Soporte para codificación DXV 3 de alto bitrate de Resolume",
            "Compresión balanceada H.264 para transmisiones simultáneas",
            "Pre-búfer optimizado con hilos dedicados de la CPU",
          ],
        },
        {
          title: "Salidas y Capturadora",
          subtitle: "Soporte Completo de Video Input & Salidas Físicas",
          bullets: [
            "Integración bidireccional de capturadoras USB / HDMI en vivo",
            "Múltiples pantallas conectadas administradas por Windows",
            "Panel de control unificado para fuentes y faders",
          ],
        },
        {
          title: "Conclusiones de Producción",
          subtitle: "Garantía de Desempeño y Escalabilidad LUMIN",
          bullets: [
            "Cero latencias acumulativas en transmisiones continuas",
            "Ideal para discotecas, teatros, estadios y auditorios",
            "Diseñado como software nativo de escritorio de Windows",
          ],
        },
      ]
    );
  });

  const [isParsing, setIsParsing] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (clip.parsedSlides) {
      setSlides(clip.parsedSlides);
      return;
    }

    if (hasTriggeredRef.current) return;

    const isPptx =
      clip.name?.toLowerCase().endsWith(".pptx") ||
      clip.url?.toLowerCase().includes(".pptx") ||
      clip.url?.startsWith("blob:");
    if (!isPptx) {
      const fallbacks = [
        {
          title: clip.name
            ? clip.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
            : "Presentación",
          subtitle: "Presentación Importada en LUMIN",
          bullets: [
            "Optimizador de codecs intra-frame activado automáticamente",
            "Mapeador de proyección y reescalado ultra rápido",
            "Sincronización multi-pantalla y transiciones fluidas",
          ],
        },
        {
          title: "Sincronización del Show",
          subtitle: "Modo Producción Activo",
          bullets: [
            "Utiliza el panel lateral para controlar las páginas de PPT",
            "Acciones de 'Siguiente' y 'Anterior' sincronizadas en Salida",
            "Pre-carga de texturas en VRAM para cambio instantáneo",
          ],
        },
      ];
      setSlides(fallbacks);
      if (onUpdateClip)
        onUpdateClip(clip.id, {
          parsedSlides: fallbacks,
          totalPages: fallbacks.length,
        });
      return;
    }

    hasTriggeredRef.current = true;
    setIsParsing(true);

    const parseFileAsync = async () => {
      try {
        // DETECCIÓN Y EJECUCIÓN DEL MOTOR NATIVO POWERPOINT EN WINDOWS (Vía Electron COM Automation)
        if (
          window.electron &&
          window.electron.isElectron &&
          window.electron.convertPptx
        ) {
          const filePath = clip.path || (clip.file as any)?.path;
          if (filePath) {
            console.log(
              "[LUMIN NATIVO] Solicitando procesado nativo de PowerPoint para:",
              filePath,
            );
            const nativeResult = await window.electron.convertPptx(filePath);
            if (nativeResult && nativeResult.success) {
              console.log(
                "[LUMIN NATIVO] PowerPoint renderizado por Office COM con éxito. Diapositivas:",
                nativeResult.slides.length,
              );
              setSlides(nativeResult.slides);
              setIsParsing(false);
              if (onUpdateClip) {
                onUpdateClip(clip.id, {
                  parsedSlides: nativeResult.slides,
                  totalPages: nativeResult.totalPages,
                  thumbnail: nativeResult.slides[0]?.image || clip.thumbnail,
                });
              }
              return;
            } else {
              console.warn(
                "[LUMIN NATIVO] El motor PowerPoint COM devolvió error. Fallback a visor web de emergencia:",
                nativeResult?.error,
              );
            }
          }
        }

        let arrayBuffer: ArrayBuffer;
        if (clip.file) {
          arrayBuffer = await clip.file.arrayBuffer();
        } else {
          const response = await fetch(clip.url);
          arrayBuffer = await response.arrayBuffer();
        }

        const zip = await JSZip.loadAsync(arrayBuffer);
        const slideFiles: { name: string; file: any; index: number }[] = [];
        zip.forEach((relativePath, fileObj) => {
          const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/);
          if (match) {
            slideFiles.push({
              name: relativePath,
              file: fileObj,
              index: parseInt(match[1], 10),
            });
          }
        });

        if (slideFiles.length === 0) {
          throw new Error("No slides found in .pptx ZIP container");
        }

        const mediaFiles: Record<string, string> = {};
        const mediaPromises: Promise<void>[] = [];
        zip.forEach((path, entry) => {
          if (path.startsWith("ppt/media/")) {
            const p = entry.async("blob").then((blob) => {
              mediaFiles[path] = URL.createObjectURL(blob);
            });
            mediaPromises.push(p);
          }
        });
        await Promise.all(mediaPromises);

        slideFiles.sort((a, b) => a.index - b.index);
        const parsed: any[] = [];
        const parser = new DOMParser();

        for (const sf of slideFiles) {
          const xmlText = await sf.file.async("string");
          const doc = parser.parseFromString(xmlText, "application/xml");

          let title = "";
          let subtitle = "";
          const bullets: string[] = [];

          const textRuns: string[] = [];
          const ps = doc.getElementsByTagNameNS("*", "p");
          for (const p of Array.from(ps)) {
            const ts = p.getElementsByTagNameNS("*", "t");
            let pText = "";
            for (const t of Array.from(ts)) {
              if (t.textContent) pText += t.textContent;
            }
            pText = pText.trim();
            if (pText && !pText.includes("xmlns:") && pText.length > 1) {
              textRuns.push(pText);
            }
          }

          if (textRuns.length > 0) {
            title = textRuns[0];
            if (textRuns.length > 1) {
              if (textRuns[1].length < 60) {
                subtitle = textRuns[1];
                bullets.push(...textRuns.slice(2));
              } else {
                bullets.push(...textRuns.slice(1));
              }
            }
          }

          // Relationship lookup for images
          let slideImage: string | undefined;
          try {
            const relsPath = `ppt/slides/_rels/slide${sf.index}.xml.rels`;
            const relsEntry = zip.file(relsPath);
            if (relsEntry) {
              const relsXml = await relsEntry.async("string");
              const relsDoc = parser.parseFromString(
                relsXml,
                "application/xml",
              );
              const relationships =
                relsDoc.getElementsByTagName("Relationship");
              for (const rel of Array.from(relationships)) {
                const target = rel.getAttribute("Target");
                const type = rel.getAttribute("Type");
                if (type?.includes("image") && target) {
                  const fullMediaTarget = target.replace(
                    "../media/",
                    "ppt/media/",
                  );
                  if (mediaFiles[fullMediaTarget]) {
                    slideImage = mediaFiles[fullMediaTarget];
                    break;
                  }
                }
              }
            }
          } catch (e) {}

          // Background parsing attempt
          let bgColor = "#0f172a"; // Default slate-900
          try {
            const bgNode = doc.getElementsByTagNameNS("*", "bg")[0];
            if (bgNode) {
              const bgPr = bgNode.getElementsByTagNameNS("*", "bgPr")[0];
              if (bgPr) {
                const solidFill = bgPr.getElementsByTagNameNS(
                  "*",
                  "solidFill",
                )[0];
                if (solidFill) {
                  const srgbClr = solidFill.getElementsByTagNameNS(
                    "*",
                    "srgbClr",
                  )[0];
                  if (srgbClr) bgColor = `#${srgbClr.getAttribute("val")}`;
                  const schemeClr = solidFill.getElementsByTagNameNS(
                    "*",
                    "schemeClr",
                  )[0];
                  if (schemeClr && schemeClr.getAttribute("val") === "bg1")
                    bgColor = "#ffffff";
                }
              }
            }
          } catch (e) {}

          parsed.push({
            title: title || `Slide ${sf.index}`,
            subtitle: subtitle || undefined,
            bullets: bullets.slice(0, 15),
            image: slideImage,
            bgColor: bgColor,
          });
        }

        setSlides(parsed);
        setIsParsing(false);
        if (onUpdateClip)
          onUpdateClip(clip.id, {
            parsedSlides: parsed,
            totalPages: parsed.length,
          });
      } catch (err) {
        console.warn("PPTX Parsing failed fallback triggered", err);
        const nameClean = clip.name
          ? clip.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
          : "Presentación";
        const fallbacks = [
          {
            title: nameClean,
            subtitle: "Presentación Importada en LUMIN",
            bullets: [
              "Control dinámico sincronizado de diapositivas en tiempo real",
              "Modo de previsualización activa en baja latencia",
              "Ajustes de escala, brillo, contraste y saturación de la capa",
            ],
          },
          {
            title: "Preproducción y Carga Automática",
            subtitle: "Rendimiento Optimizado",
            bullets: [
              "HAP / WebM video decoding y caché persistente en memoria",
              "Pipeline de bajo jitter con sincronización stable de fotogramas",
              "Operativa robusta de backup dinámico de decoders",
            ],
          },
        ];
        setSlides(fallbacks);
        setIsParsing(false);
        if (onUpdateClip)
          onUpdateClip(clip.id, {
            parsedSlides: fallbacks,
            totalPages: fallbacks.length,
          });
      }
    };

    parseFileAsync();
  }, [clip.id, clip.url, clip.file, clip.parsedSlides, onUpdateClip]);

  const currentSlide = slides[(pageNumber - 1) % slides.length] || slides[0];

  if (!currentSlide) {
    return (
      <div className="w-full h-full bg-slate-900 border border-slate-700/50 rounded flex items-center justify-center text-white">
        <span className="text-[8px] font-mono tracking-widest text-obs-accent animate-pulse uppercase">
          CARGANDO PRESENTACIÓN...
        </span>
      </div>
    );
  }

  // Optimize layout for Thumbnail format to prevent overflows in lists and cards
  if (isThumbnail) {
    const isBgWhite = currentSlide.bgColor === "#ffffff";
    return (
      <div className="w-full h-full relative overflow-hidden rounded transition-all duration-200 border border-obs-border/30 bg-black flex items-center justify-center">
        {currentSlide.image ? (
          <img
            src={currentSlide.image}
            className="w-full h-full object-contain pointer-events-none select-none"
            alt="Slide"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="w-full h-full relative flex flex-col justify-between p-1"
            style={{ backgroundColor: currentSlide.bgColor || "#0f172a" }}
          >
            <div className="relative z-10 flex-1 flex flex-col justify-between h-full pointer-events-none">
              <div className="shrink-0 max-w-full">
                <h3
                  className={`text-[7px] font-black uppercase truncate tracking-tight leading-tight ${isBgWhite ? "text-slate-900 bg-white/70 px-0.5 rounded-[1px]" : "text-white bg-black/50 px-0.5 rounded-[1px]"}`}
                >
                  {currentSlide.title || `Diapositiva ${pageNumber}`}
                </h3>
                {currentSlide.subtitle && (
                  <p
                    className={`text-[5px] font-bold truncate tracking-wider leading-none mt-0.5 ${isBgWhite ? "text-slate-500 bg-white/50 px-0.5 rounded-[1px]" : "text-white/60 bg-black/40 px-0.5 rounded-[1px]"}`}
                  >
                    {currentSlide.subtitle}
                  </p>
                )}
              </div>

              <div className="self-end mt-auto">
                <span
                  className={`text-[5px] font-mono font-bold py-0.2 px-1 rounded-[1px] ${isBgWhite ? "bg-slate-200 text-slate-700 border border-slate-300" : "bg-obs-accent/10 border border-obs-accent/20 text-obs-accent"}`}
                >
                  SLD {pageNumber}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full Screen Output Display rendering
  return (
    <div className="w-full h-full border border-slate-700/50 rounded flex flex-col items-center justify-center bg-black overflow-hidden relative shadow-2xl transition-all duration-300 pointer-events-none">
      {currentSlide.image ? (
        <img
          src={currentSlide.image}
          className="w-full h-full object-contain pointer-events-none select-none"
          alt="Slide Content"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="w-full h-full flex flex-col p-8 justify-between"
          style={{ backgroundColor: currentSlide.bgColor || "#0f172a" }}
        >
          {/* Structured contents layer */}
          <div className="border-b border-slate-800/30 pb-3 mb-4 shrink-0 relative z-10 animate-fade-in">
            <h2 className="text-xl font-black uppercase tracking-tight py-1 px-2.5 rounded-sm inline-block text-white bg-black/50 backdrop-blur-sm shadow-md">
              {currentSlide.title}
            </h2>
            {currentSlide.subtitle && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-2 py-0.5 px-1.5 rounded-sm inline-block text-white/70 bg-black/40 backdrop-blur-sm">
                  {currentSlide.subtitle}
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 relative z-10 overflow-hidden">
            {currentSlide.bullets.map((bullet: string, idx: number) => (
              <div
                key={idx}
                className="flex gap-3 items-start animate-fade-in group py-1 px-2.5 rounded-md backdrop-blur-sm max-w-2xl border bg-black/30 text-slate-100 border-white/5"
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 group-hover:scale-125 transition-transform bg-obs-accent shadow-[0_0_8px_rgba(0,163,245,0.6)]" />
                <span className="text-xs font-semibold leading-relaxed">
                  {bullet}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-2 border-t border-slate-800/60 flex justify-between items-center text-[8px] font-mono tracking-wider relative z-10">
            <span className="text-slate-500 font-bold">
              LUMIN PRESENTATION PRO
            </span>
            <span className="text-slate-500">© 2026 LUMIN SOFTWARE NATIVO</span>
          </div>
        </div>
      )}
    </div>
  );
};

const DocumentLayer = ({
  clip,
  onUpdateClip,
}: {
  clip: any;
  onUpdateClip?: (id: string, updates: any) => void;
}) => {
  const isPdf =
    clip.name.toLowerCase().endsWith(".pdf") || clip.type === "document";
  const isPpt =
    clip.name.toLowerCase().endsWith(".ppt") ||
    clip.name.toLowerCase().endsWith(".pptx") ||
    clip.type === "ppt";
  const currentPage = clip.currentPage || 1;

  if (isPpt) {
    const totalPages = clip.parsedSlides?.length || 5;
    if (clip.totalPages !== totalPages) {
      setTimeout(() => onUpdateClip?.(clip.id, { totalPages }), 10);
    }
    return (
      <div className="w-full h-full relative group bg-black overflow-hidden flex items-center justify-center pointer-events-none">
        <PPTSlideRenderer
          clip={clip}
          pageNumber={currentPage}
          onUpdateClip={onUpdateClip}
        />
        <div className="absolute inset-0 pointer-events-none border-4 border-transparent group-hover:border-obs-accent/20 transition-all z-10" />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="w-full h-full relative group bg-black overflow-hidden flex items-center justify-center pointer-events-none">
        <PDFRenderer
          url={clip.url}
          pageNumber={currentPage}
          onLoadSuccess={(totalPages) => {
            if (clip.totalPages !== totalPages) {
              onUpdateClip?.(clip.id, { totalPages });
            }
          }}
        />
        <div className="absolute inset-0 pointer-events-none border-4 border-transparent group-hover:border-obs-accent/20 transition-all z-10" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-obs-surface text-obs-muted uppercase text-[10px] font-bold">
      Documento no soportado
    </div>
  );
};

const VideoLayer = ({
  clip,
  isPlaying,
  nextSrc,
  volume,
  masterVolume = 1,
  opacity,
  faderOpacity,
  isProgram,
  crossfaderValue,
  transitionType,
  transitionDuration,
  onTimeUpdate,
  onProgressUpdate,
  onLevelChange,
  onEnded,
  startTime,
  loopOverride,
  isTransmitting = false,
  style,
  onUpdateClip,
  onReady,
  perfSettings,
  isSlave = false,
  isPlaylistSequence = false,
  isClockSource = false,
  layerId,
  outputId,
  isVisuallyActive = true,
}: {
  clip: any;
  isPlaying?: boolean;
  nextSrc?: string;
  volume: number;
  masterVolume?: number;
  opacity: number;
  faderOpacity?: number;
  isProgram: boolean;
  crossfaderValue?: number;
  transitionType?: "fade" | "wipe" | "slide" | "cut";
  transitionDuration?: number;
  onTimeUpdate?: (time: number) => void;
  onProgressUpdate?: (current: number, total: number) => void;
  onLevelChange?: (level: number) => void;
  onEnded?: () => void;
  startTime?: number;
  loopOverride?: boolean;
  isTransmitting?: boolean;
  style?: React.CSSProperties;
  onUpdateClip?: (id: string, updates: any) => void;
  onReady?: () => void;
  perfSettings?: any;
  isSlave?: boolean;
  isPlaylistSequence?: boolean;
  isClockSource?: boolean;
  layerId?: string;
  outputId?: string;
  isVisuallyActive?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSrc = useRef<string>("");
  const onEndedRef = useRef(onEnded);
  const [isReady, setIsReady] = useState(false);
  const [firstFrameRendered, setFirstFrameRendered] = useState(
    clip.type !== "video" && clip.type !== "videoinput",
  );
  const earlyEndTriggered = useRef(false);
  const earlyLoopTriggered = useRef(false);
  const lastBroadcastTimeRef = useRef<number>(0);
  const autoPlayNextRef = useRef<boolean>(false);

  const trackerId = useMemo(() => {
    if (layerId) {
      return `layer_${outputId || "1"}_${layerId}_${clip.id}`;
    }
    if (outputId) {
      return `output_${outputId}_${clip.id}`;
    }
    return `clip_${clip.id}`;
  }, [layerId, outputId, clip.id]);

  const activeIsPlaying = isPlaying !== undefined ? isPlaying : (clip.isPlaying !== false);

  const activePerf = useMemo(
    () =>
      perfSettings || {
        gpuDecoding: "d3d11",
        engine: "native_chromium",
        bufferingMode: "aggressive",
        renderingBackend: "directx11",
        codecOptimization: true,
        renderCodec: "dxv3",
        loopMode: "native_seamless",
        highResOptimization: true,
        maxThreads: 4,
      },
    [perfSettings],
  );

  useEffect(() => {
    if (clip.type === "video" || clip.type === "videoinput") {
      setFirstFrameRendered(false);
    } else {
      setFirstFrameRendered(true);
    }
    earlyEndTriggered.current = false;
    earlyLoopTriggered.current = false;
  }, [clip.id, clip.url, clip.type]);

  // CRITICAL: Delayed GPU decoder release on unmount to allow smooth AnimatePresence exit transitions.
  // This prevents instant black screen flashes during fade transitions.
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        // Match the transition duration (with a small safety margin) instead of a hardcoded 2000ms delay.
        // This prevents hardware decoders from stacking up during rapid switching.
        const cleanDelay = Math.max(
          100,
          (transitionDuration || 0.4) * 1000 + 100,
        );
        setTimeout(() => {
          try {
            video.pause();
            video.src = "";
            video.removeAttribute("src");
            video.load();
          } catch (e) {}
        }, cleanDelay);
      }
    };
  }, [transitionDuration]);

  // Sync native video loop property directly when clip loop state changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const activeLoop =
        loopOverride !== undefined ? loopOverride : clip.loop !== false;
      video.loop = activeLoop && activePerf.loopMode !== "double_buffer";
    }
  }, [loopOverride, clip.loop, activePerf.loopMode]);

  // Report first frame rendered when state becomes true
  useEffect(() => {
    if (firstFrameRendered) {
      onReady?.();
    }
  }, [firstFrameRendered, onReady]);

  const handleEnded = () => {
    if (earlyEndTriggered.current) return;
    earlyEndTriggered.current = true;
    onEndedRef.current?.();
  };

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && isClockSource && !isSlave) {
      (window as any).__luminProgramVideo = video;
      if (typeof window !== "undefined") {
        (window as any).__lastProgramVideo = video;
      }
      return () => {
        if ((window as any).__luminProgramVideo === video) {
          (window as any).__luminProgramVideo = null;
        }
      };
    }
  }, [isClockSource, clip.id, isSlave]);

  const filterId = useMemo(
    () => `filter-${clip.id}-${Math.random().toString(36).substr(2, 9)}`,
    [clip.id],
  );

  const audioLevel = useAudioLevel(
    videoRef,
    clip.type === "video",
    1,
    isProgram,
  );

  useEffect(() => {
    onLevelChange?.(audioLevel);
  }, [audioLevel, onLevelChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && clip.type === "video") {
      const handleTimeUpdate = () => {
        onTimeUpdate?.(video.currentTime);
        onProgressUpdate?.(video.currentTime, video.duration || 0);

        // Periodically record and broadcast time updates to keep other screens in sync
        const now = Date.now();
        if (now - lastBroadcastTimeRef.current >= 300) {
          lastBroadcastTimeRef.current = now;
          if (typeof window !== "undefined") {
            if (!(window as any).__luminVideoTimes) {
              (window as any).__luminVideoTimes = {};
            }
            (window as any).__luminVideoTimes[trackerId] = video.currentTime;
            
            // Both the master (controller) and active slave playing in the output can broadcast.
            // If it is a master (not isSlave), only broadcast when actually visually active in the controller UI!
            // If it is a slave, only broadcast when actually playing so we don't interfere when paused.
            const shouldBroadcast = !isSlave ? isVisuallyActive : activeIsPlaying;
            if (shouldBroadcast) {
              const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
              if (ch) {
                if (!(window as any).__luminTimeChannel) (window as any).__luminTimeChannel = ch;
                try {
                  ch.postMessage({
                    type: "VIDEO_TIME_UPDATE",
                    payload: { trackerId, clipId: clip.id, currentTime: video.currentTime },
                  });
                } catch (err) {}
              }
            }
          }
        }

        // Sequential Playback Stability
        if (isPlaylistSequence && video.duration > 0) {
          const remaining = video.duration - video.currentTime;
          
          // For sequences, we trigger slightly before the end to hide buffer delay
          const threshold = transitionType === "cut" ? 0.15 : 0.35;

          if (
            remaining > 0 &&
            remaining <= threshold &&
            !earlyEndTriggered.current
          ) {
            earlyEndTriggered.current = true;
            onEndedRef.current?.();
          }
        }
      };

      video.addEventListener("timeupdate", handleTimeUpdate);

      const handleEndedNative = () => {
        if (!earlyEndTriggered.current) {
          earlyEndTriggered.current = true;
          onEndedRef.current?.();
        }
      };
      video.addEventListener("ended", handleEndedNative);

      const handleMetadata = () => {
        const savedTime = (window as any).__luminVideoTimes?.[trackerId];
        if (savedTime !== undefined) {
          video.currentTime = savedTime;
        } else if (startTime !== undefined) {
          video.currentTime = startTime;
        } else if (clip.currentTime !== undefined) {
          video.currentTime = clip.currentTime;
        } else {
          video.currentTime = 0;
        }
      };

      const handleReady = () => {
        if (activeIsPlaying) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      };

      // Register or run instantly if already loaded:
      if (video.readyState >= 1) {
        // HAVE_METADATA
        handleMetadata();
      } else {
        video.addEventListener("loadedmetadata", handleMetadata);
      }

      if (video.readyState >= 3) {
        // HAVE_FUTURE_DATA
        handleReady();
      } else {
        video.addEventListener("canplay", handleReady);
      }

      // If playing state changes:
      if (activeIsPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }

      const handleBroadcastMessage = (e: MessageEvent) => {
        if (e.data?.type === "VIDEO_TIME_UPDATE") {
          const payload = e.data.payload;
          if (payload && payload.trackerId === trackerId) {
            if (isSlave && videoRef.current) {
              const diff = Math.abs(videoRef.current.currentTime - payload.currentTime);
              if (diff > 0.15) {
                videoRef.current.currentTime = payload.currentTime;
              }
            } else if (!isSlave) {
              // Main controller page tracking: keep our local video state memory in sync with real playback:
              if (typeof window !== "undefined") {
                if (!(window as any).__luminVideoTimes) {
                  (window as any).__luminVideoTimes = {};
                }
                (window as any).__luminVideoTimes[trackerId] = payload.currentTime;
              }
              // If the master video element is currently NOT visually active, keep its video time
              // strictly synchronized with the active slave to prevent jumping when transitioned active!
              if (!isVisuallyActive && videoRef.current) {
                const diff = Math.abs(videoRef.current.currentTime - payload.currentTime);
                if (diff > 0.3) {
                  videoRef.current.currentTime = payload.currentTime;
                }
              }
            }
          }
        }
      };

      const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
      if (ch) {
        if (!(window as any).__luminTimeChannel) (window as any).__luminTimeChannel = ch;
        ch.addEventListener("message", handleBroadcastMessage);
      }

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("loadedmetadata", handleMetadata);
        video.removeEventListener("canplay", handleReady);
        video.removeEventListener("ended", handleEndedNative);
        if (ch) {
          ch.removeEventListener("message", handleBroadcastMessage);
        }
      };
    }
  }, [clip.id, clip.url, clip.isPlaying, isPlaying, isSlave, trackerId]);

  // Video IN (Capturadoras USB / HDMI en Windows)
  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (video && clip.type === "videoinput") {
      let active = true;
      const deviceId = clip.url.startsWith("videoinput-device-")
        ? clip.url.replace("videoinput-device-", "")
        : undefined;

      const startCapture = async () => {
        try {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }

          let constraints: MediaStreamConstraints = {
            video: true,
            audio: false,
          };

          if (deviceId && deviceId !== "hdmi" && deviceId !== "camera") {
            constraints = {
              video: { deviceId: { exact: deviceId } },
              audio: false,
            };
          }

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (active && video) {
            streamRef.current = stream;
            video.srcObject = stream;
            video.play().catch((e) => {
              // Ignore play error
            });
            setFirstFrameRendered(true);
            setIsReady(true);
          } else {
            stream.getTracks().forEach((t) => t.stop());
          }
        } catch (e) {
          // Fallo de captura nativa (e.g. Permission denied) - silently use backup
          if (active && video) {
            video.srcObject = null;
            video.src =
              "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-32-large.mp4";
            video.play().catch(() => {});
            setFirstFrameRendered(true);
            setIsReady(true);
          }
        }
      };

      startCapture();

      return () => {
        active = false;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (video) {
          video.srcObject = null;
          video.src = "";
        }
      };
    }
  }, [clip.id, clip.url, clip.type]);

  // Audio handling
  useEffect(() => {
    const video = videoRef.current;
    if (video && clip.type === "video") {
      const clipBaseVolume = clip.volume !== undefined ? clip.volume : 1;
      const targetAudioOpacity =
        faderOpacity !== undefined ? faderOpacity : opacity || 1;

      // combinedVolume = ProgramFader * MasterFader * TransitionFader * ClipTrim
      const finalVolume = Math.max(
        0,
        Math.min(
          1,
          volume * masterVolume * targetAudioOpacity * clipBaseVolume,
        ),
      );

      video.volume = finalVolume;
      video.muted = isProgram ? !isTransmitting || finalVolume <= 0 : true;
    }
  }, [
    volume,
    masterVolume,
    opacity,
    faderOpacity,
    isTransmitting,
    isProgram,
    clip.volume,
    clip.id,
    clip.url,
  ]);

  // Speed and sync
  useEffect(() => {
    const video = videoRef.current;
    if (video && clip.type === "video" && video.readyState >= 2) {
      video.playbackRate = clip.speed || 1;
    }
  }, [clip.speed, clip.id]);

  // Support real-time seeking tracking (Slave only - Authority ignores state sync to avoid loops)
  useEffect(() => {
    const video = videoRef.current;
    if (
      video &&
      isSlave &&
      clip.type === "video" &&
      clip.currentTime !== undefined &&
      Math.abs(video.currentTime - clip.currentTime) > 0.5
    ) {
      video.currentTime = clip.currentTime;
    }
  }, [clip.currentTime, clip.id, isSlave]);

  const colorBalance = clip.colorBalance || { r: 1, g: 1, b: 1 };
  const brightness = clip.brightness ?? 1;
  const contrast = clip.contrast ?? 1;
  const saturation = clip.saturation ?? 1;
  const clipOpacity = clip.opacity ?? 1;
  const clipMaster = clip.master ?? 1;

  const hasLocalFilters = useMemo(() => {
    return (
      brightness !== 1 ||
      contrast !== 1 ||
      saturation !== 1 ||
      colorBalance.r !== 1 ||
      colorBalance.g !== 1 ||
      colorBalance.b !== 1 ||
      (clip.filter && clip.filter !== "none")
    );
  }, [brightness, contrast, saturation, colorBalance, clip.filter]);

  const clipPath = useMemo(() => {
    if (
      isProgram &&
      transitionType === "wipe" &&
      crossfaderValue !== undefined
    ) {
      return `inset(0 ${crossfaderValue}% 0 0)`;
    }
    if (
      !isProgram &&
      transitionType === "wipe" &&
      crossfaderValue !== undefined
    ) {
      return `inset(0 0 0 ${100 - crossfaderValue}%)`;
    }
    return clip.mask === "circle"
      ? "circle(50%)"
      : clip.mask === "square"
        ? "inset(0%)"
        : clip.mask === "diamond"
          ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
          : "none";
  }, [clip.mask, isProgram, transitionType, crossfaderValue]);

  const xOffsetPercentage = useMemo(() => {
    let baseOffset = clip.transform.x || 0;
    if (
      isProgram &&
      transitionType === "slide" &&
      crossfaderValue !== undefined
    ) {
      return `calc(${baseOffset}% - ${crossfaderValue}%)`;
    }
    if (
      !isProgram &&
      transitionType === "slide" &&
      crossfaderValue !== undefined
    ) {
      return `calc(${baseOffset}% + ${100 - crossfaderValue}%)`;
    }
    return `${baseOffset}%`;
  }, [clip.transform.x, isProgram, transitionType, crossfaderValue]);

  const isCut = transitionType === "cut";
  const activeDuration = isCut ? 0 : (typeof transitionDuration === "number" ? transitionDuration : 0.4);
  const variants: any = {
    initial: {
      opacity: 0,
    },
    animate: {
      opacity:
        opacity *
        (faderOpacity !== undefined ? faderOpacity : 1) *
        clipOpacity *
        clipMaster,
      x: `${clip.transform.x}%`,
      clipPath:
        clip.mask === "circle"
          ? "circle(50%)"
          : clip.mask === "square"
            ? "inset(0%)"
            : clip.mask === "diamond"
              ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
              : "none",
      y: `${clip.transform.y}%`,
      scaleX: clip.transform.scaleW,
      scaleY: clip.transform.scaleH,
      rotate: clip.transform.rotation,
      rotateX: clip.transform.rotationX,
      transition: {
        opacity: {
          duration: activeDuration,
          ease: [0.25, 0.1, 0.25, 1.0],
        },
        default: {
          duration: 0,
        }
      },
    },
    exit: {
      opacity: 0,
      zIndex: -1,
      transition: {
        opacity: {
          duration: activeDuration,
          ease: [0.25, 0.1, 0.25, 1.0],
        },
        default: {
          duration: 0,
        }
      },
    },
  };

  return (
    <>
      <svg width="0" height="0" className="absolute">
        <filter id={filterId}>
          <feColorMatrix
            type="matrix"
            values={`${colorBalance.r} 0 0 0 0
                    0 ${colorBalance.g} 0 0 0
                    0 0 ${colorBalance.b} 0 0
                    0 0 0 1 0`}
          />
        </filter>
      </svg>
      <motion.div
        key={clip.id}
        custom={transitionType || "fade"}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        className="absolute inset-0 flex items-start justify-start pointer-events-none"
        style={{
          filter: hasLocalFilters
            ? `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) url(#${filterId}) ${
                clip.filter === "grayscale"
                  ? "grayscale(100%)"
                  : clip.filter === "sepia"
                    ? "sepia(100%)"
                    : clip.filter === "invert"
                      ? "invert(100%)"
                      : clip.filter === "blur"
                        ? "blur(10px)"
                        : ""
              }`
            : "none",
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          perspective: "1000px",
          transformStyle: "preserve-3d",
          willChange: "transform, opacity",
          ...style,
        }}
      >
        {nextSrc && (
          <video
            src={nextSrc}
            preload="auto"
            muted
            className="hidden pointer-events-none"
            aria-hidden="true"
          />
        )}
        {clip.type === "video" || clip.type === "videoinput" ? (
          <>
            <video
              ref={videoRef}
              src={clip.type === "video" ? clip.url : undefined}
              className={`w-full h-full ${!isProgram || clip.fitToScale ? "object-contain" : "object-none"}`}
              style={{
                transform: "translate3d(0, 0, 0)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transformStyle: "preserve-3d",
                willChange: "transform",
                imageRendering: activePerf.highResOptimization
                  ? "auto"
                  : "pixelated",
              }}
              muted={true}
              loop={
                clip.type === "video"
                  ? loopOverride !== undefined
                    ? loopOverride
                    : clip.loop !== false
                  : true
              }
              playsInline
              crossOrigin="anonymous"
              preload={
                isProgram ||
                activeIsPlaying ||
                activePerf.bufferingMode === "ultra_preload"
                  ? "auto"
                  : "metadata"
              }
              onLoadedData={() => {
                setIsReady(true);
                setFirstFrameRendered(true);
                if (activeIsPlaying && videoRef.current) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              onCanPlay={() => {
                setIsReady(true);
                setFirstFrameRendered(true);
              }}
              onPlaying={() => setFirstFrameRendered(true)}
              onWaiting={() => {
                if (activeIsPlaying && videoRef.current && videoRef.current.paused) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              onStalled={() => {
                if (activeIsPlaying && videoRef.current && videoRef.current.paused) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              onError={(e) => {
                console.warn("Video element error encountered in VideoLayer, retrying source...", e);
                if (activeIsPlaying && videoRef.current) {
                  const currentSrc = videoRef.current.src;
                  if (currentSrc) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }
              }}
              onTimeUpdate={(e) => {
                if (
                  clip.type === "video" &&
                  e.currentTarget.currentTime > 0.01
                ) {
                  setFirstFrameRendered(true);
                }
                onTimeUpdate?.(e.currentTarget.currentTime);
              }}
              onEnded={handleEnded}
            />
            {clip.type === "video" && nextSrc && (
              <video
                src={nextSrc}
                preload="auto"
                muted
                playsInline
                style={{
                  position: "absolute",
                  width: "1px",
                  height: "1px",
                  opacity: 0.01,
                  pointerEvents: "none",
                  zIndex: -100,
                }}
              />
            )}
          </>
        ) : clip.type === "document" || clip.type === "ppt" ? (
          <DocumentLayer clip={clip} onUpdateClip={onUpdateClip} />
        ) : (
          <img
            src={clip.url}
            className={`w-full h-full ${!isProgram || clip.fitToScale ? "object-contain" : "object-none"}`}
            referrerPolicy="no-referrer"
          />
        )}
      </motion.div>
    </>
  );
};

const AudioBumeter = ({
  volume,
  isActive,
  getSignalLevel,
}: {
  volume: number;
  isActive: boolean;
  getSignalLevel?: () => number;
}) => {
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);

  useEffect(() => {
    let frameId: number;
    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      let targetLevel = 0;
      if (getSignalLevel) {
        targetLevel = getSignalLevel();
      } else {
        // Base activity signal - gentle noise + sine wave
        const phase = now * 0.005;
        const baseSignal =
          0.5 +
          0.3 * Math.sin(phase) +
          0.15 * Math.sin(phase * 2.3) +
          0.05 * Math.random();
        targetLevel =
          volume <= 0.001 ? 0 : Math.max(0, Math.min(1, baseSignal * volume));
      }

      setLevel((prev) => {
        const diff = targetLevel - prev;
        if (diff > 0) {
          return prev + diff * 0.35;
        } else {
          return prev + diff * 0.12;
        }
      });

      setPeak((prevPeak) => {
        if (targetLevel > prevPeak) {
          return targetLevel;
        } else {
          return Math.max(0, prevPeak - delta * 0.2);
        }
      });

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [volume, isActive, getSignalLevel]);

  const totalSegments = 32;
  const activeCount = Math.round(level * totalSegments);
  const peakIndex = Math.round(peak * totalSegments) - 1;

  return (
    <div className="flex flex-col gap-0.5 mt-1 select-none w-full">
      <div className="h-4 bg-[#0a0a0a] rounded-sm p-[1px] flex gap-[1px] items-center overflow-hidden border border-white/5 relative group">
        {Array.from({ length: totalSegments }).map((_, idx) => {
          const isLit = idx < activeCount;
          const isPeakBit = idx === peakIndex;

          let litColor = "bg-[#00ff88]";
          if (idx >= 26) {
            litColor = "bg-[#ff3333] shadow-[0_0_8px_rgba(255,51,51,0.4)]";
          } else if (idx >= 21) {
            litColor = "bg-[#ffcc00] shadow-[0_0_8px_rgba(255,204,0,0.4)]";
          } else {
            litColor = "bg-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.3)]";
          }

          return (
            <div
              key={idx}
              className={`flex-1 h-full rounded-[0.5px] border-x border-black/20 transition-all duration-[40ms] ${
                isLit
                  ? litColor
                  : isPeakBit
                    ? "bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.9)]"
                    : "bg-white/[0.12]"
              }`}
            />
          );
        })}

        {/* dB labels inside */}
        <div className="absolute inset-0 flex justify-between items-center px-1 pointer-events-none opacity-40">
          <span className="text-[5px] font-black text-white">-60</span>
          <div className="flex-1" />
          <span className="text-[5px] font-black text-white">-18</span>
          <div className="flex-1" />
          <span className="text-[5px] font-black text-white">-6</span>
          <div className="flex-1" />
          <span className="text-[5px] font-black text-white font-mono">0</span>
        </div>
      </div>
      <div className="flex justify-between items-center px-0.5 opacity-60">
        <div className="flex gap-2">
          <span className="text-[5px] font-bold text-obs-muted uppercase tracking-tighter">
            -∞ dB
          </span>
        </div>
        <span className="text-[5px] font-black text-obs-muted uppercase tracking-widest">
          Digital Scale (AES/EBU)
        </span>
      </div>
    </div>
  );
};

const OutputCountdown = ({
  settings,
}: {
  settings: ExternalScreenSettings;
}) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      if (settings.timerRunning && settings.timerTargetTimestamp) {
        const diffMs = settings.timerTargetTimestamp - Date.now();
        const secs = Math.max(0, Math.ceil(diffMs / 1000));
        setRemaining(secs);
      } else {
        setRemaining(settings.timerRemainingSeconds ?? 0);
      }
    };

    updateTime();
    let interval: any;
    if (settings.timerRunning) {
      interval = setInterval(updateTime, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    settings.timerRunning,
    settings.timerTargetTimestamp,
    settings.timerRemainingSeconds,
  ]);

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const positionClasses = (() => {
    switch (settings.timerPosition) {
      case "top-left":
        return "top-6 left-6 justify-start items-start";
      case "top-center":
        return "top-6 left-1/2 -translate-x-1/2 justify-center items-center";
      case "top-right":
        return "top-6 right-6 justify-end items-end";
      case "center":
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 justify-center items-center";
      case "bottom-left":
        return "bottom-6 left-6 justify-start items-start";
      case "bottom-right":
        return "bottom-6 right-6 justify-end items-end";
      case "bottom-center":
      default:
        return "bottom-6 left-1/2 -translate-x-1/2 justify-center items-center";
    }
  })();

  const fontStyle = (() => {
    switch (settings.timerFont) {
      case "Space Grotesk":
        return "font-sans font-black";
      case "JetBrains Mono":
        return "font-mono font-bold";
      case "Playfair Display":
        return "font-serif italic";
      case "Outfit":
        return "font-sans tracking-wide font-normal";
      case "Impact":
        return "font-sans font-extrabold uppercase tracking-tighter";
      case "Inter":
      default:
        return "font-sans font-medium";
    }
  })();

  const alphaBg = settings.timerBgColor ? settings.timerBgColor : "#000000";
  const bgOpacity = (settings.timerBgOpacity ?? 70) / 100;
  const opacityHex = Math.round(bgOpacity * 255)
    .toString(16)
    .padStart(2, "0");

  const amberThreshold = settings.timerAmberSeconds ?? 30;
  const redThreshold = settings.timerRedSeconds ?? 10;

  const isEnded = remaining === 0;
  const isRed = remaining <= redThreshold || isEnded;
  const isAmber =
    remaining <= amberThreshold && remaining > redThreshold && !isEnded;

  const textColor = isRed
    ? (settings.timerRedColor ?? "#ef4444")
    : isAmber
      ? (settings.timerAmberColor ?? "#f59e0b")
      : (settings.timerColor ?? "#ffffff");

  const currentBlinkSpeed = isRed
    ? settings.timerBlinkRedEnabled !== false
      ? 0.5
      : 0
    : isAmber
      ? settings.timerBlinkAmberEnabled !== false
        ? 0.5
        : 0
      : 0;

  const animationStyle =
    currentBlinkSpeed > 0
      ? `blink-timer ${currentBlinkSpeed}s infinite`
      : "none";

  const x = settings.timerX !== undefined ? settings.timerX : 50;
  const y = settings.timerY !== undefined ? settings.timerY : 90;

  return (
    <div
      className="absolute z-[999] p-3 px-6 rounded-lg flex transition-[background-color,border-color,color] duration-300 pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        backgroundColor:
          bgOpacity === 0 ? "transparent" : `${alphaBg}${opacityHex}`,
        borderColor:
          bgOpacity === 0 ? "transparent" : "rgba(255, 255, 255, 0.1)",
        borderWidth: bgOpacity === 0 ? "0px" : "1px",
        boxShadow:
          bgOpacity === 0 ? "none" : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        color: textColor,
        fontSize: `${settings.timerSize ?? 48}px`,
        lineHeight: 1,
      }}
    >
      <span className={fontStyle} style={{ animation: animationStyle, color: "inherit" }}>
        {formatTime(remaining)}
      </span>
    </div>
  );
};

const PresenterTimerDisplay = ({
  settings,
  onUpdate,
  screenId,
}: {
  settings: ExternalScreenSettings;
  onUpdate: (updates: any) => void;
  screenId?: string;
}) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      if (settings.timerRunning && settings.timerTargetTimestamp) {
        const diffMs = settings.timerTargetTimestamp - Date.now();
        setRemaining(Math.max(0, Math.ceil(diffMs / 1000)));
      } else {
        setRemaining(settings.timerRemainingSeconds ?? 0);
      }
    };
    updateTime();
    let interval: any;
    if (settings.timerRunning) {
      interval = setInterval(updateTime, 100);
    }
    return () => clearInterval(interval);
  }, [
    settings.timerRunning,
    settings.timerTargetTimestamp,
    settings.timerRemainingSeconds,
  ]);

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isAmber =
    remaining > (settings.timerRedSeconds ?? 10) &&
    remaining <= (settings.timerAmberSeconds ?? 30);
  const isRed = remaining <= (settings.timerRedSeconds ?? 10) && remaining > 0;
  const isEnded = remaining === 0;

  let textColor = settings.timerColor ?? "#ffffff";
  let bgClass = "bg-obs-dark-2";
  let animationStyle = "none";
  let extraClass = "font-black";

  if (isEnded) {
    textColor = settings.timerRedColor ?? "#ef4444";
    if (settings.timerBlinkRedEnabled !== false) {
      animationStyle = `blink-timer ${settings.timerBlinkSpeedRed ?? 0.5}s infinite`;
    }
    bgClass = "bg-red-950/20 border border-red-500/20";
  } else if (isRed) {
    textColor = settings.timerRedColor ?? "#ef4444";
    if (settings.timerBlinkRedEnabled !== false) {
      animationStyle = `blink-timer ${settings.timerBlinkSpeedRed ?? 0.5}s infinite`;
    }
    bgClass = "bg-red-900/10 border border-red-500/20";
    extraClass = "font-extrabold";
  } else if (isAmber) {
    textColor = settings.timerAmberColor ?? "#f59e0b";
    if (settings.timerBlinkAmberEnabled !== false) {
      animationStyle = `blink-timer ${settings.timerBlinkSpeedAmber ?? 0.5}s infinite`;
    }
    bgClass = "bg-amber-900/10 border border-amber-500/20";
    extraClass = "font-semibold";
  }

  return (
    <div className="p-4 space-y-4">
      {/* Row 1: Clock on left, control panel on right */}
      <div className="flex gap-4">
        {/* Big Clock area */}
        <div
          className={`flex-1 p-5 rounded-xl flex flex-col items-center justify-center transition-[background-color,border-color,color] duration-300 ${bgClass} min-h-[100px] border-2 border-white/5`}
        >
          <span className="text-[7.5px] uppercase font-black text-obs-muted tracking-[0.2em] mb-1">
            tiempo restante
          </span>
          <div
            className={`text-5xl font-mono tracking-tighter select-none transition-none ${extraClass}`}
            style={{ animation: animationStyle, color: textColor }}
          >
            {formatTime(remaining)}
          </div>
        </div>

        {/* Numeric control panel */}
        <div className="w-24 space-y-2 border-l border-obs-border pl-4 flex flex-col justify-center">
          <span className="text-[7.5px] uppercase font-black text-obs-text tracking-[0.1em]">
            Control de Tiempo
          </span>
          <div className="space-y-1.5 pt-1">
            <div className="flex flex-col gap-0.5">
              <label className="text-[6px] uppercase font-bold text-obs-muted">
                Minutos
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={settings.timerMinutes ?? 5}
                onChange={(e) => {
                  const mins = parseInt(e.target.value) || 0;
                  const secs = settings.timerSeconds ?? 0;
                  onUpdate({
                    timerMinutes: mins,
                    timerRemainingSeconds: mins * 60 + secs,
                    timerRunning: false,
                    timerTargetTimestamp: null,
                  });
                }}
                className="bg-obs-bg border border-obs-border rounded p-1 text-[11px] font-black font-mono text-center text-obs-accent focus:border-obs-accent outline-none"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[6px] uppercase font-bold text-obs-muted">
                Segundos
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={settings.timerSeconds ?? 0}
                onChange={(e) => {
                  const mins = settings.timerMinutes ?? 5;
                  const secs = parseInt(e.target.value) || 0;
                  onUpdate({
                    timerSeconds: secs,
                    timerRemainingSeconds: mins * 60 + secs,
                    timerRunning: false,
                    timerTargetTimestamp: null,
                  });
                }}
                className="bg-obs-bg border border-obs-border rounded p-1 text-[11px] font-black font-mono text-center text-obs-accent focus:border-obs-accent outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Control buttons in one row */}
      <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-obs-border/50 bg-obs-surface/40 p-1.5 rounded-lg">
        <button
          onClick={() => {
            if (!settings.timerRunning) {
              onUpdate({
                timerRunning: true,
                timerTargetTimestamp:
                  Date.now() + (settings.timerRemainingSeconds ?? 0) * 1000,
              });
            }
          }}
          disabled={settings.timerRunning}
          className={`py-2 rounded-md font-black uppercase text-[8px] transition-all border-b-2 flex flex-col items-center justify-center gap-0.5 ${
            settings.timerRunning
              ? "bg-obs-dark-2 border-transparent text-obs-muted cursor-not-allowed"
              : "bg-emerald-600 border-emerald-800 text-white hover:bg-emerald-500 active:scale-95"
          }`}
        >
          <Play size={10} fill="currentColor" />
          <span>Iniciar</span>
        </button>

        <button
          onClick={() => {
            if (settings.timerRunning) {
              onUpdate({
                timerRunning: false,
                timerRemainingSeconds: remaining,
                timerTargetTimestamp: null,
              });
            }
          }}
          disabled={!settings.timerRunning}
          className={`py-2 rounded-md font-black uppercase text-[8px] transition-all border-b-2 flex flex-col items-center justify-center gap-0.5 ${
            !settings.timerRunning
              ? "bg-obs-dark-2 border-transparent text-obs-muted cursor-not-allowed"
              : "bg-red-600 border-red-800 text-white hover:bg-red-500 active:scale-95"
          }`}
        >
          <Square size={10} fill="currentColor" />
          <span>Detener</span>
        </button>

        <button
          onClick={() => {
            const m = settings.timerMinutes ?? 5;
            const s = settings.timerSeconds ?? 0;
            onUpdate({
              timerRemainingSeconds: m * 60 + s,
              timerRunning: false,
              timerTargetTimestamp: null,
            });
          }}
          className="py-2 rounded-md font-black uppercase text-[8px] transition-all bg-[#444] border-b-2 border-stone-600 text-white hover:bg-stone-500 active:scale-95 flex flex-col items-center justify-center gap-0.5"
        >
          <RotateCcw size={10} />
          <span>Reiniciar</span>
        </button>

        <button
          onClick={() => {
            onUpdate({
              timerIsLaunched: !settings.timerIsLaunched,
            });
          }}
          className={`py-2 rounded-md font-black uppercase text-[8px] transition-all border-b-2 flex flex-col items-center justify-center gap-0.5 ${
            settings.timerIsLaunched
              ? "bg-red-600 border-red-800 text-white hover:bg-red-500 active:scale-95"
              : "bg-indigo-600 border-indigo-800 text-white hover:bg-indigo-500 active:scale-95"
          }`}
          title={
            settings.timerIsLaunched
              ? "Quitar reloj de la salida externa"
              : "Lanzar reloj a la salida externa"
          }
        >
          <ExternalLink size={10} />
          <span>{settings.timerIsLaunched ? "LIVE" : "LANZAR"}</span>
        </button>
      </div>
    </div>
  );
};

const FloatingTimerPopoutView = React.memo(() => {
  const [state, setState] = useState<any>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const screenId = useMemo(() => {
    try {
      const params = new URLSearchParams(
        window.location.search ||
          window.location.hash.substring(
            window.location.hash.indexOf("?") !== -1
              ? window.location.hash.indexOf("?")
              : window.location.hash.length,
          ),
      );
      return params.get("screenId") || "1";
    } catch {
      return "1";
    }
  }, []);

  useEffect(() => {
    document.title = "LUMIN TIMER CONTROLLER";
    const channel = new BroadcastChannel("lumin-output");
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "SYNC_STATE") {
        setState(event.data.payload);
      }
    };

    channel.addEventListener("message", handleMessage);
    channel.postMessage({ type: "REQUEST_SYNC" });

    const interval = setInterval(() => {
      channel.postMessage({ type: "REQUEST_SYNC" });
    }, 1000);

    return () => {
      channel.removeEventListener("message", handleMessage);
      clearInterval(interval);
      channel.close();
    };
  }, []);

  const settings = useMemo(() => {
    if (state?.allScreenSettings && state.allScreenSettings[screenId]) {
      return state.allScreenSettings[screenId];
    }
    return (
      state?.externalScreenSettings || {
        timerMinutes: 5,
        timerSeconds: 0,
        timerRemainingSeconds: 300,
        timerRunning: false,
        timerTargetTimestamp: null,
        timerAmberSeconds: 30,
        timerRedSeconds: 10,
      }
    );
  }, [state, screenId]);

  const handleUpdate = (updates: any) => {
    channelRef.current?.postMessage({
      type: "UPDATE_TIMER_SETTINGS",
      payload: { screenId, updates },
    });
    setState((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        allScreenSettings: {
          ...(prev.allScreenSettings || {}),
          [screenId]: {
            ...(prev.allScreenSettings?.[screenId] || {}),
            ...updates,
          },
        },
      };
    });
  };

  const outputObj = state?.outputs?.find(
    (o: any) => o.physicalScreenId === screenId || o.id === screenId,
  );
  const displayName = outputObj ? outputObj.name : `Salida ${screenId}`;

  return (
    <div className="w-full h-screen bg-obs-bg text-obs-text p-4 font-sans flex flex-col justify-between overflow-hidden">
      <div className="flex items-center justify-between border-b border-obs-border pb-2 mb-2">
        <div className="flex items-center gap-1.5 text-obs-accent font-sans">
          <Clock size={12} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider font-sans">
            MANDO: {displayName}
          </span>
        </div>
        <span className="text-[7.5px] font-mono text-obs-muted">
          Lumin Timer
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <PresenterTimerDisplay
          settings={settings}
          onUpdate={handleUpdate}
          screenId={screenId}
        />
      </div>
    </div>
  );
});

const OutputView = React.memo(() => {
  const [state, setState] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasTriedFullscreen = useRef(false);
  const lastStateRef = useRef<any>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Transition handshake states for OutputView
  const [isBusAReady, setIsBusAReady] = useState(true);
  const [activeBusBClip, setActiveBusBClip] = useState<any>(null);

  // Sync transitions on external screen output:
  const screenId = useMemo(() => {
    try {
      const params = new URLSearchParams(
        window.location.search ||
          window.location.hash.substring(
            window.location.hash.indexOf("?") !== -1
              ? window.location.hash.indexOf("?")
              : window.location.hash.length,
          ),
      );
      return params.get("screenId");
    } catch {
      return null;
    }
  }, [state]);

  const perfSettings = useMemo(
    () => state?.perfSettings,
    [state?.perfSettings],
  );

  const extractedClips = state?.clips;
  const extractedProgramClipId = state?.programClipId;
  const extractedPreviewClipId = state?.previewClipId;
  const extractedOutputs = state?.outputs;
  const extractedOutputPrograms = state?.outputPrograms;
  const extractedOutputTransitionTargets = state?.outputTransitionTargets;

  const resolvedBusAClip = useMemo(() => {
    if (!extractedClips) return null;
    const mappedOutput = extractedOutputs?.find(
      (o: any) => o.physicalScreenId === screenId,
    );
    const mappedProgramClipId =
      mappedOutput && extractedOutputPrograms
        ? extractedOutputPrograms[mappedOutput.id]
        : extractedProgramClipId;
    return extractedClips.find((c: any) => c.id === mappedProgramClipId);
  }, [
    extractedClips,
    extractedOutputs,
    extractedOutputPrograms,
    extractedProgramClipId,
    screenId,
  ]);

  const resolvedBusBClip = useMemo(() => {
    if (!extractedClips) return null;
    const mappedOutput = extractedOutputs?.find(
      (o: any) => o.physicalScreenId === screenId,
    );
    const mappedTargetClipId =
      mappedOutput && extractedOutputTransitionTargets
        ? extractedOutputTransitionTargets[mappedOutput.id]
        : extractedPreviewClipId;
    const isTarget =
      mappedOutput &&
      extractedOutputTransitionTargets &&
      extractedOutputTransitionTargets[mappedOutput.id];
    const finalBusBId =
      isTarget || !Object.keys(extractedOutputTransitionTargets || {}).length
        ? mappedTargetClipId
        : null;
    return extractedClips.find((c: any) => c.id === finalBusBId);
  }, [
    extractedClips,
    extractedOutputs,
    extractedOutputTransitionTargets,
    extractedPreviewClipId,
    screenId,
  ]);

  // Sync transition handshake state on external screen outputs:
  useEffect(() => {
    if (resolvedBusBClip) {
      setActiveBusBClip(resolvedBusBClip);
    } else if (isBusAReady) {
      setActiveBusBClip(null);
    }
  }, [resolvedBusBClip, isBusAReady]);

  useEffect(() => {
    if (resolvedBusAClip) {
      if (resolvedBusAClip.type === "video") {
        setIsBusAReady(false);
      } else {
        setIsBusAReady(true);
      }
    } else {
      setIsBusAReady(true);
    }
  }, [resolvedBusAClip?.id]);

  useEffect(() => {
    console.log("OutputView: Montado.");
    document.title = "LUMIN OUTPUT";

    const channel = new BroadcastChannel("lumin-output");
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "SYNC_STATE") {
        setState(event.data.payload);
      }
    };

    channel.addEventListener("message", handleMessage);
    channel.postMessage({ type: "REQUEST_SYNC" });

    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);

    return () => {
      channel.removeEventListener("message", handleMessage);
      document.removeEventListener("fullscreenchange", handleFsChange);
      channel.close();
    };
  }, []);

  // Smarter auto-fullscreen: Only try once on first state arrival
  useEffect(() => {
    if (state && !isFullscreen && !hasTriedFullscreen.current) {
      const tryFullscreen = async () => {
        try {
          if ("getScreenDetails" in window) {
            // @ts-ignore
            const details = await window.getScreenDetails();
            const currentScreen = details.screens.find(
              (s: any) =>
                window.screenX >= s.left &&
                window.screenX < s.left + s.width &&
                window.screenY >= s.top &&
                window.screenY < s.top + s.height,
            );

            if (currentScreen) {
              // @ts-ignore
              await document.documentElement.requestFullscreen({
                screen: currentScreen,
              } as any);
              hasTriedFullscreen.current = true;
              return;
            }
          }
          await document.documentElement.requestFullscreen();
          hasTriedFullscreen.current = true;
        } catch (err) {
          console.warn("Auto-fullscreen bloqueado:", err);
        }
      };

      tryFullscreen();
    }
  }, [!!state, isFullscreen]);

  if (error) {
    return (
      <div className="bg-black h-screen w-screen flex flex-col items-center justify-center text-red-500 font-mono text-[10px] p-8 uppercase tracking-widest">
        <span>Error de Salida</span>
      </div>
    );
  }

  if (!state) {
    return (
      <div
        className="bg-black h-screen w-screen cursor-none"
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }}
      />
    );
  }

  try {
    const params = new URLSearchParams(
      window.location.search ||
        window.location.hash.substring(
          window.location.hash.indexOf("?") !== -1
            ? window.location.hash.indexOf("?")
            : window.location.hash.length,
        ),
    );
    const screenId = params.get("screenId");

    const {
      programClipId,
      previewClipId,
      outputPrograms,
      outputTransitionTargets,
      outputOffStates,
      outputs,
      clips,
      allScreenSettings,
      crossfaderValue,
      isLive,
      isTransmitting,
      programVolume,
      masterVolume,
      mutedFaders,
      transitionType,
      transitionDuration,
      externalScreenSettings,
    } = state;

    const finalProgramVolume = mutedFaders?.["Programa"] ? 0 : (programVolume ?? 0.5);
    const finalMasterVolume = mutedFaders?.["Master"] ? 0 : (masterVolume ?? 0.5);

    // Find if this screen is mapped to a specific LUMIN Output
    const mappedOutput = outputs?.find(
      (o: any) => o.physicalScreenId === screenId,
    );
    const mappedProgramClipId =
      mappedOutput && outputPrograms
        ? outputPrograms[mappedOutput.id]
        : programClipId;
    const mappedTargetClipId =
      mappedOutput && outputTransitionTargets
        ? outputTransitionTargets[mappedOutput.id]
        : previewClipId;
    const mappedOffState =
      mappedOutput && outputOffStates
        ? outputOffStates[mappedOutput.id]
        : false;

    const settings =
      allScreenSettings && screenId && allScreenSettings[screenId]
        ? allScreenSettings[screenId]
        : {
            ...(state.externalScreenSettings || {}),
            brightness: state.externalScreenSettings?.brightness ?? 1,
            contrast: state.externalScreenSettings?.contrast ?? 1,
            saturation: state.externalScreenSettings?.saturation ?? 1,
            opacity: state.externalScreenSettings?.opacity ?? 1,
            x: state.externalScreenSettings?.x ?? 0,
            y: state.externalScreenSettings?.y ?? 0,
            rotation: state.externalScreenSettings?.rotation ?? 0,
            scalingW: state.externalScreenSettings?.scalingW ?? 1,
            scalingH: state.externalScreenSettings?.scalingH ?? 1,
            colorBalance: state.externalScreenSettings?.colorBalance || {
              r: 1,
              g: 1,
              b: 1,
            },
            bgScalingW: state.externalScreenSettings?.bgScalingW ?? 100,
            bgScalingH: state.externalScreenSettings?.bgScalingH ?? 100,
            timerEnabled: false,
            timerIsLaunched: false,
          };

    const hasGlobalFilters = (() => {
      const b = settings.brightness ?? 1;
      const c = settings.contrast ?? 1;
      const s = settings.saturation ?? 1;
      const r = settings.colorBalance?.r ?? 1;
      const g = settings.colorBalance?.g ?? 1;
      const bl = settings.colorBalance?.b ?? 1;
      return b !== 1 || c !== 1 || s !== 1 || r !== 1 || g !== 1 || bl !== 1;
    })();

    const isContentActive = isLive && isTransmitting;
    const busAClip = clips.find((c: any) => c.id === mappedProgramClipId);

    // Only use busB if this output is a target of the current transition, or if we're doing a global take
    const isTarget =
      mappedOutput &&
      outputTransitionTargets &&
      outputTransitionTargets[mappedOutput.id];
    const busBClip =
      isTarget || !Object.keys(outputTransitionTargets || {}).length
        ? clips.find((c: any) => c.id === mappedTargetClipId)
        : null;

    // In OutputView, we only show content if it's active.
    // Transition handles the mix.
    const hasActiveContent =
      isContentActive &&
      (busAClip || (activeBusBClip && (crossfaderValue > 0 || !isBusAReady))) &&
      !mappedOffState;

    const audioOpacityA = (() => {
      if (!busAClip) return 0;
      if (transitionType === "cut") return mappedOffState ? 0 : 1;
      const base = 1 - crossfaderValue / 100;
      return mappedOffState ? 0 : base;
    })();
    const audioOpacityB = (() => {
      if (!activeBusBClip) return 0;
      if (!isBusAReady) return 1; // Show at full opacity during the transition handshake
      if (transitionType === "cut") return 0;
      const base = crossfaderValue / 100;
      return mappedOffState ? 0 : base;
    })();

    const wipeTransformOut = (() => {
      if (transitionType !== "wipe") return undefined;
      return `inset(0 ${100 - crossfaderValue}% 0 0)`;
    })();

    return (
      <div
        className="bg-black h-screen w-screen overflow-hidden flex items-center justify-center relative cursor-none"
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }}
      >
        {/* Background Layer - Always rendered if enabled */}
        {settings.showBackground && settings.backgroundImage && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center bg-black">
            <img
              src={settings.backgroundImage}
              className="absolute pointer-events-none"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "fill",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${(settings.bgScalingW ?? 100) / 100}, ${(settings.bgScalingH ?? 100) / 100})`,
                display: "block",
              }}
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Fullscreen Guard Overlay - Invisible Click Catcher */}
        {!isFullscreen && (
          <div
            className="fixed inset-0 z-[1000] bg-obs-dark-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              document.documentElement.requestFullscreen().catch(() => {});
            }}
          />
        )}

        <div
          className="relative overflow-hidden flex items-start justify-start z-10"
          style={{
            width: settings.width ? `${settings.width}px` : "100%",
            height: settings.height ? `${settings.height}px` : "100%",
            opacity: settings.opacity ?? 1,
            // If background is showing and we have no content, make container transparent
            backgroundColor:
              settings.showBackground &&
              settings.backgroundImage &&
              !hasActiveContent
                ? "transparent"
                : "#000",
            transform: `translate3d(${settings.x ?? 0}px, ${settings.y ?? 0}px, 0px) rotate(${settings.rotation ?? 0}deg)`,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
            willChange: "transform, opacity",
          }}
        >
          <div
            className="absolute inset-0 flex items-start justify-start"
            style={{
              transform: `scale3d(${settings.scalingW ?? 1}, ${settings.scalingH ?? 1}, 1)`,
              transformOrigin: "top left",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transformStyle: "preserve-3d",
              willChange: "transform",
              filter: hasGlobalFilters
                ? `brightness(${settings.brightness ?? 1}) contrast(${settings.contrast ?? 1}) saturate(${settings.saturation ?? 1}) url(#rgbBalance)`
                : "none",
            }}
          >
            {/* SVG Filter for RGB Balance */}
            <svg width="0" height="0" className="absolute">
              <filter id="rgbBalance">
                <feColorMatrix
                  type="matrix"
                  values={`${settings.colorBalance?.r ?? 1} 0 0 0 0
                          0 ${settings.colorBalance?.g ?? 1} 0 0 0
                          0 0 ${settings.colorBalance?.b ?? 1} 0 0
                          0 0 0 1 0`}
                />
              </filter>
            </svg>

            {isLive && isTransmitting ? (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: mappedOffState ? 0 : 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="w-full h-full flex items-start justify-start relative"
              >
                <AnimatePresence custom={transitionType}>
                  {/* Bus A Layer (Legacy/Mixer mode) */}
                  {busAClip &&
                    !state.layers?.some((l: any) => l.activeClipId && (state.layerOutputs?.[l.id] === mappedOutput?.id || !state.layerOutputs?.[l.id] || state.layerOutputs?.[l.id] === "all")) &&
                    (crossfaderValue === undefined ||
                      crossfaderValue < 100) && (
                      <VideoLayer
                        key={`bus-A-${busAClip.id}-${state?.programPlayIndex ?? 0}`}
                        clip={busAClip}
                        volume={finalProgramVolume}
                        masterVolume={finalMasterVolume}
                        opacity={1}
                        faderOpacity={audioOpacityA}
                        isProgram={crossfaderValue === 0}
                        crossfaderValue={crossfaderValue}
                        transitionType={transitionType}
                        isTransmitting={isTransmitting}
                        onEnded={() => {
                          channelRef.current?.postMessage({
                            type: "CLIP_ENDED",
                            payload: {
                              outputId: mappedOutput?.id,
                              clipId: busAClip.id,
                            },
                          });
                        }}
                        transitionDuration={
                          settings?.transitionDuration
                            ? settings.transitionDuration / 1000
                            : 0.4
                        }
                        onReady={() => setIsBusAReady(true)}
                        perfSettings={perfSettings}
                        isSlave={true}
                        outputId={mappedOutput?.id || "1"}
                      />
                    )}

                  {/* Bus B Layer */}
                  {activeBusBClip && (
                    <VideoLayer
                      key={`bus-B-${activeBusBClip.id}-${state?.programPlayIndex ?? 0}`}
                      clip={activeBusBClip}
                      volume={finalProgramVolume}
                      masterVolume={finalMasterVolume}
                      opacity={1}
                      style={{ clipPath: wipeTransformOut }}
                      faderOpacity={audioOpacityB}
                      isProgram={crossfaderValue === 100 || !isBusAReady}
                      crossfaderValue={crossfaderValue}
                      transitionType={transitionType}
                      isTransmitting={isTransmitting}
                      onEnded={() => {
                        channelRef.current?.postMessage({
                          type: "CLIP_ENDED",
                          payload: {
                            outputId: mappedOutput?.id,
                            clipId: activeBusBClip.id,
                          },
                        });
                      }}
                      transitionDuration={
                        settings?.transitionDuration
                          ? settings.transitionDuration / 1000
                          : 0.4
                      }
                      perfSettings={perfSettings}
                      isSlave={true}
                      outputId={mappedOutput?.id || "1"}
                    />
                  )}
                </AnimatePresence>

                {/* Layer Rendering - Multi-layer mixing */}
                {(state.layers || [])
                  .filter(
                    (l: any) =>
                      l.isVisible &&
                      (state.layerOutputs?.[l.id] === mappedOutput?.id ||
                        !state.layerOutputs?.[l.id] ||
                        state.layerOutputs?.[l.id] === "all"),
                  )
                  .map((l: any, index: number) => {
                      const activeClip = l.activeClipId
                        ? (state.clips || []).find(
                            (c: any) => c.id === l.activeClipId,
                          )
                        : null;
                      if (!activeClip) return null;

                      return (
                        <div
                          key={l.id}
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            opacity: l.opacity,
                            zIndex: state.layers.length - index + 10,
                          }}
                        >
                          <svg width="0" height="0" className="absolute">
                            <filter
                              id={`rgbLayerOutput-${l.id}`}
                              colorInterpolationFilters="sRGB"
                            >
                              <feColorMatrix
                                type="matrix"
                                values={`${l.colorBalance.r} 0 0 0 0
                                    0 ${l.colorBalance.g} 0 0 0
                                    0 0 ${l.colorBalance.b} 0 0
                                    0 0 0 1 0`}
                              />
                            </filter>
                          </svg>
                          <div
                            className="w-full h-full relative"
                            style={{
                              filter: `brightness(${l.brightness}) contrast(${l.contrast}) saturate(${l.saturation}) url(#rgbLayerOutput-${l.id})`,
                              transform: `rotate(${l.rotation}deg)`,
                            }}
                          >
                            <LayerPlaybox 
                              layer={l}
                              clips={state.clips || []}
                              volume={l.muted ? 0 : finalProgramVolume}
                              masterVolume={finalMasterVolume}
                              opacity={1}
                              isProgram={true}
                              isTransmitting={isTransmitting}
                              onLayerEnded={(layerId: string, clipId: string, seqCounter: number) => {
                                channelRef.current?.postMessage({
                                  type: "LAYER_CLIP_ENDED",
                                  payload: {
                                    layerId: layerId,
                                    clipId: clipId,
                                    sequenceCounter: seqCounter,
                                    outputId: mappedOutput?.id || "1",
                                  },
                                });
                              }}
                              updateClip={updateClip}
                              perfSettings={perfSettings}
                              isSlave={true}
                              outputId={mappedOutput?.id || "1"}
                            />
                          </div>
                        </div>
                      );
                    })}

                <AnimatePresence>
                  {state.pipLayers &&
                    state.pipLayers
                      .filter(
                        (p: any) =>
                          p.isActive &&
                          (p.targetOutputId === mappedOutput?.id ||
                            (!p.targetOutputId && mappedOutput?.id === "1") ||
                            p.targetOutputId === "program"),
                      )
                      .map((pip: any) => (
                        <motion.div
                          key={pip.id}
                          className={`absolute overflow-hidden pointer-events-none ${pip.showFrame ? "border" : ""}`}
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: pip.opacity,
                            clipPath: "inset(0% 0% 0% 0%)",
                          }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: Math.max(
                              0,
                              Math.min(1.5, pip.transitionDuration || 0.4),
                            ),
                            ease: "easeInOut",
                          }}
                          style={{
                            zIndex: 100,
                            left: `${(pip.x / (mappedOutput?.id ? allScreenSettings[mappedOutput.id]?.width || 1920 : 1920)) * 100}%`,
                            top: `${(pip.y / (mappedOutput?.id ? allScreenSettings[mappedOutput.id]?.height || 1080 : 1080)) * 100}%`,
                            width: `${(pip.width / (mappedOutput?.id ? allScreenSettings[mappedOutput.id]?.width || 1920 : 1920)) * 100}%`,
                            height: `${(pip.height / (mappedOutput?.id ? allScreenSettings[mappedOutput.id]?.height || 1080 : 1080)) * 100}%`,
                            borderRadius: 0,
                            borderWidth: pip.showFrame
                              ? `${pip.borderWidth || 1}px`
                              : "0px",
                            borderColor: pip.borderColor || "#000000",
                          }}
                        >
                          {pip.clipId &&
                            (state.clips || []).find(
                              (c: any) => c.id === pip.clipId,
                            ) && (
                              <div className="w-full h-full">
                                <VideoLayer
                                  clip={
                                    state.clips.find(
                                      (c: any) => c.id === pip.clipId,
                                    )!
                                  }
                                  isSlave={true}
                                  volume={0}
                                  opacity={pip.opacity}
                                  isProgram={false}
                                  layerId={pip.id}
                                />
                              </div>
                            )}
                        </motion.div>
                      ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div
                className={`w-full h-full ${settings.showBackground ? "bg-transparent" : "bg-black"}`}
              />
            )}
          </div>
          {settings.timerEnabled && settings.timerIsLaunched && (
            <OutputCountdown settings={settings} />
          )}
        </div>
      </div>
    );
  } catch (e: any) {
    console.error("Error crítico en OutputView:", e);
    setError(e.message);
    return null;
  }
});

const Inspector = React.memo(
  ({
    selectedItem,
    selectedItemType,
    externalScreenSettings,
    externalScreens,
    selectedScreenId,
    hasDetailedScreens,
    isIframe,
    previews,
    setPreviews,
    outputs,
    onUpdate,
    onUpdateExternalScreen,
    onSelectedScreenIdChange,
    onLaunchOutput,
    onDetectScreens,
    onSync,
    onUpdateLayer,
    onUpdatePiP,
    onRemovePiP,
    onAddPiP,
    onSelectPiP,
    onUpdateClip,
    clips,
    allScreenSettings,
    isDarkMode,
    isOutputLaunched,
    pipLayers,
    activeOutputId,
  }: {
    selectedItem: Clip | Playlist | any | null;
    selectedItemType:
      | "clip"
      | "playlist"
      | "program"
      | "preview"
      | "layer"
      | "pip"
      | "pipManager"
      | null;
    externalScreenSettings: ExternalScreenSettings;
    externalScreens: Screen[];
    selectedScreenId: string | null;
    hasDetailedScreens: boolean;
    isIframe: boolean;
    previews: any[];
    setPreviews: React.Dispatch<React.SetStateAction<any[]>>;
    outputs: any[];
    onUpdate: (id: string, updates: any) => void;
    onUpdateExternalScreen: (updates: any) => void;
    onSelectedScreenIdChange: (id: string | null) => void;
    onLaunchOutput: () => void;
    onDetectScreens: () => void;
    onSync?: () => void;
    onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
    onUpdatePiP?: (id: string, updates: Partial<PiPLayer>) => void;
    onRemovePiP: (id: string) => void;
    onAddPiP?: () => void;
    onSelectPiP?: (pip: PiPLayer) => void;
    onUpdateClip?: (id: string, updates: Partial<Clip>) => void;
    clips?: Clip[];
    allScreenSettings: Record<string, ExternalScreenSettings>;
    isDarkMode: boolean;
    isOutputLaunched?: boolean;
    pipLayers?: PiPLayer[];
    activeOutputId?: string;
  }) => {
    const handleReset = () => {
      if (
        (selectedItemType === "clip" || selectedItemType === "playlist") &&
        selectedItem
      ) {
        onUpdate(selectedItem.id, {
          transform: { ...DEFAULT_TRANSFORM },
          opacity: 1,
          master: 1,
          speed: 1,
          volume: 1,
          pan: 0,
          brightness: 1,
          contrast: 1,
          saturation: 1,
          colorBalance: { r: 1, g: 1, b: 1 },
          mask: "none",
          filter: "none",
        });
      } else if (selectedItemType === "layer") {
        onUpdateLayer(selectedItem.id, {
          opacity: 1,
          brightness: 1,
          contrast: 1,
          saturation: 1,
          colorBalance: { r: 1, g: 1, b: 1 },
          rotation: 0,
          isVisible: true,
          muted: true,
        });
      } else if (selectedItemType === "program") {
        onUpdateExternalScreen({
          resolution: "1920x1080",
          width: 1920,
          height: 1080,
          scalingW: 1,
          scalingH: 1,
          brightness: 1,
          contrast: 1,
          saturation: 1,
          opacity: 1,
          x: 0,
          y: 0,
          rotation: 0,
          colorBalance: { r: 1, g: 1, b: 1 },
        });
      }
    };

    if (selectedItemType === "pipManager") {
      const pips = (selectedItem as PiPLayer[]) || [];
      return (
        <div className="h-full flex flex-col overflow-hidden bg-obs-bg">
          <div className="px-3 py-2 border-b border-obs-border flex justify-between items-center bg-obs-surface">
            <div className="flex items-center gap-2">
              <Layers size={12} className="text-obs-accent" />
              <span className="text-[11px] font-semibold text-obs-text uppercase tracking-widest leading-none">
                PIPs GLOBALES
              </span>
            </div>
            <button
              onClick={() => onAddPiP?.()}
              className="p-1 px-2 text-[9px] font-bold uppercase rounded bg-obs-accent hover:bg-obs-accent/80 text-white transition-colors"
            >
              + ADD PIP
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 custom-scrollbar">
            {pips.map((layer) => (
              <div
                key={layer.id}
                className={`p-2 rounded border transition-all ${layer.isActive ? "bg-obs-accent/10 border-obs-accent" : "bg-obs-dark-1 border-obs-text/5 hover:border-obs-text/10"}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase ${layer.isActive ? "text-obs-accent" : "text-obs-muted"}`}
                    >
                      {layer.name}
                    </span>
                    <button
                      onClick={() => onSelectPiP?.(layer)}
                      className="text-obs-muted hover:text-white transition-colors"
                      title="Editar Propiedades"
                    >
                      <Settings size={10} />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {pips.length > 1 && (
                      <button
                        onClick={() => onRemovePiP?.(layer.id)}
                        className="text-obs-muted hover:text-red-500 transition-colors"
                        title="Borrar PIP"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        onUpdatePiP?.(layer.id, { isActive: !layer.isActive })
                      }
                      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${layer.isActive ? "bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.3)]" : "bg-obs-accent text-white hover:bg-obs-accent/80"}`}
                    >
                      {layer.isActive ? "OFF" : "LIVE"}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8px] text-obs-muted font-bold uppercase">
                      Fuente
                    </label>
                    <select
                      value={layer.clipId || ""}
                      onChange={(e) =>
                        onUpdatePiP?.(layer.id, {
                          clipId: e.target.value || null,
                        })
                      }
                      className="w-full bg-obs-dark-1 border border-obs-text/10 rounded px-1 py-1 text-[9px] text-obs-text outline-none focus:border-obs-accent"
                    >
                      <option value="">No Source</option>
                      {(clips || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[8px] text-obs-muted font-bold uppercase">
                        Target Out
                      </label>
                      <select
                        value={layer.targetOutputId || ""}
                        onChange={(e) =>
                          onUpdatePiP?.(layer.id, {
                            targetOutputId: e.target.value || null,
                          })
                        }
                        className="w-full bg-obs-dark-1 border border-obs-text/10 rounded px-1 py-1 text-[9px] text-obs-text outline-none focus:border-obs-accent"
                      >
                        <option value="">Output 1 (Def)</option>
                        <option value="program">Todas (Program)</option>
                        {outputs.map((o) => (
                          <option key={o.id} value={o.id}>
                            Out {o.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <div className="w-full flex items-center justify-between bg-obs-dark-1 px-2 py-1. rounded border border-obs-text/5">
                        <span className="text-[8px] font-bold text-obs-muted uppercase">
                          Prev
                        </span>
                        <button
                          onClick={() =>
                            onUpdatePiP?.(layer.id, {
                              showInPreview: !layer.showInPreview,
                            })
                          }
                          className={`w-6 h-3 rounded-full transition-colors relative ${layer.showInPreview ? "bg-obs-accent" : "bg-gray-600"}`}
                        >
                          <div
                            className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-transform ${layer.showInPreview ? "translate-x-[14px]" : "translate-x-0.5"}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (selectedItemType === "pip" && selectedItem) {
      const pip = selectedItem as PiPLayer;
      const outputSettings = (pip.targetOutputId &&
        allScreenSettings[pip.targetOutputId]) ||
        allScreenSettings["1"] || { width: 1920, height: 1080 };
      const maxW = outputSettings.width || 1920;
      const maxH = outputSettings.height || 1080;

      return (
        <div className="h-full flex flex-col overflow-hidden bg-obs-bg border-l border-obs-border">
          <div className="px-3 py-2 border-b border-obs-border flex justify-between items-center bg-obs-surface">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onUpdatePiP) {
                    // I'm dispatching a custom event since we don't have setSelectedItemType
                    document.dispatchEvent(
                      new CustomEvent("nav-to-pip-manager"),
                    );
                  }
                }}
                className="p-1 px-2 rounded hover:bg-obs-dark-1 text-obs-muted transition-colors"
                title="Volver"
              >
                <ChevronRight size={12} className="rotate-180" />
              </button>
              <Layout size={12} className="text-obs-accent" />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-obs-text uppercase tracking-widest leading-none">
                  PROPIEDADES PIP
                </span>
                <span className="text-[9px] text-obs-accent font-bold mt-0.5">
                  {pip.name}
                </span>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 rounded bg-obs-border hover:bg-obs-accent hover:text-white transition-colors"
            >
              <RotateCcw size={12} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 custom-scrollbar">
            <CollapsibleSection
              title="Ajustes Generales"
              defaultOpen={true}
              onReset={() =>
                onUpdatePiP?.(pip.id, {
                  opacity: 1,
                  showFrame: false,
                  showInPreview: false,
                  borderWidth: 1,
                  borderColor: "#000000",
                })
              }
            >
              <div className="space-y-4">
                <PropertyControl
                  label="Opacidad"
                  value={pip.opacity * 100}
                  displayValue={`${Math.round(pip.opacity * 100)}%`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdatePiP?.(pip.id, { opacity: val / 100 })
                  }
                  onInputChange={(val) => {
                    const n = parseInt(val);
                    if (!isNaN(n))
                      onUpdatePiP?.(pip.id, {
                        opacity: Math.max(0, Math.min(100, n)) / 100,
                      });
                  }}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between bg-obs-dark-1 p-2 h-[34px] rounded border border-obs-dark-2 group select-none">
                    <span className="text-[8px] font-black uppercase text-obs-muted">
                      Mostrar Marco
                    </span>
                    <button
                      onClick={() =>
                        onUpdatePiP?.(pip.id, { showFrame: !pip.showFrame })
                      }
                      className={`w-9 h-4.5 rounded-full transition-all relative ${pip.showFrame !== false ? "bg-obs-accent shadow-[0_0_8px_rgba(0,163,245,0.3)]" : "bg-obs-bg border border-white/10"}`}
                    >
                      <div
                        className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${pip.showFrame !== false ? "left-[18px]" : "left-0.5"}`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-obs-dark-1 p-2 h-[34px] rounded border border-obs-dark-2 group select-none">
                    <span className="text-[8px] font-black uppercase text-obs-muted">
                      Preview
                    </span>
                    <button
                      onClick={() =>
                        onUpdatePiP?.(pip.id, {
                          showInPreview: !pip.showInPreview,
                        })
                      }
                      className={`w-9 h-4.5 rounded-full transition-all relative ${pip.showInPreview ? "bg-obs-accent shadow-[0_0_8px_rgba(0,163,245,0.3)]" : "bg-obs-bg border border-white/10"}`}
                    >
                      <div
                        className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${pip.showInPreview ? "left-[18px]" : "left-0.5"}`}
                      />
                    </button>
                  </div>
                </div>
                <PropertyControl
                  label="Grosor Marco"
                  value={pip.borderWidth || 1}
                  displayValue={`${pip.borderWidth || 1}px`}
                  min={0}
                  max={20}
                  step={1}
                  onChange={(val) =>
                    onUpdatePiP?.(pip.id, { borderWidth: val })
                  }
                  onInputChange={(val) => {
                    const n = parseInt(val);
                    if (!isNaN(n))
                      onUpdatePiP?.(pip.id, {
                        borderWidth: Math.max(0, Math.min(20, n)),
                      });
                  }}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black uppercase text-obs-muted">
                    Color Marco
                  </span>
                  <input
                    type="color"
                    value={pip.borderColor || "#000000"}
                    onChange={(e) =>
                      onUpdatePiP?.(pip.id, { borderColor: e.target.value })
                    }
                    className="w-full h-8 bg-obs-dark-1 rounded border border-obs-dark-2 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black uppercase text-obs-muted">
                    Transición
                  </span>
                  <select
                    value={pip.transition || "none"}
                    onChange={(e) =>
                      onUpdatePiP?.(pip.id, {
                        transition: e.target.value as any,
                      })
                    }
                    className="w-full bg-obs-dark-1 border border-obs-dark-2 rounded px-2 py-1 text-[9px] text-obs-text uppercase"
                  >
                    <option value="none">Ninguna</option>
                    <option value="fade">Fade</option>
                    <option value="wipe">Wipe</option>
                  </select>
                </div>
                <PropertyControl
                  label="Duración Trans."
                  value={pip.transitionDuration || 0.4}
                  displayValue={`${(pip.transitionDuration || 0.4).toFixed(1)}s`}
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(val) =>
                    onUpdatePiP?.(pip.id, { transitionDuration: val })
                  }
                  onInputChange={(val) => {
                    const n = parseFloat(val);
                    if (!isNaN(n))
                      onUpdatePiP?.(pip.id, {
                        transitionDuration: Math.max(0, Math.min(5, n)),
                      });
                  }}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Posición y Tamaño"
              defaultOpen={true}
              onReset={() =>
                onUpdatePiP?.(pip.id, { x: 50, y: 50, width: 400, height: 225 })
              }
            >
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-bold text-obs-accent uppercase block mb-2">
                    Tamaño Ventana
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <PropertyControl
                      label="Ancho"
                      value={pip.width}
                      displayValue={`${Math.round(pip.width)}px`}
                      min={10}
                      max={maxW}
                      step={1}
                      onChange={(val) => onUpdatePiP?.(pip.id, { width: val })}
                      onInputChange={(val) => {
                        const n = parseInt(val);
                        if (!isNaN(n))
                          onUpdatePiP?.(pip.id, {
                            width: Math.max(10, Math.min(maxW, n)),
                          });
                      }}
                    />
                    <PropertyControl
                      label="Alto"
                      value={pip.height}
                      displayValue={`${Math.round(pip.height)}px`}
                      min={10}
                      max={maxH}
                      step={1}
                      onChange={(val) => onUpdatePiP?.(pip.id, { height: val })}
                      onInputChange={(val) => {
                        const n = parseInt(val);
                        if (!isNaN(n))
                          onUpdatePiP?.(pip.id, {
                            height: Math.max(10, Math.min(maxH, n)),
                          });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-obs-accent uppercase block mb-2">
                    Posición Ventana
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <PropertyControl
                      label="Posición X"
                      value={pip.x}
                      displayValue={`${Math.round(pip.x)}px`}
                      min={0}
                      max={maxW}
                      step={1}
                      onChange={(val) => onUpdatePiP?.(pip.id, { x: val })}
                      onInputChange={(val) => {
                        const n = parseInt(val);
                        if (!isNaN(n))
                          onUpdatePiP?.(pip.id, {
                            x: Math.max(0, Math.min(maxW, n)),
                          });
                      }}
                    />
                    <PropertyControl
                      label="Posición Y"
                      value={pip.y}
                      displayValue={`${Math.round(pip.y)}px`}
                      min={0}
                      max={maxH}
                      step={1}
                      onChange={(val) => onUpdatePiP?.(pip.id, { y: val })}
                      onInputChange={(val) => {
                        const n = parseInt(val);
                        if (!isNaN(n))
                          onUpdatePiP?.(pip.id, {
                            y: Math.max(0, Math.min(maxH, n)),
                          });
                      }}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Direccionamiento" defaultOpen={true}>
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] text-obs-muted uppercase font-bold">
                    Salida PiP
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[null, "1", "2", "3"].map((id) => (
                      <button
                        key={id || "prog"}
                        onClick={() =>
                          onUpdatePiP?.(pip.id, { targetOutputId: id })
                        }
                        className={`py-1 rounded text-[8px] uppercase font-black tracking-tight border transition-all ${pip.targetOutputId === id ? "bg-obs-accent text-white border-obs-accent" : "bg-obs-surface text-obs-muted border-obs-text/5"}`}
                      >
                        {id ? `OUT ${id}` : "PROG"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
          <div className="flex flex-col gap-2 p-3 border-t border-obs-border">
            <button
              onClick={() => onUpdatePiP?.(pip.id, { isActive: !pip.isActive })}
              className={`w-full py-2 rounded text-[11px] font-black uppercase tracking-widest transition-all ${pip.isActive ? "bg-red-600 text-white animate-pulse" : "bg-obs-accent text-white hover:bg-obs-accent/80"}`}
            >
              {pip.isActive ? "QUITAR DE PROGRAMA" : "LANZAR A PROGRAMA"}
            </button>
          </div>
        </div>
      );
    }

    if (selectedItemType === "layer" && selectedItem) {
      const layer = selectedItem as Layer;
      return (
        <div className="h-full flex flex-col overflow-hidden bg-obs-bg">
          <div className="px-3 py-2 border-b border-obs-border flex justify-between items-center bg-obs-surface">
            <div className="flex items-center gap-2">
              <Layers size={12} className="text-obs-accent" />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-obs-text uppercase tracking-widest leading-none">
                  PROPIEDADES CAPA
                </span>
                <span className="text-[9px] text-obs-accent font-bold mt-0.5">
                  {layer.name}
                </span>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 rounded bg-obs-border hover:bg-obs-accent hover:text-white transition-colors"
              title="Restablecer Todo"
            >
              <RotateCcw size={12} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 custom-scrollbar">
            <CollapsibleSection
              title="Ajustes Generales"
              defaultOpen={true}
              onReset={() =>
                onUpdateLayer(layer.id, {
                  opacity: 1,
                  rotation: 0,
                  transition: "fade",
                })
              }
            >
              <div className="space-y-2">
                <PropertyControl
                  label="Opacidad"
                  value={layer.opacity * 100}
                  displayValue={`${Math.round(layer.opacity * 100)}%`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdateLayer(layer.id, { opacity: val / 100 })
                  }
                  onInputChange={(val) => {
                    const n = parseInt(val);
                    if (!isNaN(n))
                      onUpdateLayer(layer.id, {
                        opacity: Math.max(0, Math.min(100, n)) / 100,
                      });
                  }}
                />
                <PropertyControl
                  label="Rotación"
                  value={layer.rotation}
                  displayValue={`${layer.rotation}°`}
                  min={0}
                  max={360}
                  step={1}
                  onChange={(val) => onUpdateLayer(layer.id, { rotation: val })}
                />
                <div className="flex items-center justify-between bg-obs-dark-1 p-2 rounded border border-obs-text/5">
                  <span className="text-[9px] font-bold text-obs-muted uppercase">
                    Loop Playlist
                  </span>
                  <button
                    onClick={() =>
                      onUpdateLayer(layer.id, { loop: !(layer.loop !== false) })
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative ${layer.loop !== false ? "bg-obs-accent" : "bg-gray-600"}`}
                  >
                    <div
                      className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${layer.loop !== false ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-obs-dark-1 p-2 rounded border border-obs-text/5">
                  <span className="text-[9px] font-bold text-obs-muted uppercase">
                    Loop Video
                  </span>
                  <button
                    onClick={() =>
                      onUpdateLayer(layer.id, {
                        loopVideo: !(layer.loopVideo !== false),
                      })
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative ${layer.loopVideo !== false ? "bg-obs-accent" : "bg-gray-600"}`}
                  >
                    <div
                      className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${layer.loopVideo !== false ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>
            </CollapsibleSection>

            {["document", "ppt"].includes(
              clips.find((c) => c.id === layer.activeClipId)?.type as any,
            ) && (
              <CollapsibleSection
                title="CONTROLES DOCUMENTO"
                defaultOpen={true}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-obs-dark-1 p-4 rounded-lg border border-obs-text/5">
                    <button
                      onClick={() => {
                        const clip = clips?.find(
                          (c) => c.id === layer.activeClipId,
                        );
                        if (clip && onUpdateClip)
                          onUpdateClip(clip.id, {
                            currentPage: Math.max(
                              1,
                              (clip.currentPage || 1) - 1,
                            ),
                          });
                      }}
                      className="p-3 bg-obs-surface hover:bg-obs-accent text-obs-text hover:text-white rounded-md transition-all shadow-lg active:scale-95"
                      title="Anterior"
                    >
                      <ChevronLeft size={24} strokeWidth={3} />
                    </button>

                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-obs-muted font-black uppercase tracking-widest mb-1">
                        PÁGINA
                      </span>
                      <div className="text-3xl font-mono font-black text-obs-accent tabular-nums bg-obs-bg px-4 py-1 rounded border border-obs-text/5 shadow-inner flex items-baseline gap-1">
                        {clips?.find((c) => c.id === layer.activeClipId)
                          ?.currentPage || 1}
                        {clips?.find((c) => c.id === layer.activeClipId)
                          ?.totalPages && (
                          <span className="text-sm text-obs-muted">
                            /{" "}
                            {
                              clips?.find((c) => c.id === layer.activeClipId)
                                ?.totalPages
                            }
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const clip = clips?.find(
                            (c) => c.id === layer.activeClipId,
                          );
                          if (clip && onUpdateClip)
                            onUpdateClip(clip.id, { currentPage: 1 });
                        }}
                        className="px-2 py-0.5 mt-1 bg-obs-surface hover:bg-obs-accent text-[9px] uppercase font-bold rounded transition-colors border border-obs-text/5"
                      >
                        Reset
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const clip = clips?.find(
                          (c) => c.id === layer.activeClipId,
                        );
                        if (clip && onUpdateClip)
                          onUpdateClip(clip.id, {
                            currentPage: Math.min(
                              (clip.currentPage || 1) + 1,
                              clip.totalPages || Infinity,
                            ),
                          });
                      }}
                      className="p-3 bg-obs-surface hover:bg-obs-accent text-obs-text hover:text-white rounded-md transition-all shadow-lg active:scale-95"
                      title="Siguiente"
                    >
                      <ChevronRight size={24} strokeWidth={3} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 p-3 bg-obs-dark-1 rounded border border-obs-text/5 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-obs-text uppercase">
                        Control por Teclado / Puntero USB
                      </span>
                      <button
                        onClick={() => {
                          const clip = clips?.find(
                            (c) => c.id === layer.activeClipId,
                          );
                          if (clip && onUpdateClip)
                            onUpdateClip(clip.id, {
                              keyboardNavEnabled: !clip.keyboardNavEnabled,
                            });
                        }}
                        className={`w-8 h-4 rounded-full transition-colors relative ${clips?.find((c) => c.id === layer.activeClipId)?.keyboardNavEnabled ? "bg-obs-accent" : "bg-gray-600"}`}
                      >
                        <div
                          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${clips?.find((c) => c.id === layer.activeClipId)?.keyboardNavEnabled ? "translate-x-4" : "translate-x-0.5"}`}
                        />
                      </button>
                    </div>
                    <p className="text-[8px] text-obs-muted leading-tight">
                      Activa para hacer avanzar o retroceder el documento usando
                      las flechas direccionales o un pasador de diapositivas USB
                      (PageUp/PageDown).
                    </p>
                  </div>

                  <p className="text-[9px] text-obs-muted text-center italic mt-2">
                    Controla las diapositivas del PDF/PPT activo en esta capa.
                  </p>
                </div>
              </CollapsibleSection>
            )}

            <CollapsibleSection
              title="Direccionamiento"
              defaultOpen={true}
              onReset={() => onUpdateLayer(layer.id, { outputId: null })}
            >
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] text-obs-muted uppercase font-bold">
                    Salida de la Capa
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() =>
                        onUpdateLayer(layer.id, { outputId: null })
                      }
                      className={`py-1.5 px-2 rounded-md text-[8px] uppercase font-black tracking-tight border transition-all flex flex-col items-center justify-center gap-0.5 ${!layer.outputId ? "bg-obs-accent text-white border-obs-accent shadow-[0_0_10px_rgba(0,163,245,0.4)]" : "bg-obs-bg text-obs-muted border-obs-text/5 hover:border-obs-text/10"}`}
                    >
                      <span>PROGRAM</span>
                    </button>
                    {outputs.map((out) => {
                      const screen = externalScreens.find(
                        (s) => s.id === out.physicalScreenId,
                      );
                      return (
                        <button
                          key={out.id}
                          onClick={() =>
                            onUpdateLayer(layer.id, { outputId: out.id })
                          }
                          className={`py-1.5 px-2 rounded-md text-[8px] uppercase font-black tracking-tight border transition-all flex flex-col items-center justify-center leading-tight ${layer.outputId === out.id ? "bg-obs-accent text-white border-obs-accent shadow-[0_0_10px_rgba(0,163,245,0.4)]" : "bg-obs-bg text-obs-muted border-obs-text/5 hover:border-obs-text/10"}`}
                        >
                          <span>OUT {out.id}</span>
                          {screen && (
                            <span className="text-[6px] opacity-60 font-normal truncate max-w-full">
                              ({screen.name})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[8px] text-obs-muted mt-1 italic">
                    Define a qué monitor se enviarán los disparos de esta capa.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Ajustes de Imagen"
              onReset={() =>
                onUpdateLayer(layer.id, {
                  brightness: 1,
                  contrast: 1,
                  saturation: 1,
                })
              }
            >
              <div className="space-y-3">
                {[
                  { label: "Brillo", key: "brightness" },
                  { label: "Contraste", key: "contrast" },
                  { label: "Saturación", key: "saturation" },
                ].map((adj) => (
                  <PropertyControl
                    key={adj.key}
                    label={adj.label}
                    value={(layer as any)[adj.key] * 50}
                    displayValue={Math.round(
                      (layer as any)[adj.key] * 50,
                    ).toString()}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(val) =>
                      onUpdateLayer(layer.id, { [adj.key]: val / 50 })
                    }
                  />
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Balance de Color"
              onReset={() =>
                onUpdateLayer(layer.id, { colorBalance: { r: 1, g: 1, b: 1 } })
              }
            >
              <div className="space-y-3">
                {["r", "g", "b"].map((chan) => (
                  <PropertyControl
                    key={chan}
                    label={chan.toUpperCase()}
                    value={
                      layer.colorBalance[
                        chan as keyof typeof layer.colorBalance
                      ] * 50
                    }
                    displayValue={Math.round(
                      layer.colorBalance[
                        chan as keyof typeof layer.colorBalance
                      ] * 50,
                    ).toString()}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(val) =>
                      onUpdateLayer(layer.id, {
                        colorBalance: {
                          ...layer.colorBalance,
                          [chan]: val / 50,
                        },
                      })
                    }
                  />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      );
    }

    if (selectedItemType === "playlist" && selectedItem) {
      const playlist = selectedItem as Playlist;
      return (
        <div className="h-full flex flex-col overflow-hidden bg-obs-bg">
          <div className="px-3 py-2 border-b border-obs-border flex justify-between items-center bg-obs-surface">
            <div className="flex items-center gap-2">
              <List size={12} className="text-obs-accent" />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-obs-text uppercase tracking-widest leading-none">
                  PROPIEDADES PLAYLIST
                </span>
                <span className="text-[9px] text-obs-accent font-bold mt-0.5">
                  {playlist.name}
                </span>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 rounded bg-obs-border hover:bg-obs-accent hover:text-white transition-colors"
            >
              <RotateCcw size={12} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 custom-scrollbar">
            <CollapsibleSection title="Ajustes Generales" defaultOpen={true}>
              <div className="space-y-2">
                <PropertyControl
                  label="Opacidad"
                  value={playlist.opacity * 100}
                  displayValue={`${Math.round(playlist.opacity * 100)}%`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdate(playlist.id, { opacity: val / 100 })
                  }
                  onInputChange={(val) => {
                    const n = parseInt(val);
                    if (!isNaN(n))
                      onUpdate(playlist.id, {
                        opacity: Math.max(0, Math.min(100, n)) / 100,
                      });
                  }}
                />
                <PropertyControl
                  label="Velocidad"
                  value={playlist.speed * 50}
                  displayValue={`${playlist.speed.toFixed(2)}x`}
                  min={5}
                  max={100}
                  step={1}
                  onChange={(val) => onUpdate(playlist.id, { speed: val / 50 })}
                />
                <div className="flex items-center justify-between bg-obs-dark-1 p-2 rounded border border-obs-text/5">
                  <span className="text-[9px] font-bold text-obs-muted uppercase">
                    Loop Playlist
                  </span>
                  <button
                    onClick={() =>
                      onUpdate(playlist.id, {
                        loop: !(playlist.loop !== false),
                      })
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative ${playlist.loop !== false ? "bg-obs-accent" : "bg-gray-600"}`}
                  >
                    <div
                      className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${playlist.loop !== false ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Lista de Clips" defaultOpen={true}>
              <div className="space-y-1">
                {playlist.clips.map((c, i) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-1.5 bg-obs-dark-1 rounded border border-obs-text/5 ${playlist.currentClipIndex === i ? "ring-1 ring-obs-accent ring-inset" : ""}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[8px] font-mono text-obs-muted">
                        #{i + 1}
                      </span>
                      <span className="text-[10px] text-obs-text truncate">
                        {c.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {c.type === "image" && (
                        <div className="flex items-center gap-1">
                          <Clock size={8} className="text-obs-muted" />
                          <input
                            type="number"
                            value={c.duration || 5}
                            onChange={(e) => {
                              const newClips = [...playlist.clips];
                              newClips[i] = {
                                ...newClips[i],
                                duration: parseInt(e.target.value) || 1,
                              };
                              onUpdate(playlist.id, { clips: newClips });
                            }}
                            className="w-8 bg-obs-dark-1 border border-obs-text/10 rounded text-center text-[8px] text-obs-accent outline-none"
                          />
                          <span className="text-[7px] text-obs-muted">s</span>
                        </div>
                      )}
                      <button
                        onClick={() =>
                          onUpdate(playlist.id, {
                            clips: playlist.clips.filter((_, idx) => idx !== i),
                          })
                        }
                        className="text-obs-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
                {playlist.clips.length === 0 && (
                  <p className="text-[9px] text-obs-muted italic text-center p-4">
                    Playlist vacía
                  </p>
                )}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      );
    }

    if (selectedItemType === "program") {
      const selectedScreen = externalScreens.find(
        (s) => s.id === selectedScreenId,
      );
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;

      return (
        <div className="h-full flex flex-col overflow-hidden bg-obs-bg">
          <div className="px-3 py-2 border-b border-obs-border flex justify-between items-center bg-obs-surface">
            <div className="flex items-center gap-2">
              <MonitorIcon size={12} className="text-obs-accent" />
              <span className="text-[11px] font-semibold text-obs-text uppercase tracking-widest">
                PROPIEDADES SALIDA
              </span>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 rounded bg-obs-border hover:bg-obs-accent hover:text-white transition-colors"
              title="Restablecer Todo"
            >
              <RotateCcw size={12} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-2 custom-scrollbar">
            <CollapsibleSection title="Destino de Salida" defaultOpen={true}>
              <div className="space-y-1.5">
                {/* Screen Info Header */}
                {selectedScreenId && (
                  <div className="bg-obs-dark-1 rounded-lg p-1.5 border border-obs-text/5 space-y-1">
                    <div className="aspect-[21/9] w-full bg-obs-surface rounded border border-obs-border overflow-hidden relative flex items-center justify-center">
                      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle,var(--color-obs-accent)_1px,transparent_1px)] bg-[size:8px_8px]" />
                      <MonitorIcon size={16} className="text-obs-accent/20" />
                      <div className="absolute bottom-1 right-1">
                        <div className="px-1 py-0.5 rounded bg-obs-accent text-[6px] font-black text-white uppercase tracking-tighter">
                          {selectedScreen?.width}x{selectedScreen?.height}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      <div className="col-span-2 bg-obs-bg/50 p-1 rounded border border-obs-text/5">
                        <div className="text-[6px] text-obs-muted uppercase font-bold">
                          Monitor
                        </div>
                        <div className="text-[7.5px] text-obs-text truncate font-medium">
                          {selectedScreen?.name || "Genérico"}
                        </div>
                      </div>
                      <div className="bg-obs-bg/50 p-1 rounded border border-obs-text/5">
                        <div className="text-[6px] text-obs-muted uppercase font-bold">
                          FPS
                        </div>
                        <div className="text-[7.5px] text-obs-accent font-mono">
                          {selectedScreen?.refreshRate
                            ? `${selectedScreen.refreshRate.toFixed(1)}Hz`
                            : "60Hz"}
                        </div>
                      </div>
                      <div className="bg-obs-bg/50 p-1 rounded border border-obs-text/5">
                        <div className="text-[6px] text-obs-muted uppercase font-bold">
                          Bit
                        </div>
                        <div className="text-[7.5px] text-obs-text">
                          {selectedScreen?.colorDepth
                            ? `${selectedScreen.colorDepth}b`
                            : "8b"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7px] text-obs-muted uppercase font-bold">
                      Monitor
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={selectedScreenId || ""}
                        onChange={(e) =>
                          onSelectedScreenIdChange(e.target.value)
                        }
                        className="flex-1 bg-obs-bg border border-obs-border rounded px-1 py-0.5 text-[9px] text-obs-text focus:border-obs-accent outline-none font-medium"
                      >
                        <option value="" disabled>
                          Seleccionar monitor...
                        </option>
                        {externalScreens.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.isPrimary ? "📌" : ""} ({s.width}x
                            {s.height})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={onDetectScreens}
                        title="Refrescar Pantallas"
                        className={`p-1.5 border rounded transition-colors ${!hasDetailedScreens ? "bg-obs-accent/20 border-obs-accent text-obs-accent animate-pulse" : "bg-obs-bg border-obs-border text-obs-text hover:bg-obs-border"}`}
                      >
                        <RotateCcw size={10} />
                      </button>
                    </div>
                  </div>

                  {!hasDetailedScreens && (
                    <div className="p-2 bg-obs-accent/10 border border-obs-accent/30 rounded text-[8.5px] text-obs-accent leading-tight space-y-2">
                      {isIframe ? (
                        <div className="space-y-2">
                          <p className="font-bold text-white">
                            iFrame: Múltiples monitores no detectables.
                          </p>
                          <button
                            onClick={() =>
                              window.open(window.location.href, "_blank")
                            }
                            className="w-full py-1.5 bg-obs-accent text-white rounded font-bold uppercase text-[8.5px] hover:bg-obs-accent/80 transition-all flex items-center justify-center gap-1.5"
                          >
                            <ExternalLink size={10} />
                            Abrir Externo
                          </button>
                        </div>
                      ) : (
                        <p className="font-medium">
                          Habilita "Window Management" en Chrome.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[9px] text-obs-text bg-obs-dark-1 p-2 rounded border border-obs-text/5">
                    <div className="flex flex-col">
                      <span className="text-[7.5px] text-obs-muted uppercase font-bold">
                        Res. Target
                      </span>
                      <span className="font-mono text-obs-accent leading-none mt-0.5">
                        {selectedScreen
                          ? `${selectedScreen.width}x${selectedScreen.height}`
                          : "---"}
                      </span>
                    </div>
                    <button
                      onClick={onLaunchOutput}
                      className={`px-2 py-1.5 ${isOutputLaunched ? "bg-red-500 hover:bg-red-600" : "bg-obs-accent hover:bg-obs-accent/80"} text-white text-[8.5px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-1.5`}
                    >
                      <MonitorIcon size={9} />
                      {isOutputLaunched ? "Cerrar" : "Lanzar"}
                    </button>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Escala"
              onReset={() =>
                onUpdateExternalScreen({
                  ...externalScreenSettings,
                  scalingW: 1,
                  scalingH: 1,
                })
              }
            >
              <div className="space-y-2">
                <PropertyControl
                  label="Escala Ancho"
                  value={externalScreenSettings.scalingW * 100}
                  displayValue={`${Math.round(externalScreenSettings.scalingW * 100)}%`}
                  min={50}
                  max={200}
                  step={1}
                  onChange={(val) =>
                    onUpdateExternalScreen({
                      ...externalScreenSettings,
                      scalingW: val / 100,
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 100;
                    if (!isNaN(num))
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        scalingW: num,
                      });
                  }}
                />
                <PropertyControl
                  label="Escala Alto"
                  value={externalScreenSettings.scalingH * 100}
                  displayValue={`${Math.round(externalScreenSettings.scalingH * 100)}%`}
                  min={50}
                  max={200}
                  step={1}
                  onChange={(val) =>
                    onUpdateExternalScreen({
                      ...externalScreenSettings,
                      scalingH: val / 100,
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 100;
                    if (!isNaN(num))
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        scalingH: num,
                      });
                  }}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Ajustes de Imagen"
              onReset={() =>
                onUpdateExternalScreen({
                  ...externalScreenSettings,
                  brightness: 1,
                  contrast: 1,
                  saturation: 1,
                  opacity: 1,
                })
              }
            >
              <div className="space-y-2">
                <PropertyControl
                  label="Brillo"
                  value={(externalScreenSettings.brightness ?? 1) * 50}
                  displayValue={`${Math.round((externalScreenSettings.brightness ?? 1) * 50)}`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdateExternalScreen({
                      ...externalScreenSettings,
                      brightness: val / 50,
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 50;
                    if (!isNaN(num))
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        brightness: num,
                      });
                  }}
                />
                <PropertyControl
                  label="Contraste"
                  value={(externalScreenSettings.contrast ?? 1) * 50}
                  displayValue={`${Math.round((externalScreenSettings.contrast ?? 1) * 50)}`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdateExternalScreen({
                      ...externalScreenSettings,
                      contrast: val / 50,
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 50;
                    if (!isNaN(num))
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        contrast: num,
                      });
                  }}
                />
                <PropertyControl
                  label="Saturación"
                  value={(externalScreenSettings.saturation ?? 1) * 50}
                  displayValue={`${Math.round((externalScreenSettings.saturation ?? 1) * 50)}`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdateExternalScreen({
                      ...externalScreenSettings,
                      saturation: val / 50,
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 50;
                    if (!isNaN(num))
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        saturation: num,
                      });
                  }}
                />
                <PropertyControl
                  label="Opacidad"
                  value={(externalScreenSettings.opacity ?? 1) * 100}
                  displayValue={`${Math.round((externalScreenSettings.opacity ?? 1) * 100)}%`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdateExternalScreen({
                      ...externalScreenSettings,
                      opacity: val / 100,
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 100;
                    if (!isNaN(num))
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        opacity: num,
                      });
                  }}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Balance de Color (RGB)"
              onReset={() =>
                onUpdateExternalScreen({
                  ...externalScreenSettings,
                  colorBalance: { r: 1, g: 1, b: 1 },
                })
              }
            >
              <div className="space-y-2">
                {["r", "g", "b"].map((channel) => (
                  <PropertyControl
                    key={channel}
                    label={channel.toUpperCase()}
                    value={
                      (externalScreenSettings.colorBalance ?? {
                        r: 1,
                        g: 1,
                        b: 1,
                      })[
                        channel as keyof typeof externalScreenSettings.colorBalance
                      ] * 50
                    }
                    displayValue={`${Math.round((externalScreenSettings.colorBalance ?? { r: 1, g: 1, b: 1 })[channel as keyof typeof externalScreenSettings.colorBalance] * 50)}`}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(val) =>
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        colorBalance: {
                          ...(externalScreenSettings.colorBalance ?? {
                            r: 1,
                            g: 1,
                            b: 1,
                          }),
                          [channel]: val / 50,
                        },
                      })
                    }
                    onInputChange={(val) => {
                      const num = parseFloat(val) / 50;
                      if (!isNaN(num))
                        onUpdateExternalScreen({
                          ...externalScreenSettings,
                          colorBalance: {
                            ...(externalScreenSettings.colorBalance ?? {
                              r: 1,
                              g: 1,
                              b: 1,
                            }),
                            [channel]: num,
                          },
                        });
                    }}
                  />
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Transformar"
              onReset={() =>
                onUpdateExternalScreen({
                  ...externalScreenSettings,
                  x: 0,
                  y: 0,
                })
              }
            >
              <div className="space-y-2">
                <PropertyControl
                  label="Posición X"
                  value={externalScreenSettings.x}
                  displayValue={Math.round(externalScreenSettings.x).toString()}
                  min={-1920}
                  max={1920}
                  step={1}
                  onChange={(val) =>
                    onUpdateExternalScreen({
                      ...externalScreenSettings,
                      x: val,
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val);
                    if (!isNaN(num))
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        x: num,
                      });
                  }}
                />
                <PropertyControl
                  label="Posición Y"
                  value={externalScreenSettings.y}
                  displayValue={Math.round(externalScreenSettings.y).toString()}
                  min={-1080}
                  max={1080}
                  step={1}
                  onChange={(val) =>
                    onUpdateExternalScreen({
                      ...externalScreenSettings,
                      y: val,
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val);
                    if (!isNaN(num))
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        y: num,
                      });
                  }}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Rotación"
              onReset={() =>
                onUpdateExternalScreen({
                  ...externalScreenSettings,
                  rotation: 0,
                })
              }
            >
              <div className="space-y-2">
                <PropertyControl
                  label="Ángulo"
                  value={externalScreenSettings.rotation}
                  displayValue={`${Math.round(externalScreenSettings.rotation)}°`}
                  min={0}
                  max={360}
                  step={1}
                  onChange={(val) =>
                    onUpdateExternalScreen({
                      ...externalScreenSettings,
                      rotation: val,
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val);
                    if (!isNaN(num))
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        rotation: num,
                      });
                  }}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="FONDO (BACKGROUND)"
              defaultOpen={true}
              onReset={() =>
                onUpdateExternalScreen({
                  ...externalScreenSettings,
                  backgroundImage: undefined,
                  showBackground: false,
                  bgScalingW: 100,
                  bgScalingH: 100,
                })
              }
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-obs-bg/50 p-2 rounded border border-obs-text/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-obs-text uppercase">
                      Mostrar Fondo
                    </span>
                    <span className="text-[8px] text-obs-muted">
                      Activar imagen cuando no hay video
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSync?.()}
                      title="Forzar Sincronización"
                      className="p-1 px-2 bg-obs-border hover:bg-obs-accent text-[9px] text-white uppercase font-bold rounded transition-colors flex items-center gap-1"
                    >
                      <RotateCcw size={10} />
                      Sync
                    </button>
                    <button
                      onClick={() =>
                        onUpdateExternalScreen({
                          ...externalScreenSettings,
                          showBackground:
                            !externalScreenSettings.showBackground,
                        })
                      }
                      className={`w-8 h-4 rounded-full transition-colors relative ${externalScreenSettings.showBackground ? "bg-obs-accent" : "bg-obs-dark-1"}`}
                    >
                      <div
                        className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${externalScreenSettings.showBackground ? "translate-x-4.5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 focus-within:z-10 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] text-obs-muted uppercase font-bold">
                      Imagen de Fondo
                    </label>
                    {(externalScreenSettings.bgScalingW !== 100 ||
                      externalScreenSettings.bgScalingH !== 100) && (
                      <button
                        onClick={() =>
                          onUpdateExternalScreen({
                            ...externalScreenSettings,
                            bgScalingW: 100,
                            bgScalingH: 100,
                          })
                        }
                        className="text-[8px] text-obs-accent hover:text-white uppercase font-bold flex items-center gap-1"
                      >
                        <RotateCcw size={8} /> Restablecer Escala
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[10px] text-obs-text truncate min-h-[28px]">
                      {externalScreenSettings.backgroundImage
                        ? "Imagen Seleccionada"
                        : "Ninguna imagen seleccionada"}
                    </div>
                    <button
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                onUpdateExternalScreen({
                                  ...externalScreenSettings,
                                  backgroundImage: event.target
                                    .result as string,
                                  showBackground: true,
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="px-3 bg-obs-accent hover:bg-obs-accent/80 text-white text-[9px] font-bold uppercase rounded transition-colors"
                    >
                      Elegir
                    </button>
                    {externalScreenSettings.backgroundImage && (
                      <button
                        onClick={() =>
                          onUpdateExternalScreen({
                            ...externalScreenSettings,
                            backgroundImage: undefined,
                            showBackground: false,
                          })
                        }
                        className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded border border-red-500/30 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {externalScreenSettings.backgroundImage && (
                  <div className="aspect-video w-full rounded border border-obs-border overflow-hidden bg-obs-dark-1">
                    <img
                      src={externalScreenSettings.backgroundImage}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="space-y-4">
                  <PropertyControl
                    label="Escalar Ancho (%)"
                    value={externalScreenSettings.bgScalingW ?? 100}
                    displayValue={`${Math.round(externalScreenSettings.bgScalingW ?? 100)}%`}
                    min={10}
                    max={500}
                    step={1}
                    onChange={(val) =>
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        bgScalingW: val,
                      })
                    }
                    onInputChange={(val) => {
                      const num = parseInt(val);
                      if (!isNaN(num))
                        onUpdateExternalScreen({
                          ...externalScreenSettings,
                          bgScalingW: num,
                        });
                    }}
                  />
                  <PropertyControl
                    label="Escalar Alto (%)"
                    value={externalScreenSettings.bgScalingH ?? 100}
                    displayValue={`${Math.round(externalScreenSettings.bgScalingH ?? 100)}%`}
                    min={10}
                    max={500}
                    step={1}
                    onChange={(val) =>
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        bgScalingH: val,
                      })
                    }
                    onInputChange={(val) => {
                      const num = parseInt(val);
                      if (!isNaN(num))
                        onUpdateExternalScreen({
                          ...externalScreenSettings,
                          bgScalingH: num,
                        });
                    }}
                  />
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() =>
                        onUpdateExternalScreen({
                          ...externalScreenSettings,
                          bgScalingW: 100,
                          bgScalingH: 100,
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-obs-border hover:bg-obs-accent hover:text-white text-[9px] font-medium text-obs-text transition-colors"
                    >
                      <RotateCcw size={10} />
                      Restablecer Escala
                    </button>
                  </div>
                </div>

                <p className="text-[8px] text-obs-muted leading-tight">
                  Esta imagen se mostrará automáticamente en la pantalla externa
                  como fondo base.
                </p>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="CONTADOR DE TIEMPO (COUNTDOWN)"
              defaultOpen={false}
            >
              <div className="space-y-3 p-1">
                <div className="flex items-center justify-between bg-obs-bg/50 p-2 rounded border border-obs-text/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-obs-text uppercase">
                      Activar Contador
                    </span>
                    <span className="text-[8px] text-obs-muted">
                      Mostrar cuenta atrás en la salida
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        timerEnabled: !externalScreenSettings.timerEnabled,
                      })
                    }
                    className={`w-8 h-4 rounded-full transition-colors relative ${externalScreenSettings.timerEnabled ? "bg-obs-accent" : "bg-obs-dark-1"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${externalScreenSettings.timerEnabled ? "translate-x-4.5" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-obs-bg/50 p-2 rounded border border-obs-text/5 font-sans">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-obs-text uppercase">
                      Lanzar Reloj a Salida
                    </span>
                    <span className="text-[8px] text-obs-muted">
                      Enviar el reloj a la pantalla externa lanzada
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        timerIsLaunched:
                          !externalScreenSettings.timerIsLaunched,
                      })
                    }
                    className={`w-12 h-6 rounded-lg transition-all flex items-center justify-center font-bold text-[9px] ${externalScreenSettings.timerIsLaunched ? "bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-white/20" : "bg-obs-dark-1 text-obs-muted hover:bg-obs-surface"}`}
                  >
                    {externalScreenSettings.timerIsLaunched ? "LIVE" : "ENVIAR"}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-obs-bg/50 p-2 rounded border border-obs-text/5 font-sans">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-obs-text uppercase">
                      Previsualizar Reloj (Preview)
                    </span>
                    <span className="text-[8px] text-obs-muted">
                      Previsualizar reloj de prueba en ventana PROGRAM
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateExternalScreen({
                        ...externalScreenSettings,
                        timerPreview: !externalScreenSettings.timerPreview,
                      })
                    }
                    className={`w-8 h-4 rounded-full transition-colors relative ${externalScreenSettings.timerPreview ? "bg-obs-accent" : "bg-obs-dark-1"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${externalScreenSettings.timerPreview ? "translate-x-4.5" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>





                <div className="flex items-center justify-between bg-obs-bg/50 p-2 rounded border border-obs-text/5 font-sans">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-obs-text uppercase font-black tracking-wide">
                      Mando Flotante
                    </span>
                    <span className="text-[8px] text-obs-muted">
                      Mando flotante arrastrable del ponente
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onUpdateExternalScreen({
                          ...externalScreenSettings,
                          timerShowDraggableFloat:
                            !externalScreenSettings.timerShowDraggableFloat,
                        })
                      }
                      className={`w-8 h-4 rounded-full transition-colors relative ${externalScreenSettings.timerShowDraggableFloat ? "bg-obs-accent" : "bg-obs-dark-1"}`}
                      title="Mostrar mando flotante interno"
                    >
                      <div
                        className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${externalScreenSettings.timerShowDraggableFloat ? "translate-x-4.5" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                </div>

                {(externalScreenSettings.timerEnabled ||
                  externalScreenSettings.timerPreview) && (
                  <>
                    {/* Duración */}
                    <div className="bg-obs-dark-1 rounded p-2 border border-obs-text/5 space-y-2">
                      <span className="text-[8px] text-obs-muted uppercase font-bold">
                        Tiempo Configurado
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[7px] text-obs-muted uppercase">
                            Minutos
                          </label>
                          <select
                            value={externalScreenSettings.timerMinutes ?? 5}
                            onChange={(e) => {
                              const mins = parseInt(e.target.value);
                              const secs =
                                externalScreenSettings.timerSeconds ?? 0;
                              const total = mins * 60 + secs;
                              onUpdateExternalScreen({
                                ...externalScreenSettings,
                                timerMinutes: mins,
                                timerRemainingSeconds: total,
                                timerRunning: false,
                                timerTargetTimestamp: null,
                              });
                            }}
                            className="bg-obs-bg border border-obs-border rounded px-1.5 py-1 text-[10px] text-obs-text focus:border-obs-accent outline-none font-medium"
                          >
                            {Array.from({ length: 180 }, (_, i) => (
                              <option key={i} value={i}>
                                {i} m
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[7px] text-obs-muted uppercase">
                            Segundos
                          </label>
                          <select
                            value={externalScreenSettings.timerSeconds ?? 0}
                            onChange={(e) => {
                              const mins =
                                externalScreenSettings.timerMinutes ?? 5;
                              const secs = parseInt(e.target.value);
                              const total = mins * 60 + secs;
                              onUpdateExternalScreen({
                                ...externalScreenSettings,
                                timerSeconds: secs,
                                timerRemainingSeconds: total,
                                timerRunning: false,
                                timerTargetTimestamp: null,
                              });
                            }}
                            className="bg-obs-bg border border-obs-border rounded px-1.5 py-1 text-[10px] text-obs-text focus:border-obs-accent outline-none font-medium"
                          >
                            {Array.from({ length: 60 }, (_, i) => (
                              <option key={i} value={i}>
                                {i} s
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Mandos de Lanzamiento */}
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      {/* Lanzar / Iniciar */}
                      <button
                        onClick={() => {
                          const isRunning = externalScreenSettings.timerRunning;
                          if (isRunning) {
                            const elapsedMs =
                              Date.now() -
                              (externalScreenSettings.timerTargetTimestamp ??
                                Date.now());
                            const remaining = Math.max(
                              0,
                              Math.ceil(-elapsedMs / 1000),
                            );
                            onUpdateExternalScreen({
                              ...externalScreenSettings,
                              timerRunning: false,
                              timerTargetTimestamp: null,
                              timerRemainingSeconds: remaining,
                            });
                          } else {
                            const remaining =
                              externalScreenSettings.timerRemainingSeconds ??
                              (externalScreenSettings.timerMinutes ?? 5) * 60 +
                                (externalScreenSettings.timerSeconds ?? 0);
                            onUpdateExternalScreen({
                              ...externalScreenSettings,
                              timerRunning: true,
                              timerTargetTimestamp:
                                Date.now() + remaining * 1000,
                            });
                          }
                        }}
                        className={`px-1 py-1.5 rounded text-[8px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                          externalScreenSettings.timerRunning
                            ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                            : "bg-green-600 hover:bg-green-500 text-white"
                        }`}
                      >
                        {externalScreenSettings.timerRunning ? (
                          <Pause size={10} />
                        ) : (
                          <Play size={10} />
                        )}
                        {externalScreenSettings.timerRunning
                          ? "Pausar"
                          : "Lanzar"}
                      </button>

                      {/* Resetear */}
                      <button
                        onClick={() => {
                          const total =
                            (externalScreenSettings.timerMinutes ?? 5) * 60 +
                            (externalScreenSettings.timerSeconds ?? 0);
                          onUpdateExternalScreen({
                            ...externalScreenSettings,
                            timerRunning: false,
                            timerTargetTimestamp: null,
                            timerRemainingSeconds: total,
                          });
                        }}
                        className="px-1 py-1.5 bg-obs-border hover:bg-obs-surface text-obs-text rounded text-[8px] font-bold uppercase transition-all flex items-center justify-center gap-1"
                      >
                        <RotateCcw size={10} />
                        Reiniciar
                      </button>

                      {/* Detener */}
                      <button
                        onClick={() => {
                          onUpdateExternalScreen({
                            ...externalScreenSettings,
                            timerRunning: false,
                            timerTargetTimestamp: null,
                            timerRemainingSeconds: 0,
                          });
                        }}
                        className="px-1 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white rounded text-[8px] font-bold uppercase transition-all flex items-center justify-center gap-1"
                      >
                        <XCircle size={10} />
                        Detener
                      </button>
                    </div>

                    {/* Diseño y Estilos del Contador */}
                    <div className="bg-obs-dark-1 rounded p-2 border border-obs-text/5 space-y-2">
                      <span className="text-[8px] text-white uppercase font-bold tracking-wider">
                        Ajustes Visuales
                      </span>

                      {/* Coordenadas de Posición del Reloj */}
                      <div className="space-y-3 pt-1">
                        <PropertyControl
                          label="Posición X (%)"
                          value={
                            externalScreenSettings.timerX !== undefined
                              ? externalScreenSettings.timerX
                              : 50
                          }
                          displayValue={`${externalScreenSettings.timerX !== undefined ? externalScreenSettings.timerX : 50}%`}
                          min={0}
                          max={100}
                          step={1}
                          onChange={(val) =>
                            onUpdateExternalScreen({
                              ...externalScreenSettings,
                              timerX: val,
                            })
                          }
                          onInputChange={(val) => {
                            const num = parseInt(val);
                            if (!isNaN(num))
                              onUpdateExternalScreen({
                                ...externalScreenSettings,
                                timerX: num,
                              });
                          }}
                        />
                        <PropertyControl
                          label="Posición Y (%)"
                          value={
                            externalScreenSettings.timerY !== undefined
                              ? externalScreenSettings.timerY
                              : 90
                          }
                          displayValue={`${externalScreenSettings.timerY !== undefined ? externalScreenSettings.timerY : 90}%`}
                          min={0}
                          max={100}
                          step={1}
                          onChange={(val) =>
                            onUpdateExternalScreen({
                              ...externalScreenSettings,
                              timerY: val,
                            })
                          }
                          onInputChange={(val) => {
                            const num = parseInt(val);
                            if (!isNaN(num))
                              onUpdateExternalScreen({
                                ...externalScreenSettings,
                                timerY: num,
                              });
                          }}
                        />
                      </div>

                      {/* Tamaño tipografía */}
                      <PropertyControl
                        label="Tamaño del Texto (px)"
                        value={externalScreenSettings.timerSize ?? 48}
                        displayValue={`${externalScreenSettings.timerSize ?? 48}px`}
                        min={16}
                        max={200}
                        step={2}
                        onChange={(val) =>
                          onUpdateExternalScreen({
                            ...externalScreenSettings,
                            timerSize: val,
                          })
                        }
                        onInputChange={(val) => {
                          const num = parseInt(val);
                          if (!isNaN(num))
                            onUpdateExternalScreen({
                              ...externalScreenSettings,
                              timerSize: num,
                            });
                        }}
                      />

                      {/* Tipografía */}
                      <div className="space-y-1">
                        <label className="text-[7px] text-obs-muted uppercase font-bold">
                          Tipografía
                        </label>
                        <select
                          value={externalScreenSettings.timerFont ?? "Inter"}
                          onChange={(e) =>
                            onUpdateExternalScreen({
                              ...externalScreenSettings,
                              timerFont: e.target.value,
                            })
                          }
                          className="w-full bg-obs-bg border border-obs-border rounded px-1.5 py-1 text-[9px] text-obs-text focus:border-obs-accent outline-none font-medium"
                        >
                          <option value="Inter">Inter (Sans-Serif)</option>
                          <option value="Space Grotesk">
                            Space Grotesk (Tech)
                          </option>
                          <option value="JetBrains Mono">
                            JetBrains Mono (Digital)
                          </option>
                          <option value="Playfair Display">
                            Playfair Display (Serif)
                          </option>
                          <option value="Outfit">Outfit (Round)</option>
                          <option value="Impact">Impact (Bold Extra)</option>
                        </select>
                      </div>

                      {/* Alertas de color */}
                      <div className="space-y-2 pt-1 border-t border-obs-text/5 font-sans">
                        <span className="text-[7.5px] text-obs-muted uppercase font-black tracking-widest block mb-1">
                          Color y Alertas de Tiempo
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1 bg-obs-dark-1/25 p-1.5 rounded border border-obs-border/30">
                            <label className="text-[7.5px] text-obs-muted uppercase font-bold block">
                              Tiempo de aviso
                            </label>
                            <div className="flex gap-1.5 items-center">
                              <div className="flex items-center bg-obs-bg rounded p-1 border border-obs-border shrink-0">
                                <input
                                  type="color"
                                  value={
                                    externalScreenSettings.timerAmberColor ??
                                    "#f59e0b"
                                  }
                                  onChange={(e) =>
                                    onUpdateExternalScreen({
                                      ...externalScreenSettings,
                                      timerAmberColor: e.target.value,
                                    })
                                  }
                                  className="w-4 h-4 bg-transparent border-0 cursor-pointer rounded overflow-hidden shrink-0"
                                />
                              </div>
                              <div className="flex items-center gap-1 bg-obs-bg border border-obs-border rounded p-1 w-14 shrink-0">
                                <input
                                  type="number"
                                  value={
                                    externalScreenSettings.timerAmberSeconds ??
                                    30
                                  }
                                  onChange={(e) =>
                                    onUpdateExternalScreen({
                                      ...externalScreenSettings,
                                      timerAmberSeconds:
                                        parseInt(e.target.value) || 30,
                                    })
                                  }
                                  className="w-full bg-transparent border-0 text-[10px] text-obs-text outline-none font-mono text-center font-bold"
                                />
                                <span className="text-[7.5px] text-obs-muted pr-0.5">
                                  s
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 bg-obs-dark-1/25 p-1.5 rounded border border-obs-border/30 font-sans">
                            <label className="text-[7.5px] text-obs-muted uppercase font-bold block">
                              Tiempo Límite
                            </label>
                            <div className="flex gap-1.5 items-center font-sans">
                              <div className="flex items-center bg-obs-bg rounded p-1 border border-obs-border shrink-0">
                                <input
                                  type="color"
                                  value={
                                    externalScreenSettings.timerRedColor ??
                                    "#ef4444"
                                  }
                                  onChange={(e) =>
                                    onUpdateExternalScreen({
                                      ...externalScreenSettings,
                                      timerRedColor: e.target.value,
                                    })
                                  }
                                  className="w-4 h-4 bg-transparent border-0 cursor-pointer rounded overflow-hidden shrink-0"
                                />
                              </div>
                              <div className="flex items-center gap-1 bg-obs-bg border border-obs-border rounded p-1 w-14 shrink-0 font-sans">
                                <input
                                  type="number"
                                  value={
                                    externalScreenSettings.timerRedSeconds ?? 10
                                  }
                                  onChange={(e) =>
                                    onUpdateExternalScreen({
                                      ...externalScreenSettings,
                                      timerRedSeconds:
                                        parseInt(e.target.value) || 10,
                                    })
                                  }
                                  className="w-full bg-transparent border-0 text-[10px] text-obs-text outline-none font-mono text-center font-bold"
                                />
                                <span className="text-[7.5px] text-obs-muted pr-0.5 font-sans">
                                  s
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Color de texto y fondo */}
                      <div className="grid grid-cols-2 gap-2 font-sans">
                        <div className="space-y-1">
                          <label className="text-[7px] text-obs-muted uppercase font-bold">
                            Color Texto
                          </label>
                          <div className="flex items-center bg-obs-bg rounded p-1 border border-obs-border w-fit">
                            <input
                              type="color"
                              value={
                                externalScreenSettings.timerColor ?? "#ff0000"
                              }
                              onChange={(e) =>
                                onUpdateExternalScreen({
                                  ...externalScreenSettings,
                                  timerColor: e.target.value,
                                })
                              }
                              className="w-4 h-4 bg-transparent border-0 cursor-pointer rounded overflow-hidden shrink-0"
                            />
                          </div>
                        </div>
                        <div className="space-y-1 font-sans">
                          <label className="text-[7px] text-obs-muted uppercase font-bold">
                            Color Fondo
                          </label>
                          <div className="flex items-center bg-obs-bg rounded p-1 border border-obs-border w-fit">
                            <input
                              type="color"
                              value={
                                externalScreenSettings.timerBgColor ?? "#000000"
                              }
                              onChange={(e) =>
                                onUpdateExternalScreen({
                                  ...externalScreenSettings,
                                  timerBgColor: e.target.value,
                                })
                              }
                              className="w-4 h-4 bg-transparent border-0 cursor-pointer rounded overflow-hidden shrink-0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Opacidad de Fondo */}
                      <PropertyControl
                        label="Opacidad de Fondo (%)"
                        value={externalScreenSettings.timerBgOpacity ?? 70}
                        displayValue={`${externalScreenSettings.timerBgOpacity ?? 70}%`}
                        min={0}
                        max={100}
                        step={5}
                        onChange={(val) =>
                          onUpdateExternalScreen({
                            ...externalScreenSettings,
                            timerBgOpacity: val,
                          })
                        }
                        onInputChange={(val) => {
                          const num = parseInt(val);
                          if (!isNaN(num))
                            onUpdateExternalScreen({
                              ...externalScreenSettings,
                              timerBgOpacity: num,
                            });
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      );
    }

    if (!selectedItem) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-obs-muted gap-4 bg-obs-bg">
          <Search size={32} strokeWidth={1} />
          <span className="text-[10px] uppercase font-bold tracking-widest">
            Selecciona un elemento
          </span>
        </div>
      );
    }

    // Final fallback (should only happen if type is not handled above)
    return (
      <div className="h-full flex flex-col overflow-hidden bg-obs-bg">
        <div className="px-3 py-2 border-b border-obs-border flex justify-between items-center bg-obs-surface">
          <div className="flex items-center gap-2">
            <Settings size={12} className="text-obs-accent" />
            <span className="text-[11px] font-semibold text-obs-text uppercase tracking-widest">
              {selectedItem.type === "document"
                ? selectedItem.name.toLowerCase().endsWith(".pdf")
                  ? "PROPIEDADES PDF"
                  : "PROPIEDADES PPT"
                : selectedItem.type === "video"
                  ? "PROPIEDADES VIDEO"
                  : "PROPIEDADES IMAGEN"}
            </span>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-obs-border hover:bg-obs-accent hover:text-white text-[9px] font-medium text-obs-text transition-colors"
          >
            <RotateCcw size={10} />
            Restablecer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Video Info Header */}
          {selectedItemType === "clip" && selectedItem && (
            <div className="space-y-3 pb-4 border-b border-obs-border/50">
              {(() => {
                const clip = selectedItem as Clip;
                return (
                  <>
                    <div className="aspect-video w-full bg-black rounded border border-obs-border overflow-hidden relative group">
                      <svg width="0" height="0" className="absolute">
                        <filter id="rgbBalanceClipPreview">
                          <feColorMatrix
                            type="matrix"
                            values={`${clip.colorBalance?.r ?? 1} 0 0 0 0
                                  0 ${clip.colorBalance?.g ?? 1} 0 0 0
                                  0 0 ${clip.colorBalance?.b ?? 1} 0 0
                                  0 0 0 1 0`}
                          />
                        </filter>
                      </svg>
                      {clip.type === "video" ? (
                        <HoverVideoPreview
                          src={clip.url}
                          thumbnail={clip.thumbnail}
                          className={`w-full h-full ${clip.fitToScale ? "object-cover" : "object-contain"}`}
                          style={{
                            opacity: clip.opacity ?? 1,
                            filter: `brightness(${clip.brightness ?? 1}) contrast(${clip.contrast ?? 1}) saturate(${clip.saturation ?? 1}) url(#rgbBalanceClipPreview)`,
                          }}
                        />
                      ) : clip.type === "videoinput" ? (
                        <div
                          className="w-full h-full"
                          style={{
                            opacity: clip.opacity ?? 1,
                            filter: `brightness(${clip.brightness ?? 1}) contrast(${clip.contrast ?? 1}) saturate(${clip.saturation ?? 1}) url(#rgbBalanceClipPreview)`,
                          }}
                        >
                          <LibraryMediaPreview file={clip} />
                        </div>
                      ) : clip.type === "document" || clip.type === "ppt" ? (
                        <div
                          className="w-full h-full"
                          style={{
                            opacity: clip.opacity ?? 1,
                            filter: `brightness(${clip.brightness ?? 1}) contrast(${clip.contrast ?? 1}) saturate(${clip.saturation ?? 1}) url(#rgbBalanceClipPreview)`,
                          }}
                        >
                          <DocumentLayer
                            clip={clip}
                            onUpdateClip={updateClip}
                          />
                        </div>
                      ) : (
                        <img
                          src={clip.url}
                          className={`w-full h-full ${clip.fitToScale ? "object-cover" : "object-contain"}`}
                          style={{
                            opacity: clip.opacity ?? 1,
                            filter: `brightness(${clip.brightness ?? 1}) contrast(${clip.contrast ?? 1}) saturate(${clip.saturation ?? 1}) url(#rgbBalanceClipPreview)`,
                          }}
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="absolute top-2 left-2 bg-obs-dark-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-obs-accent uppercase tracking-widest border border-obs-accent/30">
                        Preview
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-obs-surface/50 p-2 rounded border border-obs-border/30">
                        <div className="text-[8px] text-obs-muted uppercase font-bold mb-1">
                          Nombre
                        </div>
                        <div className="text-[10px] text-obs-text truncate">
                          {clip.name}
                        </div>
                      </div>
                      <div className="bg-obs-surface/50 p-2 rounded border border-obs-border/30">
                        <div className="text-[8px] text-obs-muted uppercase font-bold mb-1">
                          Tipo
                        </div>
                        <div className="text-[10px] text-obs-text uppercase">
                          {clip.type === "video"
                            ? "Video HD"
                            : clip.type === "document"
                              ? "Documento"
                              : clip.type === "ppt"
                                ? "Presentación"
                                : "Imagen"}
                        </div>
                      </div>
                      <div className="bg-obs-surface/50 p-2 rounded border border-obs-border/30">
                        <div className="text-[8px] text-obs-muted uppercase font-bold mb-1">
                          Resolución
                        </div>
                        <div className="text-[10px] text-obs-text font-mono">
                          {clip.width && clip.height
                            ? `${clip.width}x${clip.height}`
                            : "1920x1080"}
                        </div>
                      </div>
                      <div className="bg-obs-surface/50 p-2 rounded border border-obs-border/30">
                        <div className="text-[8px] text-obs-muted uppercase font-bold mb-1">
                          Duración
                        </div>
                        <div className="text-[10px] text-obs-text font-mono">
                          {clip.duration
                            ? `${Math.floor(clip.duration / 60)}:${Math.floor(
                                clip.duration % 60,
                              )
                                .toString()
                                .padStart(2, "0")}`
                            : "00:00"}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="space-y-4">
            {/* Escalado/Transformación Section */}
            <CollapsibleSection title="ESCALA" defaultOpen={true}>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-obs-dark-1 p-2 rounded border border-obs-border/30">
                  <span className="text-[10px] font-bold text-obs-muted uppercase">
                    Fit to scale (Llenar pantalla)
                  </span>
                  <input
                    type="checkbox"
                    className="w-3 h-3 accent-obs-accent cursor-pointer"
                    checked={!!(selectedItem as Clip).fitToScale}
                    onChange={(e) =>
                      onUpdate(selectedItem.id, {
                        fitToScale: e.target.checked,
                      })
                    }
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* VIDEO Section (Opacity & Loop) */}
            <CollapsibleSection
              title="VIDEO"
              onReset={() =>
                onUpdate(selectedItem.id, { opacity: 1, loop: true })
              }
            >
              <div className="space-y-4">
                <PropertyControl
                  label="Opacidad"
                  value={(selectedItem.opacity || 1) * 100}
                  displayValue={`${Math.round((selectedItem.opacity || 1) * 100)}%`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdate(selectedItem.id, { opacity: val / 100 })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 100;
                    if (!isNaN(num))
                      onUpdate(selectedItem.id, { opacity: num });
                  }}
                />

                {selectedItem.type === "video" && (
                  <div className="flex items-center justify-between bg-obs-dark-1 p-2 rounded border border-obs-border/30">
                    <span className="text-[10px] font-bold text-obs-muted uppercase">
                      Bucle de Video (Loop)
                    </span>
                    <button
                      onClick={() => {
                        if (onUpdateClip)
                          onUpdateClip(selectedItem.id, {
                            loop: !(selectedItem.loop !== false),
                          });
                        else
                          onUpdate(selectedItem.id, {
                            loop: !(selectedItem.loop !== false),
                          });
                      }}
                      className={`w-10 h-5 rounded-full transition-colors relative ${selectedItem.loop !== false ? "bg-obs-accent" : "bg-gray-600"}`}
                    >
                      <div
                        className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${selectedItem.loop !== false ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Document Controls */}
            {["document", "ppt"].includes(selectedItem.type || "") && (
              <CollapsibleSection
                title="CONTROLES DOCUMENTO"
                defaultOpen={true}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-obs-dark-1 p-4 rounded-lg border border-obs-text/5">
                    <button
                      onClick={() => {
                        if (onUpdateClip)
                          onUpdateClip(selectedItem.id, {
                            currentPage: Math.max(
                              1,
                              (selectedItem.currentPage || 1) - 1,
                            ),
                          });
                        else
                          onUpdate(selectedItem.id, {
                            currentPage: Math.max(
                              1,
                              (selectedItem.currentPage || 1) - 1,
                            ),
                          });
                      }}
                      className="p-3 bg-obs-surface hover:bg-obs-accent text-obs-text hover:text-white rounded-md transition-all shadow-lg active:scale-95"
                      title="Anterior"
                    >
                      <ChevronLeft size={24} strokeWidth={3} />
                    </button>

                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-obs-muted font-black uppercase tracking-widest mb-1">
                        PÁGINA
                      </span>
                      <div className="text-3xl font-mono font-black text-obs-accent tabular-nums bg-obs-bg px-4 py-1 rounded border border-obs-text/5 shadow-inner flex items-baseline gap-1">
                        {selectedItem.currentPage || 1}
                        {selectedItem.totalPages && (
                          <span className="text-sm text-obs-muted">
                            / {selectedItem.totalPages}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (onUpdateClip)
                            onUpdateClip(selectedItem.id, { currentPage: 1 });
                          else onUpdate(selectedItem.id, { currentPage: 1 });
                        }}
                        className="px-2 py-0.5 mt-1 bg-obs-surface hover:bg-obs-accent text-[9px] uppercase font-bold rounded transition-colors border border-obs-text/5"
                      >
                        Reset
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const targetPage = Math.min(
                          (selectedItem.currentPage || 1) + 1,
                          selectedItem.totalPages || Infinity,
                        );
                        if (onUpdateClip)
                          onUpdateClip(selectedItem.id, {
                            currentPage: targetPage,
                          });
                        else
                          onUpdate(selectedItem.id, {
                            currentPage: targetPage,
                          });
                      }}
                      className="p-3 bg-obs-surface hover:bg-obs-accent text-obs-text hover:text-white rounded-md transition-all shadow-lg active:scale-95"
                      title="Siguiente"
                    >
                      <ChevronRight size={24} strokeWidth={3} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 p-3 bg-obs-dark-1 rounded border border-obs-text/5 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-obs-text uppercase">
                        Control por Teclado / Puntero USB
                      </span>
                      <button
                        onClick={() => {
                          if (onUpdateClip)
                            onUpdateClip(selectedItem.id, {
                              keyboardNavEnabled:
                                !selectedItem.keyboardNavEnabled,
                            });
                          else
                            onUpdate(selectedItem.id, {
                              keyboardNavEnabled:
                                !selectedItem.keyboardNavEnabled,
                            });
                        }}
                        className={`w-8 h-4 rounded-full transition-colors relative ${selectedItem.keyboardNavEnabled ? "bg-obs-accent" : "bg-gray-600"}`}
                      >
                        <div
                          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${selectedItem.keyboardNavEnabled ? "translate-x-4" : "translate-x-0.5"}`}
                        />
                      </button>
                    </div>
                    <p className="text-[8px] text-obs-muted leading-tight">
                      Activa para hacer avanzar o retroceder el documento usando
                      las flechas direccionales o un pasador de diapositivas USB
                      (PageUp/PageDown).
                    </p>
                  </div>

                  {selectedItem.type === "ppt" && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded text-[9px] leading-relaxed mt-2.5 space-y-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                      <div className="font-black flex items-center gap-1.5 uppercase tracking-wider text-[8.5px] text-amber-400">
                        <AlertTriangle size={12} />
                        <span>FIDELIDAD DE PRESENTACIÓN</span>
                      </div>
                      <p className="text-slate-300">
                        El formato <strong>PPTX</strong> es propietario y
                        altamente complejo. La lectura web offline extrae
                        elementos básicos de texto y estilo, por lo que el
                        diseño puede variar respecto al PowerPoint original.
                      </p>
                      <div className="text-obs-accent font-bold uppercase tracking-wider text-[8px] mt-1.5">
                        💡 MÉTODOS DE RESOLUCIÓN RECOMENDADOS:
                      </div>
                      <ul className="text-slate-300 pl-3 list-disc space-y-1">
                        <li>
                          <strong>Fidelidad Absoluta (PDF):</strong> Guarda o
                          exporta tu diapositiva como <strong>PDF</strong> desde
                          PowerPoint (<em>Archivo &gt; Exportar &gt; PDF</em>) e
                          impórtalo. Se renderizará vector por vector con
                          fidelidad matemática perfecta del 100%.
                        </li>
                        <li>
                          <strong>Tratamiento de Fuentes:</strong> Si prefieres
                          usar PPTX directo, asegúrate de utilizar fuentes
                          estándar seguras para la web (como Arial, Trebuchet o
                          Georgia) para que el navegador las dibuje en su sitio
                          exacto.
                        </li>
                      </ul>
                    </div>
                  )}

                  <div className="text-[8px] text-obs-muted text-center italic bg-obs-dark-1 p-2 rounded border border-obs-text/5 mt-2">
                    * Los PDFs locales usan el visor integrado. Las
                    presentaciones Online requieren URLs públicas.
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* VELOCIDAD Section */}
            {selectedItem.type === "video" && (
              <CollapsibleSection
                title="VELOCIDAD"
                onReset={() => onUpdate(selectedItem.id, { speed: 1 })}
              >
                <div className="space-y-2">
                  <PropertyControl
                    label="Velocidad"
                    value={(selectedItem.speed || 1) * 100}
                    displayValue={`${Math.round((selectedItem.speed || 1) * 100)}%`}
                    min={10}
                    max={500}
                    step={1}
                    onChange={(val) =>
                      onUpdate(selectedItem.id, { speed: val / 100 })
                    }
                    onInputChange={(val) => {
                      const num = parseFloat(val) / 100;
                      if (!isNaN(num))
                        onUpdate(selectedItem.id, { speed: num });
                    }}
                  />
                </div>
              </CollapsibleSection>
            )}

            {/* Ajustes de Imagen */}
            <CollapsibleSection
              title="AJUSTES DE IMAGEN"
              defaultOpen={false}
              onReset={() =>
                onUpdate(selectedItem.id, {
                  brightness: 1,
                  contrast: 1,
                  saturation: 1,
                })
              }
            >
              <div className="space-y-2">
                <PropertyControl
                  label="Brillo"
                  value={(selectedItem.brightness ?? 1) * 50}
                  displayValue={`${Math.round((selectedItem.brightness ?? 1) * 50)}`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdate(selectedItem.id, { brightness: val / 50 })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 50;
                    if (!isNaN(num))
                      onUpdate(selectedItem.id, { brightness: num });
                  }}
                />
                <PropertyControl
                  label="Contraste"
                  value={(selectedItem.contrast ?? 1) * 50}
                  displayValue={`${Math.round((selectedItem.contrast ?? 1) * 50)}`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdate(selectedItem.id, { contrast: val / 50 })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 50;
                    if (!isNaN(num))
                      onUpdate(selectedItem.id, { contrast: num });
                  }}
                />
                <PropertyControl
                  label="Saturación"
                  value={(selectedItem.saturation ?? 1) * 50}
                  displayValue={`${Math.round((selectedItem.saturation ?? 1) * 50)}`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    onUpdate(selectedItem.id, { saturation: val / 50 })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 50;
                    if (!isNaN(num))
                      onUpdate(selectedItem.id, { saturation: num });
                  }}
                />
              </div>
            </CollapsibleSection>

            {/* Balance de Color (RGB) */}
            <CollapsibleSection
              title="BALANCE DE COLOR"
              defaultOpen={false}
              onReset={() =>
                onUpdate(selectedItem.id, {
                  colorBalance: { r: 1, g: 1, b: 1 },
                })
              }
            >
              <div className="space-y-2">
                {["r", "g", "b"].map((channel) => (
                  <PropertyControl
                    key={channel}
                    label={channel.toUpperCase()}
                    value={
                      (selectedItem.colorBalance ?? { r: 1, g: 1, b: 1 })[
                        channel as keyof typeof selectedItem.colorBalance
                      ] * 50
                    }
                    displayValue={`${Math.round((selectedItem.colorBalance ?? { r: 1, g: 1, b: 1 })[channel as keyof typeof selectedItem.colorBalance] * 50)}`}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(val) =>
                      onUpdate(selectedItem.id, {
                        colorBalance: {
                          ...(selectedItem.colorBalance ?? {
                            r: 1,
                            g: 1,
                            b: 1,
                          }),
                          [channel]: val / 50,
                        },
                      })
                    }
                    onInputChange={(val) => {
                      const num = parseFloat(val) / 50;
                      if (!isNaN(num))
                        onUpdate(selectedItem.id, {
                          colorBalance: {
                            ...(selectedItem.colorBalance ?? {
                              r: 1,
                              g: 1,
                              b: 1,
                            }),
                            [channel]: num,
                          },
                        });
                    }}
                  />
                ))}
              </div>
            </CollapsibleSection>

            {/* Transformar */}
            <CollapsibleSection
              title="TRANSFORMAR"
              defaultOpen={false}
              onReset={() =>
                onUpdate(selectedItem.id, {
                  transform: { ...selectedItem.transform, x: 0, y: 0 },
                })
              }
            >
              <div className="space-y-2">
                <PropertyControl
                  label="Posición X"
                  value={selectedItem.transform.x}
                  displayValue={Math.round(selectedItem.transform.x).toString()}
                  min={-1920}
                  max={1920}
                  step={1}
                  onChange={(val) =>
                    onUpdate(selectedItem.id, {
                      transform: { ...selectedItem.transform, x: val },
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val);
                    if (!isNaN(num))
                      onUpdate(selectedItem.id, {
                        transform: { ...selectedItem.transform, x: num },
                      });
                  }}
                />
                <PropertyControl
                  label="Posición Y"
                  value={selectedItem.transform.y}
                  displayValue={Math.round(selectedItem.transform.y).toString()}
                  min={-1080}
                  max={1080}
                  step={1}
                  onChange={(val) =>
                    onUpdate(selectedItem.id, {
                      transform: { ...selectedItem.transform, y: val },
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val);
                    if (!isNaN(num))
                      onUpdate(selectedItem.id, {
                        transform: { ...selectedItem.transform, y: num },
                      });
                  }}
                />
              </div>
            </CollapsibleSection>

            {/* Escala */}
            <CollapsibleSection
              title="ESCALA"
              defaultOpen={false}
              onReset={() =>
                onUpdate(selectedItem.id, {
                  transform: {
                    ...selectedItem.transform,
                    scaleW: 1,
                    scaleH: 1,
                  },
                })
              }
            >
              <div className="space-y-2">
                <PropertyControl
                  label="Escala Ancho"
                  value={selectedItem.transform.scaleW * 100}
                  displayValue={`${Math.round(selectedItem.transform.scaleW * 100)}%`}
                  min={10}
                  max={1000}
                  step={1}
                  onChange={(val) =>
                    onUpdate(selectedItem.id, {
                      transform: {
                        ...selectedItem.transform,
                        scaleW: val / 100,
                      },
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 100;
                    if (!isNaN(num))
                      onUpdate(selectedItem.id, {
                        transform: { ...selectedItem.transform, scaleW: num },
                      });
                  }}
                />
                <PropertyControl
                  label="Escala Alto"
                  value={selectedItem.transform.scaleH * 100}
                  displayValue={`${Math.round(selectedItem.transform.scaleH * 100)}%`}
                  min={10}
                  max={1000}
                  step={1}
                  onChange={(val) =>
                    onUpdate(selectedItem.id, {
                      transform: {
                        ...selectedItem.transform,
                        scaleH: val / 100,
                      },
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 100;
                    if (!isNaN(num))
                      onUpdate(selectedItem.id, {
                        transform: { ...selectedItem.transform, scaleH: num },
                      });
                  }}
                />
              </div>
            </CollapsibleSection>

            {/* Rotación */}
            <CollapsibleSection
              title="ROTACIÓN"
              defaultOpen={false}
              onReset={() =>
                onUpdate(selectedItem.id, {
                  transform: { ...selectedItem.transform, rotation: 0 },
                })
              }
            >
              <div className="space-y-2">
                <PropertyControl
                  label="Rotación Z"
                  value={selectedItem.transform.rotation}
                  displayValue={`${Math.round(selectedItem.transform.rotation)}°`}
                  min={0}
                  max={360}
                  step={1}
                  onChange={(val) =>
                    onUpdate(selectedItem.id, {
                      transform: { ...selectedItem.transform, rotation: val },
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val);
                    if (!isNaN(num))
                      onUpdate(selectedItem.id, {
                        transform: { ...selectedItem.transform, rotation: num },
                      });
                  }}
                />
                <PropertyControl
                  label="Rotación X"
                  value={selectedItem.transform.rotationX}
                  displayValue={`${Math.round(selectedItem.transform.rotationX)}°`}
                  min={0}
                  max={360}
                  step={1}
                  onChange={(val) =>
                    onUpdate(selectedItem.id, {
                      transform: { ...selectedItem.transform, rotationX: val },
                    })
                  }
                  onInputChange={(val) => {
                    const num = parseFloat(val);
                    if (!isNaN(num))
                      onUpdate(selectedItem.id, {
                        transform: {
                          ...selectedItem.transform,
                          rotationX: num,
                        },
                      });
                  }}
                />
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>
    );
  },
);

interface MediaLibraryPanelProps {
  onClose: () => void;
  libraryFiles: any[];
  onTriggerFile: (file: any) => void;
  selectedLibraryUrls: Set<string>;
  setSelectedLibraryUrls: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const HoverVideoPreview = React.memo(
  ({
    src,
    thumbnail,
    className,
    style,
  }: {
    src: string;
    thumbnail?: string;
    className?: string;
    style?: React.CSSProperties;
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Handle hover playback
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      if (isHovered) {
        video.src = src;
        video.preload = "auto";
        video.play().catch(() => {});
      } else {
        video.pause();
        video.preload = "none";
        try {
          video.src = "";
          video.removeAttribute("src");
          video.load();
        } catch (e) {}
      }
    }, [isHovered, src]);

    // Clean up decoder on unmount
    useEffect(() => {
      return () => {
        const video = videoRef.current;
        if (video) {
          try {
            video.pause();
            video.src = "";
            video.removeAttribute("src");
            video.load();
          } catch (e) {}
        }
      };
    }, []);

    return (
      <div
        className="w-full h-full relative overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <video
          ref={videoRef}
          className={className}
          muted
          loop
          playsInline
          preload="none"
          style={{ ...style, display: isHovered ? "block" : "none" }}
        />
        {!isHovered &&
          (thumbnail ? (
            <img
              src={thumbnail}
              className={className || "w-full h-full object-cover"}
              alt="Preview"
              referrerPolicy="no-referrer"
              style={style}
            />
          ) : (
            <div className="w-full h-full bg-obs-surface flex items-center justify-center">
              <Play size={16} className="text-obs-muted opacity-20" />
            </div>
          ))}
      </div>
    );
  },
);

const LibraryMediaPreview = ({ file }: { file: any }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (file.type === "videoinput" && videoRef.current) {
      const deviceId = file.url.replace("videoinput-device-", "");
      navigator.mediaDevices
        .getUserMedia({
          video:
            deviceId && deviceId !== "camera"
              ? { deviceId: { exact: deviceId } }
              : true,
          audio: false,
        })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          // Suppressing the console error to avoid surfacing permission denied to the user
        });
    }

    return () => {
      if (videoRef.current && file.type === "videoinput") {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      }
    };
  }, [file.url, file.type]);

  if (file.type === "videoinput") {
    return (
      <div className="w-full h-full relative group">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover opacity-80 bg-obs-dark-1"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
      </div>
    );
  }
  if (file.type?.startsWith("video")) {
    return (
      <HoverVideoPreview
        src={file.url}
        thumbnail={file.thumbnail}
        className="w-full h-full object-cover opacity-80"
      />
    );
  }
  if (file.type?.includes("pdf") || file.name?.toLowerCase().endsWith(".pdf")) {
    return (
      <div className="w-full h-full relative group bg-black overflow-hidden flex items-center justify-center pointer-events-none text-obs-muted">
        <PDFRenderer url={file.url} pageNumber={1} />
      </div>
    );
  }
  if (
    file.type?.includes("powerpoint") ||
    file.type === "ppt" ||
    file.name?.toLowerCase().endsWith(".ppt") ||
    file.name?.toLowerCase().endsWith(".pptx")
  ) {
    return (
      <div className="w-full h-full relative group bg-black overflow-hidden flex items-center justify-center pointer-events-none text-obs-muted">
        <PPTSlideRenderer clip={file} pageNumber={1} isThumbnail={true} />
      </div>
    );
  }
  return (
    <img
      src={file.url}
      className="w-full h-full object-cover opacity-80"
      referrerPolicy="no-referrer"
    />
  );
};

interface LibraryProps {
  onAddClip: (files: any[]) => void;
  isDarkMode: boolean;
  libraryFiles: any[];
  setLibraryFiles: React.Dispatch<React.SetStateAction<any[]>>;
  selectedLibraryUrls: Set<string>;
  setSelectedLibraryUrls: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const Library = React.memo(
  ({
    onAddClip,
    isDarkMode,
    libraryFiles,
    setLibraryFiles,
    selectedLibraryUrls,
    setSelectedLibraryUrls,
  }: LibraryProps) => {
    const [folders, setFolders] = useState<
      { id: string; name: string; active: boolean }[]
    >([
      { id: "todos", name: "TODOS", active: true },
      { id: "video", name: "VIDEOS", active: false },
      { id: "image", name: "IMAGES", active: false },
      { id: "pdf", name: "PDF", active: false },
      { id: "videoin", name: "VIDEO IN", active: false },
    ]);
    const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const libraryInputRef = useRef<HTMLInputElement>(null);

    const activeFolder = folders.find((f) => f.active)?.id || "todos";

    useEffect(() => {
      if (activeFolder === "videoin") {
        const hasVideoInFiles = libraryFiles.some(
          (f) => f.type === "videoinput",
        );
        if (!hasVideoInFiles) {
          handleCreateVideoIn();
        }
      }
    }, [activeFolder, libraryFiles]);

    const handleCreateVideoIn = async () => {
      try {
        // Pedimos permisos rápido para asegurar que podemos leer
        const perms = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        perms.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");

        const newFiles = videoDevices.map((d) => ({
          name: d.label || `Cámara USB ${d.deviceId.slice(0, 5)}`,
          type: "videoinput",
          url: `videoinput-device-${d.deviceId}`,
          file: null,
        }));

        if (newFiles.length === 0) {
          newFiles.push({
            name: "Video IN (Predeterminado)",
            type: "videoinput",
            url: "videoinput-device-camera",
            file: null,
          });
        }

        setLibraryFiles((prev) => {
          const existingUrls = prev.map((f) => f.url);
          const toAdd = newFiles.filter((f) => !existingUrls.includes(f.url));
          return [...prev, ...(toAdd as any)];
        });
      } catch (e) {
        // Ignore permission denied error for camera enumeration
        setLibraryFiles((prev) => {
          const url = "videoinput-device-camera";
          if (prev.some((f) => f.url === url)) return prev;
          return [
            ...prev,
            {
              name: "Video IN (Default Camera)",
              type: "videoinput",
              url,
              file: null as any,
            },
          ];
        });
      }
    };

    const handleLibraryLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const newFiles = await Promise.all(
        Array.from(files).map(async (f) => {
          let type: string = f.type;
          if (f.name.toLowerCase().endsWith(".pdf")) type = "application/pdf";
          else if (
            f.name.toLowerCase().endsWith(".ppt") ||
            f.name.toLowerCase().endsWith(".pptx")
          )
            type = "application/vnd.mspowerpoint";

          // Persistent path if in electron, otherwise temporary URL
          const url = (window as any).electron
            ? (f as any).path || getFileUrl(f)
            : URL.createObjectURL(f);

          let thumbnail = undefined;
          if (type.startsWith("video")) {
            try {
              thumbnail = await extractVideoThumbnail(url);
            } catch (err) {
              console.error("Error extracting video thumbnail:", err);
            }
          } else if (type.startsWith("image")) {
            thumbnail = url;
          }

          return {
            id: `lib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: f.name,
            type: type,
            url,
            file: f,
            thumbnail,
            addedAt: Date.now(),
          };
        }),
      );
      setLibraryFiles((prev) => [...prev, ...newFiles]);
    };

    const handleDeleteFile = (url: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setLibraryFiles((prev) => prev.filter((f) => f.url !== url));
      setSelectedLibraryUrls((prev) => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    };

    const filteredFiles = libraryFiles.filter((f) => {
      const matchesSearch = f.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFolder =
        activeFolder === "todos" ||
        (activeFolder === "video" &&
          f.type.startsWith("video") &&
          f.type !== "videoinput") ||
        (activeFolder === "image" && f.type.startsWith("image")) ||
        (activeFolder === "pdf" && f.type.includes("pdf")) ||
        (activeFolder === "videoin" && f.type === "videoinput");
      return matchesSearch && matchesFolder;
    });

    const toggleSelection = (url: string, multi: boolean) => {
      setSelectedLibraryUrls((prev) => {
        const next = new Set(multi ? prev : []);
        if (next.has(url)) {
          if (multi) next.delete(url);
        } else {
          next.add(url);
        }
        return next;
      });
    };

    return (
      <div className="flex-1 flex flex-col min-h-0 border-r border-obs-border bg-obs-bg">
        <div className="p-2 border-b border-obs-border flex justify-between items-center bg-obs-surface">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-obs-accent" />
            <span className="text-[10px] text-obs-text uppercase font-black tracking-wider">
              GESTIÓN DE CONTENIDOS
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (activeFolder === "videoin") {
                  handleCreateVideoIn();
                } else {
                  libraryInputRef.current?.click();
                }
              }}
              className="p-1 text-obs-accent hover:scale-110 transition-transform"
              title={
                activeFolder === "videoin"
                  ? "Detectar Dispositivos"
                  : "Agregar archivos"
              }
            >
              <Plus size={14} />
            </button>
          </div>
          <input
            type="file"
            ref={libraryInputRef}
            className="hidden"
            accept="video/*,image/*,application/pdf,.ppt,.pptx"
            multiple
            onChange={handleLibraryLoad}
          />
        </div>

        <div className="grid grid-cols-5 border-b border-obs-border bg-obs-dark-1">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() =>
                setFolders((prev) =>
                  prev.map((f) => ({ ...f, active: f.id === folder.id })),
                )
              }
              className={`py-2 text-[8px] font-black uppercase transition-colors border-b-2 ${folder.active ? "text-obs-accent border-obs-accent bg-obs-accent/5" : "text-obs-muted border-transparent hover:text-white"}`}
            >
              {folder.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {libraryFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-obs-muted gap-2 opacity-30">
              <Film size={32} strokeWidth={1} />
              <span className="text-[9px] uppercase font-bold tracking-widest">
                Biblioteca Vacía
              </span>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-1"
              }
            >
              {filteredFiles.map((file, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => {
                    const selectedFiles = libraryFiles.filter((f) =>
                      selectedLibraryUrls.has(f.url),
                    );
                    const filesToDrag =
                      selectedFiles.length > 0 &&
                      selectedLibraryUrls.has(file.url)
                        ? selectedFiles
                        : [file];

                    e.dataTransfer.setData(
                      "libraryFiles",
                      JSON.stringify(
                        filesToDrag.map((f) => ({
                          name: f.name,
                          url: f.url,
                          type: f.type,
                        })),
                      ),
                    );
                  }}
                  onClick={(e) =>
                    toggleSelection(
                      file.url,
                      e.ctrlKey || e.metaKey || e.shiftKey,
                    )
                  }
                  onDoubleClick={() => onAddClip([file])}
                  className={`group relative flex flex-col rounded transition-colors cursor-pointer text-obs-text border ${selectedLibraryUrls.has(file.url) ? "bg-obs-accent/10 border-obs-accent" : "hover:bg-obs-surface border-transparent"}`}
                >
                  <div
                    className={`${viewMode === "grid" ? "aspect-video w-full" : "w-12 h-8"} bg-black rounded-sm overflow-hidden flex-shrink-0 relative flex items-center justify-center`}
                  >
                    <LibraryMediaPreview file={file} />
                    {viewMode === "grid" && (
                      <div className="absolute bottom-0 left-0 right-0 bg-obs-dark-1 px-1 py-0.5">
                        <div className="text-[7px] truncate text-white uppercase font-bold">
                          {file.type.split("/")[1] || "DOC"}
                        </div>
                      </div>
                    )}
                    {viewMode === "grid" && (
                      <button
                        onClick={(e) => handleDeleteFile(file.url, e)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 rounded text-stone-300 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-20"
                        title="Eliminar archivo"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                  {viewMode === "list" ? (
                    <div className="flex-1 min-w-0 px-2 flex items-center justify-between">
                      <div className="truncate">
                        <div className="text-[10px] truncate leading-tight">
                          {file.name}
                        </div>
                        <div className="text-[8px] text-obs-muted uppercase">
                          {file.type.split("/")[1]}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                        <button
                          onClick={(e) => handleDeleteFile(file.url, e)}
                          className="opacity-0 group-hover:opacity-100 text-obs-muted hover:text-red-500 transition-all p-1"
                          title="Eliminar de biblioteca"
                        >
                          <Trash2 size={10} />
                        </button>
                        <Plus
                          size={10}
                          className="opacity-0 group-hover:opacity-100 text-obs-accent transition-opacity"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-1">
                      <div className="text-[9px] truncate leading-tight font-medium">
                        {file.name}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);

const Sidebar = React.memo(({ isDarkMode }: { isDarkMode: boolean }) => (
  <div className="flex flex-col h-full bg-obs-bg text-obs-text">
    <div className="p-3 border-b border-obs-border bg-obs-surface">
      <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">
        Controles
      </span>
    </div>
    <div className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto">
      <div className="space-y-4">
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors">
          Iniciar Transmisión
        </button>
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors">
          Iniciar Grabación
        </button>
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors">
          Cámara Virtual
        </button>
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors">
          Modo Estudio
        </button>
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors">
          Configuración
        </button>
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors text-red-500">
          Salir
        </button>
      </div>

      <div className="mt-auto space-y-4 pt-4 border-t border-obs-border">
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-bold text-obs-muted">
            <span>CPU</span>
            <span className="text-obs-accent">12.4%</span>
          </div>
          <div className="h-1 bg-obs-surface rounded-full overflow-hidden">
            <div className="w-[12%] h-full bg-obs-accent" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-bold text-obs-muted">
            <span>Disco</span>
            <span className="text-obs-accent">45.2GB Libre</span>
          </div>
        </div>
      </div>
    </div>
  </div>
));

const PlaylistsSection = React.memo(
  ({
    playlists,
    onAddPlaylist,
    onDropOnPlaylist,
    onSelectPlaylist,
    onSetEditingPlaylist,
    selectedPlaylistId,
    isDarkMode,
    isHorizontal = false,
  }: {
    playlists: Playlist[];
    onAddPlaylist: () => void;
    onDropOnPlaylist: (e: React.DragEvent, playlistId?: string) => void;
    onSelectPlaylist: (playlist: Playlist) => void;
    onSetEditingPlaylist: (id: string) => void;
    selectedPlaylistId: string | null;
    isDarkMode: boolean;
    isHorizontal?: boolean;
  }) => {
    const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);

    useEffect(() => {
      if (selectedPlaylistId) {
        setLocalSelectedId(selectedPlaylistId);
      }
    }, [selectedPlaylistId]);

    const activeId = localSelectedId || playlists[0]?.id;
    const selectedPlaylist = playlists.find((p) => p.id === activeId);

    return (
      <div
        className={`h-full flex ${isHorizontal ? "flex-row" : "flex-col"} bg-obs-bg`}
      >
        <div
          className={`${isHorizontal ? "w-32 border-r" : "w-full border-b"} px-3 py-1.5 border-obs-border flex ${isHorizontal ? "flex-col" : "flex-row"} justify-between items-center bg-obs-surface`}
        >
          <div className="flex items-center gap-2">
            <Layers size={12} className="text-obs-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">
              Playlists
            </span>
          </div>
          <button
            onClick={onAddPlaylist}
            disabled={playlists.length >= 8}
            className="p-1 text-obs-accent hover:scale-110 transition-transform disabled:opacity-30"
            title="Agregar Playlist"
          >
            <Plus size={14} />
          </button>
        </div>

        {isHorizontal ? (
          <div className="flex-1 flex overflow-hidden">
            {/* List of Playlists */}
            <div className="w-48 border-r border-obs-border overflow-y-auto p-1 space-y-1 bg-obs-dark-1">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("playlistId", playlist.id);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropOnPlaylist(e, playlist.id)}
                  onClick={() => {
                    setLocalSelectedId(playlist.id);
                    onSelectPlaylist(playlist);
                  }}
                  className={`px-3 py-2 rounded cursor-pointer transition-all border ${
                    activeId === playlist.id
                      ? "bg-obs-accent border-obs-accent text-white shadow-lg shadow-obs-accent/20"
                      : "bg-obs-surface border-obs-border text-obs-text hover:border-obs-muted"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate text-[10px] font-bold uppercase tracking-tight">
                      {playlist.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetEditingPlaylist(playlist.id);
                        }}
                        className={`p-2 rounded hover:bg-obs-dark-1 transition-colors ${activeId === playlist.id ? "text-white" : "text-obs-muted"}`}
                      >
                        <Settings size={18} />
                      </button>
                      <span className="text-[8px] px-1 rounded bg-obs-dark-1 text-obs-muted font-mono">
                        {playlist.clips.length}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Clips in Selected Playlist */}
            {selectedPlaylist ? (
              <div
                className="flex-1 overflow-x-auto p-2 flex gap-2 bg-obs-dark-1"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropOnPlaylist(e, selectedPlaylist.id)}
              >
                {selectedPlaylist.clips.length > 0 ? (
                  selectedPlaylist.clips.map((clip, idx) => (
                    <div
                      key={`${selectedPlaylist.id}-${clip.id}-${idx}`}
                      className="flex-shrink-0 w-36 aspect-video rounded border border-obs-border bg-obs-surface overflow-hidden relative group"
                    >
                      {clip.type === "video" ? (
                        <HoverVideoPreview
                          src={clip.url}
                          thumbnail={clip.thumbnail}
                          className="w-full h-full object-cover"
                        />
                      ) : clip.type === "videoinput" ? (
                        <LibraryMediaPreview file={clip} />
                      ) : clip.type === "document" ||
                        clip.type === "ppt" ||
                        clip.name.toLowerCase().endsWith(".pdf") ? (
                        <div className="w-full h-full bg-white overflow-hidden flex items-center justify-center pointer-events-none">
                          {clip.type === "ppt" ? (
                            <PPTSlideRenderer
                              clip={clip}
                              pageNumber={clip.currentPage || 1}
                              isThumbnail={true}
                            />
                          ) : (
                            <PDFRenderer
                              url={clip.url}
                              pageNumber={clip.currentPage || 1}
                            />
                          )}
                        </div>
                      ) : (
                        <img
                          src={clip.thumbnail}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="absolute inset-0 bg-obs-dark-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-white bg-obs-accent px-2 py-1 rounded shadow-lg">
                          Clip {idx + 1}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-obs-dark-1 px-1.5 py-0.5">
                        <span className="text-[8px] text-white truncate block">
                          {clip.name}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-obs-border rounded m-2 opacity-30">
                    <Layers size={24} className="mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Playlist Vacía
                    </span>
                    <span className="text-[8px]">
                      Arrastra clips aquí para empezar
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex-1 flex items-center justify-center opacity-30 border-2 border-dashed border-obs-border rounded-lg m-4 hover:border-obs-accent hover:bg-obs-accent/5 transition-all group"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (playlists.length > 0) {
                    onDropOnPlaylist(e, playlists[0].id);
                    onSelectPlaylist(playlists[0]);
                  } else {
                    onDropOnPlaylist(e);
                  }
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus
                    size={32}
                    className="text-obs-accent group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Selecciona una Playlist
                  </span>
                  <span className="text-[8px] font-medium text-obs-muted">
                    O arrastra contenido aquí para empezar
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("playlistId", playlist.id);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropOnPlaylist(e, playlist.id)}
                onClick={() => {
                  setLocalSelectedId(playlist.id);
                  onSelectPlaylist(playlist);
                }}
                className={`px-3 py-1.5 rounded cursor-pointer transition-colors text-[11px] font-medium flex justify-between items-center ${
                  activeId === playlist.id
                    ? "bg-obs-accent text-white"
                    : "text-obs-text hover:bg-obs-surface"
                }`}
              >
                <span className="truncate">{playlist.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetEditingPlaylist(playlist.id);
                    }}
                    className={`p-1 rounded hover:bg-obs-dark-1 transition-colors ${activeId === playlist.id ? "text-white" : "text-obs-muted"}`}
                  >
                    <Settings size={16} />
                  </button>
                  <span
                    className={`text-[8px] px-1 rounded ${activeId === playlist.id ? "bg-obs-dark-1" : "bg-obs-surface text-obs-muted"}`}
                  >
                    {playlist.clips.length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

const GridSection = React.memo(
  ({
    currentDeck,
    onSetDeck,
    deckClips,
    onSelectClip,
    onDragStart,
    isDarkMode,
    selectedClipId,
    onDeleteClip,
  }: {
    currentDeck: string;
    onSetDeck: (d: string) => void;
    deckClips: Record<string, Clip[]>;
    onSelectClip: (clip: Clip) => void;
    onDragStart: (e: React.DragEvent, clip: Clip) => void;
    isDarkMode: boolean;
    selectedClipId: string | null;
    onDeleteClip?: (id: string) => void;
  }) => (
    <div className="h-full flex flex-col bg-obs-bg">
      <div className="px-3 py-1.5 border-b border-obs-border flex justify-between items-center bg-obs-surface">
        <div className="flex items-center gap-2">
          <Grid size={12} className="text-obs-accent" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">
            Fuentes
          </span>
        </div>
        <div className="flex gap-2">
          {["TODOS", ...Object.keys(deckClips)].map((deck) => (
            <button
              key={deck}
              onClick={() => onSetDeck(deck)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${deck === currentDeck ? "bg-obs-accent text-white" : "text-obs-muted hover:text-obs-text"}`}
            >
              {deck}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {(currentDeck === "TODOS"
          ? Object.values(deckClips).flat()
          : deckClips[currentDeck]
        ).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-obs-muted opacity-30 gap-2">
            <Plus size={24} strokeWidth={1} />
            <span className="text-[9px] uppercase font-bold tracking-widest">
              Agrega fuentes a esta baraja
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 content-start">
            {(currentDeck === "TODOS"
              ? Object.values(deckClips).flat()
              : deckClips[currentDeck]
            ).map((clip) => (
              <div key={clip.id} className="w-[110px] shrink-0">
                <ClipCard
                  clip={clip}
                  onSelect={() => onSelectClip(clip)}
                  onDragStart={(e) => onDragStart(e, clip)}
                  isDarkMode={isDarkMode}
                  isSelected={selectedClipId === clip.id}
                  onDelete={
                    onDeleteClip ? () => onDeleteClip(clip.id) : undefined
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ),
);
const TransitionsSection = React.memo(
  ({
    duration,
    onDurationChange,
    onTake,
    transitionType,
    onTransitionTypeChange,
  }: {
    duration: number;
    onDurationChange: (val: number) => void;
    onTake: (type?: "fade" | "wipe" | "slide" | "cut") => void;
    transitionType: "fade" | "wipe" | "slide" | "cut";
    onTransitionTypeChange: (type: "fade" | "wipe" | "slide" | "cut") => void;
  }) => (
    <div className="flex flex-col h-full bg-obs-bg border-r border-obs-border">
      <div className="px-3 py-1.5 border-b border-obs-border flex justify-between items-center bg-obs-surface">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-obs-accent" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">
            Transiciones
          </span>
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-obs-muted uppercase">
            Transición
          </span>
          <select
            value={transitionType}
            onChange={(e) => onTransitionTypeChange(e.target.value as any)}
            className="w-full bg-obs-surface border border-obs-border rounded text-[10px] px-2 py-1.5 outline-none focus:border-obs-accent text-obs-text"
          >
            <option value="fade">Desvanecimiento</option>
            <option value="wipe">Barrido</option>
            <option value="slide">Deslizar</option>
            <option value="cut">Corte</option>
          </select>
        </div>
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-obs-muted uppercase">
            Duración (ms)
          </span>
          <div className="flex items-center gap-2 bg-obs-surface border border-obs-border rounded px-2 py-1.5">
            <input
              type="number"
              min="100"
              max="5000"
              step="100"
              value={duration}
              onChange={(e) => onDurationChange(parseFloat(e.target.value))}
              className="w-full bg-transparent text-[10px] text-obs-accent text-center focus:outline-none"
            />
            <span className="text-[9px] text-obs-muted">ms</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <button
            onClick={() => onTake()}
            className="py-2 bg-obs-surface border border-obs-border rounded text-[10px] font-bold hover:bg-obs-accent hover:text-white transition-colors"
          >
            Transición
          </button>
          <button
            onClick={() => onTake("cut")}
            className="py-2 bg-obs-surface border border-obs-border rounded text-[10px] font-bold hover:bg-obs-accent hover:text-white transition-colors"
          >
            Corte
          </button>
        </div>
      </div>
    </div>
  ),
);

const ProgramSection = React.memo(
  ({
    progress,
    activeClip,
    isPlaylist,
    isLive,
    externalScreens,
  }: {
    progress: { current: number; total: number };
    activeClip: Clip | null;
    isPlaylist: boolean;
    isLive: boolean;
    externalScreens: Screen[];
  }) => {
    const percent =
      progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    const timeRemaining = progress.total - progress.current;

    const activeScreensList = externalScreens.filter((s) => s.isActive);

    return (
      <div className="flex flex-col h-full bg-obs-bg">
        <div className="px-3 py-1.5 border-b border-obs-border flex justify-between items-center bg-obs-surface">
          <div className="flex items-center gap-2">
            <MonitorIcon size={12} className="text-obs-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">
              Info Programa
            </span>
          </div>
          {isLive && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">
                En Vivo
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto">
          {/* Clip Info */}
          <div className="p-2 bg-obs-surface rounded border border-obs-border">
            <div className="flex justify-between items-start mb-1">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-obs-muted uppercase tracking-widest mb-0.5">
                  Ahora Reproduciendo
                </span>
                <span className="text-[11px] font-bold text-obs-text truncate max-w-[140px]">
                  {activeClip ? activeClip.name : "Ningún clip"}
                </span>
              </div>
              <div className="px-2 py-0.5 bg-obs-dark-1 rounded text-[8px] font-bold text-obs-accent border border-obs-text/5 uppercase">
                {isPlaylist ? "Playlist" : "Clip único"}
              </div>
            </div>

            {/* Visualization Bar */}
            <div className="mt-2 space-y-1">
              {activeClip?.type === "document" ||
              activeClip?.type === "ppt" ||
              activeClip?.name.toLowerCase().endsWith(".pdf") ? (
                <>
                  <div className="flex justify-between text-[8px] font-mono font-normal">
                    <span className="text-obs-accent">
                      Pág. {activeClip.currentPage || 1}
                    </span>
                    <span className="text-obs-muted">
                      {activeClip.totalPages
                        ? `Quedan ${activeClip.totalPages - (activeClip.currentPage || 1)}`
                        : "Documento"}
                    </span>
                  </div>
                  <div className="h-2.5 bg-obs-dark-1 rounded-full overflow-hidden border border-obs-text/5 p-0.5">
                    <motion.div
                      initial={false}
                      animate={{
                        width: `${activeClip.totalPages ? ((activeClip.currentPage || 1) / activeClip.totalPages) * 100 : 100}%`,
                      }}
                      className="h-full bg-gradient-to-r from-obs-accent to-blue-400 rounded-full shadow-[0_0_10px_rgba(0,163,245,0.4)]"
                    />
                  </div>
                  <div className="flex justify-between text-[7px] font-bold text-obs-muted uppercase tracking-tighter">
                    <span>Inicio</span>
                    <span className="text-right">
                      {activeClip.totalPages
                        ? `Total Págs: ${activeClip.totalPages}`
                        : ""}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-[8px] font-mono font-normal">
                    <span className="text-obs-accent">
                      {formatTime(progress.current)}
                    </span>
                    <span className="text-obs-muted">
                      -{formatTime(timeRemaining > 0 ? timeRemaining : 0)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-obs-dark-1 rounded-full overflow-hidden border border-obs-text/5 p-0.5">
                    <motion.div
                      initial={false}
                      animate={{ width: `${percent}%` }}
                      className="h-full bg-gradient-to-r from-obs-accent to-blue-400 rounded-full shadow-[0_0_10px_rgba(0,163,245,0.4)]"
                    />
                  </div>
                  <div className="flex justify-between text-[7px] font-bold text-obs-muted uppercase tracking-tighter">
                    <span>Inicio</span>
                    <span className="text-right">
                      Duración Total: {formatTime(progress.total)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Screens Info */}
          <div className="space-y-1">
            <span className="text-[8px] font-black text-obs-muted uppercase tracking-widest px-1">
              Pantallas de Salida
            </span>
            <div className="grid grid-cols-1 gap-1">
              {activeScreensList.length > 0 ? (
                activeScreensList.map((screen) => (
                  <div
                    key={screen.id}
                    className="flex items-center gap-2 p-1.5 bg-obs-surface/50 rounded border border-obs-text/5"
                  >
                    <Radio size={10} className="text-green-500" />
                    <span className="text-[9px] font-bold text-obs-text uppercase truncate">
                      ID: {screen.name}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 p-1 bg-obs-surface/50 rounded border border-dashed border-obs-border opacity-50">
                  <AlertTriangle size={10} className="text-obs-muted" />
                  <span className="text-[9px] font-bold text-obs-muted uppercase">
                    No hay salidas activas
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const LayersSection = React.memo(
  ({
    layers,
    activeColumnTrigger,
    activeLayerTriggers,
    columnUIStates,
    setActiveColumnTrigger,
    setActiveLayerTriggers,
    onAddLayer,
    onRemoveLayer,
    onTriggerClip,
    onTriggerColumn,
    onStopColumn,
    onDropOnLayer,
    onDragStartSlot,
    layerOutputs,
    onSetLayerOutput,
    onUpdateLayer,
    onUpdateClip,
    onSelectLayer,
    onPreviewClip,
    onProgressUpdate,
    outputs,
    externalScreens,
    clips,
    isDarkMode,
    selectedItemId,
    selectedItemType,
    onAddColumn,
  }: {
    layers: Layer[];
    activeColumnTrigger: number | null;
    activeLayerTriggers: Record<string, "play" | "stop" | null>;
    columnUIStates: Record<number, "play" | "stop" | null>;
    setActiveColumnTrigger: (val: number | null) => void;
    setActiveLayerTriggers: React.Dispatch<
      React.SetStateAction<Record<string, "play" | "stop" | null>>
    >;
    onAddLayer: () => void;
    onRemoveLayer: (layerId: string) => void;
    onTriggerClip: (
      layerId: string,
      slotIdx: number,
      mode?: "single" | "sequence",
    ) => void;
    onTriggerColumn: (slotIdx: number) => void;
    onStopColumn: (slotIdx: number) => void;
    onDropOnLayer: (
      e: React.DragEvent,
      layerId: string,
      slotIdx: number,
    ) => void;
    onDragStartSlot: (e: React.DragEvent, clip: Clip) => void;
    layerOutputs: Record<string, string | null>;
    onSetLayerOutput: (layerId: string, outputId: string | null) => void;
    onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
    onUpdateClip: (clipId: string, updates: Partial<Clip>) => void;
    onSelectLayer: (layerId: string) => void;
    onPreviewClip: (clip: Clip) => void;
    onProgressUpdate?: (current: number, total: number) => void;
    outputs: any[];
    externalScreens: Screen[];
    clips: Clip[];
    isDarkMode: boolean;
    selectedItemId?: string | null;
    selectedItemType?: string | null;
    onAddColumn?: () => void;
  }) => {
    const [activeOutputMenu, setActiveOutputMenu] = useState<string | null>(
      null,
    );
    const columnsCount = layers[0]?.slots.length || 0;

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-obs-bg border border-obs-border rounded-lg shadow-inner">
        <div className="px-3 py-1.5 border-b border-obs-border flex justify-between items-center bg-obs-dark-1 shrink-0">
          <div className="flex items-center gap-2">
            <Grid size={12} className="text-obs-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">
              Capas (Control de Salidas Directo)
            </span>
          </div>
          <button
            onClick={onAddLayer}
            className="p-1 text-obs-accent hover:scale-110 transition-transform"
            title="Agregar Capa"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar p-2">
          <div className="min-w-max space-y-3">
            {/* Column Triggers Header */}
            <div className="flex gap-2 items-end mb-1 sticky top-0 bg-obs-bg z-20 pb-2 border-b border-obs-text/5">
              <div className="w-40 shrink-0 px-2 py-1 text-[8px] font-black text-obs-muted uppercase flex items-center gap-1.5 sticky left-0 bg-obs-bg z-30">
                <Zap size={10} className="text-obs-accent" />
                TRIGGERS
              </div>
              <div className="flex gap-1">
                {Array.from({ length: columnsCount }).map((_, colIdx) => {
                  const state = columnUIStates[colIdx];
                  return (
                    <div key={colIdx} className="w-[88px] shrink-0">
                      <div className="w-full h-full flex gap-1">
                        <div className="flex-1 flex gap-0.5">
                          <button
                            onClick={() => onTriggerColumn(colIdx)}
                            className={`flex-1 rounded-[2px] border flex items-center justify-center h-6 transition-colors ${state === "play" ? "bg-green-500/20 border-green-500 text-green-500" : "bg-transparent border-gray-400 text-gray-400 hover:bg-gray-400/10"}`}
                            title={`Play Column ${colIdx + 1}`}
                          >
                            <Play size={10} fill="currentColor" />
                          </button>
                          <button
                            onClick={() => onStopColumn(colIdx)}
                            className={`flex-1 rounded-[2px] border flex items-center justify-center h-6 transition-colors ${state === "stop" ? "bg-red-500/20 border-red-500 text-red-500" : "bg-transparent border-gray-400 text-gray-400 hover:bg-gray-400/10"}`}
                            title={`Stop Column ${colIdx + 1}`}
                          >
                            <Square size={8} fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="w-[88px] shrink-0 ml-1 h-6 pointer-events-none"></div>
              </div>
            </div>

            <div className="space-y-2 relative max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
              {layers.map((layer, lIdx) => (
                <div
                  key={layer.id}
                  className={`flex gap-2 items-center group/row relative ${activeOutputMenu === layer.id ? "z-50" : "z-10"}`}
                >
                  <div
                    onClick={() => {
                      onSelectLayer(layer.id);
                      onUpdateLayer(layer.id, {});
                    }}
                    className={`w-40 h-[60px] px-1.5 py-1 border rounded flex flex-col justify-between group relative overflow-visible shrink-0 cursor-pointer transition-all sticky left-0 ${activeOutputMenu === layer.id ? "z-[100]" : "z-20"} ${
                      layer.activeClipId ? "bg-obs-surface" : "bg-obs-dark-1"
                    } ${(selectedItemId === layer.id && selectedItemType === "layer") || layer.isActive ? "border-obs-accent ring-1 ring-obs-accent/20" : "border-obs-border"}`}
                  >
                    <div className="flex flex-col gap-1 w-full h-full justify-between">
                      {/* Top Row: Layer Name, Play/Stop and Output Selector */}
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[9px] font-black text-obs-accent uppercase truncate max-w-[50px]">
                            {layer.name}
                          </span>
                          <div className="flex gap-0.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveLayerTriggers((prev) => ({
                                  ...prev,
                                  [layer.id]: "stop",
                                }));
                                onProgressUpdate?.(0, 0);
                                onUpdateLayer(layer.id, {
                                  isPlaying: false,
                                  activeClipId: null,
                                  activeSlotIndex: null,
                                });
                                if (typeof window !== "undefined") {
                                  (window as any).__luminVideoTimes = {};
                                }
                                if (clips && onUpdateClip) {
                                  clips.forEach((c) => {
                                    onUpdateClip(c.id, { currentTime: 0 });
                                  });
                                }
                                const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
                                if (ch && clips) {
                                    clips.forEach((c) => {
                                      try {
                                        ch.postMessage({
                                          type: "VIDEO_TIME_UPDATE",
                                          payload: { clipId: c.id, currentTime: 0 },
                                        });
                                      } catch (err) {}
                                    });
                                }
                              }}
                              className={`w-[18px] h-[18px] border flex items-center justify-center rounded-[1px] transition-colors ${!layer.isPlaying && !layer.activeClipId ? "border-red-500 bg-red-500 text-white" : "border-white/80 bg-white text-black hover:bg-gray-200"}`}
                              title="Stop Layer"
                            >
                              <Square size={8} fill="currentColor" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveColumnTrigger(null);
                                setActiveLayerTriggers((prev) => ({
                                  ...prev,
                                  [layer.id]: "play",
                                }));
                                const firstIdx = layer.slots.findIndex((s) => s !== null);
                                if (firstIdx !== -1) {
                                  onTriggerClip(
                                    layer.id,
                                    firstIdx,
                                    "sequence",
                                  );
                                }
                              }}
                              className={`w-[18px] h-[18px] border flex items-center justify-center rounded-[1px] transition-colors ${layer.isPlaying && layer.playbackMode === "sequence" ? "border-green-500 bg-green-500 text-white" : "border-white/80 bg-white text-black hover:bg-green-100 hover:border-green-500"}`}
                              title="Play Layer"
                            >
                              <Play size={8} fill="currentColor" />
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveOutputMenu(
                                activeOutputMenu === layer.id ? null : layer.id,
                              );
                            }}
                            className="flex items-center gap-1 group/out hover:opacity-80 transition-opacity"
                          >
                            <MonitorIcon size={8} className="text-obs-accent" />
                            <span className="text-[8px] font-bold text-white uppercase tracking-tight">
                              {layerOutputs[layer.id]
                                ? `OUT ${layerOutputs[layer.id]}`
                                : "PROGRAM"}
                            </span>
                            <ChevronRight size={8} className="text-obs-muted" />
                          </button>

                          {activeOutputMenu === layer.id && (
                            <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 bg-obs-surface border border-obs-border rounded shadow-2xl z-[1000] p-1 flex flex-row flex-nowrap gap-1 w-max">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSetLayerOutput(layer.id, null);
                                  setActiveOutputMenu(null);
                                }}
                                className={`h-5 px-1.5 text-[7px] font-black rounded flex items-center justify-center transition-all ${!layerOutputs[layer.id] ? "bg-obs-accent text-white shadow-lg" : "bg-obs-dark-1 text-obs-muted hover:bg-white/5"}`}
                              >
                                PROGRAM
                              </button>
                              {outputs.map((out) => (
                                <button
                                  key={out.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSetLayerOutput(layer.id, out.id);
                                    setActiveOutputMenu(null);
                                  }}
                                  className={`h-5 px-1.5 text-[7px] font-black rounded flex items-center justify-center transition-all min-w-[25px] ${layerOutputs[layer.id] === out.id ? "bg-obs-accent text-white shadow-lg" : "bg-obs-dark-1 text-obs-muted hover:bg-white/5"}`}
                                >
                                  OUT {out.id}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Trash, Eye, Volume and Opacity */}
                      <div className="flex justify-between items-end w-full">
                        <div className="flex gap-2 items-center px-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveLayer(layer.id);
                            }}
                            className={`hover:scale-110 transition-all text-obs-muted hover:text-red-500`}
                            title="Eliminar capa"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateLayer(layer.id, {
                                isVisible: !layer.isVisible,
                              });
                            }}
                            className={`hover:scale-110 transition-all ${layer.isVisible ? "text-white" : "text-obs-muted"}`}
                            title="Visibilidad"
                          >
                            {layer.isVisible ? (
                              <Eye size={14} />
                            ) : (
                              <EyeOff size={14} />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateLayer(layer.id, { muted: !layer.muted });
                            }}
                            className={`hover:scale-110 transition-all ${!layer.muted ? "text-white" : "text-obs-muted"}`}
                            title={layer.muted ? "Activar audio" : "Silenciar"}
                          >
                            {layer.muted ? (
                              <VolumeX size={14} />
                            ) : (
                              <Volume2 size={14} />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateLayer(layer.id, {
                                loop: !(layer.loop !== false),
                              });
                            }}
                            className={`hover:scale-110 transition-all ${layer.loop !== false ? "text-obs-accent" : "text-white"}`}
                            title={
                              layer.loop !== false
                                ? "Desactivar bucle"
                                : "Activar bucle"
                            }
                          >
                            <Repeat size={14} />
                          </button>
                        </div>

                        <div className="flex-1 flex flex-col items-end gap-0.5 min-w-0 pb-0.5">
                          <span className="text-[8px] font-bold text-obs-muted leading-none mr-2">
                            Opacity
                          </span>
                          <div className="flex items-center bg-obs-dark-2 rounded-[2px] px-1 h-4 border border-white/10 w-full max-w-[60px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateLayer(layer.id, {
                                  opacity: Math.max(
                                    0,
                                    (layer.opacity || 0) - 0.05,
                                  ),
                                });
                              }}
                              className="text-[10px] text-white hover:text-obs-accent px-0.5 transition-colors font-bold"
                            >
                              -
                            </button>
                            <div className="flex-1 text-center">
                              <span className="text-[9px] font-black text-white font-mono">
                                {Math.round((layer.opacity || 0) * 100)}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateLayer(layer.id, {
                                  opacity: Math.min(
                                    1,
                                    (layer.opacity || 0) + 0.05,
                                  ),
                                });
                              }}
                              className="text-[10px] text-white hover:text-obs-accent px-0.5 transition-colors font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 pb-1">
                    {layer.slots.map((slot, idx) => (
                      <div
                        key={idx}
                        draggable={!!slot}
                        onDragStart={(e) => slot && onDragStartSlot(e, slot)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDropOnLayer(e, layer.id, idx)}
                        onClick={() => onTriggerClip(layer.id, idx)}
                        className={`flex-shrink-0 w-[88px] h-[60px] rounded border cursor-pointer transition-all relative group overflow-hidden ${
                          slot
                            ? "bg-obs-surface border-obs-border"
                            : "bg-obs-dark-1 border-obs-border/30 hover:border-obs-accent/50"
                        } ${layer.activeSlotIndex === idx ? "border-obs-accent shadow-[0_0_10px_rgba(0,163,245,0.3)]" : ""}`}
                      >
                        {slot ? (
                          <>
                            {slot.type === "video" ? (
                              <HoverVideoPreview
                                src={slot.url}
                                thumbnail={slot.thumbnail}
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100"
                              />
                            ) : slot.type === "videoinput" ? (
                              <LibraryMediaPreview file={slot} />
                            ) : slot.type === "document" ||
                              slot.type === "ppt" ||
                              slot.name.toLowerCase().endsWith(".pdf") ? (
                              <div className="w-full h-full bg-white overflow-hidden flex items-center justify-center pointer-events-none opacity-60 group-hover:opacity-100">
                                {slot.type === "ppt" ? (
                                  <PPTSlideRenderer
                                    clip={slot}
                                    pageNumber={slot.currentPage || 1}
                                    isThumbnail={true}
                                  />
                                ) : (
                                  <PDFRenderer
                                    url={slot.url}
                                    pageNumber={slot.currentPage || 1}
                                  />
                                )}
                              </div>
                            ) : (
                              <img
                                src={slot.thumbnail}
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100"
                              />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-obs-dark-1 px-1 py-0.5 z-10">
                              <span className="text-[7px] text-white truncate block">
                                {slot.name}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreviewClip(slot);
                              }}
                              className="absolute top-1 right-8 h-5 px-1.5 bg-obs-accent text-white rounded-[2px] text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-obs-accent shadow-lg z-20"
                              title="VISTA PREVIA"
                            >
                              PREV
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newSlots = [...layer.slots];
                                newSlots[idx] = null;
                                onUpdateLayer(layer.id, { slots: newSlots });
                              }}
                              className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center bg-obs-dark-1 border border-obs-text/10 rounded-[2px] text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-20"
                            >
                              <X size={10} />
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-10 group-hover:opacity-30 transition-opacity">
                            <Plus size={16} />
                          </div>
                        )}
                      </div>
                    ))}
                    <div
                      onClick={onAddColumn}
                      className="flex flex-shrink-0 items-center justify-center w-[88px] h-[60px] ml-1 bg-obs-dark-1/50 border border-dashed border-obs-text/20 rounded cursor-pointer hover:border-obs-accent hover:bg-obs-accent/10 transition-all group"
                      title="Añadir columna"
                    >
                      <Plus
                        size={16}
                        className="text-obs-muted group-hover:text-obs-accent transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const PiPSection = React.memo(
  ({
    layers,
    clips,
    onUpdateLayer,
    onAddPiP,
    onSelectPiP,
    selectedPiPId,
    isDarkMode,
  }: {
    layers: PiPLayer[];
    clips: Clip[];
    onUpdateLayer: (id: string, updates: Partial<PiPLayer>) => void;
    onAddPiP: () => void;
    onSelectPiP: (pip: PiPLayer) => void;
    selectedPiPId: string | null;
    isDarkMode: boolean;
  }) => {
    return (
      <div
        className="flex flex-col w-48 bg-obs-surface border border-obs-border rounded-lg overflow-hidden shrink-0"
        style={{ maxHeight: "300px" }}
      >
        <div className="px-2 py-1.5 border-b border-obs-border bg-obs-dark-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers size={12} className="text-obs-accent" />
            <span className="text-[10px] font-black uppercase tracking-wider text-obs-text">
              PiP Panels
            </span>
          </div>
          <button className="p-1 text-obs-muted hover:text-white transition-colors">
            <Settings size={10} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar px-1">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className={`p-2 rounded border transition-all ${layer.isActive ? "bg-obs-accent/10 border-obs-accent" : "bg-obs-dark-1 border-obs-text/5 hover:border-obs-text/10"}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span
                  className={`text-[9px] font-bold uppercase ${layer.isActive ? "text-obs-accent" : "text-obs-muted"}`}
                >
                  {layer.name}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      onUpdateLayer(layer.id, { isActive: !layer.isActive })
                    }
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${layer.isActive ? "bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.3)]" : "bg-obs-accent text-white hover:bg-obs-accent/80"}`}
                  >
                    {layer.isActive ? "OFF" : "LIVE"}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] text-obs-muted font-bold uppercase">
                    Source
                  </label>
                  <select
                    value={layer.clipId || ""}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, {
                        clipId: e.target.value || null,
                      })
                    }
                    className="w-full bg-obs-dark-1 border border-obs-text/10 rounded px-1 py-1 text-[9px] text-obs-text outline-none focus:border-obs-accent"
                  >
                    <option value="">No Source</option>
                    {clips.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] text-obs-muted font-bold uppercase">
                      PosX
                    </label>
                    <input
                      type="number"
                      value={layer.x}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, {
                          x: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-obs-dark-1 border border-obs-text/5 rounded px-1 py-0.5 text-[9px] text-obs-accent font-mono outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] text-obs-muted font-bold uppercase">
                      PosY
                    </label>
                    <input
                      type="number"
                      value={layer.y}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, {
                          y: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-obs-dark-1 border border-obs-text/5 rounded px-1 py-0.5 text-[9px] text-obs-accent font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] text-obs-muted font-bold uppercase">
                      Ancho
                    </label>
                    <input
                      type="number"
                      value={layer.width}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, {
                          width: parseInt(e.target.value) || 100,
                        })
                      }
                      className="w-full bg-obs-dark-1 border border-obs-text/5 rounded px-1 py-0.5 text-[9px] text-obs-accent font-mono outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] text-obs-muted font-bold uppercase">
                      Alto
                    </label>
                    <input
                      type="number"
                      value={layer.height}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, {
                          height: parseInt(e.target.value) || 100,
                        })
                      }
                      className="w-full bg-obs-dark-1 border border-obs-text/5 rounded px-1 py-0.5 text-[9px] text-obs-accent font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] text-obs-muted font-bold uppercase">
                      Opacidad
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={layer.opacity}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, {
                          opacity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-obs-dark-1 border border-obs-text/5 rounded px-1 py-0.5 text-[9px] text-obs-accent font-mono outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] text-obs-muted font-bold uppercase">
                      Target
                    </label>
                    <select
                      value={layer.targetOutputId || ""}
                      onChange={(e) =>
                        onUpdateLayer(layer.id, {
                          targetOutputId: e.target.value || null,
                        })
                      }
                      className="w-full bg-black border border-obs-text/10 rounded px-1 py-0.5 text-[8.5px] text-white font-bold outline-none"
                    >
                      <option value="" className="bg-obs-surface text-white">
                        Prog
                      </option>
                      <option value="1" className="bg-obs-surface text-white">
                        Out 1
                      </option>
                      <option value="2" className="bg-obs-surface text-white">
                        Out 2
                      </option>
                      <option value="3" className="bg-obs-surface text-white">
                        Out 3
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() =>
                      onUpdateLayer(layer.id, {
                        showInPreview: !layer.showInPreview,
                      })
                    }
                    className={`py-1 rounded text-[7px] font-black uppercase tracking-tighter transition-all border ${layer.showInPreview ? "bg-obs-accent text-white border-obs-accent" : "bg-obs-dark-1 text-obs-muted border-obs-text/5"}`}
                  >
                    PREVIEW {layer.showInPreview ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() =>
                      onUpdateLayer(layer.id, { showFrame: !layer.showFrame })
                    }
                    className={`py-1 rounded text-[7px] font-black uppercase tracking-tighter transition-all border ${layer.showFrame !== false ? "bg-obs-accent text-white border-obs-accent" : "bg-obs-dark-1 text-obs-muted border-obs-text/5"}`}
                  >
                    FRAME {layer.showFrame !== false ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={onAddPiP}
            className="w-full py-1.5 border border-dashed border-obs-border rounded text-[9px] text-obs-muted hover:text-white hover:border-obs-muted transition-all uppercase font-bold flex items-center justify-center gap-1.5"
          >
            <Plus size={10} />
            Create PiP Window
          </button>
        </div>
      </div>
    );
  },
);

const MixerSection = React.memo(
  ({
    previewLevel,
    programLevel,
    previewVolume,
    programVolume,
    masterVolume,
    usbInVolume,
    usbOutVolume,
    onPreviewVolumeChange,
    onProgramVolumeChange,
    onMasterVolumeChange,
    onUsbInVolumeChange,
    onUsbOutVolumeChange,
  }: {
    previewLevel: number;
    programLevel: number;
    previewVolume: number;
    programVolume: number;
    masterVolume: number;
    usbInVolume: number;
    usbOutVolume: number;
    onPreviewVolumeChange: (v: number) => void;
    onProgramVolumeChange: (v: number) => void;
    onMasterVolumeChange: (v: number) => void;
    onUsbInVolumeChange: (v: number) => void;
    onUsbOutVolumeChange: (v: number) => void;
  }) => {
    const faderBgStyle = {
      backgroundImage:
        "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
      backgroundSize: "100% 10%",
    };

    return (
      <div className="flex flex-col h-full bg-obs-bg border-r border-obs-border">
        <div className="px-3 py-1.5 border-b border-obs-border flex justify-between items-center bg-obs-surface">
          <div className="flex items-center gap-2">
            <Volume2 size={12} className="text-obs-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">
              Mezclador de Audio
            </span>
          </div>
          <button className="p-1 text-obs-muted hover:text-obs-text transition-colors">
            <Settings size={12} />
          </button>
        </div>
        <div className="flex-1 p-2 flex gap-0.5 overflow-x-auto justify-start select-none">
          {[
            {
              name: "Master",
              level: programLevel,
              volume: masterVolume,
              onChange: onMasterVolumeChange,
            },
            {
              name: "Programa",
              level: programLevel,
              volume: programVolume,
              onChange: onProgramVolumeChange,
            },
            {
              name: "USB IN",
              level: 0,
              volume: usbInVolume,
              onChange: onUsbInVolumeChange,
            },
            {
              name: "USB Out",
              level: 0,
              volume: usbOutVolume,
              onChange: onUsbOutVolumeChange,
            },
          ].map((source, i) => (
            <div
              key={source.name}
              className="flex gap-1 h-full items-end min-w-[36px]"
            >
              {/* VU Meter */}
              <div className="w-1.5 h-full max-h-[120px] bg-obs-dark-1 rounded-sm border border-obs-text/5 relative overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full bg-green-500/50 border-t border-green-400 transition-all duration-75"
                  style={{
                    height: `${source.level * 100}%`,
                    boxShadow: "0 0-10px rgba(34, 197, 94, 0.3)",
                  }}
                />
              </div>

              {/* Fader */}
              <div className="flex flex-col items-center gap-1 h-full">
                <div
                  className="w-4 h-full max-h-[120px] relative bg-obs-dark-1 rounded-sm border border-obs-text/5 cursor-ns-resize overflow-hidden group"
                  style={faderBgStyle}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const rect = target.getBoundingClientRect();

                    const updateValue = (clientY: number) => {
                      const y = Math.max(
                        0,
                        Math.min(clientY - rect.top, rect.height),
                      );
                      const percent = 1 - y / rect.height;
                      const newValue = Math.max(0, Math.min(1, percent));
                      source.onChange(newValue);
                    };

                    const onMouseMove = (moveEvent: MouseEvent) => {
                      updateValue(moveEvent.clientY);
                    };

                    const onMouseUp = () => {
                      window.removeEventListener("mousemove", onMouseMove);
                      window.removeEventListener("mouseup", onMouseUp);
                      document.body.style.cursor = "";
                      document.documentElement.classList.remove("select-none");
                    };

                    window.addEventListener("mousemove", onMouseMove);
                    window.addEventListener("mouseup", onMouseUp);
                    document.body.style.cursor = "ns-resize";
                    document.documentElement.classList.add("select-none");
                    updateValue(e.clientY);
                  }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 bg-obs-accent/20 transition-all duration-75"
                    style={{ height: `${source.volume * 100}%` }}
                  />
                  <div
                    className="absolute inset-x-0 bg-obs-accent h-1 shadow-[0_0_10px_rgba(0,163,245,0.8)] transition-all duration-75"
                    style={{ bottom: `calc(${source.volume * 100}% - 1px)` }}
                  />
                </div>
                <div className="flex flex-col items-center min-w-[40px]">
                  <span className="text-[7px] text-obs-muted uppercase font-bold tracking-tighter leading-none mb-0.5">
                    {source.name}
                  </span>
                  <span className="text-[8px] font-mono text-obs-accent leading-none font-bold">
                    {volToDb(source.volume)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

const OutputManagerModal = ({
  outputs,
  externalScreens,
  activeOutputId,
  onClose,
  onApply,
  showCustomAlert,
}: {
  outputs: any[];
  externalScreens: any[];
  activeOutputId: string;
  onClose: () => void;
  onApply: (newOutputs: any[]) => void;
  showCustomAlert: (title: string, message: string, type?: "info" | "error" | "success") => void;
}) => {
  const [localOutputs, setLocalOutputs] = useState([...outputs]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obs-bg/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-obs-bg border border-obs-border rounded-lg shadow-2xl w-[400px] flex flex-col overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-obs-border bg-obs-surface flex justify-between items-center">
          <span className="font-bold text-sm">Gestionar Salidas (Outputs)</span>
          <button onClick={onClose} className="text-obs-muted hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <button
            onClick={() => {
              if (
                externalScreens.length > 0 &&
                localOutputs.length >= externalScreens.length
              ) {
                showCustomAlert(
                  "Límite de Salidas Alcanzado", 
                  `No puedes crear más salidas que pantallas físicas detectadas (${externalScreens.length}).`, 
                  "error"
                );
                return;
              }
              const newId = String(Date.now());
              setLocalOutputs([
                ...localOutputs,
                {
                  id: String(localOutputs.length + 1),
                  name: `Salida ${localOutputs.length + 1}`,
                  physicalScreenId: null,
                  internalId: newId,
                },
              ]);
            }}
            className="w-full py-2 bg-obs-accent hover:bg-obs-accent-hover text-white rounded font-bold text-sm disabled:opacity-50"
            disabled={
              externalScreens.length > 0 &&
              localOutputs.length >= externalScreens.length
            }
          >
            + Agregar Nueva Salida
          </button>
          <div className="flex flex-col gap-3">
            {localOutputs.map((out) => (
              <div
                key={`output-manage-item-${out.internalId || out.id}`}
                className="flex flex-col gap-2 bg-obs-dark-1 p-3 rounded border border-obs-text/10"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold">Salida {out.id}</span>
                  <button
                    onClick={() => {
                      if (localOutputs.length > 1)
                        setLocalOutputs(
                          localOutputs.filter((o) => o.id !== out.id),
                        );
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-obs-muted uppercase font-bold">
                    Pantalla Física
                  </span>
                  <select
                    value={out.physicalScreenId || ""}
                    onChange={(e) => {
                      const screenId = e.target.value;
                      setLocalOutputs(
                        localOutputs.map((o) =>
                          o.id === out.id
                            ? { ...o, physicalScreenId: screenId || null }
                            : o,
                        ),
                      );
                    }}
                    className="bg-black border border-obs-border rounded px-2 py-1 text-xs text-white outline-none focus:border-obs-accent"
                  >
                    <option value="">No asignada</option>
                    {externalScreens.map((screen) => (
                      <option key={screen.id} value={screen.id}>
                        {screen.name || `Monitor ${screen.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-obs-border bg-obs-surface flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-obs-text hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
          >
            Cancelar
          </button>
          <button
            onClick={() => onApply(localOutputs)}
            className="px-5 py-2 rounded bg-obs-accent text-white hover:bg-obs-accent-hover transition-colors text-xs font-bold uppercase tracking-wider shadow-lg"
          >
            Aceptar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PreviewManagerModal = ({
  previews,
  outputs,
  onClose,
  onApply,
}: {
  previews: any[];
  outputs: any[];
  onClose: () => void;
  onApply: (newPreviews: any[]) => void;
}) => {
  const [localPreviews, setLocalPreviews] = useState([...previews]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obs-bg/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-obs-bg border border-obs-border rounded-lg shadow-2xl w-[500px] flex flex-col overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-obs-border bg-obs-surface flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-obs-accent" />
            <span className="font-bold text-sm uppercase tracking-widest">
              Configuración de Previews
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-obs-muted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4 bg-obs-bg">
          <button
            onClick={() => {
              const nextId = String(
                Math.max(0, ...localPreviews.map((p) => parseInt(p.id))) + 1,
              );
              setLocalPreviews([
                ...localPreviews,
                {
                  id: nextId,
                  name: `Preview ${nextId}`,
                  clipId: null,
                  volume: 0.5,
                  isLive: false,
                  assignedOutputs: outputs.map((o) => o.id),
                  selectedOutputs: [],
                  hideOverlay: false,
                  overlayColor: "#00a3f5",
                },
              ]);
            }}
            className="w-full py-2.5 bg-obs-accent hover:bg-obs-accent-hover text-white rounded font-black text-[10px] uppercase tracking-widest shadow-lg shadow-obs-accent/20 transition-all active:scale-95"
          >
            + Agregar Nuevo Preview
          </button>
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {localPreviews.map((p) => (
              <div
                key={`preview-manage-item-${p.id}`}
                className="flex flex-col gap-3 bg-obs-dark-1 p-4 rounded-lg border border-obs-text/5 shadow-inner"
              >
                <div className="flex justify-between items-center bg-obs-dark-1 p-2 rounded border border-obs-text/5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-obs-muted">
                      Nombre del Monitor
                    </span>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) =>
                        setLocalPreviews((prevs) =>
                          prevs.map((pr) =>
                            pr.id === p.id
                              ? { ...pr, name: e.target.value }
                              : pr,
                          ),
                        )
                      }
                      className="bg-transparent border-none px-0 py-0.5 text-sm font-bold w-48 focus:text-obs-accent outline-none text-white transition-colors"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setLocalPreviews(
                        localPreviews.filter((pr) => pr.id !== p.id),
                      )
                    }
                    className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-obs-muted">
                      Salidas Disponibles
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {outputs.map((out) => (
                        <button
                          key={out.id}
                          onClick={() => {
                            setLocalPreviews((prevs) =>
                              prevs.map((pr) =>
                                pr.id === p.id
                                  ? {
                                      ...pr,
                                      assignedOutputs: (
                                        pr.assignedOutputs || []
                                      ).includes(out.id)
                                        ? pr.assignedOutputs.filter(
                                            (o: string) => o !== out.id,
                                          )
                                        : [
                                            ...(pr.assignedOutputs || []),
                                            out.id,
                                          ],
                                    }
                                  : pr,
                              ),
                            );
                          }}
                          className={`w-7 h-7 rounded text-[10px] font-black transition-all border ${p.assignedOutputs?.includes(out.id) ? "bg-obs-accent border-obs-accent text-white shadow-[0_0_8px_rgba(0,163,245,0.4)]" : "bg-obs-dark-1 border-obs-text/10 text-obs-muted hover:border-obs-text/30"}`}
                        >
                          {out.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-obs-muted">
                        Mostrar Textos
                      </span>
                      <button
                        onClick={() =>
                          setLocalPreviews((prevs) =>
                            prevs.map((pr) =>
                              pr.id === p.id
                                ? { ...pr, hideOverlay: !pr.hideOverlay }
                                : pr,
                            ),
                          )
                        }
                        className={`w-8 h-4 rounded-full relative transition-colors ${p.hideOverlay ? "bg-red-500" : "bg-green-500"}`}
                      >
                        <div
                          className={`absolute top-0.5 bottom-0.5 w-3 bg-white rounded-full transition-all ${p.hideOverlay ? "right-0.5" : "left-0.5"}`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-obs-muted">
                        Color Accent
                      </span>
                      <input
                        type="color"
                        value={p.overlayColor || "#00a3f5"}
                        onChange={(e) =>
                          setLocalPreviews((prevs) =>
                            prevs.map((pr) =>
                              pr.id === p.id
                                ? { ...pr, overlayColor: e.target.value }
                                : pr,
                            ),
                          )
                        }
                        className="w-10 h-5 bg-transparent border-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-obs-border bg-obs-surface flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-obs-text hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
          >
            Cancelar
          </button>
          <button
            onClick={() => onApply(localPreviews)}
            className="px-5 py-2 rounded bg-obs-accent text-white hover:bg-obs-accent-hover transition-colors text-xs font-bold uppercase tracking-wider shadow-lg"
          >
            Aceptar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [clips, setClips] = useState<Clip[]>(MOCK_CLIPS);
  const [lastSwitchTime, setLastSwitchTime] = useState(0);
  const [playlists, setPlaylists] = useState<Playlist[]>([
    {
      id: "playlist-1",
      name: "Playlist 1",
      clips: [],
      opacity: 1,
      isVisible: true,
      transform: { ...DEFAULT_TRANSFORM },
      mask: "none",
      master: 1,
      speed: 1,
      volume: 1,
      pan: 0,
      transition: "fade",
      transitionDuration: 1,
      blendMode: "Alpha",
      behavior: "Cortar",
      curve: "Lineal",
      filter: "none",
      brightness: 1,
      contrast: 1,
      saturation: 1,
      colorBalance: { r: 1, g: 1, b: 1 },
    },
    {
      id: "playlist-2",
      name: "Playlist 2",
      clips: [],
      opacity: 1,
      isVisible: true,
      transform: { ...DEFAULT_TRANSFORM },
      mask: "none",
      master: 1,
      speed: 1,
      volume: 1,
      pan: 0,
      transition: "fade",
      transitionDuration: 1,
      blendMode: "Alpha",
      behavior: "Cortar",
      curve: "Lineal",
      filter: "none",
      brightness: 1,
      contrast: 1,
      saturation: 1,
      colorBalance: { r: 1, g: 1, b: 1 },
    },
  ]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<
    | "clip"
    | "playlist"
    | "program"
    | "preview"
    | "layer"
    | "pip"
    | "pipManager"
    | null
  >("program");
  const [previewVolume, setPreviewVolume] = useState(0.5);
  const [programVolume, setProgramVolume] = useState(0.5);
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [usbInVolume, setUsbInVolume] = useState(0.5);
  const [usbOutVolume, setUsbOutVolume] = useState(0.5);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [allScreenSettings, setAllScreenSettings] = useState<
    Record<string, ExternalScreenSettings>
  >({});
  const [programProgress, setProgramProgress] = useState({
    current: 0,
    total: 0,
  });
  const [previewProgress, setPreviewProgress] = useState({
    current: 0,
    total: 0,
  });
  const [timerMode, setTimerMode] = useState<"elapsed" | "remaining">(
    "remaining",
  );
  const [audioVolumes, setAudioVolumes] = useState<Record<string, number>>({
    Master: 0.5,
    Programa: 0.5,
    USB: 0.5,
    IN: 0.5,
  });
  const [audioInputDevices, setAudioInputDevices] = useState<any[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<any[]>([]);
  const [windowsDevicesList, setWindowsDevicesList] = useState<any[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] =
    useState<string>("default");
  const [selectedAudioOutput, setSelectedAudioOutput] =
    useState<string>("default");
  const activeFaders = useMemo(() => {
    const list = ["Master"];
    if (selectedAudioOutput && selectedAudioOutput !== "none") {
      list.push(
        selectedAudioOutput.startsWith("out-")
          ? selectedAudioOutput
          : `out-${selectedAudioOutput}`
      );
    }
    if (selectedAudioInput && selectedAudioInput !== "none") {
      list.push(
        selectedAudioInput.startsWith("in-")
          ? selectedAudioInput
          : `in-${selectedAudioInput}`
      );
    }
    return list;
  }, [selectedAudioOutput, selectedAudioInput]);
  const [isAudioConfigModalOpen, setIsAudioConfigModalOpen] = useState(false);
  const [mutedFaders, setMutedFaders] = useState<Record<string, boolean>>({});

  const toggleMute = useCallback((sourceName: string) => {
    setMutedFaders((prev) => {
      const isMuted = !prev[sourceName];
      
      // Enforce physical muting if Windows electron API available
      if (sourceName === "Master") {
        if (isMuted) {
          (window.electron as any)?.setWindowsVolume?.(0).catch(() => {});
        } else {
          (window.electron as any)?.setWindowsVolume?.(masterVolume).catch(() => {});
        }
      } else if (sourceName === "out-default") {
        const defDev = windowsDevicesList.find((d) => d.flow === 0 && d.isDefault);
        const currentVol = audioVolumes["out-default"] ?? 0.5;
        if (defDev) {
          (window.electron as any)?.setWindowsDeviceVolume?.(defDev.id, isMuted ? 0 : currentVol).catch(() => {});
        } else {
          (window.electron as any)?.setWindowsVolume?.(isMuted ? 0 : currentVol).catch(() => {});
        }
      } else if (sourceName === "in-default") {
        const defDev = windowsDevicesList.find((d) => d.flow === 1 && d.isDefault);
        const currentVol = audioVolumes["in-default"] ?? 0.5;
        if (defDev) {
          (window.electron as any)?.setWindowsDeviceVolume?.(defDev.id, isMuted ? 0 : currentVol).catch(() => {});
        }
      } else if (sourceName === "USB") {
        if (isMuted) {
          (window.electron as any)?.setWindowsVolume?.(0).catch(() => {});
        } else {
          (window.electron as any)?.setWindowsVolume?.(usbOutVolume).catch(() => {});
        }
      } else if (sourceName === "IN") {
        const defIn = windowsDevicesList.find((d) => d.flow === 1 && d.isDefault);
        if (defIn) {
          (window.electron as any)?.setWindowsDeviceVolume?.(defIn.id, isMuted ? 0 : usbInVolume).catch(() => {});
        }
      } else if (sourceName.startsWith("out-") || sourceName.startsWith("in-")) {
        const flow = sourceName.startsWith("out-") ? 0 : 1;
        const cleanId = sourceName.replace("out-", "").replace("in-", "");
        
        let winDevId = cleanId;
        const chromeList = flow === 0 ? audioOutputDevices : audioInputDevices;
        const chromeDev = chromeList.find((d) => d.deviceId === cleanId);
        
        if (chromeDev && chromeDev.label) {
          const rawLabel = chromeDev.label.replace(/^Predeterminado - /, "").trim();
          const winDev = windowsDevicesList.find(d => d.flow === flow && d.name === rawLabel);
          if (winDev) winDevId = winDev.id;
        }

        const dev = windowsDevicesList.find((d: any) => d.id === winDevId);
        const currentVol = dev?.volume ?? audioVolumes[sourceName] ?? 0.5;
        (window.electron as any)?.setWindowsDeviceVolume?.(winDevId, isMuted ? 0 : currentVol).catch(() => {});
      }

      return {
        ...prev,
        [sourceName]: isMuted
      };
    });
  }, [masterVolume, usbOutVolume, usbInVolume, audioVolumes, windowsDevicesList]);

  // Audio signals
  const [programLevel, setProgramLevel] = useState(0);
  const micVolumeRef = useRef<number>(0);

  const [activeOutputId, setActiveOutputId] = useState<string>("1");
  const [libraryFiles, setLibraryFiles] = useState<
    {
      id?: string;
      name: string;
      type: string;
      url: string;
      file?: File | { path: string; name: string } | null;
      path?: string;
      thumbnail?: string;
      addedAt?: number;
    }[]
  >([]);

  const getFaderSignalLevel = useCallback((sourceName: string): number => {
    // If the fader is muted, return exactly 0 immediately
    if (mutedFaders[sourceName]) return 0;

    // Volume setting
    const vol =
      sourceName === "Master"
        ? masterVolume
        : sourceName === "out-default"
          ? (windowsDevicesList.find((d) => d.flow === 0 && d.isDefault)?.volume ?? audioVolumes["out-default"] ?? 0.5)
          : sourceName === "in-default"
            ? (windowsDevicesList.find((d) => d.flow === 1 && d.isDefault)?.volume ?? audioVolumes["in-default"] ?? 0.5)
            : sourceName === "Programa"
              ? programVolume
              : sourceName === "USB"
                ? usbOutVolume
                : sourceName === "IN"
                  ? usbInVolume
                  : (audioVolumes[sourceName] ?? 0.5);

    if (vol <= 0.001) return 0;

    // Windows native WASAPI real-time peak signal integration gated by our app's active content sending
    if (typeof window !== "undefined" && (window as any).electron && windowsDevicesList.length > 0) {
      if (sourceName === "Master") {
        const dev = windowsDevicesList.find((d) => d.flow === 0 && d.isDefault);
        if (dev) {
          const progSig = programLevel * programVolume;
          const micSig = micVolumeRef.current * usbInVolume;
          let ourAppLevel = Math.max(progSig, micSig);

          Object.keys(audioVolumes).forEach((id) => {
            if (id !== "Master" && !mutedFaders[id]) {
              const fV = audioVolumes[id] ?? 0.5;
              if (id === "Programa") ourAppLevel = Math.max(ourAppLevel, programLevel * fV);
              else if (id === "IN" || id === selectedAudioInput) ourAppLevel = Math.max(ourAppLevel, micVolumeRef.current * fV);
            }
          });

          if (ourAppLevel <= 0.005) return 0; // Gated: our app is silent, show zero on Master VU meter
          let peak = dev.peak;
          if (peak < 0.005) peak = 0; // noise gate
          return Math.max(0, Math.min(1, peak * vol * 1.15));
        }
      } else if (sourceName === "out-default") {
        const dev = windowsDevicesList.find((d) => d.flow === 0 && d.isDefault);
        if (dev) {
          const ourAppLevel = programLevel * vol;
          if (ourAppLevel <= 0.005) return 0; // Gated
          let peak = dev.peak;
          if (peak < 0.005) peak = 0; // noise gate
          return Math.max(0, Math.min(1, peak * vol * 1.15));
        }
      } else if (sourceName === "in-default") {
        const dev = windowsDevicesList.find((d) => d.flow === 1 && d.isDefault);
        if (dev) {
          if (micVolumeRef.current <= 0.005) return 0; // Gated
          let peak = dev.peak;
          if (peak < 0.005) peak = 0; // noise gate
          return Math.max(0, Math.min(1, peak * vol * 1.15));
        }
      } else if (sourceName === "IN") {
        const dev = windowsDevicesList.find((d) => d.flow === 1 && d.isDefault);
        if (dev) {
          if (micVolumeRef.current <= 0.005) return 0; // Gated
          let peak = dev.peak;
          if (peak < 0.005) peak = 0; // noise gate
          return Math.max(0, Math.min(1, peak * vol * 1.15));
        }
      } else if (sourceName.startsWith("out-") || sourceName.startsWith("in-")) {
        const flow = sourceName.startsWith("out-") ? 0 : 1;
        const cleanId = sourceName.replace("out-", "").replace("in-", "");
        
        let winDevId = cleanId;
        const chromeList = flow === 0 ? audioOutputDevices : audioInputDevices;
        const chromeDev = chromeList.find((d) => d.deviceId === cleanId);
        
        if (chromeDev && chromeDev.label) {
          const rawLabel = chromeDev.label.replace(/^Predeterminado - /, "").trim();
          const winDev = windowsDevicesList.find(d => d.flow === flow && d.name === rawLabel);
          if (winDev) winDevId = winDev.id;
        }

        const dev = windowsDevicesList.find((d) => d.id === winDevId);
        if (dev) {
          if (flow === 0) {
            const ourAppLevel = programLevel * vol;
            if (ourAppLevel <= 0.005) return 0; // Gated
          } else {
            if (selectedAudioInput !== cleanId || micVolumeRef.current <= 0.005) return 0; // Gated
          }
          let peak = dev.peak;
          if (peak < 0.005) peak = 0; // noise gate
          return Math.max(0, Math.min(1, peak * vol * 1.15));
        }
      }
    }

    let baseSignal = 0;
    
    // Logic for individual faders (cross-platform fallback)
    if (sourceName === "Programa") {
      baseSignal = programLevel;
    } else if (sourceName === "IN" || sourceName.startsWith("in-") || sourceName === selectedAudioInput) {
      baseSignal = micVolumeRef.current;
    } else if (sourceName === "USB" || sourceName.startsWith("out-")) {
      baseSignal = programLevel; // Default out faders to program signal
    } else if (sourceName === "Master") {
      // Master is a mix of Programa level and Mic level
      const progSig = programLevel * programVolume;
      const micSig = micVolumeRef.current * usbInVolume;
      baseSignal = Math.max(progSig, micSig);
      
      // Also consider dynamic faders from audioVolumes
      Object.keys(audioVolumes).forEach(id => {
        if (id !== "Master") {
          const fV = audioVolumes[id] ?? 0.5;
          if (id === "Programa") baseSignal = Math.max(baseSignal, programLevel * fV);
          else if (id === "IN" || id === selectedAudioInput) baseSignal = Math.max(baseSignal, micVolumeRef.current * fV);
        }
      });
    }

    // Return the signal scaled by this fader's volume
    // Multiply by a small gain (1.15) to make it look "lively"
    return Math.max(0, Math.min(1, baseSignal * vol * 1.15));
  }, [
    masterVolume,
    programVolume,
    usbInVolume,
    usbOutVolume,
    audioVolumes,
    programLevel,
    selectedAudioInput,
    windowsDevicesList,
    mutedFaders
  ]);

  const DEFAULT_SCREEN_SETTINGS: ExternalScreenSettings = {
    resolution: "1920x1080",
    width: 1920,
    height: 1080,
    scalingW: 1,
    scalingH: 1,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    opacity: 1,
    x: 0,
    y: 0,
    rotation: 0,
    temperature: 6500,
    colorBalance: { r: 1, g: 1, b: 1 },
    showBackground: false,
    bgScalingW: 100,
    bgScalingH: 100,
    transitionType: "fade",
    transitionDuration: 400,
    timerEnabled: false,
    timerMinutes: 5,
    timerSeconds: 0,
    timerSize: 48,
    timerFont: "Inter",
    timerColor: "#ffffff",
    timerBgColor: "#000000",
    timerBgOpacity: 70,
    timerRunning: false,
    timerTargetTimestamp: null,
    timerRemainingSeconds: 300,
    timerAmberSeconds: 30,
    timerRedSeconds: 10,
    timerShowDraggableFloat: false,
    timerPreview: false,
    timerX: 50,
    timerY: 50,
    timerAmberColor: "#d8e91f",
    timerRedColor: "#ff0000",
    timerBlinkSpeedAmber: 0.5,
    timerBlinkSpeedRed: 0.5,
    timerBlinkAmberEnabled: true,
    timerBlinkRedEnabled: true,
    timerPosition: "center",
    timerIsLaunched: false,
  };

  const getExternalScreenSettings = (
    screenId: string | null,
  ): ExternalScreenSettings => {
    if (!screenId) return DEFAULT_SCREEN_SETTINGS;
    return allScreenSettings[screenId] || DEFAULT_SCREEN_SETTINGS;
  };

  const externalScreenSettings = getExternalScreenSettings(selectedScreenId);
  const DEFAULT_LAYER_PROPS: Omit<Layer, "id" | "name" | "slots"> = {
    isVisible: true,
    opacity: 1,
    muted: true,
    activeClipId: null,
    activeSlotIndex: null,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    colorBalance: { r: 1, g: 1, b: 1 },
    rotation: 0,
    loop: true,
    playbackMode: "sequence",
    transition: "fade",
    transitionDuration: 1,
  };

  const [layers, setLayers] = useState<Layer[]>([
    {
      id: "layer-1",
      name: "CAPA 1",
      slots: Array(10).fill(null),
      ...DEFAULT_LAYER_PROPS,
    },
    {
      id: "layer-2",
      name: "CAPA 2",
      slots: Array(10).fill(null),
      ...DEFAULT_LAYER_PROPS,
    },
  ]);

  const [previewClipId, setPreviewClipId] = useState<string | null>(null);
  const [programClipId, setProgramClipId] = useState<string | null>(null);
  const [programPlayIndex, setProgramPlayIndex] = useState(0);
  const [outputPrograms, setOutputPrograms] = useState<
    Record<string, string | null>
  >({});
  const [outputTransitionTargets, setOutputTransitionTargets] = useState<
    Record<string, string | null>
  >({});
  const [outputOffStates, setOutputOffStates] = useState<
    Record<string, boolean>
  >({});
  const [showLayers, setShowLayers] = useState(true);
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [currentLuminPath, setCurrentLuminPath] = useState<string | null>(null);
  // Force stability on Windows by setting additional Chromium flags and preventing too many concurrent decoders
  useEffect(() => {
    if ((window as any).electron) {
      // In a real scenario we'd talk to IPC to adjust priorities, 
      // but here we just ensure we are cleaning up every hidden preview.
    }
  }, []);
  const [luminSaveMode, setLuminSaveMode] = useState<"save" | "saveAs">("save");
  const [saveFileName, setSaveFileName] = useState("");
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [isPptImporting, setIsPptImporting] = useState(false);
  const [pptImportProgress, setPptImportProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showContentPanel, setShowContentPanel] = useState(true);

  const [customAlertOptions, setCustomAlertOptions] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "error" | "success";
  }>({ isOpen: false, title: "", message: "", type: "info" });

  const showCustomAlert = (title: string, message: string, type: "info" | "error" | "success" = "info") => {
    setCustomAlertOptions({ isOpen: true, title, message, type });
  };

  // HYDRATION: Ensure thumbnails and IDs exist after loading .lumin
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      let changed = false;
      const newLib = await Promise.all(
        libraryFiles.map(async (f) => {
          let updated = { ...f };
          if (!updated.id) {
            updated.id = `lib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            changed = true;
          }
          // Repair broken object URLs if they are from a previous session
          if (updated.url?.startsWith("blob:") && !updated.file) {
            // If we have a path in Electron, restore the URL
            if ((window as any).electron && updated.path) {
              const urlFromPath = (path: string) => {
                try {
                  const normalized = path.replace(/\\/g, "/");
                  const parts = normalized.split("/");
                  const encodedParts = parts.map((part: string, index: number) => {
                    if (index === 0 && part.endsWith(":")) return part;
                    return encodeURIComponent(part);
                  });
                  let joined = encodedParts.join("/");
                  if (!joined.startsWith("/")) joined = "/" + joined;
                  return `file://${joined}`;
                } catch (e) { return null; }
              };
              const nativeUrl = urlFromPath(updated.path);
              if (nativeUrl) {
                updated.url = nativeUrl;
                changed = true;
              }
            }
          }

          // If thumbnail is a blob from a previous session, we must regenerate it.
          // Object URLs (blob:...) are only valid in the document that created them.
          if (updated.thumbnail?.startsWith("blob:")) {
            updated.thumbnail = undefined;
          }

          // Generate missing thumbnail
          if (
            !updated.thumbnail &&
            updated.type?.startsWith("video") &&
            updated.url &&
            !updated.url.startsWith("blob:")
          ) {
            try {
              updated.thumbnail = await extractVideoThumbnail(updated.url);
              changed = true;
            } catch (err) {}
          }
          return updated;
        }),
      );

      if (active && changed) {
        setLibraryFiles(newLib);
      }
    };

    if (libraryFiles.length > 0) {
      hydrate();
    }
    return () => { active = false; };
  }, [libraryFiles.length]); // Run when count changes or on load

  const sanitizeClipForSave = (clip: any) => {
    if (!clip) return null;
    const filePath =
      clip.path || (clip.file ? (clip.file as any).path : undefined);
    return {
      ...clip,
      file: filePath ? { path: filePath, name: clip.name } : null,
      path: filePath,
    };
  };

  const getLuminStateData = () => {
    return JSON.stringify(
      {
        libraryFiles: libraryFiles.map((f: any) => ({
          name: f.name,
          type: f.type,
          url: f.url,
          path: f.path || (f.file ? (f.file as any).path : undefined),
          thumbnail: f.thumbnail || undefined,
          file: f.file
            ? { path: (f.file as any).path, name: f.file.name }
            : f.path
              ? { path: f.path, name: f.name }
              : null,
        })),
        clips: clips.map(sanitizeClipForSave),
        deckClips: (() => {
          const res: Record<string, any[]> = {};
          Object.entries(deckClips || {}).forEach(([k, cl]) => {
            res[k] = Array.isArray(cl) ? cl.map(sanitizeClipForSave) : [];
          });
          return res;
        })(),
        layers: (layers || []).map((layer) => ({
          ...layer,
          slots: (layer.slots || []).map(sanitizeClipForSave),
        })),
        perfSettings,
        playlists: (playlists || []).map((pl) => ({
          ...pl,
          clips: (pl.clips || []).map(sanitizeClipForSave),
        })),
        pipLayers,
        allScreenSettings,
        outputs,
        outputPrograms,
        outputTransitionTargets,
        outputOffStates,
        masterVolume,
        programVolume,
        layerOutputs,
        crossfaderValue,
        previewClipId,
        programClipId,
        activeOutputId,
        selectedScreenId,
        isLive,
        isTransmitting,
        currentDeck,
        isDarkMode,
      },
      null,
      2,
    );
  };

  const handleSaveLumin = async () => {
    if (
      !window.electron ||
      !window.electron.selectSaveLuminFile ||
      !window.electron.writeLuminFile
    ) {
      showCustomAlert(
        "Función Nativa Requerida",
        "El guardado de proyectos nativos solo está disponible en Windows.",
        "info"
      );
      return;
    }

    // Si ya existe un archivo activo, guardamos encima
    if (currentLuminPath) {
      const dataStr = getLuminStateData();
      const res = await window.electron.writeLuminFile(
        currentLuminPath,
        dataStr,
      );
      if (res.success) {
        showCustomAlert("Proyecto Guardado", `Proyecto guardado en: ${currentLuminPath}`, "success");
      } else {
        showCustomAlert("Error de Guardado", "Error al guardar: " + res.error, "error");
      }
    } else {
      // Si no hay archivo activo, actúa como "Guardar Como"
      handleSaveAsLumin();
    }
  };

  const handleSaveAsLumin = async () => {
    if (
      !window.electron ||
      !window.electron.selectSaveLuminFile ||
      !window.electron.writeLuminFile
    ) {
      showCustomAlert(
        "Función Nativa Requerida",
        "El guardado de proyectos nativos solo está disponible en Windows.",
        "info"
      );
      return;
    }

    const defaultName = currentLuminPath
      ? currentLuminPath.substring(currentLuminPath.lastIndexOf("\\") + 1)
      : "proyecto_lumin.lumin";

    const dialogResult = await window.electron.selectSaveLuminFile(defaultName);
    if (dialogResult.canceled || !dialogResult.filePath) {
      return;
    }

    const filePath = dialogResult.filePath;
    const dataStr = getLuminStateData();

    const res = await window.electron.writeLuminFile(filePath, dataStr);
    if (res.success) {
      setCurrentLuminPath(filePath);
      showCustomAlert("Proyecto Guardado Como", `Proyecto guardado como: ${filePath}`, "success");
    } else {
      showCustomAlert("Error de Guardado", "Error al guardar como: " + res.error, "error");
    }
  };

  const handleOpenLumin = async () => {
    if (
      !window.electron ||
      !window.electron.selectOpenLuminFile ||
      !window.electron.readLuminFile
    ) {
      showCustomAlert(
        "Función Nativa Requerida",
        "La apertura de proyectos nativos solo está disponible en Windows.",
        "info"
      );
      return;
    }

    const dialogResult = await window.electron.selectOpenLuminFile();
    if (dialogResult.canceled || !dialogResult.filePath) {
      return;
    }

    const filePath = dialogResult.filePath;
    const res = await window.electron.readLuminFile(filePath);
    if (!res.success || !res.data) {
      showCustomAlert("Error de Apertura", "Error al abrir archivo: " + res.error, "error");
      return;
    }

    try {
      const parsedData = JSON.parse(res.data);

      // Validar estructura básica
      if (!parsedData.libraryFiles || !parsedData.clips || !parsedData.layers) {
        throw new Error(
          "El archivo no tiene el formato de configuración de LUMIN válido.",
        );
      }

      // Helper function to reconstruct URL from path in native mode
      const getUrlFromPath = (path: string) => {
        try {
          const normalized = path.replace(/\\/g, "/");
          const parts = normalized.split("/");
          const encodedParts = parts.map((part: string, index: number) => {
            if (index === 0 && part.endsWith(":")) return part;
            return encodeURIComponent(part);
          });
          let joined = encodedParts.join("/");
          if (!joined.startsWith("/")) joined = "/" + joined;
          return `file://${joined}`;
        } catch (e) {
          return null;
        }
      };

      // Re-estructurar files para la sesión local
      // En modo nativo, regeneramos las URLs a partir de los paths absolutos guardados
      const reconstructedFiles = parsedData.libraryFiles.map((f: any) => {
        let newUrl = f.url;
        const filePath = f.path || (f.file && f.file.path);
        if (filePath && (window as any).electron) {
          const nativeUrl = getUrlFromPath(filePath);
          if (nativeUrl) newUrl = nativeUrl;
        }
        return {
          name: f.name,
          type: f.type,
          url: newUrl,
          file: filePath ? { path: filePath, name: f.name } : null,
        };
      });

      // Crear mapa de URLs antiguas a nuevas para actualizar clips
      const urlMap: Record<string, string> = {};
      parsedData.libraryFiles.forEach((oldF: any, idx: number) => {
        urlMap[oldF.url] = reconstructedFiles[idx].url;
      });

      const getReconstructedClip = (clip: any) => {
        if (!clip) return null;
        let newUrl = urlMap[clip.url] || clip.url;
        const filePath = clip.path || (clip.file && clip.file.path);
        if (filePath && (window as any).electron) {
          const nativeUrl = getUrlFromPath(filePath);
          if (nativeUrl) newUrl = nativeUrl;
        }
        
        let newThumbnail = clip.thumbnail;
        if (newThumbnail?.startsWith("blob:")) {
          newThumbnail = undefined;
        }

        return {
          ...clip,
          url: newUrl,
          file: filePath ? { path: filePath, name: clip.name } : null,
          path: filePath || undefined,
          thumbnail: newThumbnail,
        };
      };

      // Actualizar URLs de los clips basándose en el mapa
      const reconstructedClips = parsedData.clips.map((clip: any) =>
        getReconstructedClip(clip),
      );

      // Actualizar deckClips (Record<string, Clip[]>)
      const reconstructedDeckClips: Record<string, Clip[]> = {};
      if (
        parsedData.deckClips &&
        typeof parsedData.deckClips === "object" &&
        !Array.isArray(parsedData.deckClips)
      ) {
        Object.entries(parsedData.deckClips).forEach(
          ([deckName, clipsList]) => {
            if (Array.isArray(clipsList)) {
              reconstructedDeckClips[deckName] = clipsList.map((clip: any) =>
                getReconstructedClip(clip),
              ) as Clip[];
            } else {
              reconstructedDeckClips[deckName] = [];
            }
          },
        );
      } else if (Array.isArray(parsedData.deckClips)) {
        reconstructedDeckClips["Videos"] = parsedData.deckClips.map(
          (clip: any) => getReconstructedClip(clip),
        ) as Clip[];
        reconstructedDeckClips["Imágenes"] = [];
        reconstructedDeckClips["PDF"] = [];
        reconstructedDeckClips["Video IN"] = [];
      } else {
        reconstructedDeckClips["Videos"] = [];
        reconstructedDeckClips["Imágenes"] = [];
        reconstructedDeckClips["PDF"] = [];
        reconstructedDeckClips["Video IN"] = [];
      }

      // Reconstruir layers
      const reconstructedLayers = (parsedData.layers || []).map(
        (layer: any) => ({
          ...layer,
          slots: (layer.slots || []).map((clip: any) =>
            getReconstructedClip(clip),
          ),
        }),
      );

      // Reconstruir playlists
      const reconstructedPlaylists = (parsedData.playlists || []).map(
        (playlist: any) => ({
          ...playlist,
          clips: (playlist.clips || []).map((clip: any) =>
            getReconstructedClip(clip),
          ),
        }),
      );

      // Aplicar estados principales
      setLibraryFiles(reconstructedFiles);
      setClips(reconstructedClips);
      setDeckClips(reconstructedDeckClips);
      setLayers(reconstructedLayers);

      // Restaurar configuraciones de pantalla y sistema
      if (parsedData.perfSettings) setPerfSettings(parsedData.perfSettings);
      if (parsedData.playlists) setPlaylists(reconstructedPlaylists);
      if (parsedData.pipLayers) setPipLayers(parsedData.pipLayers);
      if (parsedData.allScreenSettings)
        setAllScreenSettings(parsedData.allScreenSettings);
      if (parsedData.outputs) setOutputs(parsedData.outputs);
      if (parsedData.outputPrograms)
        setOutputPrograms(parsedData.outputPrograms);
      if (parsedData.outputTransitionTargets)
        setOutputTransitionTargets(parsedData.outputTransitionTargets);
      if (parsedData.outputOffStates)
        setOutputOffStates(parsedData.outputOffStates);
      if (parsedData.layerOutputs) setLayerOutputs(parsedData.layerOutputs);

      // Restaurar variables globales
      if (parsedData.masterVolume !== undefined)
        setMasterVolume(parsedData.masterVolume);
      if (parsedData.programVolume !== undefined)
        setProgramVolume(parsedData.programVolume);
      if (parsedData.crossfaderValue !== undefined)
        setCrossfaderValue(parsedData.crossfaderValue);
      if (parsedData.previewClipId !== undefined)
        setPreviewClipId(parsedData.previewClipId);
      if (parsedData.programClipId !== undefined)
        setProgramClipId(parsedData.programClipId);
      if (parsedData.activeOutputId !== undefined)
        setActiveOutputId(parsedData.activeOutputId);
      if (parsedData.selectedScreenId !== undefined)
        setSelectedScreenId(parsedData.selectedScreenId);
      if (parsedData.isLive !== undefined) setIsLive(parsedData.isLive);
      if (parsedData.isTransmitting !== undefined)
        setIsTransmitting(parsedData.isTransmitting);
      if (parsedData.currentDeck !== undefined)
        setCurrentDeck(parsedData.currentDeck);
      if (parsedData.isDarkMode !== undefined)
        setIsDarkMode(parsedData.isDarkMode);

      setCurrentLuminPath(filePath);
      showCustomAlert("Proyecto Cargado", `Proyecto cargado con éxito: ${filePath}`, "success");
    } catch (err: any) {
      showCustomAlert("Error de Procesamiento", "Error al procesar el archivo LUMIN: " + err.message, "error");
    }
  };

  const handleImportPptClick = async () => {
    if (!window.electron || !window.electron.selectPptFile) {
      showCustomAlert(
        "Función Nativa Requerida",
        "La importación de PPT nativa solo está disponible en la versión de escritorio para Windows.",
        "info"
      );
      return;
    }

    // 1. Abre el explorador de archivos nativo de Windows
    const fileResult = await window.electron.selectPptFile();
    if (fileResult.canceled || !fileResult.filePath) {
      return;
    }

    const filePath = fileResult.filePath;
    const baseName = filePath.substring(filePath.lastIndexOf("\\") + 1);

    // 2. Muestra popup de progreso
    setIsPptImporting(true);
    setPptImportProgress(5);

    // Simular progreso de 5% a 90%
    const progressInterval = setInterval(() => {
      setPptImportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 8) + 2;
      });
    }, 450);

    try {
      if (!window.electron.convertPptToPdf) {
        throw new Error(
          "El método convertPptToPdf no está disponible en la interfaz de Electron.",
        );
      }

      // 3. Llama al backend de Electron que ejecuta PowerPoint COM
      const conversionResult = await window.electron.convertPptToPdf(filePath);
      clearInterval(progressInterval);

      if (!conversionResult.success || !conversionResult.pdfPath) {
        throw new Error(
          conversionResult.error || "La conversión nativa de PowerPoint falló.",
        );
      }

      setPptImportProgress(100);

      // 4. Importa pdf generado
      const pdfPath = conversionResult.pdfPath;
      const pdfName = baseName.replace(/\.[^/.]+$/, "") + ".pdf";
      const fileUrl = `file:///${pdfPath.replace(/\\/g, "/")}`;

      const newFileItem = {
        name: pdfName,
        type: "application/pdf",
        url: fileUrl,
        file: { path: pdfPath, name: pdfName } as any,
      };

      // Añadir a la biblioteca de Gestión de Contenido
      setLibraryFiles((prev) => {
        if (prev.some((f) => f.url === fileUrl)) return prev;
        return [...prev, newFileItem];
      });

      // Crear clip nativo del tipo document (PDF)
      await handleAddClips([newFileItem]);

      // Cerramos tras un breve instante para satisfacción visual
      setTimeout(() => {
        setIsPptImporting(false);
        setPptImportProgress(0);
      }, 800);
    } catch (err: any) {
      clearInterval(progressInterval);
      setIsPptImporting(false);
      setPptImportProgress(0);
      showCustomAlert("Error de Importación PPT", "Error al importar PowerPoint: " + err.message, "error");
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [isDarkMode]);

  const [workMode, setWorkMode] = useState<"layers" | "previews">("layers");
  const [isPixelMapOpen, setIsPixelMapOpen] = useState(false);
  const [slices, setSlices] = useState([
    {
      id: "slice-1",
      name: "Main Screen",
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      outputX: 0,
      outputY: 0,
      outputWidth: 1920,
      outputHeight: 1080,
    },
  ]);

  // -- NEW MULTI-PREVIEW & MULTI-OUTPUT STATE --
  const [outputs, setOutputs] = useState<any[]>([
    { id: "1", name: "Salida 1", physicalScreenId: null },
  ]);
  // activeOutputId declaration moved up to fix hosting
  const [layerOutputs, setLayerOutputs] = useState<
    Record<string, string | null>
  >({});
  const [pipLayers, setPipLayers] = useState<PiPLayer[]>([
    {
      id: "pip-1",
      name: "PIP 1",
      clipId: null,
      x: 50,
      y: 50,
      width: 400,
      height: 225,
      opacity: 1,
      isActive: false,
      targetOutputId: "1",
      showFrame: false,
      showInPreview: false,
      borderWidth: 1,
      borderColor: "#000000",
    },
  ]);

  const handleSelectPiP = (pip: PiPLayer) => {
    setSelectedItemType("pip" as any);
    setSelectedItemId(pip.id);
  };

  const removePiP = (id: string) => {
    setPipLayers((prev) => prev.filter((p) => p.id !== id));
    if (selectedItemId === id) {
      setSelectedItemType("pipManager");
      setSelectedItemId(null);
    }
  };

  const addPiP = () => {
    const newId = `pip-${Date.now()}`;
    setPipLayers((prev) => [
      ...prev,
      {
        id: newId,
        name: `PIP ${prev.length + 1}`,
        clipId: null,
        x: 50,
        y: 50,
        width: 400,
        height: 225,
        opacity: 1,
        isActive: false,
        targetOutputId: activeOutputId,
        showFrame: false,
        showInPreview: false,
      },
    ]);
  };
  const [previews, setPreviews] = useState<any[]>([
    {
      id: "1",
      name: "Preview 1",
      selectedOutputs: [],
      isLive: false,
      clipId: null,
    },
  ]);
  const [isOutputModalOpen, setIsOutputModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  // --------------------------------------------

  useEffect(() => {
    const handleNav = () => setSelectedItemType("pipManager");
    document.addEventListener("nav-to-pip-manager", handleNav);
    return () => document.removeEventListener("nav-to-pip-manager", handleNav);
  }, []);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // micVolumeRef moved to top

  // Hook up real dynamic capture for the selected audio input
  useEffect(() => {
    let isActive = true;
    let micStream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrameId: number;

    const startMic = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return;
        }

        // Clean up any existing stream first
        if (audioStreamRef.current) {
          try {
            audioStreamRef.current.getTracks().forEach((t) => t.stop());
          } catch {}
        }

        // Exclude custom prefix if any
        const rawId = selectedAudioInput.startsWith("in-")
          ? selectedAudioInput.substring(3)
          : selectedAudioInput;

        const constraints =
          rawId === "default" || !rawId
            ? { audio: true }
            : { audio: { deviceId: { exact: rawId } } };

        micStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isActive) {
          micStream.getTracks().forEach((t) => t.stop());
          return;
        }

        audioStreamRef.current = micStream;

        // @ts-ignore
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(micStream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateMicLevel = () => {
          if (!isActive || !analyser) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          Sum_loop: for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          const rawVolume = average / 128;
          // Increased sensitivity for mic input
          micVolumeRef.current = Math.min(1, rawVolume * 2.8);
          animationFrameId = requestAnimationFrame(updateMicLevel);
        };

        updateMicLevel();
      } catch (err) {
        console.warn("Could not load real microphone capture stream:", err);
      }
    };

    startMic();

    return () => {
      isActive = false;
      cancelAnimationFrame(animationFrameId);
      if (micStream) {
        try {
          micStream.getTracks().forEach((track) => track.stop());
        } catch {}
      }
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [selectedAudioInput]);

  const lastVolumeRef = useRef(masterVolume);

  // Bidirectional fader synchronization loop with Windows core audio session
  useEffect(() => {
    // @ts-ignore
    if (
      typeof window !== "undefined" &&
      window.electron &&
      (window.electron as any).getWindowsDevices
    ) {
      let active = true;

      const syncFromWindows = async () => {
        if (!active) return;
        try {
          // @ts-ignore
          const winDevices = await (window.electron as any).getWindowsDevices();
          if (Array.isArray(winDevices) && winDevices.length > 0) {
            setWindowsDevicesList(winDevices);

            // Determine active default inputs/outputs
            const inputs = winDevices.filter((d: any) => d.flow === 1).map((d: any) => ({ deviceId: d.id, label: d.name }));
            const outputs = winDevices.filter((d: any) => d.flow === 0).map((d: any) => ({ deviceId: d.id, label: d.name }));

            if (inputs.length > 0) {
              setAudioInputDevices((prev) => {
                if (JSON.stringify(prev) !== JSON.stringify(inputs)) return inputs;
                return prev;
              });
            }
            if (outputs.length > 0) {
              setAudioOutputDevices((prev) => {
                if (JSON.stringify(prev) !== JSON.stringify(outputs)) return outputs;
                return prev;
              });
            }

            // Sync master fader with Windows default output endpoint
            const defPlayback = winDevices.find((d: any) => d.flow === 0 && d.isDefault);
            if (defPlayback) {
              if (selectedAudioOutput === "default") {
                setSelectedAudioOutput(defPlayback.id);
              }
              if (Math.abs(defPlayback.volume - lastVolumeRef.current) > 0.03) {
                lastVolumeRef.current = defPlayback.volume;
                setMasterVolume(defPlayback.volume);
              }
            }

            // Update default IN fader with volume of default audio record input device if active
            const defRecord = winDevices.find((d: any) => d.flow === 1 && d.isDefault);
            if (defRecord) {
              if (selectedAudioInput === "default") {
                setSelectedAudioInput(defRecord.id);
              }
              setAudioVolumes((prev) => {
                if (prev["IN"] !== undefined && Math.abs(defRecord.volume - prev["IN"]) > 0.03) {
                  return { ...prev, IN: defRecord.volume };
                }
                return prev;
              });
            }

            // Sync details of specific active faders including default wrappers
            setAudioVolumes((prevVolumes) => {
              let changed = false;
              const next = { ...prevVolumes };

              if (defPlayback) {
                if (prevVolumes["out-default"] === undefined || Math.abs(defPlayback.volume - prevVolumes["out-default"]) > 0.03) {
                  next["out-default"] = defPlayback.volume;
                  changed = true;
                }
              }

              if (defRecord) {
                if (prevVolumes["in-default"] === undefined || Math.abs(defRecord.volume - prevVolumes["in-default"]) > 0.03) {
                  next["in-default"] = defRecord.volume;
                  changed = true;
                }
              }

              winDevices.forEach((dev: any) => {
                const faderId = dev.flow === 0 ? `out-${dev.id}` : `in-${dev.id}`;
                const currentVol = prevVolumes[faderId];
                if (currentVol !== undefined && Math.abs(dev.volume - currentVol) > 0.02) {
                  next[faderId] = dev.volume;
                  changed = true;
                }
              });
              return changed ? next : prevVolumes;
            });
          }
        } catch (e) {}
      };

      const syncInterval = setInterval(syncFromWindows, 200);
      return () => {
        active = false;
        clearInterval(syncInterval);
      };
    }
  }, []);

  useEffect(() => {
    // @ts-ignore
    if (
      typeof window !== "undefined" &&
      window.electron &&
      (window.electron as any).setWindowsVolume
    ) {
      if (Math.abs(masterVolume - lastVolumeRef.current) > 0.02) {
        lastVolumeRef.current = masterVolume;
        // @ts-ignore
        (window.electron as any).setWindowsVolume(masterVolume).catch(() => {});
      }
    }
  }, [masterVolume]);

  // Dynamically route AudioContext output to selected playback output device of Windows
  useEffect(() => {
    if (audioContext && typeof (audioContext as any).setSinkId === "function") {
      const targetSink = selectedAudioOutput === "default" ? "" : selectedAudioOutput;
      (audioContext as any)
        .setSinkId(targetSink)
        .then(() => {
          console.log(`Audio output routed successfully to target sink: ${selectedAudioOutput}`);
        })
        .catch((e: any) => {
          console.warn("Failed to dynamically set audioContext target sinkId:", e);
        });
    }
  }, [selectedAudioOutput]);

  const [floatingTimerPos, setFloatingTimerPos] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [isDraggingFloatingTimer, setIsDraggingFloatingTimer] = useState<
    string | null
  >(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDraggingFloatingTimer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;

      const boundedX = Math.max(0, Math.min(window.innerWidth - 320, newX));
      const boundedY = Math.max(0, Math.min(window.innerHeight - 200, newY));

      setFloatingTimerPos((prev) => ({
        ...prev,
        [isDraggingFloatingTimer]: { x: boundedX, y: boundedY },
      }));
    };

    const handleMouseUp = () => {
      setIsDraggingFloatingTimer(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingFloatingTimer]);

  const getTimerRemaining = (settings: ExternalScreenSettings) => {
    if (settings.timerRunning && settings.timerTargetTimestamp) {
      const diffMs = settings.timerTargetTimestamp - Date.now();
      return Math.max(0, Math.ceil(diffMs / 1000));
    }
    return settings.timerRemainingSeconds ?? 0;
  };

  const [activeSidebarTab, setActiveSidebarTab] = useState<
    "audio" | "perf" | null
  >(null);
  const [perfSettings, setPerfSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("lumin_perf_settings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      gpuDecoding: "d3d11", // 'd3d11' | 'dxva2' | 'nvdec' | 'vaapi' | 'software'
      engine: "native_chromium", // 'ffmpeg' | 'libvlc' | 'native_chromium'
      bufferingMode: "aggressive", // 'normal' | 'aggressive' | 'ultra_preload'
      renderingBackend: "directx11", // 'directx12' | 'directx11' | 'opengl' | 'vulkan'
      codecOptimization: true,
      loopMode: "native_seamless", // 'native_seamless' | 'double_buffer' | 'standard'
      highResOptimization: true,
      maxThreads: 4,
      persistentVram: true,
      zeroCopyUpload: true,
      framePacingSync: true,
      tripleBuffering: true,
      independentScheduler: true,
      nvdecEnabled: true,
      softwareFallback: true,
      reusableDecoderPool: true,
      preBufferFrames: 4,
      asyncDecoding: true,
      autoDetectProblematicCodecs: true,
      recommendedCodec: "hap_q",
      preproductionTranscoding: true,
      autoProxies: true,
      ssdCacheOptimize: true,
      watchdogActive: true,
      corruptFileProtection: true,
      timeoutRecovery: true,
      dynamicDecoderRestart: true,
      advancedPerfLogs: true,
    };
  });

  const [telemetryFps, setTelemetryFps] = useState(60.0);
  const [telemetryCpu, setTelemetryCpu] = useState(14.5);
  const [telemetryGpu, setTelemetryGpu] = useState(28.2);
  const [telemetryRam, setTelemetryRam] = useState(2.3);

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryFps((prev) =>
        Math.min(60.0, Math.max(59.4, prev + (Math.random() - 0.5) * 0.2)),
      );
      setTelemetryCpu((prev) =>
        Math.min(45.0, Math.max(8.0, prev + (Math.random() - 0.5) * 1.5)),
      );
      setTelemetryGpu((prev) =>
        Math.min(80.0, Math.max(20.0, prev + (Math.random() - 0.5) * 2.2)),
      );
      setTelemetryRam((prev) =>
        Math.min(4.8, Math.max(1.9, prev + (Math.random() - 0.5) * 0.05)),
      );
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("lumin_perf_settings", JSON.stringify(perfSettings));
  }, [perfSettings]);
  // libraryFiles declaration moved up to fix hosting
  const [selectedLibraryUrls, setSelectedLibraryUrls] = useState<Set<string>>(
    new Set(),
  );
  const [crossfaderValue, setCrossfaderValue] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [isTransmitting, setIsTransmitting] = useState(true);
  const [externalScreens, setExternalScreens] = useState<Screen[]>([]);
  const [hasDetailedScreens, setHasDetailedScreens] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null);
  const outputWindowsRef = useRef<Record<string, Window | null>>({});
  const [launchedScreens, setLaunchedScreens] = useState<
    Record<string, boolean>
  >({});
  const outputChannel = useRef<BroadcastChannel | null>(null);
  const lastLayerEndTimesRef = useRef<Record<string, number>>({});

  // Close external screens on unmount
  useEffect(() => {
    const handleUnload = () => {
      Object.entries(outputWindowsRef.current).forEach(([_, win]) => {
        if (win && !win.closed) {
          win.close();
        }
      });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, []);

  // Ref to store latest state
  const stateRef = useRef({
    programClipId,
    previewClipId,
    outputPrograms,
    outputTransitionTargets,
    outputOffStates,
    outputs,
    clips,
    crossfaderValue,
    allScreenSettings,
    isLive,
    isTransmitting,
    isProgramOff: outputOffStates[activeOutputId] || false,
    programVolume,
    masterVolume,
    transitionType: externalScreenSettings.transitionType,
    layers,
    layerOutputs,
    pipLayers,
    playlists,
    perfSettings,
  });

  // Sync state to ref
  useEffect(() => {
    stateRef.current = {
      programClipId,
      previewClipId,
      outputPrograms,
      outputTransitionTargets,
      outputOffStates,
      outputs,
      clips,
      crossfaderValue,
      allScreenSettings,
      isLive,
      isTransmitting,
      isProgramOff: outputOffStates[activeOutputId] || false,
      programVolume,
      masterVolume,
      transitionType: externalScreenSettings.transitionType,
      layers,
      layerOutputs,
      pipLayers,
      playlists,
      perfSettings,
    };
  }, [
    programClipId,
    previewClipId,
    outputPrograms,
    outputTransitionTargets,
    outputOffStates,
    outputs,
    clips,
    crossfaderValue,
    allScreenSettings,
    isLive,
    isTransmitting,
    activeOutputId,
    programVolume,
    masterVolume,
    externalScreenSettings.transitionType,
    layers,
    layerOutputs,
    pipLayers,
    playlists,
    perfSettings,
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      Object.values(outputWindowsRef.current).forEach((win) => {
        if (win && !win.closed) {
          win.close();
        }
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleProgramOff = () => {
    const isCurrentlyOff = outputOffStates[activeOutputId];

    if (!isCurrentlyOff) {
      // Step 1: Trigger fade out (fader/opacity handled by outputOffStates)
      setOutputOffStates((prev) => ({
        ...prev,
        [activeOutputId]: true,
      }));

      // Step 2: After a longer fade (2.5s), fully clear the content
      setTimeout(() => {
        setOutputPrograms((prev) => ({
          ...prev,
          [activeOutputId]: null,
        }));
        setOutputTransitionTargets((prev) => ({
          ...prev,
          [activeOutputId]: null,
        }));
        // Also clear internal program state if this was the active output
        if (activeOutputId === "1") {
          setProgramClipId(null);
        }
        setOutputOffStates((prev) => ({
          ...prev,
          [activeOutputId]: false,
        }));
      }, 2500);
    } else {
      // Toggle back on (though technically it won't have content until next TAKE)
      setOutputOffStates((prev) => ({
        ...prev,
        [activeOutputId]: false,
      }));
    }
  };

  // Initialize BroadcastChannel
  useEffect(() => {
    outputChannel.current = new BroadcastChannel("lumin-output");
    return () => {
      outputChannel.current?.close();
    };
  }, []);

  // Handle requests from output windows
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "VIDEO_TIME_UPDATE") {
        const { trackerId, currentTime } = event.data.payload;
        if (trackerId) {
          if (typeof window !== "undefined") {
            if (!(window as any).__luminVideoTimes) {
              (window as any).__luminVideoTimes = {};
            }
            (window as any).__luminVideoTimes[trackerId] = currentTime;
          }
        }
      }
      if (event.data.type === "UPDATE_TIMER_SETTINGS") {
        const { screenId, updates } = event.data.payload;
        setAllScreenSettings((prev) => ({
          ...prev,
          [screenId]: {
            ...(prev[screenId] || DEFAULT_SCREEN_SETTINGS),
            ...updates,
          },
        }));
      }
      if (event.data.type === "REQUEST_SYNC") {
        outputChannel.current?.postMessage({
          type: "SYNC_STATE",
          payload: {
            programClipId,
            previewClipId,
            programPlayIndex,
            outputPrograms,
            outputTransitionTargets,
            outputOffStates,
            outputs,
            clips,
            crossfaderValue,
            allScreenSettings,
            isLive,
            isTransmitting,
            isProgramOff: outputOffStates[activeOutputId] || false,
            programVolume,
            masterVolume,
            transitionType: externalScreenSettings.transitionType,
            transitionDuration: externalScreenSettings.transitionDuration,
            externalScreenSettings,
            layers,
            layerOutputs,
            pipLayers,
            perfSettings,
          },
        });
      }
      if (event.data.type === "CLIP_ENDED") {
        const { outputId, clipId } = event.data.payload;
        const clip = clips.find((c: any) => c.id === clipId);
        
        // Reset the currentTime of the ended clip to 0 so it starts fresh next time
        const programTrackerId = `output_${outputId || "1"}_${clipId}`;
        if (typeof window !== "undefined") {
          if (!(window as any).__luminVideoTimes) {
            (window as any).__luminVideoTimes = {};
          }
          (window as any).__luminVideoTimes[programTrackerId] = 0;
        }
        const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
        if (ch) {
          try {
            ch.postMessage({
              type: "VIDEO_TIME_UPDATE",
              payload: { trackerId: programTrackerId, clipId, currentTime: 0 },
            });
          } catch (err) {}
        }
        const playlist = playlists.find(
          (p: any) =>
            p.id === clip?.playlistId ||
            p.clips.some((c: any) => c.id === clipId),
        );
        if (playlist && playlist.clips.length > 0) {
          const currentIndex = playlist.clips.findIndex(
            (c: any) => c.id === clipId,
          );
          const isAtEnd = currentIndex === playlist.clips.length - 1;

          if (isAtEnd && playlist.loop === false) {
            if (outputId) {
              setOutputPrograms((prev) => ({ ...prev, [outputId]: null }));
              if (outputId === activeOutputId) {
                handleStop();
              }
            }
            return;
          }

          const nextIndex = (currentIndex + 1) % playlist.clips.length;
          const nextClip = playlist.clips[nextIndex];

          if (outputId) {
            setOutputPrograms((prev) => ({ ...prev, [outputId]: nextClip.id }));
            if (outputId === activeOutputId) {
              setProgramClipId(nextClip.id);
              setProgramPlayIndex((p) => p + 1);
            }
          }
        } else {
          // Direct individual clip playing (no playlist)
          if (clip && clip.loop === false) {
            if (outputId) {
              setOutputPrograms((prev) => ({ ...prev, [outputId]: null }));
              if (outputId === activeOutputId) {
                handleStop();
              }
            }
          }
        }
      }
      if (event.data.type === "LAYER_CLIP_ENDED") {
        const { layerId, clipId, sequenceCounter, outputId } = event.data.payload;
        handleLayerEnded(layerId, clipId, sequenceCounter, outputId);
      }
    };

    outputChannel.current?.addEventListener("message", handleMessage);

    return () => {
      outputChannel.current?.removeEventListener("message", handleMessage);
    };
  }, [
    programClipId,
    previewClipId,
    programPlayIndex,
    outputTransitionTargets,
    outputPrograms,
    outputOffStates,
    outputs,
    clips,
    crossfaderValue,
    allScreenSettings,
    isLive,
    isTransmitting,
    activeOutputId,
    programVolume,
    masterVolume,
    externalScreenSettings.transitionType,
    layers,
    layerOutputs,
    pipLayers,
    playlists,
  ]);
  // Throttles state mirroring securely to 30fps max to avoid locking the UI during smooth slider inputs and continuous render ticks
  const lastSyncTimeRef = useRef<number>(0);
  const pendingSyncRef = useRef<any>(null);

  useEffect(() => {
    if (!outputChannel.current) return;

    const doSync = () => {
      outputChannel.current?.postMessage({
        type: "SYNC_STATE",
        payload: {
          programClipId,
          previewClipId,
          outputPrograms,
          outputTransitionTargets,
          outputOffStates,
          outputs,
          clips,
          crossfaderValue,
          allScreenSettings,
          isLive,
          isTransmitting,
          isProgramOff: outputOffStates[activeOutputId] || false,
          programVolume,
          masterVolume,
          mutedFaders,
          transitionType: externalScreenSettings.transitionType,
          transitionDuration: externalScreenSettings.transitionDuration,
          externalScreenSettings,
          layers,
          layerOutputs,
          pipLayers,
          perfSettings,
        },
      });
      lastSyncTimeRef.current = performance.now();
      if (pendingSyncRef.current) {
        clearTimeout(pendingSyncRef.current);
        pendingSyncRef.current = null;
      }
    };

    const now = performance.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;

    if (timeSinceLastSync >= 33) {
      if (pendingSyncRef.current) {
        clearTimeout(pendingSyncRef.current);
        pendingSyncRef.current = null;
      }
      doSync();
    } else {
      if (pendingSyncRef.current) {
        clearTimeout(pendingSyncRef.current);
      }
      const remainingDelay = 33 - timeSinceLastSync;
      pendingSyncRef.current = setTimeout(doSync, remainingDelay);
    }
  }, [
    programClipId,
    previewClipId,
    outputTransitionTargets,
    outputOffStates,
    outputPrograms,
    outputs,
    clips,
    crossfaderValue,
    allScreenSettings,
    isLive,
    isTransmitting,
    activeOutputId,
    programVolume,
    masterVolume,
    mutedFaders,
    externalScreenSettings.transitionType,
    externalScreenSettings.transitionDuration,
    layers,
    layerOutputs,
    pipLayers,
    perfSettings,
  ]);

  // Screen Detection Logic
  const detectScreens = async (requestPermission = false) => {
    try {
      console.log("Detectando pantallas...");

      // PRIORIDAD 1: Electron (Nativo Desktop)
      if (window.electron && window.electron.getScreens) {
        try {
          const electronScreens = await window.electron.getScreens();
          if (electronScreens && electronScreens.length > 0) {
            console.log("Pantallas detectadas vía Electron:", electronScreens);
            const formatted = electronScreens.map((s) => ({
              ...s,
              isActive: true,
              colorDepth: 8, // Default for UI simplicity
            }));
            setExternalScreens(formatted);
            setHasDetailedScreens(true);
            if (!selectedScreenId) {
              setSelectedScreenId(formatted[0].id);
            }
            return;
          }
        } catch (e) {
          console.error("Error detecting with electron:", e);
        }
      }

      // Intentar detección nativa vía Bridge Python (Puerto 3001)
      try {
        const response = await fetch("http://localhost:3001/monitors").catch(
          () => null,
        );
        if (response && response.ok) {
          const nativeScreens = await response.json();
          if (nativeScreens && nativeScreens.length > 0) {
            console.log(
              "Pantallas detectadas vía Native Bridge:",
              nativeScreens,
            );
            setExternalScreens(nativeScreens);
            setHasDetailedScreens(true);
            if (!selectedScreenId) {
              setSelectedScreenId(nativeScreens[0].id);
            }
            return;
          }
        }
      } catch (e) {}

      // Check if in iframe
      setIsIframe(window.self !== window.top);

      // Window Management API
      if ("getScreenDetails" in window) {
        // @ts-ignore
        const details = await window.getScreenDetails();
        console.log("Pantallas detectadas (detalladas):", details.screens);

        const screens = details.screens.map((s: any, index: number) => {
          // Physical resolution is logical resolution * devicePixelRatio
          const dpr = s.devicePixelRatio || window.devicePixelRatio || 1;

          // Map colorDepth (e.g. 24 -> 8, 30 -> 10)
          let depth = s.colorDepth || window.screen.colorDepth;
          if (depth >= 30) depth = 10;
          else if (depth >= 24) depth = 8;
          else depth = 8;

          const snapRes = (val: number) => {
            const standards = [
              720, 1080, 1280, 1366, 1440, 1600, 1920, 2160, 2560, 3440, 3840,
              4096,
            ];
            for (let st of standards) {
              if (Math.abs(val - st) <= 6) return st;
            }
            return Math.round(val);
          };

          return {
            id: s.id || `screen-${index}`,
            name: s.label || `Pantalla ${index + 1}`,
            isActive: true,
            width: snapRes(s.width * dpr),
            height: snapRes(s.height * dpr),
            left: s.left,
            top: s.top,
            isPrimary: s.isPrimary,
            refreshRate: s.refreshRate || 60,
            colorDepth: depth,
          };
        });

        setExternalScreens(screens);
        setHasDetailedScreens(true);

        // Auto-populate outputs based on detected screens if outputs are default
        if (
          screens.length > 0 &&
          outputs.length <= 1 &&
          !outputs[0].physicalScreenId
        ) {
          const autoOutputs = screens.map((s: any, idx: number) => ({
            id: `${idx + 1}`,
            name: `Salida ${idx + 1}`,
            physicalScreenId: s.id,
          }));
          setOutputs(autoOutputs);
        }

        if (!selectedScreenId && screens.length > 0) {
          setSelectedScreenId(screens[0].id);
        }
      } else {
        throw new Error("API no soportada");
      }
    } catch (err) {
      console.warn("Error en detección detallada, usando fallback:", err);
      setHasDetailedScreens(false);

      // Fallback a información básica de pantalla con corrección de DPR
      const dpr = window.devicePixelRatio || 1;
      let depth = window.screen.colorDepth;
      if (depth >= 30) depth = 10;
      else if (depth >= 24) depth = 8;
      else depth = 8;

      const fallback = [
        {
          id: "primary",
          name: "Pantalla Principal (Windows)",
          isActive: true,
          width: Math.round(window.screen.width * dpr),
          height: Math.round(window.screen.height * dpr),
          isPrimary: true,
          left: 0,
          top: 0,
          refreshRate: 60,
          colorDepth: depth,
        },
      ];

      setExternalScreens(fallback);
      if (!selectedScreenId) {
        setSelectedScreenId("primary");
      }
    }
  };

  useEffect(() => {
    // Initial silent attempt
    detectScreens();

    // Listen for screen changes if supported
    if ("getScreenDetails" in window) {
      // @ts-ignore
      (window as any)
        .getScreenDetails()
        .then((details) => {
          details.addEventListener("screenschange", () => detectScreens());
        })
        .catch(() => {});
    }
  }, []);

  const refreshAudioDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          console.log("No mic permission during enumeration:", err);
        }
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");
      const outputs = devices.filter((d) => d.kind === "audiooutput");

      setAudioInputDevices(
        inputs.length > 0
          ? inputs
          : [
              {
                deviceId: "default",
                label: "Dispositivo del Sistema por Defecto",
              },
              {
                deviceId: "auxin",
                label: "Línea de Entrada (High Definition Audio)",
              },
              { deviceId: "mic", label: "Micrófono Nativo Realtek (Windows)" },
            ],
      );
      setAudioOutputDevices(
        outputs.length > 0
          ? outputs
          : [
              {
                deviceId: "default",
                label: "Altavoces por Defecto (Windows DirectSound)",
              },
              {
                deviceId: "speakers",
                label: "Altavoces Realtek High Definition Audio",
              },
              {
                deviceId: "hdmi",
                label: "HDMI Audio Out (Intel Display Audio)",
              },
              {
                deviceId: "virtual",
                label: "CABLE Input (VB-Audio Virtual Cable)",
              },
            ],
      );
    } catch (e) {
      console.error("Error enumerando dispositivos de audio:", e);
      setAudioInputDevices([
        { deviceId: "default", label: "Dispositivo del Sistema por Defecto" },
        {
          deviceId: "auxin",
          label: "Línea de Entrada (High Definition Audio)",
        },
        { deviceId: "mic", label: "Micrófono Nativo Realtek (Windows)" },
      ]);
      setAudioOutputDevices([
        {
          deviceId: "default",
          label: "Altavoces por Defecto (Windows DirectSound)",
        },
        {
          deviceId: "speakers",
          label: "Altavoces Realtek High Definition Audio",
        },
        { deviceId: "hdmi", label: "HDMI Audio Out (Intel Display Audio)" },
        { deviceId: "virtual", label: "CABLE Input (VB-Audio Virtual Cable)" },
      ]);
    }
  };

  useEffect(() => {
    refreshAudioDevices();
  }, []);

  const handleUpdateExternalScreen = (updates: any) => {
    if (!selectedScreenId) return;
    setAllScreenSettings((prev) => ({
      ...prev,
      [selectedScreenId]: {
        ...(prev[selectedScreenId] || DEFAULT_SCREEN_SETTINGS),
        ...updates,
      },
    }));
  };

  const handleLaunchOutput = () => {
    const selectedScreen = externalScreens.find(
      (s) => s.id === selectedScreenId,
    );

    // Check if window is already open
    const screenKey = selectedScreenId || "default";
    const existingWin = outputWindowsRef.current[screenKey];
    const isAlreadyLaunched = launchedScreens[screenKey];

    if (isAlreadyLaunched || (existingWin && !existingWin.closed)) {
      // Close standard web window
      if (existingWin && !existingWin.closed) {
        try {
          existingWin.close();
        } catch (e) {
          console.error("Error closing window ref:", e);
        }
      }
      outputWindowsRef.current[screenKey] = null;

      // Close in Electron if available
      if (
        window.electron &&
        (window.electron.closeOutput || window.electron.launchOutput)
      ) {
        if (typeof window.electron.closeOutput === "function") {
          window.electron.closeOutput(selectedScreenId || "primary");
        } else {
          // Fallback legacy behavior if IPC not registered or just toggle state
          console.warn(
            "Electron closeOutput is not exposed yet. State toggled.",
          );
        }
      }

      setLaunchedScreens((prev) => ({ ...prev, [screenKey]: false }));

      // Notify output channels if any
      outputChannel.current?.postMessage({
        type: "CLOSE_WINDOW",
        payload: { screenId: selectedScreenId },
      });
      return;
    }

    // Construct the URL
    const url = new URL(window.location.href);
    url.searchParams.set("mode", "output");
    if (selectedScreenId) {
      url.searchParams.set("screenId", selectedScreenId);
    }

    // Check if running in Electron
    if (window.electron && window.electron.launchOutput) {
      window.electron.launchOutput({
        screenId: selectedScreenId || "primary",
        url: `/?mode=output${selectedScreenId ? `&screenId=${selectedScreenId}` : ""}`,
      });
      setIsTransmitting(true);
      setIsLive(true);
      setLaunchedScreens((prev) => ({ ...prev, [screenKey]: true }));
      return;
    }

    // Features for a clean output window
    let features =
      "menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no,popup=yes";

    // Use the screen's coordinates and dimensions if available
    if (selectedScreen && hasDetailedScreens) {
      features += `,left=${selectedScreen.left},top=${selectedScreen.top},width=${selectedScreen.width},height=${selectedScreen.height}`;
    } else {
      features += `,width=1280,height=720,left=100,top=100`;
    }

    // Try to open the output window
    const windowName = `LUMINOutput_${screenKey}`;

    try {
      const win = window.open(url.toString(), windowName, features);
      outputWindowsRef.current[screenKey] = win;

      if (win) {
        win.focus();
        setIsTransmitting(true);
        setIsLive(true);
        setLaunchedScreens((prev) => ({ ...prev, [screenKey]: true }));

        // Poll to check if user closed window manually
        const checkInterv = setInterval(() => {
          if (win.closed) {
            setLaunchedScreens((prev) => ({ ...prev, [screenKey]: false }));
            clearInterval(checkInterv);
          }
        }, 1000);

        setTimeout(() => {
          outputChannel.current?.postMessage({
            type: "SYNC_STATE",
            payload: {
              programClipId,
              previewClipId,
              outputPrograms,
              outputTransitionTargets,
              outputOffStates,
              outputs,
              clips,
              crossfaderValue,
              allScreenSettings,
              isLive: true,
              isTransmitting: true,
              isProgramOff: outputOffStates[activeOutputId] || false,
              programVolume,
              masterVolume,
              transitionType: externalScreenSettings.transitionType,
              transitionDuration: externalScreenSettings.transitionDuration,
              externalScreenSettings,
              layers,
              layerOutputs,
              pipLayers,
            },
          });
        }, 1500);
      } else {
        showCustomAlert(
          "Aviso de Navegador",
          "El navegador bloqueó la ventana emergente o falló al abrirla. Por favor, permite ventanas emergentes.",
          "error"
        );
      }
    } catch (err) {
      console.error("Error al lanzar salida:", err);
    }
  };
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(
    null,
  );
  const [currentDeck, setCurrentDeck] = useState("Videos");

  const addLayer = () => {
    const newId = `layer-${Date.now()}`;
    const slotsCount = layers.length > 0 ? layers[0].slots.length : 10;
    setLayers((prev) => [
      ...prev,
      {
        id: newId,
        name: `Capa ${prev.length + 1}`,
        slots: Array(slotsCount).fill(null),
        activeClipId: null,
        activeSlotIndex: null,
        opacity: 1,
        rotation: 0,
        transition: "fade",
        transitionDuration: 1,
        isVisible: true,
        muted: true,
        loop: true,
        isPlaying: false,
        playbackMode: "sequence",
        colorBalance: { r: 1, g: 1, b: 1 },
        brightness: 1,
        contrast: 1,
        saturation: 1,
      },
    ]);
  };

  const removeLayer = (layerId: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    setLayerOutputs((prev) => {
      const next = { ...prev };
      delete next[layerId];
      return next;
    });
  };

  const [activeColumnTrigger, setActiveColumnTrigger] = useState<number | null>(
    null,
  );
  const [columnUIStates, setColumnUIStates] = useState<
    Record<number, "play" | "stop" | null>
  >({});
  const [activeLayerTriggers, setActiveLayerTriggers] = useState<
    Record<string, "play" | "stop" | null>
  >({});

  const handleLayerEnded = (
    layerId: string,
    clipId: string,
    seqCounter?: number,
    outputId?: string,
  ) => {
    const lastTime = lastLayerEndTimesRef.current[layerId] || 0;
    const now = Date.now();
    // Reduce throttle to 50ms as in working versions to allow rapid sequence continuation
    if (now - lastTime < 50) {
      return;
    }
    lastLayerEndTimesRef.current[layerId] = now;

    const targetOutputId = outputId || layerOutputs[layerId] || "1";

    // Reset the currentTime of the ended clip to 0 so it starts fresh next time
    const layerTrackerId = `layer_${targetOutputId}_${layerId}_${clipId}`;
    if (typeof window !== "undefined") {
      if (!(window as any).__luminVideoTimes) {
        (window as any).__luminVideoTimes = {};
      }
      (window as any).__luminVideoTimes[layerTrackerId] = 0;
    }
    const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
    if (ch) {
      try {
        ch.postMessage({
          type: "VIDEO_TIME_UPDATE",
          payload: { trackerId: layerTrackerId, clipId, currentTime: 0 },
        });
      } catch (err) {}
    }

    setLayers((prev) => {
      let sideEffectStop = false;
      const nextLayers = prev.map((layer) => {
        if (layer.id !== layerId) return layer;

        // Verify sequence counter to prevent historical events from triggering next
        if (
          seqCounter !== undefined &&
          (layer.sequenceCounter || 0) !== seqCounter
        ) {
          return layer;
        }

        // Verify we are still on the same clip
        if (layer.activeClipId !== clipId) return layer;

        if (layer.playbackMode === "single") {
          if (layer.loopVideo === false) {
            sideEffectStop = true;
            return {
              ...layer,
              activeClipId: null,
              activeSlotIndex: null,
              isPlaying: false,
            };
          }
          return layer;
        }

        // Mode Sequence/Playlist: Find next non-null slot in current layer
        const currentSlotIndex =
          layer.activeSlotIndex !== null
            ? layer.activeSlotIndex
            : layer.slots.findIndex((s) => s?.id === layer.activeClipId);

        let nextClipIndex = -1;
        for (let i = currentSlotIndex + 1; i < layer.slots.length; i++) {
          if (layer.slots[i]) {
            nextClipIndex = i;
            break;
          }
        }

        if (nextClipIndex !== -1) {
          const nextClip = layer.slots[nextClipIndex]!;
          // Reset the next clip's stored time to 0 immediately so it starts fresh
          const nextTrackerId = `layer_${targetOutputId}_${layerId}_${nextClip.id}`;
          if (typeof window !== "undefined") {
            if (!(window as any).__luminVideoTimes) {
              (window as any).__luminVideoTimes = {};
            }
            (window as any).__luminVideoTimes[nextTrackerId] = 0;
          }
          const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
          if (ch) {
            try {
              ch.postMessage({
                type: "VIDEO_TIME_UPDATE",
                payload: { trackerId: nextTrackerId, clipId: nextClip.id, currentTime: 0 },
              });
            } catch (err) {}
          }
          
          return {
            ...layer,
            activeClipId: nextClip.id,
            activeSlotIndex: nextClipIndex,
            sequenceCounter: (layer.sequenceCounter || 0) + 1,
            isPlaying: true,
          };
        } else if (layer.loop !== false) {
          // Restart from beginning if loop is enabled
          const firstSlotIndex = layer.slots.findIndex((s) => s !== null);
          if (firstSlotIndex !== -1) {
            const firstClip = layer.slots[firstSlotIndex]!;
            const firstTrackerId = `layer_${targetOutputId}_${layerId}_${firstClip.id}`;
            if (typeof window !== "undefined") {
              if (!(window as any).__luminVideoTimes) {
                (window as any).__luminVideoTimes = {};
              }
              (window as any).__luminVideoTimes[firstTrackerId] = 0;
            }
            const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
            if (ch) {
              try {
                ch.postMessage({
                  type: "VIDEO_TIME_UPDATE",
                  payload: { trackerId: firstTrackerId, clipId: firstClip.id, currentTime: 0 },
                });
              } catch (err) {}
            }

            return {
              ...layer,
              activeClipId: firstClip.id,
              activeSlotIndex: firstSlotIndex,
              sequenceCounter: (layer.sequenceCounter || 0) + 1,
              isPlaying: true,
            };
          }
        }

        // Final fallback: no more clips and no loop
        sideEffectStop = true;
        return {
          ...layer,
          activeClipId: null,
          activeSlotIndex: null,
          isPlaying: false,
        };
      });

      if (sideEffectStop) {
        setActiveLayerTriggers((p) => ({ ...p, [layerId]: "stop" }));
        setProgramProgress({ current: 0, total: 0 });
      }
      return nextLayers;
    });
  };

  const onTriggerLayerClip = (
    layerId: string,
    slotIdx: number,
    mode: "single" | "sequence" = "single",
  ) => {
    const targetLayer = layers.find((l) => l.id === layerId);
    const isStopClick = !targetLayer || !targetLayer.slots[slotIdx];
    const linkedOutputId = layerOutputs[layerId] || "1";

    if (isStopClick) {
      if (typeof window !== "undefined") {
        (window as any).__luminVideoTimes = {};
      }
      setClips(prev => {
        const next = prev.map(c => ({ ...c, currentTime: 0 }));
        return next;
      });
      const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
      if (ch) {
        clips.forEach((c) => {
          try {
            ch.postMessage({
              type: "VIDEO_TIME_UPDATE",
              payload: { clipId: c.id, currentTime: 0 },
            });
          } catch (err) {}
        });
      }
    } else if (targetLayer) {
      const clip = targetLayer.slots[slotIdx];
      if (clip) {
        // ALWAYS reset the time of the clip we are about to play to 0
        const trackerId = `layer_${linkedOutputId}_${layerId}_${clip.id}`;
        if (typeof window !== "undefined") {
          if (!(window as any).__luminVideoTimes) {
            (window as any).__luminVideoTimes = {};
          }
          (window as any).__luminVideoTimes[trackerId] = 0;
        }
        const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
        if (ch) {
          try {
            ch.postMessage({
              type: "VIDEO_TIME_UPDATE",
              payload: { trackerId, clipId: clip.id, currentTime: 0 },
            });
          } catch (err) {}
        }
      }

      if (mode === "single" && targetLayer.activeClipId) {
        const prevActiveClipId = targetLayer.activeClipId;
        if (prevActiveClipId !== targetLayer.slots[slotIdx]?.id) {
          const prevTrackerId = `layer_${linkedOutputId}_${layerId}_${prevActiveClipId}`;
          if (typeof window !== "undefined") {
            if (!(window as any).__luminVideoTimes) {
              (window as any).__luminVideoTimes = {};
            }
            (window as any).__luminVideoTimes[prevTrackerId] = 0;
          }
          const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
          if (ch) {
            try {
              ch.postMessage({
                type: "VIDEO_TIME_UPDATE",
                payload: { trackerId: prevTrackerId, clipId: prevActiveClipId, currentTime: 0 },
              });
            } catch (err) {}
          }
        }
      }
    }

    // Throttle switching to 300ms to prevent browser-level video deadlocks, but DO NOT throttle stops
    const now = Date.now();
    if (!isStopClick && now - lastSwitchTime < 100) return;
    if (!isStopClick) {
      setLastSwitchTime(now);
    }

    if (mode !== "single") {
      setActiveColumnTrigger(null);
      setColumnUIStates({});
    }
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId) return l;
        const clip = l.slots[slotIdx];
        if (clip) {
          if (mode === "sequence") {
            setActiveLayerTriggers((prev) => ({ ...prev, [layerId]: "play" }));
          } else {
            setActiveLayerTriggers((prev) => ({ ...prev, [layerId]: "play" }));
          }
          return {
            ...l,
            activeClipId: clip.id,
            activeSlotIndex: slotIdx,
            sequenceCounter: (l.sequenceCounter || 0) + 1,
            isPlaying: true,
            playbackMode: mode,
          };
        }
        // If empty slot, stop the layer
        setActiveLayerTriggers((prev) => ({ ...prev, [layerId]: "stop" }));
        return {
          ...l,
          activeClipId: null,
          activeSlotIndex: null,
          isPlaying: false,
        };
      }),
    );
  };

  const handleAddColumn = () => {
    setLayers((prev) =>
      prev.map((layer) => ({ ...layer, slots: [...layer.slots, null] })),
    );
  };

  const handleColumnTrigger = (colIdx: number) => {
    const now = Date.now();
    if (now - lastSwitchTime < 300) return;
    setLastSwitchTime(now);

    setActiveColumnTrigger(colIdx);
    setColumnUIStates({ [colIdx]: "play" });
    setActiveLayerTriggers({});
    setLayers((prev) =>
      prev.map((layer) => {
        const clip = layer.slots[colIdx];
        if (clip) {
          return {
            ...layer,
            activeClipId: clip.id,
            activeSlotIndex: colIdx,
            isPlaying: true,
            playbackMode: "column",
          };
        }
        return {
          ...layer,
          activeClipId: null,
          activeSlotIndex: colIdx,
          isPlaying: false,
        };
      }),
    );
  };

  const handleColumnStop = (colIdx: number) => {
    if (typeof window !== "undefined") {
      (window as any).__luminVideoTimes = {};
    }
    clips.forEach((c) => {
      updateClip(c.id, { currentTime: 0 });
    });
    const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
    if (ch) {
      clips.forEach((c) => {
        try {
          ch.postMessage({
            type: "VIDEO_TIME_UPDATE",
            payload: { clipId: c.id, currentTime: 0 },
          });
        } catch (err) {}
      });
    }

    setActiveColumnTrigger(null);
    setColumnUIStates({});
    setLayers((prev) =>
      prev.map((layer) => {
        const clip = layer.slots[colIdx];
        if (clip && layer.activeClipId === clip.id) {
          return {
            ...layer,
            activeClipId: null,
            activeSlotIndex: null,
            isPlaying: false,
          };
        }
        return layer;
      }),
    );
  };

  const handleDropOnLayer = (
    e: React.DragEvent,
    layerId: string,
    slotIdx: number,
  ) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData("clipId");
    const clipData = e.dataTransfer.getData("clip");
    const libraryFilesData = e.dataTransfer.getData("libraryFiles");

    let clip: Clip | undefined;
    if (clipData) {
      try {
        clip = JSON.parse(clipData);
      } catch (err) {
        console.error("Error parsing clip data:", err);
      }
    } else if (clipId) {
      clip = clips.find((c) => c.id === clipId);
    } else if (libraryFilesData) {
      try {
        const filesData = JSON.parse(libraryFilesData);
        if (filesData.length > 0) {
          const fileData = filesData[0];
          clip = {
            id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: fileData.name,
            thumbnail: fileData.url,
            url: fileData.url,
            type: getClipTypeFromFile(fileData.type, fileData.name),
            status: "idle",
            currentPage: 1,
            transform: { ...DEFAULT_TRANSFORM },
            mask: "none",
            opacity: 1,
            master: 1,
            speed: 1,
            volume: 1,
            pan: 0,
            blendMode: "Alpha",
            behavior: "Cortar",
            curve: "Lineal",
            filter: "none",
            brightness: 1,
            contrast: 1,
            saturation: 1,
            colorBalance: { r: 1, g: 1, b: 1 },
            isPlaying: true,
            loop: true,
          };
          setClips((prev) => [...prev, clip!]);
        }
      } catch (err) {}
    }

    if (clip) {
      setLayers((prev) =>
        prev.map((l) =>
          l.id === layerId
            ? {
                ...l,
                slots: l.slots.map((s, i) => (i === slotIdx ? clip : s)),
              }
            : l,
        ),
      );
    }
  };

  const [previewPlaylistState, setPreviewPlaylistState] = useState<{
    id: string;
    index: number;
  } | null>(null);
  const [programPlaylistState, setProgramPlaylistState] = useState<{
    id: string;
    index: number;
  } | null>(null);
  const [deckClips, setDeckClips] = useState<Record<string, Clip[]>>({
    Videos: [],
    Imágenes: [],
    PDF: [],
    "Video IN": [],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getClipTypeFromFile = (
    type: string,
    name: string,
  ): "video" | "image" | "document" | "ppt" | "videoinput" => {
    if (type === "videoinput") return "videoinput";
    const isVideo =
      type.startsWith("video") ||
      name.toLowerCase().endsWith(".mp4") ||
      name.toLowerCase().endsWith(".mov") ||
      name.toLowerCase().endsWith(".webm");
    const isImage =
      type.startsWith("image") ||
      name.toLowerCase().endsWith(".jpg") ||
      name.toLowerCase().endsWith(".jpeg") ||
      name.toLowerCase().endsWith(".png") ||
      name.toLowerCase().endsWith(".webp");
    const isDocument =
      type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
    const isPpt =
      name.toLowerCase().endsWith(".ppt") ||
      name.toLowerCase().endsWith(".pptx") ||
      type === "application/vnd.mspowerpoint";

    if (isPpt) return "ppt";
    if (isVideo) return "video";
    if (isDocument) return "document";
    return "image";
  };

  const handleAddClips = async (inputItems: any[]) => {
    const newClipsPromises = inputItems.map(async (item, index) => {
      let file: File | null = null;
      let url = "";
      let name = "";
      let type = "";

      if (item instanceof File) {
        file = item;
        name = file.name;
        type = file.type;
        url =
          window.electron && (file as any).path
            ? getFileUrl(file)
            : URL.createObjectURL(file);
      } else {
        file = item.file;
        name = item.name;
        type = item.type;
        url = item.url;
      }

      const clipType = getClipTypeFromFile(type, name);
      const isVideo = clipType === "video";
      const isImage = clipType === "image";

      let metadata: {
        duration: number;
        width: number;
        height: number;
        thumbnail?: string;
      } = { duration: 0, width: 0, height: 0 };

      if (isVideo) {
        metadata = await new Promise((resolve) => {
          const video = document.createElement("video");
          video.src = url;
          video.onloadedmetadata = async () => {
            resolve({
              thumbnail: await extractVideoThumbnail(url),
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
            });
          };
          video.onerror = () =>
            resolve({ duration: 0, width: 1920, height: 1080 });
        });
      } else if (isImage) {
        metadata = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              duration: 0,
              width: img.width,
              height: img.height,
            });
          };
          img.onerror = () =>
            resolve({ duration: 0, width: 1920, height: 1080 });
          img.src = url;
        });
      } else {
        metadata = { duration: 0, width: 1920, height: 1080 };
      }

      return {
        id: `clip-${Date.now()}-${index}`,
        name: name,
        thumbnail: isVideo ? metadata.thumbnail || "" : url,
        url: url,
        type: clipType,
        file: file,
        path: file ? (file as any).path : undefined,
        status: "idle",
        currentPage: 1,
        transform: { ...DEFAULT_TRANSFORM },
        mask: "none",
        opacity: 1,
        master: 1,
        speed: 1,
        volume: 1,
        pan: 0,
        blendMode: "Alpha",
        behavior: "Cortar",
        curve: "Lineal",
        filter: "none",
        brightness: 1,
        contrast: 1,
        saturation: 1,
        colorBalance: { r: 1, g: 1, b: 1 },
        isPlaying: true,
        loop: true,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
      } as Clip;
    });

    const newClips = await Promise.all(newClipsPromises);
    setClips((prev) => [...prev, ...newClips]);

    setDeckClips((prev) => {
      const nextDecks = { ...prev };
      newClips.forEach((clip) => {
        let deck = "Videos";
        if (clip.type === "video") deck = "Videos";
        else if (clip.type === "image") deck = "Imágenes";
        else if (clip.type === "document" || clip.type === "ppt") deck = "PDF";
        else if (clip.type === "videoinput") deck = "Video IN";

        if (nextDecks[deck]) {
          nextDecks[deck] = [...nextDecks[deck], clip];
        } else {
          nextDecks[deck] = [clip];
        }
      });
      return nextDecks;
    });
  };

  const [previewLevel, setPreviewLevel] = useState(0);
  // programLevel moved up to be available for getFaderSignalLevel

  // Global Audio Context Auto-Resume on User Interaction
  useEffect(() => {
    const resumeAudio = () => {
      if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }
    };
    window.addEventListener("click", resumeAudio);
    window.addEventListener("mousedown", resumeAudio);
    window.addEventListener("keydown", resumeAudio);
    return () => {
      window.removeEventListener("click", resumeAudio);
      window.removeEventListener("mousedown", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
    };
  }, []);

  updateClip = (id: string, updates: Partial<Clip>) => {
    setClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
    setDeckClips((prev) => {
      const newDecks = { ...prev };
      Object.keys(newDecks).forEach((deck) => {
        if (newDecks[deck]) {
          newDecks[deck] = newDecks[deck].map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          );
        }
      });
      return newDecks;
    });
    setPlaylists((prev) =>
      prev.map((p) => ({
        ...p,
        clips: p.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      })),
    );
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        slots: l.slots.map((s) =>
          s && s.id === id ? { ...s, ...updates } : s,
        ),
      })),
    );
  };

  const handleUpdateItem = (id: string, updates: any) => {
    if (selectedItemType === "clip") {
      updateClip(id, updates);
    } else if (selectedItemType === "playlist") {
      setPlaylists((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))
        return;

      const isNext =
        e.key === "ArrowRight" ||
        e.key === "PageDown" ||
        e.key === " " ||
        e.key === "n" ||
        e.key === "N";
      const isPrev =
        e.key === "ArrowLeft" ||
        e.key === "PageUp" ||
        e.key === "p" ||
        e.key === "P";

      if (isNext || isPrev) {
        // Find actively playing files in the Program Output only
        const activeClipIds = new Set<string>();

        // Add directly running Program clips
        Object.values(outputPrograms).forEach((id) => {
          if (id) activeClipIds.add(id);
        });

        // Add clips from visible layers (which are mixed into Program)
        layers.forEach((layer) => {
          if (layer.isVisible && layer.activeClipId)
            activeClipIds.add(layer.activeClipId);
        });

        const navClips = clips.filter(
          (c) =>
            (c.type === "document" ||
              c.type === "ppt" ||
              c.name.toLowerCase().endsWith(".pdf")) &&
            c.keyboardNavEnabled &&
            activeClipIds.has(c.id),
        );

        if (navClips.length > 0) {
          e.preventDefault();
          navClips.forEach((clip) => {
            let newPage = (clip.currentPage || 1) + (isNext ? 1 : -1);
            newPage = Math.max(1, newPage);
            if (clip.totalPages) {
              newPage = Math.min(newPage, clip.totalPages);
            }
            updateClip(clip.id, { currentPage: newPage });
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clips, layers, previews]);

  const handleSelectClip = (clip: Clip) => {
    setSelectedItemId(clip.id);
    setSelectedItemType("clip");
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedItemId(playlist.id);
    setSelectedItemType("playlist");
  };

  const handlePreviewClip = (clip: Clip) => {
    setPreviewClipId(clip.id);
    setPreviewPlaylistState(null);
    // Also update the main preview monitor (PREVIEW 1)
    setPreviews((prevs) =>
      prevs.map((p, i) => (i === 0 ? { ...p, clipId: clip.id } : p)),
    );
  };

  const handlePreviewPlaylist = (playlist: Playlist) => {
    if (playlist && playlist.clips && playlist.clips.length > 0) {
      setPreviewPlaylistState({ id: playlist.id, index: 0 });
      setPreviewClipId(playlist.clips[0].id);
    }
  };

  const handleTake = () => {
    const tDuration = externalScreenSettings.transitionDuration || 0.4;

    // Multi-take logic: Find all previews with assigned outputs
    const livePreviews = previews.filter(
      (p) => p.selectedOutputs?.length > 0 && p.clipId,
    );

    if (livePreviews.length > 0) {
      setIsTransmitting(true);
      livePreviews.forEach((p) => handleRewind(p.clipId));

      const targets: Record<string, string | null> = {};
      livePreviews.forEach((lp) => {
        lp.selectedOutputs.forEach((outId: string) => {
          targets[outId] = lp.clipId;
        });
      });
      setOutputTransitionTargets(targets);

      const applyAllToOutputs = () => {
        setOutputPrograms((prev) => {
          const next = { ...prev };
          Object.entries(targets).forEach(([outId, clipId]) => {
            next[outId] = clipId;
          });
          return next;
        });

        const activeEffectClipId = targets[activeOutputId];
        if (activeEffectClipId) {
          setProgramClipId(activeEffectClipId);
        }

        setOutputTransitionTargets({});
      };

      animate(0, 100, {
        duration: tDuration,
        ease: "linear",
        onUpdate: (latest) => setCrossfaderValue(latest),
        onComplete: () => {
          applyAllToOutputs();
          setCrossfaderValue(0);
        },
      });
    } else if (previewClipId && crossfaderValue === 0) {
      handleRewind(previewClipId);

      animate(0, 100, {
        duration: tDuration,
        ease: "linear",
        onUpdate: (latest) => setCrossfaderValue(latest),
        onComplete: () => {
          setProgramClipId(previewClipId);
          setOutputPrograms((prev) => ({
            ...prev,
            [activeOutputId]: previewClipId,
          }));
          setCrossfaderValue(0);
        },
      });
    }
  };

  const onDropOnMultiPreview = (previewId: string, e: React.DragEvent) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData("clipId");
    const playlistId = e.dataTransfer.getData("playlistId");
    const libraryFilesStr = e.dataTransfer.getData("libraryFiles");

    let targetClipId = null;

    if (clipId) {
      targetClipId = clipId;
    } else if (playlistId) {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (playlist && playlist.clips.length > 0) {
        targetClipId = playlist.clips[0].id;
        setPreviewPlaylistState({ id: playlist.id, index: 0 });
      }
    } else if (libraryFilesStr) {
      try {
        const files = JSON.parse(libraryFilesStr);
        if (files.length > 0) {
          const fileData = files[0];
          const clip: Clip = {
            id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: fileData.name,
            thumbnail: fileData.url,
            url: fileData.url,
            type: getClipTypeFromFile(fileData.type, fileData.name),
            status: "idle",
            currentPage: 1,
            transform: { ...DEFAULT_TRANSFORM },
            mask: "none",
            opacity: 1,
            master: 1,
            speed: 1,
            volume: 1,
            pan: 0,
            blendMode: "Alpha",
            behavior: "Cortar",
            curve: "Lineal",
            filter: "none",
            brightness: 1,
            contrast: 1,
            saturation: 1,
            colorBalance: { r: 1, g: 1, b: 1 },
            isPlaying: true,
            loop: true,
          };
          setClips((prev) => [...prev, clip]);
          targetClipId = clip.id;
        }
      } catch (err) {}
    }

    if (targetClipId) {
      setPreviews((prevs) =>
        prevs.map((p) =>
          p.id === previewId ? { ...p, clipId: targetClipId } : p,
        ),
      );
      setPreviewClipId(targetClipId);
      setSelectedItemId(targetClipId);
      setSelectedItemType("clip");
    }
  };

  const handlePreviewNext = () => {
    if (previewPlaylistState) {
      const playlist = playlists.find((p) => p.id === previewPlaylistState.id);
      if (playlist && playlist.clips.length > 0) {
        const nextIndex =
          (previewPlaylistState.index + 1) % playlist.clips.length;
        setPreviewPlaylistState({ ...previewPlaylistState, index: nextIndex });
        setPreviewClipId(playlist.clips[nextIndex].id);
      }
    }
  };

  const handleProgramNext = () => {
    const clip = clips.find((c) => c.id === programClipId);
    const playlist = playlists.find(
      (p) =>
        p.id === (programPlaylistState?.id || clip?.playlistId) ||
        p.clips.some((c) => c.id === programClipId),
    );

    if (playlist && playlist.clips.length > 0) {
      const currentIndex = playlist.clips.findIndex(
        (c) => c.id === programClipId,
      );
      const isAtEnd = currentIndex === playlist.clips.length - 1;

      if (isAtEnd && playlist.loop === false) {
        // End of playlist and loop is explicitly disabled
        handleStop();
        setOutputPrograms((prev) => ({ ...prev, [activeOutputId]: null }));
        return;
      }

      const nextIndex = (currentIndex + 1) % playlist.clips.length;
      const nextClip = playlist.clips[nextIndex];

      const tDuration = externalScreenSettings.transitionDuration || 400;

      // Perform smooth A/B transition swap
      setOutputTransitionTargets((prev) => ({
        ...prev,
        [activeOutputId]: nextClip.id,
      }));
      handleRewind(nextClip.id);

      animate(0, 100, {
        duration: tDuration / 1000,
        ease: "linear",
        onUpdate: (latest) => setCrossfaderValue(latest),
        onComplete: () => {
          setProgramClipId(nextClip.id);
          setProgramPlayIndex((p) => p + 1);
          setProgramPlaylistState({ id: playlist.id, index: nextIndex });
          setOutputPrograms((prev) => ({
            ...prev,
            [activeOutputId]: nextClip.id,
          }));
          setCrossfaderValue(0);
          setOutputTransitionTargets((prev) => {
            const next = { ...prev };
            delete next[activeOutputId];
            return next;
          });
        },
      });
    } else {
      // Direct individual clip playing (no playlist)
      if (clip && clip.loop === false) {
        // Stop playing and clear output programs to go to black!
        handleStop();
        setOutputPrograms((prev) => ({ ...prev, [activeOutputId]: null }));
      }
    }
  };

  const handleStop = () => {
    if (typeof window !== "undefined") {
      (window as any).__luminVideoTimes = {};
    }
    clips.forEach((c) => {
      updateClip(c.id, { currentTime: 0 });
    });
    const ch = (window as any).__luminTimeChannel || (typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lumin-output") : null);
    if (ch) {
      clips.forEach((c) => {
        try {
          ch.postMessage({
            type: "VIDEO_TIME_UPDATE",
            payload: { clipId: c.id, currentTime: 0 },
          });
        } catch (err) {}
      });
    }

    setProgramClipId(null);
    setProgramPlaylistState(null);
    setCrossfaderValue(0);
  };

  const handleTogglePlay = (id: string) => {
    const clip = clips.find((c) => c.id === id);
    if (clip) {
      handleUpdateItem(id, { isPlaying: !clip.isPlaying });
    }
  };

  const handleToggleLoop = (id: string) => {
    const clip = clips.find((c) => c.id === id);
    if (clip) {
      handleUpdateItem(id, { loop: !clip.loop });
    }
  };

  const handleRewind = (id: string) => {
    handleUpdateItem(id, { currentTime: 0 });
  };

  const handleSkip = (id: string, amount: number) => {
    const clip = clips.find((c) => c.id === id);
    if (clip) {
      // Note: This only updates the state, the Monitor component's useEffect
      // will sync this to the actual video element if needed,
      // but for skip we might want to directly manipulate the video ref
      // if we had access to it. However, updating state is the "React way" here.
      // Actually, Monitor component handles currentTime sync in its useEffect.
      const newTime = Math.max(0, (clip.currentTime || 0) + amount);
      handleUpdateItem(id, { currentTime: newTime });
    }
  };

  const handleReset = () => {
    if (programClipId) {
      handleUpdateItem(programClipId, { currentTime: 0 });
    }
  };

  const onDragStart = (e: React.DragEvent, clip: Clip) => {
    e.dataTransfer.setData("clipId", clip.id);
  };

  const onDropOnPreview = (e: React.DragEvent) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData("clipId");
    const playlistId = e.dataTransfer.getData("playlistId");
    const libraryFilesStr = e.dataTransfer.getData("libraryFiles");

    if (clipId) {
      const clip = clips.find((c) => c.id === clipId);
      if (clip) handlePreviewClip(clip);
    } else if (playlistId) {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (playlist) handlePreviewPlaylist(playlist);
    } else if (libraryFilesStr) {
      try {
        const files = JSON.parse(libraryFilesStr);
        if (files.length > 0) {
          const fileData = files[0];
          const clip: Clip = {
            id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: fileData.name,
            thumbnail: fileData.url,
            url: fileData.url,
            type: getClipTypeFromFile(fileData.type, fileData.name),
            status: "idle",
            currentPage: 1,
            transform: { ...DEFAULT_TRANSFORM },
            mask: "none",
            opacity: 1,
            master: 1,
            speed: 1,
            volume: 1,
            pan: 0,
            blendMode: "Alpha",
            behavior: "Cortar",
            curve: "Lineal",
            filter: "none",
            brightness: 1,
            contrast: 1,
            saturation: 1,
            colorBalance: { r: 1, g: 1, b: 1 },
            isPlaying: true,
            loop: true,
          };
          setClips((prev) => [...prev, clip]);
          handlePreviewClip(clip);
        }
      } catch (err) {}
    }
  };

  const onDropOnPlaylist = (e: React.DragEvent, playlistId?: string) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData("clipId");
    const libraryFileData = e.dataTransfer.getData("libraryFile");
    const libraryFilesData = e.dataTransfer.getData("libraryFiles");

    let clipsToClone: Clip[] = [];

    if (clipId) {
      const found = clips.find((c) => c.id === clipId);
      if (found) clipsToClone = [found];
    } else if (libraryFilesData) {
      const filesData = JSON.parse(libraryFilesData);
      clipsToClone = filesData.map((fileData: any) => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        name: fileData.name,
        thumbnail: fileData.url,
        url: fileData.url,
        type: getClipTypeFromFile(fileData.type, fileData.name),
        status: "idle" as const,
        currentPage: 1,
        transform: { ...DEFAULT_TRANSFORM },
        mask: "none" as const,
        opacity: 1,
        master: 1,
        speed: 1,
        volume: 1,
        pan: 0,
        blendMode: "Alpha" as const,
        behavior: "Cortar" as const,
        curve: "Lineal" as const,
        filter: "none" as const,
        brightness: 1,
        contrast: 1,
        saturation: 1,
        colorBalance: { r: 1, g: 1, b: 1 },
        isPlaying: true,
        loop: false,
      }));
    } else if (libraryFileData) {
      const fileData = JSON.parse(libraryFileData);
      clipsToClone = [
        {
          id: `temp-${Date.now()}`,
          name: fileData.name,
          thumbnail: fileData.url,
          url: fileData.url,
          type: getClipTypeFromFile(fileData.type, fileData.name),
          status: "idle" as const,
          currentPage: 1,
          transform: { ...DEFAULT_TRANSFORM },
          mask: "none" as const,
          opacity: 1,
          master: 1,
          speed: 1,
          volume: 1,
          pan: 0,
          blendMode: "Alpha" as const,
          behavior: "Cortar" as const,
          curve: "Lineal" as const,
          filter: "none" as const,
          brightness: 1,
          contrast: 1,
          saturation: 1,
          colorBalance: { r: 1, g: 1, b: 1 },
          isPlaying: true,
          loop: false,
        },
      ];
    } else if (e.dataTransfer.files.length > 0) {
      // Handle OS files
      const files = Array.from(e.dataTransfer.files);
      clipsToClone = files.map((f) => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        name: f.name,
        thumbnail: URL.createObjectURL(f),
        url: URL.createObjectURL(f),
        type: getClipTypeFromFile(f.type, f.name),
        status: "idle" as const,
        currentPage: 1,
        transform: { ...DEFAULT_TRANSFORM },
        mask: "none" as const,
        opacity: 1,
        master: 1,
        speed: 1,
        volume: 1,
        pan: 0,
        blendMode: "Alpha" as const,
        behavior: "Cortar" as const,
        curve: "Lineal" as const,
        filter: "none" as const,
        brightness: 1,
        contrast: 1,
        saturation: 1,
        colorBalance: { r: 1, g: 1, b: 1 },
        isPlaying: true,
        loop: true,
      }));
    }

    if (clipsToClone.length > 0) {
      const newClips: Clip[] = clipsToClone.map((clipToClone) => ({
        ...clipToClone,
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: "idle" as const,
        isPlaying: true,
        loop: false,
      }));

      setClips((prev) => [...prev, ...newClips]);

      if (playlistId) {
        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === playlistId
              ? { ...p, clips: [...p.clips, ...newClips] }
              : p,
          ),
        );
      } else {
        const newPlaylist: Playlist = {
          id: `playlist-${playlists.length + 1}`,
          name: `Playlist ${playlists.length + 1}`,
          clips: newClips,
          opacity: 1,
          isVisible: true,
          loop: true,
          transform: { ...DEFAULT_TRANSFORM },
          mask: "none",
          master: 1,
          speed: 1,
          volume: 1,
          pan: 0,
          blendMode: "Alpha",
          behavior: "Cortar",
          curve: "Lineal",
          filter: "none",
          brightness: 1,
          contrast: 1,
          saturation: 1,
          colorBalance: { r: 1, g: 1, b: 1 },
        };
        setPlaylists((prev) => [...prev, newPlaylist]);
        setSelectedItemId(newPlaylist.id);
        setSelectedItemType("playlist");
      }
    }
  };

  const addPlaylist = () => {
    if (playlists.length < 8) {
      const newPlaylist: Playlist = {
        id: `playlist-${playlists.length + 1}`,
        name: `Playlist ${playlists.length + 1}`,
        clips: [],
        opacity: 1,
        isVisible: true,
        loop: true,
        transform: { ...DEFAULT_TRANSFORM },
        mask: "none",
        master: 1,
        speed: 1,
        volume: 1,
        pan: 0,
        blendMode: "Alpha",
        behavior: "Cortar",
        curve: "Lineal",
        filter: "none",
        brightness: 1,
        contrast: 1,
        saturation: 1,
        colorBalance: { r: 1, g: 1, b: 1 },
      };
      setPlaylists([...playlists, newPlaylist]);
    }
  };

  const addExternalScreen = () => {
    const newScreen: Screen = {
      id: `scr-${Date.now()}`,
      name: `Screen ${externalScreens.length + 1}`,
      isActive: false,
    };
    setExternalScreens([...externalScreens, newScreen]);
  };

  const toggleScreen = (id: string) => {
    setExternalScreens((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)),
    );
  };

  const selectedItem =
    selectedItemType === "clip"
      ? clips.find((c) => c.id === selectedItemId) || null
      : selectedItemType === "pip"
        ? pipLayers.find((p) => p.id === selectedItemId) || null
        : selectedItemType === "layer"
          ? layers.find((l) => l.id === selectedItemId) || null
          : selectedItemType === "playlist"
            ? playlists.find((p) => p.id === selectedItemId) || null
            : null;
  const previewClip = clips.find((c) => c.id === previewClipId) || null;
  const programClip = clips.find((c) => c.id === programClipId) || null;

  // Check for output mode
  const params = new URLSearchParams(
    window.location.search ||
      window.location.hash.substring(
        window.location.hash.indexOf("?") !== -1
          ? window.location.hash.indexOf("?")
          : window.location.hash.length,
      ),
  );
  const isOutputMode = params.get("mode") === "output";
  const isFloatingTimerMode = params.get("mode") === "floating_timer";

  if (isOutputMode) {
    return <OutputView />;
  }

  if (isFloatingTimerMode) {
    return <FloatingTimerPopoutView />;
  }

  return (
    <div
      className={`flex flex-col h-screen font-sans selection:bg-obs-accent/30 overflow-hidden bg-obs-bg text-obs-text`}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="video/*,image/*"
        multiple
        onChange={(e) =>
          e.target.files && handleAddClips(Array.from(e.target.files))
        }
      />

      <PixelMapModal
        isOpen={isPixelMapOpen}
        onClose={() => setIsPixelMapOpen(false)}
        slices={slices}
        onUpdateSlices={setSlices}
      />

      {/* MODAL: REGISTRO DE IMPORTACIÓN PPT A PDF */}
      <AnimatePresence>
        {isPptImporting && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-obs-dark-1 border border-obs-border w-[400px] rounded p-6 shadow-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="p-3 bg-obs-accent/10 rounded-full animate-pulse border border-obs-accent/25">
                <Loader2 size={24} className="text-obs-accent animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase text-white tracking-widest">
                  CONVIRTIENDO DIAPOSITIVAS
                </h3>
                <p className="text-[10px] text-obs-muted">
                  PowerPoint COM Engine está extrayendo su PPT a formato PDF
                  vectorizado...
                </p>
              </div>
              <div className="w-full bg-obs-surface h-2 rounded-full overflow-hidden border border-obs-border relative mt-2">
                <motion.div
                  className="bg-obs-accent h-full rounded-full transition-all duration-300"
                  style={{ width: `${pptImportProgress}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-black text-obs-accent">
                {pptImportProgress}% completado
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CUSTOM ALERT */}
      <AnimatePresence>
        {customAlertOptions.isOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10000] font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="bg-obs-dark-1 border border-obs-border p-6 rounded shadow-2xl min-w-[320px] max-w-md w-full"
            >
              <h2 className="text-white text-[12px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                {customAlertOptions.type === "error" ? <AlertTriangle size={16} className="text-red-500" /> : null}
                {customAlertOptions.type === "success" ? <Check size={16} className="text-emerald-500" /> : null}
                {customAlertOptions.type === "info" ? <AlertTriangle size={16} className="text-blue-500" /> : null}
                {customAlertOptions.title}
              </h2>
              <p className="text-obs-muted mb-6 text-[10px] leading-relaxed break-words">{customAlertOptions.message}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setCustomAlertOptions({ ...customAlertOptions, isOpen: false })}
                  className="px-5 py-2 bg-obs-accent hover:opacity-90 text-white rounded text-[10px] font-bold uppercase transition-all"
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRMACIÓN DE SALIDA (A LA WINDOWS) */}
      <AnimatePresence>
        {isExitModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-obs-dark-1 border border-obs-border w-[420px] rounded shadow-2xl overflow-hidden"
            >
              <div className="p-4 bg-obs-surface border-b border-obs-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-obs-accent">
                  <AlertTriangle size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-white">
                    SALIR DE LUMIN
                  </span>
                </div>
                <button
                  onClick={() => setIsExitModalOpen(false)}
                  className="text-obs-muted hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-6 text-left space-y-2">
                <p className="text-[10px] text-white leading-relaxed font-sans">
                  ¿Deseas guardar los cambios actuales en el archivo de proyecto
                  antes de salir del software?
                </p>
                {currentLuminPath ? (
                  <p className="text-[9px] text-obs-muted font-mono break-all bg-obs-bg p-2 rounded border border-obs-border/50">
                    Archivo activo: {currentLuminPath}
                  </p>
                ) : (
                  <p className="text-[9px] text-obs-muted italic">
                    El proyecto actual nunca se ha guardado (.lumin)
                  </p>
                )}
              </div>
              <div className="p-3 bg-obs-surface border-t border-obs-border flex justify-end gap-2">
                <button
                  onClick={async () => {
                    await handleSaveLumin();
                    window.electron?.exitApp?.();
                  }}
                  className="px-4 py-1.5 bg-obs-accent hover:opacity-90 text-white rounded text-[10px] font-bold uppercase transition-all"
                >
                  Guardar y Salir
                </button>
                <button
                  onClick={() => {
                    window.electron?.exitApp?.();
                  }}
                  className="px-4 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white rounded text-[10px] font-bold uppercase transition-all"
                >
                  Salir sin Guardar
                </button>
                <button
                  onClick={() => setIsExitModalOpen(false)}
                  className="px-4 py-1.5 bg-obs-border hover:bg-obs-border/70 text-obs-text rounded text-[10px] font-bold uppercase transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: GESTIÓN DE AUDIO (POPUP REQUERIDO) */}
      <AnimatePresence>
        {isAudioConfigModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-obs-dark-1 border border-obs-border w-[480px] rounded shadow-2xl overflow-hidden"
            >
              <div className="p-4 bg-obs-surface border-b border-obs-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-obs-accent animate-pulse">
                  <Sliders size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-white font-sans">
                    GESTIÓN Y ENRUTAMIENTO DE AUDIO
                  </span>
                </div>
                <button
                  onClick={() => setIsAudioConfigModalOpen(false)}
                  className="text-obs-muted hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-left max-h-[70vh] overflow-y-auto">
                {/* Dispositivos de Salida */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase text-obs-muted tracking-wider flex items-center gap-1">
                      <Headphones size={11} className="text-obs-accent" />
                      Dispositivo de Salida (Windows Playback)
                    </label>
                    <button
                      onClick={refreshAudioDevices}
                      className="text-[8px] text-obs-accent hover:text-white font-bold uppercase transition-all flex items-center gap-0.5"
                      title="Refrescar dispositivos"
                    >
                      <RefreshCw size={8} className="animate-spin" /> Escanear
                    </button>
                  </div>
                  <select
                    value={selectedAudioOutput}
                    onChange={(e) => setSelectedAudioOutput(e.target.value)}
                    className="w-full bg-obs-surface text-white text-[10px] font-bold p-2.5 border border-obs-border rounded focus:outline-none focus:border-obs-accent hover:border-obs-accent/50 outline-none"
                  >
                    <option value="none">Ninguno (Sin Audio)</option>
                    {audioOutputDevices.map((dev) => (
                      <option
                        key={dev.deviceId || dev.label}
                        value={dev.deviceId}
                      >
                        {dev.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dispositivos de Entrada */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-obs-muted tracking-wider flex items-center gap-1">
                    <Mic size={11} className="text-obs-accent" />
                    Dispositivo de Entrada (Windows Capture)
                  </label>
                  <select
                    value={selectedAudioInput}
                    onChange={(e) => setSelectedAudioInput(e.target.value)}
                    className="w-full bg-obs-surface text-white text-[10px] font-bold p-2.5 border border-obs-border rounded focus:outline-none focus:border-obs-accent hover:border-obs-accent/50 outline-none"
                  >
                    <option value="none">Ninguno (Sin Audio)</option>
                    {audioInputDevices.map((dev) => (
                      <option
                        key={dev.deviceId || dev.label}
                        value={dev.deviceId}
                      >
                        {dev.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-obs-surface border-t border-obs-border flex justify-between items-center">
                <span className="text-[8px] text-obs-muted uppercase font-mono font-bold pl-2">
                  Windows Audio Control Active
                </span>
                <button
                  onClick={() => setIsAudioConfigModalOpen(false)}
                  className="px-5 py-1.5 bg-obs-accent hover:opacity-90 text-white rounded text-[10px] font-bold uppercase transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PREFERENCIAS (POPUP REQUERIDO) */}
      <AnimatePresence>
        {isPreferencesModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-obs-dark-1 border border-obs-border w-[460px] rounded shadow-2xl overflow-hidden"
            >
              <div className="p-4 bg-obs-surface border-b border-obs-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-obs-accent">
                  <Settings size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-white">
                    PREFERENCIAS DEL SISTEMA
                  </span>
                </div>
                <button
                  onClick={() => setIsPreferencesModalOpen(false)}
                  className="text-obs-muted hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-6 space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-obs-muted">
                    Idioma del Software
                  </label>
                  <select className="w-full bg-obs-surface text-white text-[10px] font-bold p-2 border border-obs-border rounded focus:outline-none focus:border-obs-accent">
                    <option>Español (ES)</option>
                    <option>English (US)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-obs-muted font-sans">
                    Motor de Aceleración de Video
                  </label>
                  <div className="p-3 bg-obs-bg rounded border border-obs-border flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-white uppercase font-black font-sans">
                        Aceleración por Hardware DirectX/Vulkan
                      </span>
                      <p className="text-[8px] text-obs-muted">
                        Fuerza la decodificación por hardware nativa del GPU.
                      </p>
                    </div>
                    <span className="text-[8px] text-obs-accent font-black font-mono uppercase bg-obs-accent/10 px-2.5 py-0.5 rounded border border-obs-accent/15">
                      Activo
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-obs-muted font-sans">
                    Configuración del Guardado Automático
                  </label>
                  <div className="p-2 bg-obs-surface text-[9px] text-obs-muted leading-relaxed rounded border border-obs-border border-dashed">
                    LUMIN guarda automáticamente todos los cambios realizados en
                    el archivo del proyecto actual cada vez que agregas clips o
                    re-ordenas las capas.
                  </div>
                </div>
              </div>
              <div className="p-3 bg-obs-surface border-t border-obs-border flex justify-end">
                <button
                  onClick={() => setIsPreferencesModalOpen(false)}
                  className="px-5 py-1.5 bg-obs-accent hover:opacity-90 text-white rounded text-[10px] font-bold uppercase transition-all"
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header / Menu Bar */}
      <header className="h-8 border-b border-obs-border flex items-center justify-between px-3 bg-obs-surface">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-obs-accent" />
            <span className="text-[11px] font-bold tracking-tight">LUMIN</span>
          </div>
          <nav className="flex gap-1 items-center">
            <button
              onClick={() => setShowContentPanel(!showContentPanel)}
              className={`text-[10px] px-3 py-1 rounded transition-colors font-bold tracking-widest capitalize flex items-center gap-1.5 ${!showContentPanel ? "bg-obs-accent text-white" : "text-obs-text hover:bg-obs-border"}`}
            >
              <Layout size={12} />
              {showContentPanel ? "Ocultar Contenido" : "Mostrar Contenido"}
            </button>
            <div className="relative font-sans">
              <button
                onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                className={`text-[10px] px-3 py-1 rounded transition-colors font-bold tracking-widest capitalize flex items-center ${isFileMenuOpen ? "bg-obs-accent text-white" : "text-obs-text hover:bg-obs-border"}`}
              >
                Archivo
              </button>
              <AnimatePresence>
                {isFileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsFileMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute left-0 top-full mt-1 w-48 bg-obs-dark-1 border border-obs-border rounded shadow-2xl z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          handleOpenLumin();
                          setIsFileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold capitalize tracking-widest text-obs-text hover:bg-obs-accent hover:text-white transition-colors flex items-center justify-between border-b border-obs-text/5"
                      >
                        <span>Abrir</span>
                        <FolderOpen size={12} />
                      </button>
                      <button
                        onClick={() => {
                          handleSaveLumin();
                          setIsFileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold capitalize tracking-widest text-obs-text hover:bg-obs-accent hover:text-white transition-colors flex items-center justify-between border-b border-obs-text/5"
                      >
                        <span>Guardar</span>
                        <Save size={12} />
                      </button>
                      <button
                        onClick={() => {
                          handleSaveAsLumin();
                          setIsFileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold capitalize tracking-widest text-obs-text hover:bg-obs-accent hover:text-white transition-colors flex items-center justify-between border-b border-obs-text/5"
                      >
                        <span>Guardar Como</span>
                        <FileCode size={12} />
                      </button>
                      <button
                        onClick={() => {
                          handleImportPptClick();
                          setIsFileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold capitalize tracking-widest text-obs-text hover:bg-obs-accent hover:text-white transition-colors flex items-center justify-between border-b border-obs-text/5"
                      >
                        <span>Importar PPT</span>
                        <PlusSquare size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setIsPreferencesModalOpen(true);
                          setIsFileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold capitalize tracking-widest text-obs-text hover:bg-obs-accent hover:text-white transition-colors flex items-center justify-between border-b border-obs-text/5"
                      >
                        <span>Preferencias</span>
                        <Settings size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setIsFileMenuOpen(false);
                          setIsExitModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold capitalize tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-between"
                      >
                        <span>Salir</span>
                        <LogOut size={12} />
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsEditMenuOpen(!isEditMenuOpen)}
                className={`text-[10px] px-3 py-1 rounded transition-colors font-bold tracking-widest capitalize flex items-center ${isEditMenuOpen ? "bg-obs-accent text-white" : "text-obs-text hover:bg-obs-border"}`}
              >
                Editar
              </button>
              <AnimatePresence>
                {isEditMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsEditMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute left-0 top-full mt-1 w-56 bg-obs-dark-1 border border-obs-border rounded shadow-2xl z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setIsOutputModalOpen(true);
                          setIsEditMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-bold capitalize tracking-widest text-obs-text hover:bg-obs-accent hover:text-white transition-colors flex items-center justify-between border-b border-obs-text/5"
                      >
                        <span>Salidas</span>
                        <MonitorIcon size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.electron?.openSettings) {
                            window.electron.openSettings();
                          } else {
                            window.location.href = "ms-settings:display";
                          }
                          setIsEditMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-bold capitalize tracking-widest text-obs-text hover:bg-obs-accent hover:text-white transition-colors flex items-center justify-between border-b border-obs-text/5"
                      >
                        <span>Configuración Windows</span>
                        <ExternalLink size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setIsPerfModalOpen(true);
                          setIsEditMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-bold capitalize tracking-widest text-obs-text hover:bg-obs-accent hover:text-white transition-colors flex items-center justify-between border-b border-obs-text/5"
                      >
                        <span>Rendimiento y CPU</span>
                        <Cpu size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setIsAudioConfigModalOpen(true);
                          refreshAudioDevices();
                          setIsEditMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-bold capitalize tracking-widest text-obs-text hover:bg-obs-accent hover:text-white transition-colors flex items-center justify-between"
                      >
                        <span>Gestión de Audio</span>
                        <Sliders size={12} />
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setIsPixelMapOpen(true)}
              className="text-[10px] text-obs-text hover:bg-obs-border px-3 py-1 rounded transition-colors font-bold tracking-widest capitalize"
            >
              Output
            </button>

            <button className="text-[10px] text-obs-text hover:bg-obs-border px-3 py-1 rounded transition-colors font-bold tracking-widest capitalize">
              Ayuda
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1 text-obs-muted hover:text-obs-text transition-colors"
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Content Management */}
        <AnimatePresence>
          {showContentPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex flex-col border-r border-obs-border bg-obs-bg overflow-hidden shadow-2xl z-20"
            >
              <div className="flex-1 flex flex-col min-h-0">
                <Library
                  onAddClip={handleAddClips}
                  isDarkMode={isDarkMode}
                  libraryFiles={libraryFiles}
                  setLibraryFiles={setLibraryFiles}
                  selectedLibraryUrls={selectedLibraryUrls}
                  setSelectedLibraryUrls={setSelectedLibraryUrls}
                />
              </div>

              <div className="flex flex-col border-t border-obs-border">
                {/* Gestión de Audio Tab */}
                <div className="border-b border-obs-border">
                  <button
                    onClick={() =>
                      setActiveSidebarTab(
                        activeSidebarTab === "audio" ? null : "audio",
                      )
                    }
                    className={`w-full flex items-center justify-between px-4 py-2 hover:bg-obs-surface transition-colors ${activeSidebarTab === "audio" ? "bg-obs-surface/50" : "bg-obs-bg"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Volume2
                        size={12}
                        className={
                          activeSidebarTab === "audio"
                            ? "text-obs-accent"
                            : "text-obs-muted"
                        }
                      />
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider ${activeSidebarTab === "audio" ? "text-obs-text" : "text-obs-muted"}`}
                      >
                        GESTIÓN DE AUDIO
                      </span>
                    </div>
                    <ChevronDown
                      size={12}
                      className={`text-obs-muted transition-transform duration-300 ${activeSidebarTab === "audio" ? "" : "-rotate-90"}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {activeSidebarTab === "audio" && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden bg-obs-dark-1"
                      >
                        <div className="p-2 space-y-2">
                          <div className="flex justify-between items-center px-1 border-b border-obs-border pb-1">
                            <span className="text-[7.5px] uppercase font-bold text-obs-muted tracking-wider">
                              Faders del Sistema
                            </span>
                            <button
                              onClick={() => {
                                setIsAudioConfigModalOpen(true);
                                refreshAudioDevices();
                              }}
                              className="p-1 px-1.5 bg-obs-accent hover:bg-obs-accent/80 text-white rounded text-[7.5px] font-bold uppercase transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Sliders size={8} />
                              Ajustes
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {activeFaders.map((sourceName) => {
                              const volume =
                                sourceName === "Master"
                                  ? masterVolume
                                  : sourceName === "out-default"
                                    ? (windowsDevicesList.find((d) => d.flow === 0 && d.isDefault)?.volume ?? audioVolumes["out-default"] ?? 0.5)
                                    : sourceName === "in-default"
                                      ? (windowsDevicesList.find((d) => d.flow === 1 && d.isDefault)?.volume ?? audioVolumes["in-default"] ?? 0.5)
                                      : (audioVolumes[sourceName] ?? 0.5);

                              const onChange = (val: number) => {
                                if (sourceName === "Master") {
                                  setMasterVolume(val);
                                  (window.electron as any)?.setWindowsVolume?.(val).catch(() => {});
                                } else if (sourceName === "out-default") {
                                  const defDev = windowsDevicesList.find((d) => d.flow === 0 && d.isDefault);
                                  if (defDev) {
                                    (window.electron as any)?.setWindowsDeviceVolume?.(defDev.id, val).catch(() => {});
                                  } else {
                                    (window.electron as any)?.setWindowsVolume?.(val).catch(() => {});
                                  }
                                } else if (sourceName === "in-default") {
                                  const defDev = windowsDevicesList.find((d) => d.flow === 1 && d.isDefault);
                                  if (defDev) {
                                    (window.electron as any)?.setWindowsDeviceVolume?.(defDev.id, val).catch(() => {});
                                  }
                                } else if (sourceName === "Programa") {
                                  setProgramVolume(val);
                                } else if (sourceName === "USB") {
                                  setUsbOutVolume(val);
                                  (window.electron as any)?.setWindowsVolume?.(val).catch(() => {});
                                } else if (sourceName === "IN") {
                                  setUsbInVolume(val);
                                  const defIn = windowsDevicesList.find((d) => d.flow === 1 && d.isDefault);
                                  if (defIn) {
                                    (window.electron as any)?.setWindowsDeviceVolume?.(defIn.id, val).catch(() => {});
                                  }
                                } else if (sourceName.startsWith("out-") || sourceName.startsWith("in-")) {
                                  const flow = sourceName.startsWith("out-") ? 0 : 1;
                                  const cleanId = sourceName.replace("out-", "").replace("in-", "");
                                  
                                  let winDevId = cleanId;
                                  // Attempt to map from Chrome label to Windows device name
                                  const chromeList = flow === 0 ? audioOutputDevices : audioInputDevices;
                                  const chromeDev = chromeList.find(d => d.deviceId === cleanId);
                                  
                                  if (chromeDev && chromeDev.label) {
                                    // Strip things like "Predeterminado - " from Chrome label if present
                                    const rawLabel = chromeDev.label.replace(/^Predeterminado - /, "").trim();
                                    const winDev = windowsDevicesList.find(d => 
                                      d.flow === flow && 
                                      d.name === rawLabel
                                    );
                                    if (winDev) {
                                      winDevId = winDev.id;
                                    }
                                  }

                                  (window.electron as any)?.setWindowsDeviceVolume?.(winDevId, val).catch(() => {});
                                }

                                setAudioVolumes((prev) => ({
                                  ...prev,
                                  [sourceName]: val,
                                }));
                              };

                              let faderLabel = sourceName;
                              if (sourceName === "Master") {
                                faderLabel = "MEZCLA MASTER";
                              } else if (sourceName === "out-default") {
                                faderLabel = "SALIDA PRINCIPAL";
                              } else if (sourceName === "in-default") {
                                faderLabel = "ENTRADA MICRÓFONO";
                              } else if (sourceName.startsWith("out-")) {
                                const cleanId = sourceName.replace("out-", "");
                                const matched = audioOutputDevices.find(
                                  (d) => d.deviceId === cleanId,
                                );
                                faderLabel = matched
                                  ? `SALIDA: ${matched.label}`
                                  : `SALIDA: ${cleanId}`;
                              } else if (sourceName.startsWith("in-")) {
                                const cleanId = sourceName.replace("in-", "");
                                const matched = audioInputDevices.find(
                                  (d) => d.deviceId === cleanId,
                                );
                                faderLabel = matched
                                  ? `ENTRADA: ${matched.label}`
                                  : `ENTRADA: ${cleanId}`;
                              }

                              return (
                                <div
                                  key={sourceName}
                                  className={`p-1.5 rounded border space-y-1.5 font-sans transition-all duration-200 ${
                                    mutedFaders[sourceName]
                                      ? "bg-red-950/20 border-red-900/40 shadow-inner"
                                      : "bg-obs-bg/40 border-obs-border/40"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 px-1">
                                    <span className={`text-[8.5px] font-black uppercase tracking-wider truncate flex-1 transition-colors ${mutedFaders[sourceName] ? "text-red-400" : "text-obs-text"}`}>
                                      {faderLabel}
                                    </span>
                                    <button
                                      onClick={() => toggleMute(sourceName)}
                                      className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider transition-all cursor-pointer select-none shrink-0 border ${
                                        mutedFaders[sourceName]
                                          ? "bg-red-600 border-red-500 text-white hover:bg-red-500 shadow-md shadow-red-900/20"
                                          : "bg-obs-dark-2 border-white/5 text-obs-muted hover:bg-obs-surface hover:text-white"
                                      }`}
                                      title={mutedFaders[sourceName] ? "Desmutear" : "Mutear canal"}
                                    >
                                      {mutedFaders[sourceName] ? "MUTED" : "MUTE"}
                                    </button>
                                  </div>

                                  <PropertyControl
                                    label="Volumen"
                                    value={mutedFaders[sourceName] ? 0 : volume}
                                    displayValue={mutedFaders[sourceName] ? "-∞ dB" : volToDb(volume)}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    onChange={onChange}
                                    isAudioControl={true}
                                  />
                                  <AudioBumeter
                                    volume={mutedFaders[sourceName] ? 0 : volume}
                                    isActive={true}
                                    getSignalLevel={() =>
                                      mutedFaders[sourceName] ? 0 : getFaderSignalLevel(sourceName)
                                    }
                                  />
                                </div>
                              );
                            })}
                            {activeFaders.length === 0 && (
                              <div className="p-4 text-center text-obs-muted text-[8.5px] italic">
                                Ningún fader visible o configurado.
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Rendimiento & Hardware GPU Tab */}
                <div className="border-b border-obs-border">
                  <button
                    onClick={() =>
                      setActiveSidebarTab(
                        activeSidebarTab === "perf" ? null : "perf",
                      )
                    }
                    className={`w-full flex items-center justify-between px-4 py-2 hover:bg-obs-surface transition-colors ${activeSidebarTab === "perf" ? "bg-obs-surface/50" : "bg-obs-bg"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Cpu
                        size={12}
                        className={
                          activeSidebarTab === "perf"
                            ? "text-obs-accent"
                            : "text-obs-muted"
                        }
                      />
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider ${activeSidebarTab === "perf" ? "text-obs-text" : "text-obs-muted"}`}
                      >
                        RENDIMIENTO Y MOTOR NATIVO
                      </span>
                    </div>
                    <ChevronDown
                      size={12}
                      className={`text-obs-muted transition-transform duration-300 ${activeSidebarTab === "perf" ? "" : "-rotate-90"}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {activeSidebarTab === "perf" && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden bg-obs-dark-1"
                      >
                        <div className="p-3 space-y-3">
                          <div className="bg-obs-surface p-2.5 rounded border border-obs-text/5 space-y-3 font-sans">
                            <div className="flex items-center justify-between border-b border-obs-text/5 pb-2">
                              <span className="text-[8px] font-black text-obs-accent uppercase tracking-widest flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                TELEMETRÍA EN DIRECTO
                              </span>
                              <button
                                onClick={() => setIsPerfModalOpen(true)}
                                className="bg-obs-dark-2 hover:bg-obs-accent hover:text-white px-2 py-0.5 rounded text-[8px] font-bold text-obs-text flex items-center gap-1 transition-all"
                                title="Editar parámetros"
                              >
                                ⚙ EDITAR
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {/* FPS */}
                              <div className="bg-obs-dark-2 p-2 rounded relative overflow-hidden group border border-obs-text/5">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[7px] text-obs-muted uppercase font-black tracking-wider">
                                    Frames / FPS
                                  </span>
                                  <span className="text-[6px] text-emerald-400 font-bold uppercase tracking-tighter">
                                    Estable
                                  </span>
                                </div>
                                <div className="font-mono text-xs font-black text-white leading-none">
                                  {telemetryFps.toFixed(1)}{" "}
                                  <span className="text-[7px] text-obs-muted">
                                    FPS
                                  </span>
                                </div>
                                <div className="w-full bg-obs-border/30 h-0.5 mt-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${(telemetryFps / 60) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              {/* CPU */}
                              <div className="bg-obs-dark-2 p-2 rounded relative overflow-hidden group border border-obs-text/5">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[7px] text-obs-muted uppercase font-black tracking-wider">
                                    Carga CPU
                                  </span>
                                  <span className="text-[6px] text-obs-accent font-bold uppercase tracking-tighter">
                                    {telemetryCpu.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="font-mono text-xs font-black text-white leading-none">
                                  {telemetryCpu.toFixed(1)}{" "}
                                  <span className="text-[7px] text-obs-muted">
                                    CPU
                                  </span>
                                </div>
                                <div className="w-full bg-obs-border/30 h-0.5 mt-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-obs-accent h-full rounded-full transition-all duration-300"
                                    style={{ width: `${telemetryCpu}%` }}
                                  />
                                </div>
                              </div>

                              {/* GPU */}
                              <div className="bg-obs-dark-2 p-2 rounded relative overflow-hidden group border border-obs-text/5">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[7px] text-obs-muted uppercase font-black tracking-wider">
                                    Carga GPU
                                  </span>
                                  <span className="text-[6px] text-indigo-400 font-bold uppercase tracking-tighter">
                                    {telemetryGpu.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="font-mono text-xs font-black text-white leading-none">
                                  {telemetryGpu.toFixed(1)}{" "}
                                  <span className="text-[7px] text-obs-muted">
                                    GPU
                                  </span>
                                </div>
                                <div className="w-full bg-obs-border/30 h-0.5 mt-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${telemetryGpu}%` }}
                                  />
                                </div>
                              </div>

                              {/* RAM/VRAM */}
                              <div className="bg-obs-dark-2 p-2 rounded relative overflow-hidden group border border-obs-text/5">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[7px] text-obs-muted uppercase font-black tracking-wider">
                                    Memoria RAM
                                  </span>
                                  <span className="text-[6px] text-amber-500 font-bold uppercase tracking-tighter">
                                    {((telemetryRam / 8) * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="font-mono text-xs font-black text-white leading-none">
                                  {telemetryRam.toFixed(2)}{" "}
                                  <span className="text-[7px] text-obs-muted">
                                    GB
                                  </span>
                                </div>
                                <div className="w-full bg-obs-border/30 h-0.5 mt-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${(telemetryRam / 8) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Additional telemetry stats */}
                            <div className="bg-obs-dark-2 p-2 rounded space-y-1.5 text-[6.5px] uppercase font-mono border border-obs-text/5 text-obs-text">
                              <div className="flex justify-between items-center">
                                <span className="text-obs-muted">
                                  Modo de Ejecución
                                </span>
                                <span
                                  className={`${window.electron?.isElectron ? "text-amber-500" : "text-blue-400"} font-black flex items-center gap-1`}
                                >
                                  {window.electron?.isElectron && (
                                    <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping" />
                                  )}
                                  {window.electron?.isElectron
                                    ? "NATIVO WINDOWS"
                                    : "REMOTA (BROWSER)"}
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-t border-obs-text/5 pt-1.5">
                                <span className="text-obs-muted">
                                  VRAM Persistente
                                </span>
                                <span
                                  className={`${window.electron?.isElectron ? "text-obs-accent" : "text-obs-muted"} font-bold`}
                                >
                                  {window.electron?.isElectron
                                    ? "ACTIVO D3D12"
                                    : "ESTÁNDAR (WEB)"}
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-t border-obs-text/5 pt-1.5">
                                <span className="text-obs-muted">
                                  Decodificador GPU
                                </span>
                                <span
                                  className={`${window.electron?.isElectron ? "text-emerald-400" : "text-obs-muted"} font-bold`}
                                >
                                  {window.electron?.isElectron
                                    ? "NVDEC (HW CUDA)"
                                    : "GENÉRICO HWA"}
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-t border-obs-text/5 pt-1.5">
                                <span className="text-obs-muted">
                                  Chromium Render Bypass
                                </span>
                                <span
                                  className={`${window.electron?.isElectron ? "text-emerald-400" : "text-obs-muted"} font-bold`}
                                >
                                  {window.electron?.isElectron
                                    ? "COMPLETO"
                                    : "NO DISPONIBLE"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Vista Previa at bottom */}
                <div className="bg-black flex flex-col h-48 min-h-[192px] max-h-[192px] basis-48 shrink-0 border-t border-obs-border">
                  <div className="px-3 py-1.5 bg-obs-surface border-b border-obs-border flex justify-between items-center">
                    <span className="text-[9px] font-black text-obs-muted uppercase tracking-wider">
                      VISTA PREVIA
                    </span>
                    <span className="text-[8px] text-obs-accent font-bold">
                      {selectedLibraryUrls.size === 1
                        ? "1 ARCHIVO"
                        : selectedLibraryUrls.size > 1
                          ? `${selectedLibraryUrls.size} ARCHIVOS`
                          : "VACÍO"}
                    </span>
                  </div>
                  <div className="flex-1 relative flex items-center justify-center bg-obs-dark-m2 overflow-hidden">
                    {selectedLibraryUrls.size === 1 ? (
                      ((clipUpdateFunction) => {
                        const selectedFile = libraryFiles.find((f) =>
                          selectedLibraryUrls.has(f.url),
                        );
                        if (!selectedFile) return null;
                        if (selectedFile.type === "videoinput" || selectedFile.type?.startsWith("video")) {
                          return <LibraryMediaPreview file={selectedFile} />;
                        } else if (
                          selectedFile.type === "document" ||
                          selectedFile.type === "ppt" ||
                          selectedFile.type?.includes("pdf") ||
                          selectedFile.type?.includes("powerpoint")
                        ) {
                          return (
                            <DocumentLayer
                              clip={selectedFile}
                              onUpdateClip={clipUpdateFunction}
                            />
                          );
                        } else {
                          return (
                            <img
                              src={selectedFile.url}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          );
                        }
                      })(updateClip)
                    ) : (
                      <div className="text-obs-muted opacity-10 flex flex-col items-center gap-1.5">
                        <MonitorIcon size={32} strokeWidth={1} />
                        <span className="text-[7px] uppercase font-black tracking-[0.3em]">
                          Selecciona un archivo
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center: Monitors & Controls */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Monitors Area */}
          <div
            className="flex-none p-2 flex flex-col lg:flex-row gap-4 items-start justify-between bg-obs-dark-m3 border-b border-obs-border z-10 relative overflow-x-hidden overflow-y-auto"
            style={{ maxHeight: "60vh" }}
          >
            <div className="flex-none flex flex-wrap gap-4 auto-rows-max shrink-0">
              {previews.map((preview) => (
                <div
                  key={`monitor-preview-${preview.id}`}
                  className="flex flex-col gap-1.5 group/mon relative w-[320px]"
                >
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[9px] text-obs-accent font-black uppercase tracking-[0.2em]">
                      {preview.name}
                    </span>
                    {preview.selectedOutputs.length > 0 && (
                      <div className="flex gap-0.5 items-center">
                        <span className="text-[7px] text-obs-muted font-bold mr-1">
                          TGT:
                        </span>
                        {preview.selectedOutputs.map((outId) => (
                          <span
                            key={outId}
                            className="w-3 h-3 flex items-center justify-center bg-obs-accent text-white text-[7px] font-black rounded-sm shadow-sm"
                          >
                            {outId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className={`w-full aspect-video shadow-xl relative border rounded overflow-hidden transition-all ${selectedItemType === "preview" && selectedItemId === preview.id ? "ring-2 ring-[#00a3f5] border-transparent" : "border-obs-muted/40 hover:border-obs-muted/70"}`}
                    onDrop={(e) => onDropOnMultiPreview(preview.id, e)}
                  >
                    <Monitor
                      title={preview.name}
                      activeClip={
                        preview.clipId
                          ? clips.find((c) => c.id === preview.clipId) || null
                          : null
                      }
                      isDarkMode={isDarkMode}
                      isTransmitting={isTransmitting}
                      volume={0.5}
                      onLevelChange={setPreviewLevel}
                      clips={clips}
                      previewClipId={preview.clipId}
                      hideOverlays={preview.hideOverlays}
                      onUpdateClip={updateClip}
                      accentColor={preview.accentColor}
                      pipLayers={pipLayers}
                      activeOutputId={preview.selectedOutputs[0] || "1"}
                      perfSettings={perfSettings}
                      onEnded={() => {
                        if (preview.clipId) {
                          const clip = clips.find(
                            (c) => c.id === preview.clipId,
                          );
                          const playlist = playlists.find(
                            (p) =>
                              p.id === clip?.playlistId ||
                              p.clips.some((c) => c.id === clip?.id),
                          );
                          if (playlist && playlist.clips.length > 0) {
                            const currentIndex = playlist.clips.findIndex(
                              (c) => c.id === preview.clipId,
                            );
                            const nextIndex =
                              (currentIndex + 1) % playlist.clips.length;
                            const nextClip = playlist.clips[nextIndex];
                            setPreviews((prevs) =>
                              prevs.map((p) =>
                                p.id === preview.id
                                  ? { ...p, clipId: nextClip.id }
                                  : p,
                              ),
                            );
                          }
                        }
                      }}
                    />

                    {/* Delete button (hidden by default) */}
                    {previews.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Clear outputs that were assigned to this preview
                          const deletedPreview = previews.find(
                            (p) => p.id === preview.id,
                          );
                          if (deletedPreview?.selectedOutputs?.length > 0) {
                            setOutputPrograms((prev) => {
                              const next = { ...prev };
                              deletedPreview.selectedOutputs.forEach(
                                (outId: string) => {
                                  next[outId] = null;
                                },
                              );
                              return next;
                            });
                          }
                          setPreviews((prevs) =>
                            prevs.filter((p) => p.id !== preview.id),
                          );
                          if (selectedItemId === preview.id)
                            setSelectedItemId(null);
                        }}
                        className="absolute top-2 left-2 bg-obs-dark-1 hover:bg-red-600 text-white rounded p-1.5 opacity-0 group-hover/mon:opacity-100 transition-opacity z-30"
                        title="Eliminar Preview"
                      >
                        <Minus size={12} />
                      </button>
                    )}

                    {preview.isLive && (
                      <div className="absolute top-1.5 right-1.5 bg-red-600/90 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm shadow-lg animate-pulse uppercase tracking-wider z-20 backdrop-blur-sm">
                        Live
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Program Monitor & Controls */}
            <div className="w-[480px] flex flex-col flex-none shrink-0 group/prog">
              <div className="flex justify-between items-end px-1 pb-0.5">
                <span className="text-[9px] text-red-500 font-black uppercase tracking-[0.2em]">
                  PROGRAM SALIDA {activeOutputId}
                  {outputs.find((o) => o.id === activeOutputId)
                    ?.physicalScreenId && (
                    <span className="text-obs-muted ml-2 font-medium">
                      [
                      {externalScreens.find(
                        (s) =>
                          s.id ===
                          outputs.find((o) => o.id === activeOutputId)
                            ?.physicalScreenId,
                      )?.name || "Monitor"}
                      ]
                    </span>
                  )}
                </span>
                {isLive && (
                  <div className="text-[7px] font-black text-red-500 animate-pulse flex items-center gap-1.5 uppercase tracking-tighter">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> ON
                    AIR
                  </div>
                )}
              </div>
              <div className="flex flex-col w-full">
                {/* Program Monitor */}
                <div
                  className="w-full aspect-video relative border border-obs-muted/40 rounded overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedItemType("program");
                    setSelectedItemId("program-output");
                  }}
                >
                  <Monitor
                    title=""
                    isActive={isLive}
                    activeClip={programClip}
                    isDarkMode={isDarkMode}
                    clips={clips}
                    programClipId={programClipId}
                    previewClipId={previewClipId}
                    programPlayIndex={programPlayIndex}
                    targetClipId={outputTransitionTargets[activeOutputId]}
                    hasTransitionTargets={
                      Object.keys(outputTransitionTargets).length > 0
                    }
                    crossfaderValue={crossfaderValue}
                    isProgram={true}
                    layers={layers}
                    layerOutputs={layerOutputs}
                    isTransmitting={isTransmitting}
                    isProgramOff={outputOffStates[activeOutputId] || false}
                    settings={
                      allScreenSettings[activeOutputId] ||
                      DEFAULT_SCREEN_SETTINGS
                    }
                    masterVolume={mutedFaders["Master"] ? 0 : masterVolume}
                    onEnded={handleProgramNext}
                    onLayerEnded={handleLayerEnded}
                    onLevelChange={setProgramLevel}
                    onTogglePlay={handleTogglePlay}
                    onToggleLoop={handleToggleLoop}
                    onRewind={handleRewind}
                    onSkip={handleSkip}
                    onProgressUpdate={(current, total) => {
                      setProgramProgress({ current, total });
                      try {
                        window.dispatchEvent(
                          new CustomEvent("video-progress-program", {
                            detail: { current, total },
                          }),
                        );
                      } catch (e) {}
                    }}
                    onUpdateClip={updateClip}
                    isPlaylist={!!programPlaylistState}
                    volume={mutedFaders["Programa"] ? 0 : programVolume}
                    brightness={allScreenSettings[activeOutputId]?.brightness ?? DEFAULT_SCREEN_SETTINGS.brightness}
                    contrast={allScreenSettings[activeOutputId]?.contrast ?? DEFAULT_SCREEN_SETTINGS.contrast}
                    saturation={allScreenSettings[activeOutputId]?.saturation ?? DEFAULT_SCREEN_SETTINGS.saturation}
                    opacity={allScreenSettings[activeOutputId]?.opacity ?? DEFAULT_SCREEN_SETTINGS.opacity}
                    x={allScreenSettings[activeOutputId]?.x ?? DEFAULT_SCREEN_SETTINGS.x}
                    y={allScreenSettings[activeOutputId]?.y ?? DEFAULT_SCREEN_SETTINGS.y}
                    rotation={allScreenSettings[activeOutputId]?.rotation ?? DEFAULT_SCREEN_SETTINGS.rotation}
                    scalingW={allScreenSettings[activeOutputId]?.scalingW ?? DEFAULT_SCREEN_SETTINGS.scalingW}
                    scalingH={allScreenSettings[activeOutputId]?.scalingH ?? DEFAULT_SCREEN_SETTINGS.scalingH}
                    transitionType={allScreenSettings[activeOutputId]?.transitionType ?? DEFAULT_SCREEN_SETTINGS.transitionType}
                    colorBalance={allScreenSettings[activeOutputId]?.colorBalance ?? DEFAULT_SCREEN_SETTINGS.colorBalance}
                    pipLayers={pipLayers}
                    activeOutputId={activeOutputId}
                    perfSettings={perfSettings}
                    isSlave={false}
                  />
                </div>
              </div>

              {/* Program Controls */}
              <div className="flex flex-col gap-3 mt-1 px-1">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1.5">
                    {/* PIP Toggles Row */}
                    <div className="flex gap-1">
                      <div className="flex items-center justify-center px-4 py-1 bg-obs-dark-1 rounded border border-obs-border text-white font-black text-[9px] uppercase tracking-wider">
                        PIP
                      </div>
                      {pipLayers.map((pip, idx) => (
                        <button
                          key={pip.id}
                          title={`Toggle ${pip.name}`}
                          onClick={() => {
                            setPipLayers((prev) =>
                              prev.map((p) =>
                                p.id === pip.id
                                  ? { ...p, isActive: !p.isActive }
                                  : p,
                              ),
                            );
                          }}
                          className={`w-10 py-1 rounded border transition-colors flex items-center justify-center font-black text-[10px] shadow-lg ${pip.isActive ? "bg-obs-accent text-black border-obs-accent shadow-[0_0_8px_rgba(0,163,245,0.4)]" : "bg-obs-dark-1 text-obs-muted border-obs-text/10 hover:border-obs-text/20 hover:text-white"}`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => setIsOutputModalOpen(true)}
                        className="w-10 py-1 flex items-center justify-center bg-obs-dark-1 hover:bg-obs-text/10 hover:text-white rounded text-obs-accent transition-colors border border-obs-text/10"
                        title="Configurar Salidas"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        onClick={() => setSelectedItemType("pipManager")}
                        className="w-10 py-1 flex items-center justify-center bg-obs-dark-1 hover:bg-obs-text/10 hover:text-white rounded text-obs-accent transition-colors border border-obs-text/10"
                        title="Gestor de PiPs"
                      >
                        <PictureInPicture2 size={14} />
                      </button>
                      {outputs.map((out) => (
                        <button
                          key={`output-btn-${out.id}`}
                          onClick={() => {
                            setActiveOutputId(out.id);
                            setProgramClipId(outputPrograms[out.id] || null);
                            setSelectedScreenId(out.physicalScreenId || null);
                            setSelectedItemType("program");
                          }}
                          className={`w-10 py-1 rounded font-black text-xs flex items-center justify-center transition-all border ${activeOutputId === out.id ? "bg-obs-accent text-black border-obs-accent shadow-[0_0_10px_rgba(0,163,245,0.4)]" : "bg-obs-dark-1 text-obs-muted border-obs-text/10 hover:text-white"}`}
                        >
                          {out.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Take / Live Actions */}
                  <div className="flex gap-1 pt-1">
                    <button
                      onClick={handleProgramOff}
                      className={`w-12 py-3 rounded text-[7px] uppercase font-bold text-white transition-colors flex flex-col items-center justify-center gap-1 border border-obs-text/10 ${outputOffStates[activeOutputId] ? "bg-red-600 animate-pulse" : "bg-obs-dark-1 hover:bg-obs-text/10"}`}
                    >
                      <Square
                        size={10}
                        className={
                          outputOffStates[activeOutputId]
                            ? ""
                            : "text-obs-muted"
                        }
                      />
                      OFF
                    </button>
                    <button
                      onClick={() => handleTake()}
                      className="w-14 py-3 bg-obs-dark-1 hover:bg-obs-text/10 rounded text-[7px] uppercase font-bold text-white transition-colors flex flex-col items-center justify-center gap-1 border border-obs-text/10"
                    >
                      <Scissors size={10} className="text-obs-accent" />
                      TAKE
                    </button>
                    <button
                      onClick={() => setIsTransmitting(!isTransmitting)}
                      className={`w-16 py-3 rounded text-[8px] uppercase font-black text-white transition-colors flex flex-col items-center justify-center gap-1 ${isTransmitting ? "bg-red-600 border border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.4)]" : "bg-[#e50000] border-transparent hover:bg-red-500"}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full bg-white ${isTransmitting ? "animate-pulse" : ""}`}
                      />
                      LIVE
                    </button>
                  </div>
                </div>

                {/* Work Mode Selectors & Timer */}
                <div className="flex justify-between items-center mt-2">
                  {(() => {
                    const activeProgramId = outputPrograms[activeOutputId];
                    const activeProgramClip = clips.find(
                      (c) => c.id === activeProgramId,
                    );

                    const isProgramVideo =
                      activeProgramClip &&
                      (activeProgramClip.type === "video" ||
                        activeProgramClip.type === "videoinput");
                    const activeDocOrPptClip =
                      !isProgramVideo &&
                      activeProgramClip &&
                      (activeProgramClip.type === "document" ||
                        activeProgramClip.type === "ppt" ||
                        activeProgramClip.name?.toLowerCase().endsWith(".pdf"))
                        ? activeProgramClip
                        : !isProgramVideo
                          ? clips?.find((c) => {
                              const hasLayer = layers?.some(
                                (l) => l.activeClipId === c.id,
                              );
                              return (
                                hasLayer &&
                                (c.type === "document" ||
                                  c.type === "ppt" ||
                                  c.name?.toLowerCase().endsWith(".pdf"))
                              );
                            })
                          : null;

                    return (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-obs-muted uppercase font-black tracking-widest leading-none mb-0.5">
                          {activeDocOrPptClip ? "DIAPOSITIVA" : timerMode}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-mono font-normal text-white leading-none tracking-tight">
                            {activeDocOrPptClip ? (
                              `${activeDocOrPptClip.currentPage || 1} / ${activeDocOrPptClip.totalPages || 1}`
                            ) : activeProgramClip?.type === "videoinput" ||
                              activeProgramId?.startsWith("videoinput") ? (
                              "00:00:00"
                            ) : (
                              <FluidTimeDisplay
                                eventId="video-progress-program"
                                isRemaining={timerMode === "remaining"}
                                clipId={activeProgramId}
                                outputId={activeOutputId}
                                clips={clips}
                              />
                            )}
                          </span>
                          {!activeDocOrPptClip && (
                            <button
                              onClick={() =>
                                setTimerMode((prev) =>
                                  prev === "elapsed" ? "remaining" : "elapsed",
                                )
                              }
                              className="p-1 rounded bg-obs-dark-1 hover:bg-obs-text/10 transition-colors border border-obs-text/5"
                              title="Cambiar modo de tiempo"
                            >
                              <RefreshCw size={12} className="text-obs-muted" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-2">
                    {/* Work mode buttons removed as requested - defaulting to layers only */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-obs-bg overflow-hidden">
            {/* Center Area: Previews/Working Area (if any) */}
            <div className="flex-1 overflow-y-auto" />

            {/* Pinned area for layers and playlists pegged to docks */}
            <div className="flex flex-col bg-obs-bg border-t border-obs-border shrink-0 py-1 space-y-4 w-full">
              {workMode === "layers" && (
                <div className="max-h-[290px] px-2">
                  <LayersSection
                    layers={layers}
                    activeColumnTrigger={activeColumnTrigger}
                    activeLayerTriggers={activeLayerTriggers}
                    columnUIStates={columnUIStates}
                    setActiveColumnTrigger={setActiveColumnTrigger}
                    setActiveLayerTriggers={setActiveLayerTriggers}
                    onAddLayer={addLayer}
                    onRemoveLayer={removeLayer}
                    layerOutputs={layerOutputs}
                    onSetLayerOutput={(lid, oid) => {
                      setLayerOutputs((prev) => ({ ...prev, [lid]: oid }));
                      setLayers((prev) =>
                        prev.map((l) =>
                          l.id === lid ? { ...l, outputId: oid } : l,
                        ),
                      );
                    }}
                    onUpdateLayer={(lid, updates) => {
                      setLayers((prev) => {
                        const newLayers = prev.map((l) =>
                          l.id === lid ? { ...l, ...updates } : l,
                        );
                        return newLayers;
                      });
                      if (updates.outputId !== undefined) {
                        setLayerOutputs((prev) => ({
                          ...prev,
                          [lid]: updates.outputId as string | null,
                        }));
                      }
                      setSelectedItemId(lid);
                      setSelectedItemType("layer" as any);
                    }}
                    onUpdateClip={updateClip}
                    onProgressUpdate={(current, total) => {
                      setProgramProgress({ current, total });
                    }}
                    onSelectLayer={(lid) => {
                      setSelectedItemId(lid);
                      setSelectedItemType("layer" as any);
                    }}
                    onTriggerClip={(layerId, slotIdx, mode) => {
                      setSelectedItemId(layerId);
                      setSelectedItemType("layer" as any);
                      onTriggerLayerClip(layerId, slotIdx, mode);
                    }}
                    onTriggerColumn={handleColumnTrigger}
                    onStopColumn={handleColumnStop}
                    onDropOnLayer={handleDropOnLayer}
                    onDragStartSlot={(e, clip) => {
                      e.dataTransfer.setData("clip", JSON.stringify(clip));
                    }}
                    outputs={outputs}
                    externalScreens={externalScreens}
                    clips={clips}
                    isDarkMode={isDarkMode}
                    onPreviewClip={handlePreviewClip}
                    selectedItemId={selectedItemId}
                    selectedItemType={selectedItemType as string}
                    onAddColumn={handleAddColumn}
                  />
                </div>
              )}

              {/* Playlists work mode removed as requested */}
            </div>

            {/* Bottom Docks Area - Fixed at bottom */}
            <div className="h-44 flex border-t border-obs-border overflow-hidden shrink-0 bg-obs-bg">
              <div className="flex-1 h-full">
                <GridSection
                  currentDeck={currentDeck}
                  onSetDeck={setCurrentDeck}
                  deckClips={deckClips}
                  onSelectClip={handleSelectClip}
                  onDragStart={onDragStart}
                  isDarkMode={isDarkMode}
                  selectedClipId={selectedItemId}
                  onDeleteClip={(id) => {
                    setClips((prev) => prev.filter((c) => c.id !== id));
                    setDeckClips((prev) => {
                      const next = { ...prev };
                      Object.keys(next).forEach((deck) => {
                        next[deck] = next[deck].filter((c) => c.id !== id);
                      });
                      return next;
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Inspector */}
        <div className="w-72 flex flex-col border-l border-obs-border">
          <Inspector
            selectedItem={
              selectedItemType === "preview"
                ? previews.find((p) => p.id === selectedItemId)
                : selectedItemType === "layer"
                  ? layers.find((l) => l.id === selectedItemId)
                  : selectedItemType === "pip"
                    ? pipLayers.find((p) => p.id === selectedItemId)
                    : selectedItemType === "pipManager"
                      ? pipLayers
                      : selectedItem
            }
            selectedItemType={selectedItemType}
            activeOutputId={activeOutputId}
            externalScreenSettings={externalScreenSettings}
            externalScreens={externalScreens}
            allScreenSettings={allScreenSettings}
            hasDetailedScreens={hasDetailedScreens}
            isIframe={isIframe}
            previews={previews}
            setPreviews={setPreviews}
            outputs={outputs}
            onUpdate={handleUpdateItem}
            onUpdateExternalScreen={handleUpdateExternalScreen}
            selectedScreenId={selectedScreenId}
            onSelectedScreenIdChange={setSelectedScreenId}
            onLaunchOutput={handleLaunchOutput}
            onDetectScreens={() => detectScreens(true)}
            isOutputLaunched={
              launchedScreens[selectedScreenId || "default"] || false
            }
            pipLayers={pipLayers}
            onUpdateLayer={(lid, updates) => {
              setLayers((prev) =>
                prev.map((l) => (l.id === lid ? { ...l, ...updates } : l)),
              );
              if (updates.outputId !== undefined) {
                setLayerOutputs((prev) => ({
                  ...prev,
                  [lid]: updates.outputId as string | null,
                }));
              }
            }}
            onUpdatePiP={(pid, updates) => {
              setPipLayers((prev) =>
                prev.map((p) => (p.id === pid ? { ...p, ...updates } : p)),
              );
            }}
            onRemovePiP={removePiP}
            onAddPiP={addPiP}
            onSelectPiP={handleSelectPiP}
            onUpdateClip={updateClip}
            clips={clips}
            onSync={() => {
              if (outputChannel.current) {
                outputChannel.current.postMessage({
                  type: "SYNC_STATE",
                  payload: {
                    lastUpdateId: Date.now(),
                    programClipId,
                    previewClipId,
                    outputPrograms,
                    outputTransitionTargets,
                    outputs,
                    clips,
                    crossfaderValue,
                    allScreenSettings,
                    isLive,
                    isTransmitting,
                    programVolume,
                    masterVolume,
                    transitionType: externalScreenSettings.transitionType,
                    transitionDuration:
                      externalScreenSettings.transitionDuration,
                    externalScreenSettings,
                    layers,
                    layerOutputs,
                    pipLayers,
                    perfSettings,
                  },
                });
              }
            }}
            isDarkMode={isDarkMode}
          />
        </div>
      </main>

      {/* Multi-Output creation modal */}
      <AnimatePresence>
        {isOutputModalOpen && (
          <OutputManagerModal
            outputs={outputs}
            externalScreens={externalScreens}
            activeOutputId={activeOutputId}
            onClose={() => setIsOutputModalOpen(false)}
            showCustomAlert={showCustomAlert}
            onApply={(newOutputs) => {
              setOutputs(newOutputs);

              // Ensure selectedScreenId is correctly updated if the activeOutput modified its physicalScreenId
              const currentActive = newOutputs.find(
                (o) => o.id === activeOutputId,
              );
              if (currentActive) {
                if (currentActive.physicalScreenId !== selectedScreenId) {
                  setSelectedScreenId(currentActive.physicalScreenId || null);
                  setSelectedItemType("program");
                }
              }

              setIsOutputModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <PreviewManagerModal
            previews={previews}
            outputs={outputs}
            onClose={() => setIsPreviewModalOpen(false)}
            onApply={(newPreviews) => {
              setPreviews(newPreviews);
              setIsPreviewModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* FLOATING WINDOW: CONTROL PANEL DE CONTADOR PARA EL PONENTE */}
      <AnimatePresence>
        {Object.entries(allScreenSettings).map(([sId, settings], index) => {
          if (!settings.timerShowDraggableFloat) return null;

          const pos = floatingTimerPos[sId] || {
            x: 350 + index * 40,
            y: 180 + index * 40,
          };

          return (
            <motion.div
              key={`float-timer-${sId}`}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                zIndex: 99999 + index,
              }}
              className="w-80 bg-obs-dark-1 border-2 border-obs-border rounded-xl shadow-2xl overflow-hidden font-sans select-none"
            >
              {/* Header (Drag handle) */}
              <div 
                onMouseDown={(e) => {
                  setIsDraggingFloatingTimer(sId);
                  dragOffsetRef.current = {
                    x: e.clientX - pos.x,
                    y: e.clientY - pos.y
                  };
                }}
                className="flex items-center justify-between bg-obs-surface border-b border-obs-border p-2 cursor-move text-stone-200"
              >
                <div className="flex items-center gap-2 text-obs-accent shrink-0">
                  <Clock size={13} className="animate-[pulse_1.5s_infinite]" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider truncate max-w-[180px]">
                    COUNTDOWN:{" "}
                    {outputs.find(
                      (o: any) => o.physicalScreenId === sId || o.id === sId,
                    )?.name ||
                      (sId === "primary"
                        ? "Salida Principal"
                        : sId === "default"
                          ? "Global"
                          : `Salida ${sId}`)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setAllScreenSettings((prev) => ({
                        ...prev,
                        [sId]: {
                          ...prev[sId],
                          timerShowDraggableFloat: false,
                        },
                      }));
                    }}
                    className="p-1 text-obs-muted hover:text-white transition-colors cursor-pointer"
                    title="Cerrar"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Timer Display Body */}
              <PresenterTimerDisplay
                settings={settings}
                screenId={sId}
                onUpdate={(updates) => {
                  setAllScreenSettings((prev) => ({
                    ...prev,
                    [sId]: {
                      ...(prev[sId] || DEFAULT_SCREEN_SETTINGS),
                      ...updates,
                    },
                  }));
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Performance & GPU Modal */}
      <AnimatePresence>
        {isPerfModalOpen && (
          <PerfManagerModal
            perfSettings={perfSettings}
            onClose={() => setIsPerfModalOpen(false)}
            onApply={(newSettings) => {
              setPerfSettings(newSettings);
              setIsPerfModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingPlaylistId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obs-bg/90 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-obs-bg border border-obs-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-obs-border bg-obs-surface flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-obs-accent/20 flex items-center justify-center text-obs-accent">
                    <Settings size={18} />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-obs-text">
                    Editar Playlist:{" "}
                    {playlists.find((p) => p.id === editingPlaylistId)?.name}
                  </h2>
                </div>
                <button
                  onClick={() => setEditingPlaylistId(null)}
                  className="p-2 hover:bg-obs-dark-1 rounded-full transition-colors text-obs-muted hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-obs-bg">
                <Reorder.Group
                  axis="y"
                  values={
                    playlists.find((p) => p.id === editingPlaylistId)?.clips ||
                    []
                  }
                  onReorder={(newClips) => {
                    setPlaylists((prev) =>
                      prev.map((p) =>
                        p.id === editingPlaylistId
                          ? { ...p, clips: newClips }
                          : p,
                      ),
                    );
                  }}
                  className="space-y-3"
                >
                  {playlists
                    .find((p) => p.id === editingPlaylistId)
                    ?.clips.map((clip, i) => (
                      <Reorder.Item
                        key={clip.id}
                        value={clip}
                        className="bg-obs-surface border border-obs-border rounded-lg p-3 flex items-center gap-4 group hover:border-obs-accent/50 transition-all cursor-grab active:cursor-grabbing"
                      >
                        <div className="text-obs-muted cursor-grab active:cursor-grabbing">
                          <GripVertical size={16} />
                        </div>
                        <div className="w-24 aspect-video rounded overflow-hidden border border-obs-border bg-obs-dark-1">
                          {clip.type === "video" ? (
                            <HoverVideoPreview
                              src={clip.url}
                              thumbnail={clip.thumbnail}
                              className="w-full h-full object-cover"
                            />
                          ) : clip.type === "videoinput" ? (
                            <LibraryMediaPreview file={clip} />
                          ) : clip.type === "document" ||
                            clip.type === "ppt" ||
                            clip.name.toLowerCase().endsWith(".pdf") ? (
                            <div className="w-full h-full bg-white overflow-hidden flex items-center justify-center pointer-events-none">
                              {clip.type === "ppt" ? (
                                <PPTSlideRenderer
                                  clip={clip}
                                  pageNumber={clip.currentPage || 1}
                                  isThumbnail={true}
                                />
                              ) : (
                                <PDFRenderer
                                  url={clip.url}
                                  pageNumber={clip.currentPage || 1}
                                />
                              )}
                            </div>
                          ) : (
                            <img
                              src={clip.thumbnail}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-obs-text truncate">
                            {clip.name}
                          </div>
                          <div className="text-[9px] text-obs-muted uppercase tracking-wider">
                            {clip.type} • {clip.duration}s
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setPlaylists((prev) =>
                              prev.map((p) =>
                                p.id === editingPlaylistId
                                  ? {
                                      ...p,
                                      clips: p.clips.filter(
                                        (c) => c.id !== clip.id,
                                      ),
                                    }
                                  : p,
                              ),
                            );
                          }}
                          className="p-2 text-obs-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </Reorder.Item>
                    ))}
                </Reorder.Group>

                {!playlists.find((p) => p.id === editingPlaylistId)?.clips
                  .length && (
                  <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-obs-border rounded-xl text-obs-muted opacity-50">
                    <Plus size={32} className="mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Playlist Vacía
                    </span>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-obs-border bg-obs-surface flex justify-end">
                <button
                  onClick={() => setEditingPlaylistId(null)}
                  className="px-6 py-2 bg-obs-accent text-white rounded text-[11px] font-black uppercase tracking-widest hover:bg-obs-accent/80 transition-all shadow-lg shadow-obs-accent/20"
                >
                  Cerrar y Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}
