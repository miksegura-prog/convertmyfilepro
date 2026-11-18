// extract.mjs — Extracción de texto por página con pdfjs-dist (build legacy para Node).
// La extracción es la prueba de que el texto es seleccionable/copiable de verdad.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs'),
  ).href;
} catch { /* Node usa fake worker por defecto */ }

const stdDir = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts');
const standardFontDataUrl = fs.existsSync(stdDir) ? pathToFileURL(stdDir).href + '/' : undefined;

export async function extractPages(bytes) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: false,
    ...(standardFontDataUrl ? { standardFontDataUrl } : {}),
  }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    pages.push(tc.items
      .map((it) => ({ str: it.str ?? '', x: it.transform[4], y: it.transform[5] }))
      .filter((it) => it.str.trim().length > 0));
  }
  await doc.cleanup?.();
  return pages;
}
