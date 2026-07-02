// hapDemuxer.ts
// Pure JavaScript HAP demuxer and Snappy decompressor.
// Parses QuickTime MOV container atoms (boxes) to extract HAP DXT chunks.
// Runs seamlessly in the browser preview as a fallback or complete standalone solution.

export interface HapFrameInfo {
  offset: number;
  size: number;
}

export interface HapMovieInfo {
  width: number;
  height: number;
  frameCount: number;
  fps: number;
  codec: string;
  frames: HapFrameInfo[];
  buffer: ArrayBuffer;
}

// ============================================================================
// 1. Pure JS Snappy Decompressor (Ultra-Fast)
// ============================================================================
export function snappyDecompress(compressed: Uint8Array): Uint8Array {
  if (compressed.length === 0) {
    return new Uint8Array(0);
  }

  let ip = 0;

  // Read uncompressed length (varint)
  let shift = 0;
  let uncompressedLength = 0;
  while (ip < compressed.length) {
    const c = compressed[ip++];
    uncompressedLength |= (c & 0x7f) << shift;
    if ((c & 0x80) === 0) break;
    shift += 7;
    if (shift >= 32) {
      throw new Error("Snappy: Invalid varint size");
    }
  }

  const uncompressed = new Uint8Array(uncompressedLength);
  let op = 0;

  while (ip < compressed.length) {
    const tag = compressed[ip++];
    const type = tag & 0x03;

    if (type === 0) {
      // Literal
      let len = (tag >> 2) + 1;
      if (len > 60) {
        const bytesToRead = len - 60;
        len = 0;
        for (let i = 0; i < bytesToRead; i++) {
          if (ip >= compressed.length) {
            throw new Error("Snappy: Truncated literal length");
          }
          len |= compressed[ip++] << (i * 8);
        }
        len += 1;
      }
      if (ip + len > compressed.length || op + len > uncompressedLength) {
        throw new Error("Snappy: Literal out of bounds");
      }
      uncompressed.set(compressed.subarray(ip, ip + len), op);
      ip += len;
      op += len;
    } else {
      // Copy
      let len = 0;
      let offset = 0;

      if (type === 1) {
        len = ((tag >> 2) & 0x07) + 4;
        if (ip >= compressed.length) {
          throw new Error("Snappy: Truncated copy tag type 1");
        }
        offset = ((tag & 0xe0) << 3) | compressed[ip++];
      } else if (type === 2) {
        len = (tag >> 2) + 1;
        if (ip + 2 > compressed.length) {
          throw new Error("Snappy: Truncated copy tag type 2");
        }
        offset = compressed[ip] | (compressed[ip + 1] << 8);
        ip += 2;
      } else if (type === 3) {
        len = (tag >> 2) + 1;
        if (ip + 4 > compressed.length) {
          throw new Error("Snappy: Truncated copy tag type 3");
        }
        offset =
          compressed[ip] |
          (compressed[ip + 1] << 8) |
          (compressed[ip + 2] << 16) |
          (compressed[ip + 3] << 24);
        ip += 4;
      }

      if (offset === 0 || offset > op || op + len > uncompressedLength) {
        throw new Error("Snappy: Copy offset out of bounds");
      }

      // Fast copy from previous history
      for (let i = 0; i < len; i++) {
        uncompressed[op + i] = uncompressed[op - offset + i];
      }
      op += len;
    }
  }

  return uncompressed;
}

