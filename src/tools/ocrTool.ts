import { createWorker } from 'tesseract.js';
import type { OcrResult } from '@/types';

let worker: Tesseract.Worker | null = null;

export const initializeOcr = async (language: string = 'eng'): Promise<Tesseract.Worker> => {
  if (!worker) {
    worker = await createWorker(language);
  }
  return worker;
};

export const terminateOcr = async (): Promise<void> => {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
};

export const extractTextFromImage = async (
  file: File,
  language: string = 'eng'
): Promise<OcrResult> => {
  const ocrWorker = await initializeOcr(language);
  
  const imageUrl = URL.createObjectURL(file);
  
  try {
    const { data: { text, confidence } } = await ocrWorker.recognize(imageUrl);
    
    return {
      text: text.trim(),
      confidence
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

export const extractTextFromMultipleImages = async (
  files: File[],
  language: string = 'eng',
  onProgress?: (index: number, total: number) => void
): Promise<OcrResult[]> => {
  const results: OcrResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const result = await extractTextFromImage(files[i], language);
    results.push(result);
    onProgress?.(i + 1, files.length);
  }
  
  return results;
};

export const supportedLanguages = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'rus', name: 'Russian' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'chi_tra', name: 'Chinese (Traditional)' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hin', name: 'Hindi' },
  { code: 'tha', name: 'Thai' },
  { code: 'vie', name: 'Vietnamese' }
];
