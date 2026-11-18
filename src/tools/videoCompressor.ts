import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export interface CompressVideoOptions {
  targetSizeMB?: number; // e.g. 15, 16, 25, 50
  maxWidth?: number;     // e.g. 1280 or 854
  onProgress?: (progress: number) => void;
  onLog?: (msg: string) => void;
}

/** A partir de este tamaño de entrada avisamos de consumo de memoria/tiempo. */
export const LARGE_VIDEO_WARNING_MB = 50;

/** Mensaje mostrado al usuario cuando el navegador no tiene memoria suficiente. */
export const OUT_OF_MEMORY_MESSAGE =
  'Memoria insuficiente para procesar este vídeo en tu navegador. Cierra otras pestañas, ' +
  'prueba con un archivo más pequeño o reduce la resolución del original.';

let ffmpegInstance: FFmpeg | null = null;

/**
 * FFmpeg WebAssembly falla con mensajes distintos según el navegador cuando se
 * agota la memoria. Los detectamos para no mostrar un error críptico.
 */
const MEMORY_ERROR_PATTERNS = [
  /out of memory/i,
  /outofmemory/i,
  /\boom\b/i,
  /cannot allocate/i,
  /failed to allocate/i,
  /allocation failed/i,
  /memory access out of bounds/i,
  /array buffer allocation failed/i,
];

export const isMemoryError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? '');
  return MEMORY_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

/**
 * Libera la instancia actual de FFmpeg. Necesario tras un fallo por memoria:
 * el WebAssembly queda en un estado inválido y hay que recargar el core.
 */
export const terminateFFmpeg = (): void => {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch {
      // La instancia ya estaba terminada
    }
    ffmpegInstance = null;
  }
};

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
 * Memoria aproximada declarada por el navegador (no está disponible en todos).
 * Solo se usa para avisar al usuario, nunca para bloquear.
 */
const getDeviceMemoryGB = (): number | null => {
  const value = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof value === 'number' ? value : null;
};

/** Borra un archivo del sistema de archivos virtual sin propagar errores. */
const deleteVirtualFile = async (ffmpeg: FFmpeg, name: string): Promise<void> => {
  try {
    await ffmpeg.deleteFile(name);
  } catch {
    // El archivo puede no existir (fallo previo) o FFmpeg estar terminado.
  }
};

/**
 * Compresses video for WhatsApp or custom size limit (<= 16 MB)
 */
export const compressVideoForWhatsApp = async (
  file: File,
  options: CompressVideoOptions = {}
): Promise<Blob> => {
  const { targetSizeMB = 15, onProgress, onLog } = options;

  if (!file || file.size === 0) {
    throw new Error('El archivo de vídeo está vacío o no se pudo leer.');
  }

  const fileMB = Math.round((file.size / (1024 * 1024)) * 10) / 10;
  onLog?.(`Reading video metadata... (${fileMB} MB)`);
  onProgress?.(5);

  const { duration, width, height } = await getVideoMetadata(file);

  // Aviso temprano: los vídeos grandes pueden no caber en la memoria del
  // navegador. No prometemos que el tamaño máximo se procese en todos los
  // dispositivos.
  if (file.size > LARGE_VIDEO_WARNING_MB * 1024 * 1024) {
    onLog?.(`Vídeo grande (${fileMB} MB): puede consumir mucha memoria y tardar varios minutos.`);
    const deviceMemoryGB = getDeviceMemoryGB();
    if (deviceMemoryGB !== null && deviceMemoryGB < 8) {
      onLog?.(`Este dispositivo declara ~${deviceMemoryGB} GB de RAM: si falla, usa un vídeo más pequeño.`);
    }
  }

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

  // Nombre único: evita colisiones si se comprime más de un vídeo seguido.
  const inputName = 'input_' + `${Date.now()}_` + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const outputName = `output_${Date.now()}.mp4`;

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

  let outputBlob: Blob | null = null;

  try {
    onLog?.('Writing file to virtual filesystem...');
    const fileData = await fetchFile(file);
    await ffmpeg.writeFile(inputName, fileData);

    onProgress?.(15);
    onLog?.('Compressing video with H.264 / AAC...');
    await ffmpeg.exec(ffmpegArgs);

    onProgress?.(95);
    onLog?.('Reading compressed video result...');

    const outputData = await ffmpeg.readFile(outputName);
    const outputBytes = new Uint8Array(outputData as unknown as ArrayBuffer);

    if (outputBytes.byteLength === 0) {
      throw new Error('FFmpeg no generó ningún archivo de salida. Prueba con otro vídeo.');
    }

    outputBlob = new Blob([outputBytes], { type: 'video/mp4' });
  } catch (error) {
    if (isMemoryError(error)) {
      // El core queda inutilizable: se descarta para que el siguiente intento
      // cargue una instancia limpia.
      terminateFFmpeg();
      throw new Error(OUT_OF_MEMORY_MESSAGE);
    }
    throw error instanceof Error
      ? error
      : new Error('No se pudo comprimir el vídeo.');
  } finally {
    // Se ejecuta siempre, también cuando la conversión falla: no dejamos
    // archivos temporales en el sistema de archivos virtual de FFmpeg.
    await deleteVirtualFile(ffmpeg, inputName);
    await deleteVirtualFile(ffmpeg, outputName);
  }

  onProgress?.(100);
  return outputBlob;
};
