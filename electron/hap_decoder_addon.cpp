// hap_decoder_addon.cpp
// Native C++ Node Addon (N-API) for ultra-low latency HAP (.mov) video demuxing and DXT extraction.
// Bypasses CPU DXT decoding, sending raw DXT1/DXT5 textures directly to WebGL.

#include <node_api.h>
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <mutex>
#include <cstdint>
#include <cstring>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/avutil.h>
}

// ============================================================================
// 1. Light, self-contained Snappy decompressor
// ============================================================================
bool snappy_uncompress(const uint8_t* compressed, size_t compressed_length, std::vector<uint8_t>& uncompressed) {
    if (compressed_length == 0) return false;
    
    size_t ip = 0;
    
    // Read uncompressed length (varint)
    uint32_t shift = 0;
    uint32_t uncompressed_length = 0;
    while (ip < compressed_length) {
        uint8_t c = compressed[ip++];
        uncompressed_length |= static_cast<uint32_t>(c & 0x7F) << shift;
        if ((c & 0x80) == 0) break;
        shift += 7;
        if (shift >= 32) return false;
    }
    
    uncompressed.resize(uncompressed_length);
    if (uncompressed_length == 0) return true;
    
    size_t op = 0;
    while (ip < compressed_length) {
        uint8_t tag = compressed[ip++];
        if ((tag & 3) == 0) {
            // Literal
            size_t len = (tag >> 2) + 1;
            if (len > 60) {
                size_t bytes_to_read = len - 60;
                len = 0;
                for (size_t i = 0; i < bytes_to_read; ++i) {
                    if (ip >= compressed_length) return false;
                    len |= static_cast<size_t>(compressed[ip++]) << (i * 8);
                }
                len += 1;
            }
            if (ip + len > compressed_length || op + len > uncompressed_length) return false;
            std::memcpy(&uncompressed[op], &compressed[ip], len);
            ip += len;
            op += len;
        } else {
            // Copy
            size_t len = 0;
            size_t offset = 0;
            if ((tag & 3) == 1) {
                len = ((tag >> 2) & 7) + 4;
                offset = ((tag & 0xE0) << 3) | compressed[ip++];
            } else if ((tag & 3) == 2) {
                len = (tag >> 2) + 1;
                if (ip + 2 > compressed_length) return false;
                offset = compressed[ip] | (compressed[ip + 1] << 8);
                ip += 2;
            } else if ((tag & 3) == 3) {
                len = (tag >> 2) + 1;
                if (ip + 4 > compressed_length) return false;
                offset = compressed[ip] | (compressed[ip + 1] << 8) | (compressed[ip + 2] << 16) | (compressed[ip + 3] << 24);
                ip += 4;
            }
            if (offset == 0 || offset > op || op + len > uncompressed_length) return false;
            
            // Fast copy
            for (size_t i = 0; i < len; ++i) {
                uncompressed[op + i] = uncompressed[op - offset + i];
            }
            op += len;
        }
    }
    return op == uncompressed_length;
}

// ============================================================================
// 2. Decoder Context
// ============================================================================
struct HapDecoderInstance {
    AVFormatContext* format_ctx = nullptr;
    int video_stream_idx = -1;
    AVCodecContext* codec_ctx = nullptr;
    
    int width = 0;
    int height = 0;
    int64_t frame_count = 0;
    double fps = 0.0;
    std::string codec_name = "hap";
    
    // Instant frame index cache for ultra-fast seek (Required for VJ loops)
    struct FramePos {
        int64_t pts;
        int64_t dts;
        int64_t pos;
        int size;
    };
    std::vector<FramePos> frames;
    
    std::mutex mtx;
};

static std::unordered_map<int, HapDecoderInstance*> g_instances;
static int g_next_handle = 1;
static std::mutex g_instances_mtx;

// ============================================================================
// Helper to extract clean error messages
// ============================================================================
void throw_napi_error(napi_env env, const char* message) {
    napi_throw_error(env, nullptr, message);
}

