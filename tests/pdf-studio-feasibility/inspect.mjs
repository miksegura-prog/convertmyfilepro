// inspect.mjs — Dump de la estructura interna de un PDF de prueba (content streams
// y diccionarios de fuente) para diagnosticar por qué el motor no encuentra texto.
// Uso: node tests/pdf-studio-feasibility/inspect.mjs <fixture.pdf>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName, PDFArray, decodePDFRawStream } from 'pdf-lib';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
if (!file) { console.error('falta argumento: nombre del fixture'); process.exit(1); }
const bytes = fs.readFileSync(path.join(DIR, 'artifacts', file));
const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
doc.registerFontkit((await import('@pdf-lib/fontkit')).default);

const nameOf = (obj) => {
  if (!obj) return '';
  if (typeof obj.code === 'string') return obj.code;
  return String(typeof obj.asString === 'function' ? obj.asString() : obj);
};

const pages = doc.getPages();
console.log(`=== ${file} — ${pages.length} página(s) ===`);
for (let pi = 0; pi < pages.length; pi++) {
  const page = pages[pi];
  const node = page.node;
  const ctx = node.context;
  const contents = node.get(PDFName.of('Contents'));
  const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
  console.log(`\n--- página ${pi + 1}: ${refs.length} content stream(s) ---`);
  let idx = 0;
  for (const ref of refs) {
    const stream = ctx.lookup(ref);
    if (!stream) { console.log(`  [stream ${idx}] <no encontrado>`); idx++; continue; }
    let raw = null;
    try {
      const dec = decodePDFRawStream(stream);
      raw = dec.decode();
    } catch (e) {
      raw = stream.getContents?.() ?? null;
    }
    const s = raw instanceof Uint8Array
      ? Array.from(raw, (b) => String.fromCharCode(b)).join('')
      : String(raw);
    console.log(`  [stream ${idx}] raw=${raw instanceof Uint8Array ? raw.length : '?'} bytes`);
    console.log('    ' + s.replace(/\n/g, '⏎\n    ').slice(0, 8000));
    idx++;
  }

  // Fuentes
  let res = node.get(PDFName.of('Resources'));
  while (res && !(typeof res.get === 'function')) { res = ctx.lookup(res); }
  const fontsDict = res?.get?.(PDFName.of('Font'));
  const fonts = fontsDict ? ctx.lookup(fontsDict) : null;
  console.log(`\n--- página ${pi + 1}: fuentes ---`);
  if (!fonts) { console.log('  (sin /Font)'); continue; }
  for (const [k, fr] of fonts.entries()) {
    const fd = ctx.lookup(fr);
    const subtype = nameOf(fd.get(PDFName.of('Subtype')));
    const base = nameOf(fd.get(PDFName.of('BaseFont')));
    const encName = nameOf(fd.get(PDFName.of('Encoding')));
    const toUni = fd.get(PDFName.of('ToUnicode'));
    let descKind = '';
    if (subtype === 'Type0') {
      const dfRef = fd.get(PDFName.of('DescendantFonts'));
      const df = dfRef ? ctx.lookup(dfRef) : null;
      const first = df?.asArray?.()?.[0];
      const d = first ? ctx.lookup(first) : null;
      descKind = `${nameOf(d?.get?.(PDFName.of('Subtype')))}/${nameOf(d?.get?.(PDFName.of('BaseFont')))}`;
      const fdr = d?.get?.(PDFName.of('FontDescriptor'));
      const fdd = fdr ? ctx.lookup(fdr) : null;
      const ffs = ['FontFile', 'FontFile2', 'FontFile3']
        .map((n) => { const r = fdd?.get?.(PDFName.of(n)); return r ? ctx.lookup(r) : null; })
        .filter(Boolean);
      descKind += ` · embebido=${ffs.length ? ffs.map((f) => nameOf(f.get(PDFName.of('Subtype'))) || 'FontFile').join(',') : 'NO'}`;
    } else if (subtype === 'Type1' || subtype === 'TrueType') {
      const fdr = fd.get(PDFName.of('FontDescriptor'));
      const fdd = fdr ? ctx.lookup(fdr) : null;
      const ff = ['FontFile', 'FontFile2', 'FontFile3']
        .map((n) => { const r = fdd?.get?.(PDFName.of(n)); return r ? ctx.lookup(r) : null; })
        .filter(Boolean);
      descKind = ff.length ? `embebido=${ffsName(fd, ctx)}` : 'ESTÁNDAR (no embebida)';
    }
    console.log(`  ${k} → ${subtype} / ${base} / enc=${encName || '(ninguna)'} / ToUnicode=${toUni ? 'sí' : 'no'} ${descKind}`);
  }
}

function ffsName(fd, ctx) {
  const fdr = fd.get(PDFName.of('FontDescriptor'));
  const fdd = fdr ? ctx.lookup(fdr) : null;
  const ffs = ['FontFile', 'FontFile2', 'FontFile3']
    .map((n) => { const r = fdd?.get?.(PDFName.of(n)); return r ? ctx.lookup(r) : null; })
    .filter(Boolean);
  return ffs.length ? ffs.map((f) => nameOf(f.get(PDFName.of('Subtype'))) || 'raw').join(',') : 'NO';
}
