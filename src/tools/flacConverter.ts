import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

/**
 * WAV -> genuine lossless FLAC, encoded inside the browser using the same
 * pinned single-thread ffmpeg.wasm core already used for video compression.
 *
 * A separate FFmpeg instance avoids sharing its virtual filesystem and
 * progress listener with the video tool.
 */
let flacEnginePromise: Promise<FFmpeg> | null = null;
let conversionQueue: Promise<void> = Promise.resolve();

function getFlacEngine(): Promise<FFmpeg> {
  if (!flacEnginePromise) {
    flacEnginePromise = (async () => {
      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });
      return ffmpeg;
    })().catch((error: unknown) => {
      flacEnginePromise = null; // Allow retry after a CDN/load failure.
      throw error;
    });
  }
  return flacEnginePromise;
}

function hasWavHeader(bytes: Uint8Array): boolean {
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const wave = String.fromCharCode(...bytes.slice(8, 12));
  return (riff === 'RIFF' || riff === 'RF64' || riff === 'RIFX') && wave === 'WAVE';
}

function hasFlacHeader(bytes: Uint8Array): boolean {
  return bytes.length > 4
    && bytes[0] === 0x66 && bytes[1] === 0x4c
    && bytes[2] === 0x61 && bytes[3] === 0x43; // fLaC
}

export async function convertWavToFlac(
  file: File,
  options: { onProgress?: (percentage: number) => void } = {},
): Promise<Blob> {
  const { onProgress } = options;

  // ffmpeg.wasm is stateful. Serialize conversions to avoid virtual filesystem
  // collisions, even when two UI components request FLAC at the same time.
  const previousJob = conversionQueue;
  let releaseJob!: () => void;
  conversionQueue = new Promise<void>(resolve => { releaseJob = resolve; });
  await previousJob;

  try {
    onProgress?.(5);
    if (!hasWavHeader(new Uint8Array(await file.slice(0, 12).arrayBuffer()))) {
      throw new Error('El archivo de origen no tiene una cabecera WAV válida. / The input file is not a valid WAV.');
    }

    const ffmpeg = await getFlacEngine();
    onProgress?.(25);

    const inputName = 'cmfp_input.wav';
    const outputName = 'cmfp_output.flac';
    const onEncodingProgress = ({ progress }: { progress: number }) => {
      if (Number.isFinite(progress)) {
        onProgress?.(40 + Math.round(Math.max(0, Math.min(1, progress)) * 52));
      }
    };

    ffmpeg.on('progress', onEncodingProgress);
    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      onProgress?.(40);

      // The native FFmpeg FLAC encoder is lossless. No MP3 or WAV fallback.
      // Keep audio parameters native instead of forcing 16-bit PCM output.
      const exitCode = await ffmpeg.exec([
        '-hide_banner', '-loglevel', 'error',
        '-i', inputName, '-map', '0:a:0', '-vn',
        '-c:a', 'flac', '-compression_level', '5',
        '-f', 'flac', '-y', outputName,
      ]);

      if (exitCode !== 0) {
        throw new Error('La codificación FLAC ha fallado. / FLAC encoding failed.');
      }

      const outputData = await ffmpeg.readFile(outputName);
      if (!(outputData instanceof Uint8Array) || !hasFlacHeader(outputData)) {
        throw new Error('No se ha generado un archivo FLAC válido. / No valid FLAC file was produced.');
      }

      // Make an owned copy of ffmpeg.wasm's virtual-fs bytes for a stable Blob.
      const resultBytes = new Uint8Array(outputData);
      onProgress?.(100);
      return new Blob([resultBytes], { type: 'audio/flac' });
    } finally {
      ffmpeg.off('progress', onEncodingProgress);
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});
    }
  } finally {
    releaseJob();
  }
}