// ============================================================================
// Addon Function: Open File
// ============================================================================
napi_value HapOpen(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (argc < 1) {
        throw_napi_error(env, "File path argument is required.");
        return nullptr;
    }
    
    char file_path[1024];
    size_t path_len;
    napi_get_value_string_utf8(env, args[0], file_path, sizeof(file_path), &path_len);
    
    // Prevent double registering
    #if LIBAVCODEC_VERSION_INT < AV_VERSION_INT(58, 9, 100)
    static bool av_registered = false;
    if (!av_registered) {
        av_register_all();
        av_registered = true;
    }
    #endif
    
    AVFormatContext* format_ctx = nullptr;
    if (avformat_open_input(&format_ctx, file_path, nullptr, nullptr) != 0) {
        throw_napi_error(env, "Failed to open video file. Ensure the path is correct.");
        return nullptr;
    }
    
    if (avformat_find_stream_info(format_ctx, nullptr) < 0) {
        avformat_close_input(&format_ctx);
        throw_napi_error(env, "Failed to retrieve stream info from video.");
        return nullptr;
    }
    
    int video_stream_idx = -1;
    for (unsigned int i = 0; i < format_ctx->nb_streams; i++) {
        if (format_ctx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
            video_stream_idx = i;
            break;
        }
    }
    
    if (video_stream_idx == -1) {
        avformat_close_input(&format_ctx);
        throw_napi_error(env, "No video stream found in the file.");
        return nullptr;
    }
    
    AVCodecParameters* codec_par = format_ctx->streams[video_stream_idx]->codecpar;
    
    // Verify codec is HAP (FFmpeg tag 'hap ', 'hapa', 'hapq')
    // We can also allow standard codecs if needed, but our purpose is HAP!
    char codec_tag_str[32] = {0};
    av_get_codec_tag_string(codec_tag_str, sizeof(codec_tag_str), codec_par->codec_tag);
    
    HapDecoderInstance* instance = new HapDecoderInstance();
    instance->format_ctx = format_ctx;
    instance->video_stream_idx = video_stream_idx;
    instance->width = codec_par->width;
    instance->height = codec_par->height;
    instance->codec_name = codec_tag_str;
    
    AVStream* stream = format_ctx->streams[video_stream_idx];
    if (stream->nb_frames > 0) {
        instance->frame_count = stream->nb_frames;
    } else {
        // Estimate frames based on duration and FPS
        double duration = (double)format_ctx->duration / AV_TIME_BASE;
        double calculated_fps = av_q2d(stream->avg_frame_rate);
        if (calculated_fps > 0) {
            instance->frame_count = (int64_t)(duration * calculated_fps);
        }
    }
    
    instance->fps = av_q2d(stream->avg_frame_rate);
    if (instance->fps <= 0) {
        instance->fps = av_q2d(stream->r_frame_rate);
    }
    if (instance->fps <= 0) {
        instance->fps = 30.0; // Default fallback
    }
    
    // Quick index generation for instant VJ lookup
    // Traverse the file to cache packet positions so we have constant-time seeking
    AVPacket pkt;
    av_init_packet(&pkt);
    int64_t current_pts = 0;
    while (av_read_frame(format_ctx, &pkt) == 0) {
        if (pkt.stream_index == video_stream_idx) {
            HapDecoderInstance::FramePos fp;
            fp.pts = pkt.pts;
            fp.dts = pkt.dts;
            fp.pos = pkt.pos;
            fp.size = pkt.size;
            instance->frames.push_back(fp);
        }
        av_packet_unref(&pkt);
    }
    
    if (instance->frames.empty()) {
        // Fallback if read loop failed
        avformat_close_input(&format_ctx);
        delete instance;
        throw_napi_error(env, "Failed to read packets or file is empty.");
        return nullptr;
    }
    
    instance->frame_count = instance->frames.size();
    
    // Store handle
    int handle;
    {
        std::lock_guard<std::mutex> lock(g_instances_mtx);
        handle = g_next_handle++;
        g_instances[handle] = instance;
    }
    
    // Return details to JS
    napi_value result, val_handle, val_width, val_height, val_frame_count, val_fps, val_codec;
    napi_create_object(env, &result);
    
    napi_create_int32(env, handle, &val_handle);
    napi_create_int32(env, instance->width, &val_width);
    napi_create_int32(env, instance->height, &val_height);
    napi_create_int64(env, instance->frame_count, &val_frame_count);
    napi_create_double(env, instance->fps, &val_fps);
    napi_create_string_utf8(env, instance->codec_name.c_str(), NAPI_AUTO_LENGTH, &val_codec);
    
    napi_set_named_property(env, result, "handle", val_handle);
    napi_set_named_property(env, result, "width", val_width);
    napi_set_named_property(env, result, "height", val_height);
    napi_set_named_property(env, result, "frameCount", val_frame_count);
    napi_set_named_property(env, result, "fps", val_fps);
    napi_set_named_property(env, result, "codec", val_codec);
    
    return result;
}

