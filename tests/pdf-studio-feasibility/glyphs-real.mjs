// glyphs-real.mjs — ¿Están los glifos de reemplazo realmente en las fuentes embebidas?
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName, decodePDFRawStream } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { skipIfMissingRealPdfs } from './real-fixtures.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(DIR, 'artifacts', 'real');
const file = process.argv[2] ?? 'real0.pdf';
skipIfMissingRealPdfs('glyphs-real.mjs', [file]);
const chars = (process.argv[3] ?? 'MuestraMPD P'.split(' ')[0]).split('');
const bytes = fs.readFileSync(path.join(ART, file));
const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
const ctx = doc.getPages()[0].node.context;
const res = ctx.lookup(doc.getPages()[0].node.get(PDFName.of('Resources')));
const fonts = ctx.lookup(res.get(PDFName.of('Font')));
for (const [k, fr] of fonts.entries()) {
  const fd = ctx.lookup(fr);
  const subtype = fd.get(PDFName.of('Subtype'))?.asString?.() ?? fd.get(PDFName.of('Subtype'))?.code ?? '';
  const base = fd.get(PDFName.of('BaseFont'))?.asString?.() ?? '';
  let ffRef = null;
  if (subtype === 'Type0') {
    const df = ctx.lookup(fd.get(PDFName.of('DescendantFonts'))).asArray()[0];
    ffRef = ctx.lookup(ctx.lookup(df).get(PDFName.of('FontDescriptor'))).get(PDFName.of('FontFile2'));
  } else {
    const fdr = fd.get(PDFName.of('FontDescriptor'));
    ffRef = fdr ? ctx.lookup(fdr).get(PDFName.of('FontFile2')) : null;
  }
  console.log(`\n${file} ${k} ${subtype} ${base} ff2=${ffRef ? 'sí' : 'NO'}`);
  if (!ffRef) continue;
  const st = ctx.lookup(ffRef);
  const raw = decodePDFRawStream(st).decode();
  try {
    const f = await fontkit.create(raw);
    console.log(`  numGlyphs=${f.numGlyphs}`);
    for (const ch of chars) {
      const cp = ch === ' ' ? 32 : ch.codePointAt(0);
      const g = f.glyphForCodePoint(cp);
      console.log(`  '${ch}' U+${cp.toString(16)} → gid=${g.id} w=${g.advanceWidth} name=${g.name} isNotDef=${g.id === 0}`);
    }
  } catch (e) {
    console.log('  fontkit error:', e.message.slice(0, 120));
  }
}
