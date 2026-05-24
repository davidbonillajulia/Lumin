# LUMIN Media Server: Architecture & Design Specification

**Author:** Senior Multimedia Architect  
**Date:** March 26, 2026  
**Status:** Draft / Proposal

---

## 1. Technology Stack Recommendation

To achieve ultra-low latency and high-throughput video processing (multiple 4K streams), we recommend the following stack:

*   **Core Language:** **C++20** (for deterministic memory management and high-performance SIMD operations).
*   **UI Framework:** **JUCE** (preferred for its excellent audio/video synchronization and cross-platform window management) or **Qt 6**.
*   **Graphics API:** **Vulkan** (preferred for multi-threaded command buffer submission) or **OpenGL 4.5+** (for easier integration with legacy shaders).
*   **Video Decoding:** 
    *   **FFmpeg (libavcodec):** For H.264/H.265 hardware-accelerated decoding (NVDEC/QuickSync).
    *   **Native HAP Support:** Custom Snappy-based decompressor that uploads DXT-compressed textures directly to the GPU.
*   **Electron Wrapper:** Used for the desktop interface, providing deep Win32 API access and hardware acceleration flags.

---

## 2. Windows Native Core Bridge (Bypass Engine)

To achieve maximum performance and bypass the overhead of the Chromium rendering engine (HTML/CSS layout engine), LUMIN includes a **Native Core Bridge** written in **C++ and Rust**.

### Architecture Overview:
1.  **Frontend (Electron/React):** Handles the complex UI, library management, and user interaction.
2.  **OS-Independent Scheduler (Rust):** A high-priority system thread that manages the frame pacing and ensures constant 60fps presentation regardless of UI complexity.
3.  **Hardware Video Decoder (C++/FFmpeg):** Uses **NVDEC (Nvidia Codec SDK)** or **QuickSync (Intel)** to decode video streams directly in VRAM. This avoids copying frame data back to system RAM.
4.  **DirectX 12 Swapchain (C++):** A dedicated Win32 window attachment that receives decoded buffers from NVDEC and presents them to the screen using a triple-buffering flip-discard swapchain.

### Implementation Status:
- [x] **Electron Hardware Flags:** Configured in `electron/main.cjs` to force GPU rasterization and zero-copy transfers.
- [x] **Telemetry Integration:** Real-time monitoring of VRAM and GPU decoder state.
- [x] **Native Source Boilerplates:** Provided in `win32_native/` for rapid compilation on Windows 10/11 using Visual Studio 2022 and Cargo.

---

## 3. Processing Logic (Data Flow)

The system follows a "Pull-based" architecture driven by the Output Refresh Rate (VSync).

### Flow Diagram:
1.  **Disk/Network:** Asynchronous I/O reads encoded packets into a ring buffer.
2.  **Decoder Thread:** 
    *   *HAP:* Extracts DXT chunks.
    *   *H.264:* Decodes to NV12/YUV420p via Hardware.
3.  **GPU Upload:** 
    *   HAP textures are uploaded as `COMPRESSED_RGBA_S3TC_DXT5_EXT`.
    *   YUV frames are uploaded as separate planes and converted to RGB via a **Compute Shader**.
4.  **Composition Pipeline (The Canvas):**
    *   Each **Layer** is rendered to an Offscreen Framebuffer (FBO).
    *   **Mask Shader:** Multiplies Layer Texture by Alpha Mask Texture.
    *   **Effect Shaders:** Sequential passes for Blur, Color Correction, etc.
    *   **Blending Shader:** Final pass that composites all layers onto the **Master Canvas** using standard blend equations (Add, Multiply, etc.).
5.  **Output:** The Master Canvas is sampled and sent to physical Display Outputs or NDI Encoders.

---

## 3. Structural UI Mockup (Logic)

The interface follows a **Contextual Inspector** pattern to minimize clutter:

*   **Deck (Top):** 8x8 Grid of clips. Each cell is a "Slot".
*   **Monitors (Middle):** 
    *   *Preview:* Shows the clip selected in the Inspector.
    *   *Program:* Shows the final output of the Master Canvas.
*   **Inspector (Bottom):** Only visible when a clip or layer is selected. Contains:
    *   *Transform:* X, Y, Scale, Rotation (GPU Uniforms).
    *   *Mask:* Drag-and-drop slot for PNG/Shape masks.
    *   *Effects:* Stack of GLSL-based filters.
*   **Output Manager (Sidebar):** Quick toggles for physical and virtual outputs.

---

## 4. Initial Pseudocode (Core Engine)

```cpp
// PlaybackEngine.h - Core logic for a single video stream
class PlaybackEngine {
public:
    struct Transform {
        float x, y, scale, rotation;
    };

    void loadSource(const std::string& path) {
        if (isHapCodec(path)) {
            decoder = std::make_unique<HapDecoder>(path);
        } else {
            decoder = std::make_unique<HWAccelDecoder>(path);
        }
    }

    // Called every frame by the Render Thread
    void updateTexture(GLuint textureId) {
        auto frame = decoder->getNextFrame();
        if (frame.isCompressed()) {
            // Direct GPU upload for HAP
            glCompressedTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, w, h, 
                                     frame.format, frame.size, frame.data);
        } else {
            // Upload YUV planes and trigger conversion shader
            uploadYUVToGPU(frame);
        }
    }

private:
    std::unique_ptr<BaseDecoder> decoder;
};

// LayerManager.h - Compositing logic
class LayerManager {
public:
    void composite(GLuint targetFbo) {
        glBindFramebuffer(GL_FRAMEBUFFER, targetFbo);
        glClear(GL_COLOR_BUFFER_BIT);

        for (auto& layer : layers) {
            if (!layer.active) continue;

            // 1. Update Layer Texture
            layer.engine->updateTexture(layer.texId);

            // 2. Apply Shaders (Transform, Mask, Effects)
            shaderProgram.use();
            shaderProgram.setUniform("u_transform", layer.transform);
            shaderProgram.setUniform("u_opacity", layer.opacity);
            shaderProgram.setUniform("u_blendMode", layer.blendMode);
            
            drawFullScreenQuad(layer.texId, layer.maskId);
        }
    }

private:
    std::vector<Layer> layers;
    Shader compositionShader;
};
```

---

## 5. Implementation Recommendations

1.  **Zero-Copy Path:** Use `DMA-BUF` (Linux) or `DirectComposition` (Windows) to share textures between the decoder and the renderer without CPU round-trips.
2.  **Thread Isolation:** Keep the UI thread (JUCE/Qt) completely separate from the Render thread and the Decoding threads to prevent UI freezes during heavy load.
3.  **HAP Optimization:** Since HAP is DXT-based, ensure your GPU pipeline supports `S3TC` compression to avoid decompressing on the CPU.
