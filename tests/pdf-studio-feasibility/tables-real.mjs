// tables-real.mjs — Verifica /Widths y ToUnicode de las fuentes de los PDFs reales
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName, decodePDFRawStream } from 'pdf-lib';
import { skipIfMissingRealPdfs } from './real-fixtures.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(DIR, 'artifacts', 'real');
skipIfMissingRealPdfs('tables-real.mjs', ['real0.pdf', 'real1.pdf']);

for (const file of ['real0.pdf', 'real1.pdf']) {
  const bytes = fs.readFileSync(path.join(ART, file));
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const page = doc.getPages()[0];
  const node = page.node;
  const ctx = node.context;
  const res = ctx.lookup(node.get(PDFName.of('Resources')));
  const fontsDict = ctx.lookup(res.get(PDFName.of('Font')));
  console.log(`\n### ${file}`);
  for (const [k, fr] of fontsDict.entries()) {
    const fdict = ctx.lookup(fr);
    const subtype = fdict.get(PDFName.of('Subtype'))?.asString?.() ?? fdict.get(PDFName.of('Subtype'))?.code ?? '';
    const base = fdict.get(PDFName.of('BaseFont'))?.asString?.() ?? '';
    const first = fdict.get(PDFName.of('FirstChar'))?.asNumber?.();
    const enc = fdict.get(PDFName.of('Encoding'));
    const encName = enc?.asString?.() ?? (enc?.code ?? (enc ? '(dict)' : 'none'));
    const widths = fdict.get(PDFName.of('Widths'));
    let wArr = null;
    if (widths) {
      const arr = ctx.lookup(widths);
      wArr = arr.asArray().map((x) => ctx.lookup(x).asNumber());
    }
    console.log(`  ${k}: subtype=${subtype} base=${base} FirstChar=${first} Encoding=${encName} Widths=${wArr ? wArr.length : 'NO'}`);
    if (wArr) {
      const few = [];
      for (let i = 0; i < Math.min(wArr.length, 14); i++) few.push(`${first + i}:${wArr[i]}`);
      console.log(`    widths[0..13]: ${few.join(' ')}`);
    }
    const tu = fdict.get(PDFName.of('ToUnicode'));
    if (tu) {
      const st = ctx.lookup(tu);
      const dec = decodePDFRawStream(st).decode();
      const txt = Array.from(dec, (b) => String.fromCharCode(b)).join('');
      const m = txt.match(/beginbfchar[\s\S]*?endbfchar/);
      console.log(`    ToUnicode bfchar: ${m ? m[0].replace(/[\s]+/g, ' ').slice(0, 800) : '(ninguno)'}`);
    }
    // Descendant /W para CID
    const dfRef = fdict.get(PDFName.of('DescendantFonts'));
    if (dfRef) {
      const df = ctx.lookup(dfRef).asArray()[0];
      const d = ctx.lookup(df);
      const w2 = d.get(PDFName.of('W'));
      if (w2) {
        const arr = ctx.lookup(w2).asArray().map((e) => ctx.lookup(e));
        const preview = [];
        for (let i = 0; i < Math.min(arr.length, 10); i++) {
          preview.push(arr[i]?.asNumber?.() ?? (arr[i].asArray?.() ? `[${arr[i].asArray().slice(0, 8).map((x) => ctx.lookup(x).asNumber()).join(',')}…]` : '?'));
        }
        console.log(`    /W (desc): ${preview.join(' ')}`);
      }
    }
  }
}