// ============================================================================
// 2. Pure JS QuickTime MOV parser specifically for HAP
// ============================================================================
export function demuxHapMov(arrayBuffer: ArrayBuffer): HapMovieInfo {
  const view = new DataView(arrayBuffer);
  const totalSize = arrayBuffer.byteLength;
  let offset = 0;

  let width = 0;
  let height = 0;
  let frameCount = 0;
  let fps = 30.0;
  let codec = "hap ";

  let stszSizes: number[] = [];
  let stcoOffsets: number[] = [];
  let co64Offsets: number[] = [];

  // Parse top level boxes
  while (offset < totalSize - 8) {
    const boxSize = view.getUint32(offset);
    const boxType = getString(view, offset + 4, 4);

    if (boxSize < 8) break;

    if (boxType === "moov") {
      // Recurse into moov
      parseContainer(offset + 8, offset + boxSize);
    }

    offset += boxSize;
  }

  function getString(v: DataView, off: number, len: number): string {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += String.fromCharCode(v.getUint8(off + i));
    }
    return s;
  }

  function parseContainer(start: number, end: number) {
    let cur = start;
    while (cur < end - 8) {
      const boxSize = view.getUint32(cur);
      const boxType = getString(view, cur + 4, 4);
      if (boxSize < 8 || cur + boxSize > end) break;

      if (
        boxType === "trak" ||
        boxType === "mdia" ||
        boxType === "minf" ||
        boxType === "stbl"
      ) {
        parseContainer(cur + 8, cur + boxSize);
      } else if (boxType === "stsd") {
        // Sample Description Box (Codec format)
        // Skip header
        const entryCount = view.getUint32(cur + 12);
        if (entryCount > 0) {
          // The first entry format (4 characters)
          const format = getString(view, cur + 20, 4);
          codec = format;
          // Extract width/height if video description
          if (cur + boxSize > cur + 50) {
            width = view.getUint16(cur + 48);
            height = view.getUint16(cur + 50);
          }
        }
      } else if (boxType === "stsz") {
        // Sample Size Box
        const sampleSize = view.getUint32(cur + 12);
        const count = view.getUint32(cur + 16);
        if (sampleSize === 0) {
          stszSizes = [];
          for (let i = 0; i < count; i++) {
            stszSizes.push(view.getUint32(cur + 20 + i * 4));
          }
        } else {
          stszSizes = new Array(count).fill(sampleSize);
        }
      } else if (boxType === "stco") {
        // Chunk Offset Box (32-bit offsets)
        const count = view.getUint32(cur + 12);
        stcoOffsets = [];
        for (let i = 0; i < count; i++) {
          stcoOffsets.push(view.getUint32(cur + 16 + i * 4));
        }
      } else if (boxType === "co64") {
        // Chunk Offset Box (64-bit offsets)
        const count = view.getUint32(cur + 12);
        co64Offsets = [];
        for (let i = 0; i < count; i++) {
          // Reading 64-bit offsets (we combine high/low 32-bit since JS can parse accurately up to 53-bits)
          const high = view.getUint32(cur + 16 + i * 8);
          const low = view.getUint32(cur + 20 + i * 8);
          co64Offsets.push(high * 4294967296 + low);
        }
      } else if (boxType === "mdhd") {
        // Media Header Box (Timescale and Duration)
        const version = view.getUint8(cur + 8);
        let timescale = 1;
        let duration = 1;
        if (version === 1) {
          timescale = view.getUint32(cur + 28);
          // 64-bit duration
          const high = view.getUint32(cur + 32);
          const low = view.getUint32(cur + 36);
          duration = high * 4294967296 + low;
        } else {
          timescale = view.getUint32(cur + 20);
          duration = view.getUint32(cur + 24);
        }
        if (timescale > 0) {
          fps = timescale / (duration / (stszSizes.length || 1)) || 30.0;
        }
      }

      cur += boxSize;
    }
  }

  // Combine offsets
  const offsets = co64Offsets.length > 0 ? co64Offsets : stcoOffsets;
  frameCount = Math.min(offsets.length, stszSizes.length);

  const frames: HapFrameInfo[] = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push({
      offset: offsets[i],
      size: stszSizes[i],
    });
  }

  // If width/height weren't found in STSD, fallback to standard VJ sizes
  if (width === 0) width = 1920;
  if (height === 0) height = 1080;

  return {
    width,
    height,
    frameCount,
    fps,
    codec,
    frames,
    buffer: arrayBuffer,
  };
}

// ============================================================================
// 3. Frame Data Decoding: Extracts texture format and decompressed S3TC DXT payload
// ============================================================================
export interface DecodedHapFrame {
  data: Uint8Array;
  format: number; // WebGL format enum (COMPRESSED_RGB_S3TC_DXT1_EXT / COMPRESSED_RGBA_S3TC_DXT5_EXT)
}

export function decodeHapFrame(
  movie: HapMovieInfo,
  frameIndex: number
): DecodedHapFrame {
  if (frameIndex < 0 || frameIndex >= movie.frameCount) {
    throw new Error(`Frame index ${frameIndex} out of bounds.`);
  }

  const frameInfo = movie.frames[frameIndex];
  const packetData = new Uint8Array(movie.buffer, frameInfo.offset, frameInfo.size);

  if (packetData.length < 4) {
    throw new Error("HAP frame packet truncated.");
  }

  let headerLen = 0;
  let sectionLen = 0;

  const sizeVal = (packetData[0] << 16) | (packetData[1] << 8) | packetData[2];
  let typeByte = 0;

  if (sizeVal === 0) {
    if (packetData.length < 8) {
      throw new Error("Invalid HAP 8-byte header.");
    }
    sectionLen =
      (packetData[3] << 24) |
      (packetData[4] << 16) |
      (packetData[5] << 8) |
      packetData[6];
    typeByte = packetData[7];
    headerLen = 8;
  } else {
    sectionLen = sizeVal;
    typeByte = packetData[3];
    headerLen = 4;
  }

  const sectionType = typeByte & 0x0f;
  const compressor = (typeByte & 0xf0) >> 4;

  const payload = packetData.subarray(headerLen);

  let dxtData: Uint8Array;
  if (compressor === 0x0b) {
    // Snappy
    dxtData = snappyDecompress(payload);
  } else if (compressor === 0x0a) {
    // Raw DXT
    dxtData = payload;
  } else {
    throw new Error(`Unsupported HAP compressor format: 0x${compressor.toString(16)}`);
  }

  // WebGL S3TC Enums:
  // COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1
  // COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3
  let format = 0x83f3; // Default DXT5
  if (sectionType === 0x01) {
    format = 0x83f1; // DXT1
  } else if (sectionType === 0x0f) {
    format = 0x83f3; // DXT5
  } else if (sectionType === 0x0c) {
    format = 0x83f3; // YCoCg DXT5
  }

  return {
    data: dxtData,
    format,
  };
}
