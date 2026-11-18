// pages-intact.mjs — Confirma que las páginas no editadas conservan sus content streams
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { PDFDocument, PDFName, PDFArray, decodePDFRawStream } from 'pdf-lib';
import { skipIfMissingRealPdfs } from './real-fixtures.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(DIR, 'artifacts', 'real');

skipIfMissingRealPdfs('pages-intact.mjs');
if (!fs.existsSync(path.join(DIR, 'artifacts', 'engine-browser.bundle.mjs'))) {
  console.log('[omitido] pages-intact.mjs: falta artifacts/engine-browser.bundle.mjs (ejecuta antes run-tests-browser-engine.mjs).');
  process.exit(0);
}

async function streamForPage(doc, pageIdx) {
  const nodes = doc.getPages();
  const node = nodes[pageIdx].node;
  const ctx = doc.context;
  const v = node.get(PDFName.of('Contents'));
  const refs = v instanceof PDFArray ? v.asArray() : [v];
  const parts = [];
  for (const ref of refs) {
    const st = ctx.lookup(ref);
    if (!st) continue;
    try {
      parts.push(decodePDFRawStream(st).decode());
    } catch {
      parts.push(st.getContents?.() ?? new Uint8Array(0));
    }
  }
  return parts.map((p) => (p instanceof Uint8Array ? Buffer.from(p).toString('latin1') : String(p))).join('\n--stream--\n');
}

// Editar la página 1 de real2 vía el port del navegador.
const root = path.resolve(DIR, '..', '..');
const { editPdf } = await import(pathToFileURL(path.join(DIR, 'artifacts', 'engine-browser.bundle.mjs')).href);

const src = fs.readFileSync(path.join(ART, 'real2.pdf'));
const out = await editPdf(new Uint8Array(src), [{ page: 0, find: 'Attention', replace: 'Atencion' }]);
const edited = await PDFDocument.load(out.bytes, { ignoreEncryption: true });
const orig = await PDFDocument.load(src, { ignoreEncryption: true });

let ok = true;
for (let p = 0; p < orig.getPages().length; p++) {
  if (p === 0) continue; // la página editada
  const a = await streamForPage(orig, p);
  const b = await streamForPage(edited, p);
  const same = a === b;
  if (!same) { ok = false; console.log(`página ${p + 1}: CONTENT STREAM CAMBIADO (${a.length} vs ${b.length} chars)`); }
}
console.log(ok ? 'TODAS las páginas no editadas (2..15) conservan sus content streams byte a byte.' : 'HAY PÁGINAS MODIFICADAS.');
process.exit(ok ? 0 : 1);
