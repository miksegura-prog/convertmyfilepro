import { createWorker, PSM, type Worker } from 'tesseract.js';
import type { OcrResult } from '@/types';

export type OcrImageMode = 'auto' | 'document' | 'line' | 'sparse';
export type OcrImageProcessing = 'automatic' | 'original' | 'grayscale' | 'blackWhite';
export type OcrRotation = 0 | 90 | 180 | 270;

export interface OcrSettings {
  language: string;
  mode: OcrImageMode;
  preprocessing: OcrImageProcessing;
  rotation: OcrRotation;
}

export const DEFAULT_OCR_SETTINGS: OcrSettings = {
  language: 'spa',
  mode: 'auto',
  preprocessing: 'automatic',
  rotation: 0,
};

let worker: Promise<Worker> | null = null;
let loadedLanguage = '';

const segmentModes: Record<OcrImageMode, PSM> = {
  auto: PSM.AUTO,
  document: PSM.SINGLE_BLOCK,
  line: PSM.SINGLE_LINE,
  sparse: PSM.SPARSE_TEXT,
};

/** Keep one worker for batches. Switching languages really loads the new model. */
export async function initializeOcr(language = 'eng'): Promise<Worker> {
  if (worker && loadedLanguage !== language) {
    const previous = worker;
    worker = null;
    loadedLanguage = '';
    try {
      await (await previous).terminate();
    } catch { /* A failed worker should not block a new attempt. */ }
  }

  if (!worker) {
    loadedLanguage = language;
    worker = createWorker(language.includes('+') ? language.split('+') : language).catch(error => {
      worker = null;
      loadedLanguage = '';
      throw error;
    });
  }
  return worker;
}

export async function terminateOcr(): Promise<void> {
  const current = worker;
  worker = null;
  loadedLanguage = '';
  if (current) await (await current).terminate();
}

/**
 * Prepare for OCR in the browser. Max 3200px long side and 9MP so scans
 * improve in resolution without exhausting phone memory.
 */
export function imageToOcrCanvas(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  rotation: OcrRotation,
): HTMLCanvasElement {
  if (!sourceWidth || !sourceHeight) throw new Error('Image has no readable pixels');
  const scale = Math.min(2.5, 3200 / Math.max(sourceWidth, sourceHeight),
    Math.sqrt(9_000_000 / (sourceWidth * sourceHeight)));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const turn = rotation === 90 || rotation === 270;
  const canvas = document.createElement('canvas');
  canvas.width = turn ? height : width;
  canvas.height = turn ? width : height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (rotation === 90) {
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  } else if (rotation === 180) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
  } else if (rotation === 270) {
    ctx.translate(0, canvas.height);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);
  ctx.restore();
  return canvas;
}

/**
 * The automatic option is intentionally conservative: aggressive binary
 * thresholding can destroy fine fonts or coloured text.
 * For very poor scans, users can choose a black/white threshold explicitly.
 */
export function preprocessOcrCanvas(
  canvas: HTMLCanvasElement,
  setting: OcrImageProcessing,
): void {
  if (setting === 'original') return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas unavailable');
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  const histogram = new Uint32Array(256);
  const light = new Uint8Array(pixels.length / 4);

  for (let i = 0; i < light.length; i++) {
    const j = i * 4;
    const value = Math.max(0, Math.min(255, Math.round(
      0.299 * pixels[j] + 0.587 * pixels[j + 1] + 0.114 * pixels[j + 2],
    )));
    light[i] = value;
    histogram[value]++;
  }
  let threshold = 128;
  if (setting === 'blackWhite') {
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];
    let foreground = 0, foregroundSum = 0, score = -1;
    for (let value = 0; value < 256; value++) {
      foreground += histogram[value];
      if (!foreground) continue;
      const background = light.length - foreground;
      if (!background) break;
      foregroundSum += value * histogram[value];
      const delta = foregroundSum / foreground - (sum - foregroundSum) / background;
      const between = foreground * background * delta * delta;
      if (between > score) { score = between; threshold = value; }
    }
  }

  let low = 0, high = 255;
  if (setting === 'automatic') {
    let seen = 0;
    for (let i = 0; i < 256; i++) {
      seen += histogram[i];
      if (seen >= light.length * .02) { low = i; break; }
    }
    seen = 0;
    for (let i = 255; i >= 0; i--) {
      seen += histogram[i];
      if (seen >= light.length * .02) { high = i; break; }
    }
    if (high - low < 80) { low = 0; high = 255; }
  }

  for (let i = 0; i < light.length; i++) {
    const j = i * 4;
    const value = setting === 'blackWhite'
      ? (light[i] > threshold ? 255 : 0)
      : setting === 'automatic'
        ? Math.max(0, Math.min(255, Math.round((light[i] - low) * 255 / (high - low))))
        : light[i];
    pixels[j] = value;
    pixels[j + 1] = value;
    pixels[j + 2] = value;
    pixels[j + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

export async function extractTextFromCanvas(
  canvas: HTMLCanvasElement,
  settings: OcrSettings,
): Promise<OcrResult> {
  preprocessOcrCanvas(canvas, settings.preprocessing);
  const ocrWorker = await initializeOcr(settings.language);
  await ocrWorker.setParameters({
    tessedit_pageseg_mode: segmentModes[settings.mode],
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  });
  const { data: { text, confidence } } = await ocrWorker.recognize(canvas);
  return { text: text.trim(), confidence };
}

export async function extractTextFromImage(
  file: File,
  settingsOrLanguage: OcrSettings | string = 'eng',
): Promise<OcrResult> {
  const settings = typeof settingsOrLanguage === 'string'
    ? { ...DEFAULT_OCR_SETTINGS, language: settingsOrLanguage }
    : settingsOrLanguage;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Could not decode this image. Try PNG, JPEG or WebP.');
  }
  try {
    const canvas = imageToOcrCanvas(bitmap, bitmap.width, bitmap.height, settings.rotation);
    try {
      return await extractTextFromCanvas(canvas, settings);
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    bitmap.close();
  }
}

export const extractTextFromMultipleImages = async (
  files: File[],
  language = 'eng',
  onProgress?: (index: number, total: number) => void,
): Promise<OcrResult[]> => {
  const results: OcrResult[] = [];
  for (let i = 0; i < files.length; i++) {
    results.push(await extractTextFromImage(files[i], language));
    onProgress?.(i + 1, files.length);
  }
  return results;
};

export const supportedLanguages = [
  { code: 'spa', name: 'Español' },
  { code: 'eng', name: 'English' },
  { code: 'spa+eng', name: 'Español + English' },
  { code: 'cat', name: 'Català' },
  { code: 'fra', name: 'Français' },
  { code: 'deu', name: 'Deutsch' },
  { code: 'ita', name: 'Italiano' },
  { code: 'por', name: 'Português' },
  { code: 'rus', name: 'Русский' },
  { code: 'chi_sim', name: '简体中文' },
  { code: 'chi_tra', name: '繁體中文' },
  { code: 'jpn', name: '日本語' },
  { code: 'kor', name: '한국어' },
  { code: 'ara', name: 'العربية' },
  { code: 'hin', name: 'हिन्दी' },
  { code: 'tha', name: 'ภาษาไทย' },
  { code: 'vie', name: 'Tiếng Việt' },
];
