// repro-real-browser.mjs — Mismos casos reales contra el port del navegador (bundle).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { extractPages } from './extract.mjs';
import { skipIfMissingRealPdfs } from './real-fixtures.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(DIR, 'artifacts', 'real');

skipIfMissingRealPdfs('repro-real-browser.mjs');
if (!fs.existsSync(path.join(DIR, 'artifacts', 'engine-browser.bundle.mjs'))) {
  console.log('[omitido] repro-real-browser.mjs: falta artifacts/engine-browser.bundle.mjs (ejecuta antes run-tests-browser-engine.mjs).');
  process.exit(0);
}

const { editPdf } = await import(pathToFileURL(path.join(DIR, 'artifacts', 'engine-browser.bundle.mjs')).href);

const CASES = [
  { file: 'real0.pdf', edits: [{ page: 0, find: 'Sample PDF', replace: 'ample PDF' }] },
  { file: 'real0.pdf', edits: [{ page: 0, find: 'fun', replace: 'lull' }] },
  { file: 'real1.pdf', edits: [{ page: 0, find: 'PDF', replace: 'PFD' }] },
  { file: 'real2.pdf', edits: [{ page: 0, find: 'Attention', replace: 'Atencion' }] },
  { file: 'real2.pdf', edits: [{ page: 1, find: 'transduction', replace: 'transducciones' }] },
];

let fails = 0;
for (const c of CASES) {
  const src = fs.readFileSync(path.join(ART, c.file));
  const log = (m) => console.log('  motor>', m);
  const { bytes, applied } = await editPdf(new Uint8Array(src), c.edits, log);
  const a = applied[0];
  let ok = a.count > 0 && !a.error;
  if (ok) {
    const after = await extractPages(bytes);
    const afterFull = after.flat().map((i) => i.str).join(' ');
    const norm = (s) => s.normalize('NFC').replace(/\s+/g, '');
    const hasNew = norm(afterFull).includes(norm(c.edits[0].replace));
    const hasOld = norm(afterFull).includes(norm(c.edits[0].find));
    ok = hasNew;
    console.log(`${c.file} [${c.edits[0].find}→${c.edits[0].replace}] → count=${a.count} ok=${ok} (oldSigue=${hasOld}, found=${a.found})`);
  } else {
    console.log(`${c.file} [${c.edits[0].find}→${c.edits[0].replace}] → ERROR: ${a.error}`);
  }
  if (!ok) fails++;
}
console.log(fails === 0 ? '\nREALES (browser): TODO OK' : `\nREALES (browser): ${fails} FALLO(S)`);
process.exit(fails === 0 ? 0 : 1);
