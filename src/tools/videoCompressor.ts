import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export interface CompressVideoOptions {
  targetSizeMB?: number; // e.g. 15, 16, 25, 50
  maxWidth?: number;     // e.g. 1280 or 854
  onProgress?: (progress: number) => void;
  onLog?: (msg: string) => void;
}

let ffmpegInstance: FFmpeg | null = null;

/**
 * Returns single-threaded FFmpeg instance loaded via CDN or local core
 * ensuring total compatibility with Vercel / GitHub Pages without COOP/COEP headers.
 */
export const getFFmpeg = async (onProgress?: (p: number) => void): Promise<FFmpeg> => {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    // progress is 0.0 to 1.0
    if (onProgress && typeof progress === 'number') {
      const pct = Math.min(99, Math.round(progress * 100));
      onProgress(pct);
    }
  });

  // Load single-threaded @ffmpeg/core from unpkg / jsdelivr
  // Single-threaded core does not need SharedArrayBuffer or COOP/COEP
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
};

/**
 * Extracts video duration and dimensions using browser's HTML5 Video element
 */
export const getVideoMetadata = (file: File): Promise<{ duration: number; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration || 1,
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot read video metadata'));
    };
  });
};

/**
 * Compresses video for WhatsApp or custom size limit (<= 16 MB)
 */
export const compressVideoForWhatsApp = async (
  file: File,
  options: CompressVideoOptions = {}
): Promise<Blob> => {
  const { targetSizeMB = 15, onProgress, onLog } = options;

  onLog?.('Reading video metadata...');
  onProgress?.(5);

  const { duration, width, height } = await getVideoMetadata(file);

  // WhatsApp limit is typically 16MB. We aim for targetSizeMB (e.g. 15MB) for safety
  // Total bits = targetSizeMB * 8 * 1024 * 1024 bits
  const totalBits = targetSizeMB * 8 * 1024 * 1024;
  const targetTotalBitrate = Math.floor(totalBits / Math.max(1, duration)); // bps

  // Audio bitrate (e.g. 96k or 128k)
  const audioBitrateK = duration > 120 ? 64 : 96;
  const audioBitrate = audioBitrateK * 1000;

  // Video bitrate (minimum 150k, maximum 2500k)
  let videoBitrate = Math.max(150000, targetTotalBitrate - audioBitrate);
  if (videoBitrate > 2500000) {
    videoBitrate = 2500000;
  }
  const videoBitrateK = Math.floor(videoBitrate / 1000);

  onLog?.(`Target Bitrate: ${videoBitrateK} kbps (Video), ${audioBitrateK} kbps (Audio)`);
  onProgress?.(10);

  // Determine scaling: for WhatsApp mobile, 720p or 480p is ideal and sharp
  let scaleFilter = '';
  const maxDim = Math.max(width, height);
  if (maxDim > 1280) {
    // Scale down keeping aspect ratio, width & height must be divisible by 2
    scaleFilter = 'scale=trunc(iw*min(1280/iw\\,720/ih)/2)*2:trunc(ih*min(1280/iw\\,720/ih)/2)*2';
  } else {
    scaleFilter = 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
  }

  const ffmpeg = await getFFmpeg((p) => {
    // Map FFmpeg progress (0-100) to overall progress (15 - 95%)
    const mapped = 15 + Math.round((p / 100) * 80);
    onProgress?.(mapped);
  });

  const inputName = 'input_' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const outputName = 'output_whatsapp.mp4';

  onLog?.('Writing file to virtual filesystem...');
  const fileData = await fetchFile(file);
  await ffmpeg.writeFile(inputName, fileData);

  onProgress?.(15);
  onLog?.('Compressing video with H.264 / AAC...');

  const ffmpegArgs = [
    '-i', inputName,
    '-vf', scaleFilter,
    '-c:v', 'libx264',
    '-b:v', `${videoBitrateK}k`,
    '-maxrate', `${Math.round(videoBitrateK * 1.3)}k`,
    '-bufsize', `${videoBitrateK * 2}k`,
    '-preset', 'veryfast',
    '-c:a', 'aac',
    '-b:a', `${audioBitrateK}k`,
    '-movflags', '+faststart',
    '-y',
    outputName
  ];

  await ffmpeg.exec(ffmpegArgs);

  onProgress?.(95);
  onLog?.('Reading compressed video result...');

  const outputData = await ffmpeg.readFile(outputName);

  // Cleanup virtual files
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // Ignore cleanup error
  }

  onProgress?.(100);

  const outputBytes = new Uint8Array(outputData as unknown as ArrayBuffer);
  return new Blob([outputBytes], { type: 'video/mp4' });
};