// ============================================================================
// Addon Function: Get Frame (Decompresses and returns raw DXT blocks)
// ============================================================================
napi_value HapGetFrame(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (argc < 2) {
        throw_napi_error(env, "Handle and frameIndex are required.");
        return nullptr;
    }
    
    int handle;
    napi_get_value_int32(env, args[0], &handle);
    
    int64_t frame_index;
    napi_get_value_int64(env, args[1], &frame_index);
    
    HapDecoderInstance* instance = nullptr;
    {
        std::lock_guard<std::mutex> lock(g_instances_mtx);
        auto it = g_instances.find(handle);
        if (it != g_instances.end()) {
            instance = it->second;
        }
    }
    
    if (!instance) {
        throw_napi_error(env, "Invalid decoder handle.");
        return nullptr;
    }
    
    std::lock_guard<std::mutex> lock(instance->mtx);
    
    if (frame_index < 0 || frame_index >= (int64_t)instance->frames.size()) {
        throw_napi_error(env, "Frame index out of bounds.");
        return nullptr;
    }
    
    const auto& frame_info = instance->frames[frame_index];
    
    // Seek and read exactly this frame packet
    FILE* file = nullptr;
#ifdef _WIN32
    // Windows FFmpeg format context is backed by files, but we can open file safely
    file = fopen(instance->format_ctx->url, "rb");
#else
    file = fopen(instance->format_ctx->url, "rb");
#endif
    
    if (!file) {
        throw_napi_error(env, "Failed to read video frame on disk.");
        return nullptr;
    }
    
    // Position to frame packet offset
#ifdef _WIN32
    _fseeki64(file, frame_info.pos, SEEK_SET);
#else
    fseeko(file, frame_info.pos, SEEK_SET);
#endif
    
    std::vector<uint8_t> packet_data(frame_info.size);
    size_t bytes_read = fread(packet_data.data(), 1, frame_info.size, file);
    fclose(file);
    
    if (bytes_read != (size_t)frame_info.size) {
        throw_napi_error(env, "Truncated frame read from disk.");
        return nullptr;
    }
    
    // ========================================================================
    // Parse HAP Frame Header
    // ========================================================================
    if (packet_data.size() < 4) {
        throw_napi_error(env, "HAP packet too small.");
        return nullptr;
    }
    
    size_t header_len = 0;
    uint32_t section_len = 0;
    
    // The first 3 bytes are section size, unless they are 0
    uint32_t size_val = (packet_data[0] << 16) | (packet_data[1] << 8) | packet_data[2];
    uint8_t type_byte = 0;
    
    if (size_val == 0) {
        // Size is 4 bytes at offset 4
        if (packet_data.size() < 8) {
            throw_napi_error(env, "Invalid HAP 8-byte header.");
            return nullptr;
        }
        section_len = (packet_data[3] << 24) | (packet_data[4] << 16) | (packet_data[5] << 8) | packet_data[6];
        type_byte = packet_data[7];
        header_len = 8;
    } else {
        section_len = size_val;
        type_byte = packet_data[3];
        header_len = 4;
    }
    
    uint8_t section_type = type_byte & 0x0F;
    uint8_t compressor = (type_byte & 0xF0) >> 4;
    
    const uint8_t* payload_ptr = packet_data.data() + header_len;
    size_t payload_len = packet_data.size() - header_len;
    
    std::vector<uint8_t> dxt_data;
    
    // Compressor 0x0A = Raw DXT blocks, 0x0B = Snappy compressed DXT blocks
    if (compressor == 0x0B) {
        if (!snappy_uncompress(payload_ptr, payload_len, dxt_data)) {
            throw_napi_error(env, "Snappy decompression failed for HAP frame.");
            return nullptr;
        }
    } else if (compressor == 0x0A) {
        dxt_data.assign(payload_ptr, payload_ptr + payload_len);
    } else {
        throw_napi_error(env, "Unsupported HAP frame compression format.");
        return nullptr;
    }
    
    // Format mapping for WebGL gl.compressedTexImage2D:
    // DXT1 = COMPRESSED_RGB_S3TC_DXT1_EXT (0x83F0) or COMPRESSED_RGBA_S3TC_DXT1_EXT (0x83F1)
    // DXT5 = COMPRESSED_RGBA_S3TC_DXT5_EXT (0x83F3)
    uint32_t gl_format = 0x83F3; // Default to DXT5
    if (section_type == 0x01) {
        gl_format = 0x83F1; // DXT1 RGBA
    } else if (section_type == 0x0F) {
        gl_format = 0x83F3; // DXT5 RGBA
    } else if (section_type == 0x0C) {
        gl_format = 0x83F3; // YCoCg DXT5 (decodes using custom shader, but format is same)
    }
    
    // Return Javascript Buffer containing the S3TC texture payload
    napi_value js_buffer;
    void* buffer_data = nullptr;
    napi_create_buffer_copy(env, dxt_data.size(), dxt_data.data(), &buffer_data, &js_buffer);
    
    napi_value result, val_format;
    napi_create_object(env, &result);
    napi_create_uint32(env, gl_format, &val_format);
    
    napi_set_named_property(env, result, "data", js_buffer);
    napi_set_named_property(env, result, "format", val_format);
    
    return result;
}

