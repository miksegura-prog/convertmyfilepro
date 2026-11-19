import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { OcrResult } from '@/types';
import {
  extractTextFromCanvas, imageToOcrCanvas, type OcrSettings,
} from './ocrTool';

// Use the bundled matching PDF.js worker, not an unrelated CDN version.
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

async function openDocument(file: File) {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  return { document, close: () => loadingTask.destroy() };
}

export async function getOcrPdfPageCount(file: File): Promise<number> {
  const { document, close } = await openDocument(file);
  try {
    return document.numPages;
  } finally {
    await close();
  }
}

/**
 * Comma-separated 1-based PDF page selection, e.g. 1-3,5,7-9.
 * Empty means all pages. A per-job cap protects memory for every plan.
 */
export function selectPdfPages(input: string, pageCount: number): number[] {
  const value = input.trim();
  if (!value) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const selected = new Set<number>();
  for (const segment of value.split(',')) {
    const match = segment.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Invalid PDF page selection. Use 1-3,5');
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end > pageCount || start > end) {
      throw new Error('PDF page selection is out of range.');
    }
    if (end - start > 40) throw new Error('Select 40 pages or fewer per job.');
    for (let page = start; page <= end; page++) {
      selected.add(page);
      if (selected.size > 40) throw new Error('Select 40 pages or fewer per job.');
    }
  }
  return Array.from(selected).sort((a, b) => a - b);
}

export async function extractTextFromPdfPages(
  file: File,
  pages: number[],
  settings: OcrSettings,
  onPage: (pageNumber: number, result: OcrResult) => void | Promise<void>,
  cancelled?: () => boolean,
): Promise<void> {
  const { document, close } = await openDocument(file);
  try {
    for (const pageNumber of pages) {
      if (cancelled?.()) break;
      const page = await document.getPage(pageNumber);
      const natural = page.getViewport({ scale: 1 });
      const scale = Math.min(2.5, 3200 / Math.max(natural.width, natural.height),
        Math.sqrt(9_000_000 / (natural.width * natural.height)));
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      try {
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        const prepared = imageToOcrCanvas(
          canvas, canvas.width, canvas.height, settings.rotation,
        );
        try {
          const result = await extractTextFromCanvas(prepared, settings);
          await onPage(pageNumber, result);
        } finally {
          prepared.width = 0;
          prepared.height = 0;
        }
      } finally {
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  } finally {
    await close();
  }
}
