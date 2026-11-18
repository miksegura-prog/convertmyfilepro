// verify-addtext.mjs — Comprueba que el "texto libre" añadido es contenido REAL:
// se guarda como operador de texto (Tj) y vuelve a extraerse (seleccionable) con pdfjs.
// Replica EXACTAMENTE `addTextToPdf()` de src/lib/pdf-studio/pdfEditEngine.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractPages } from './extract.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(DIR, 'artifacts');
const srcBytes = fs.readFileSync(path.join(ART, 'F1-simple-helvetica.pdf'));

async function addTextToPdf(bytes, texts) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  doc.registerFontkit((await import('@pdf-lib/fontkit')).default ?? (await import('@pdf-lib/fontkit')));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  let added = 0;
  for (const t of texts) {
    const page = pages[t.page];
    if (t.text.trim()) {
      page.drawText(t.text, { x: t.x, y: t.y, size: t.size || 12, font });
      added++;
    }
  }
  return { bytes: await doc.save({ useObjectStreams: false, addDefaultPage: false }), added };
}

const texts = [
  { page: 0, text: 'NOTA AÑADIDA', x: 60, y: 60, size: 14 },
  { page: 0, text: 'segunda línea libre', x: 60, y: 45, size: 11 },
];

const out = await addTextToPdf(srcBytes, texts);
console.log('añadidos:', out.added, '| bytes salida:', out.bytes.length);

// 1) Reabrir con pdf-lib (verificación de integridad).
let okVerify;
try { await PDFDocument.load(out.bytes, { ignoreEncryption: true }); okVerify = true; }
catch { okVerify = false; }
console.log('verify reabrir pdf-lib:', okVerify);

// 2) Re-extraer con pdfjs: el texto debe ser seleccionable/copiable.
const pages = await extractPages(out.bytes);
const full = pages.map((p) => p.map((i) => i.str).join(' ')).join(' ');
const missing = texts.filter((t) => t.text.trim() && !full.includes(t.text.trim()));
console.log('texto AÑADIDO extraíble (seleccionable):', missing.length === 0 ? true : `FALTA ${JSON.stringify(missing.map((m) => m.text))}`);

const pass = okVerify && missing.length === 0;
console.log('\nResultado:', pass ? 'OK — el texto libre es contenido real y seleccionable.' : 'FALLO');
process.exit(pass ? 0 : 1);