// ============================================================================
// Addon Function: Close File
// ============================================================================
napi_value HapClose(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    
    if (argc < 1) {
        return nullptr;
    }
    
    int handle;
    napi_get_value_int32(env, args[0], &handle);
    
    HapDecoderInstance* instance = nullptr;
    {
        std::lock_guard<std::mutex> lock(g_instances_mtx);
        auto it = g_instances.find(handle);
        if (it != g_instances.end()) {
            instance = it->second;
            g_instances.erase(it);
        }
    }
    
    if (instance) {
        std::lock_guard<std::mutex> lock(instance->mtx);
        if (instance->format_ctx) {
            avformat_close_input(&instance->format_ctx);
        }
        delete instance;
    }
    
    return nullptr;
}

// ============================================================================
// Module Registration
// ============================================================================
napi_value Init(napi_env env, napi_value exports) {
    napi_value open_fn, get_frame_fn, close_fn;
    
    napi_create_function(env, "open", NAPI_AUTO_LENGTH, HapOpen, nullptr, &open_fn);
    napi_create_function(env, "getFrame", NAPI_AUTO_LENGTH, HapGetFrame, nullptr, &get_frame_fn);
    napi_create_function(env, "close", NAPI_AUTO_LENGTH, HapClose, nullptr, &close_fn);
    
    napi_set_named_property(env, exports, "open", open_fn);
    napi_set_named_property(env, exports, "getFrame", get_frame_fn);
    napi_set_named_property(env, exports, "close", close_fn);
    
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
