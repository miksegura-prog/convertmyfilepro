// repro-real.mjs — Reproduce el fallo real: extrae con PDF.js y aplica el motor actual
// sobre PDFs reales descargados. Imprime extracción, resultado del motor y diagnóstico.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPages } from './extract.mjs';
import { editPdf, diagReset } from './engine.mjs';
import { skipIfMissingRealPdfs } from './real-fixtures.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(DIR, 'artifacts', 'real');

const CASES = [
  { file: 'real0.pdf', edits: [{ page: 0, find: 'Sample PDF', replace: 'ample PDF' }] },
  { file: 'real0.pdf', edits: [{ page: 0, find: 'fun', replace: 'lull' }] },
  { file: 'real0.pdf', edits: [{ page: 0, find: 'Lorem', replace: 'Lorem ipsum' }] },
  { file: 'real1.pdf', edits: [{ page: 0, find: 'PDF', replace: 'PFD' }] },
  { file: 'real2.pdf', edits: [{ page: 0, find: 'Attention', replace: 'Atencion' }] },
  { file: 'real2.pdf', edits: [{ page: 1, find: 'transduction', replace: 'transducciones' }] },
  // Sustitución imposible (glifo fuera del subset): el motor debe negarse sin tocar nada.
  { file: 'real0.pdf', edits: [{ page: 0, find: 'PDF', replace: 'MPD' }], expectGlyphError: true },
];
const ONLY = process.argv[2] !== undefined ? Number(process.argv[2]) : null;

skipIfMissingRealPdfs('repro-real.mjs');

for (const [ci, c] of CASES.entries()) {
  if (ONLY !== null && ci !== ONLY) continue;
  const src = fs.readFileSync(path.join(ART, c.file));
  const pages = await extractPages(src);
  const full = pages.flat().map((i) => i.str).join(' ');
  console.log(`\n==== ${c.file} — página ${c.edits[0].page + 1} · “${c.edits[0].find}” → “${c.edits[0].replace}” ====`);
  console.log(`items PDF.js en la página: ${pages[c.edits[0].page]?.length ?? 0} de ${pages.length} páginas`);
  console.log(`texto: ${JSON.stringify(full.slice(0, 120))}`);
  const line = pages[c.edits[0].page].find((i) => i.str.includes(c.edits[0].find));
  console.log(`¿Item contiene el find?:`, line ? `sí (x=${line.x.toFixed(1)} y=${line.y.toFixed(1)} «${line.str}») ` : 'NO (split en varios items)');
  try {
    const log = (m) => console.log('  motor>', m);
    const lines = [];
    diagReset(lines);
    const { bytes, applied } = await editPdf(new Uint8Array(src), c.edits, log, { debug: true });
    const a = applied[0];
    const expectErr = c.expectGlyphError ? 'glifo no disponible' : null;
    console.log('resultado:', JSON.stringify({ count: a.count, error: a.error, found: a.found }));
    if (expectErr) {
      console.log(`  (esperado error de glifo: ${String(a.error).includes('glifo') && a.error && a.count === 0 ? 'OK' : 'MAL'})`);
      continue;
    }
    if (a.count > 0 && !a.error) {
      fs.writeFileSync(path.join(ART, `out-${c.file}`), bytes);
      const after = await extractPages(bytes);
      const afterFull = after.flat().map((i) => i.str).join(' ');
      console.log(`post-edición contiene replace:`, afterFull.includes(c.edits[0].replace), `· contiene find:`, afterFull.includes(c.edits[0].find));
    }
  } catch (err) {
    console.log('ERROR del motor:', String((err && err.message) || err));
  }
}
