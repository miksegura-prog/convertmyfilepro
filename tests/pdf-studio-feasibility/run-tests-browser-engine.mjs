// run-tests-browser-engine.mjs — Verifica que el PORT del motor al navegador
// (`src/lib/pdf-studio/pdfEditEngine.ts`) se comporta igual que el motor original
// de la prueba de viabilidad. Se transpila el motor TS con esbuild (mismo bundler
// que usa Vite) y se reejecutan los 5 escenarios S1–S5 con las mismas comprobaciones.
// Los archivos originales de la prueba NO se modifican.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { PDFDocument as PDFDocForMetrics, StandardFonts as SF } from 'pdf-lib';
import { buildFixtures } from './fixtures.mjs';
import { extractPages } from './extract.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(DIR, 'artifacts');
const ROOT = path.resolve(DIR, '..', '..');
fs.mkdirSync(ART, { recursive: true });

const norm = (s) => s.normalize('NFC').replace(/\s+/g, '');

// 1) Transpilar el motor del navegador con esbuild (el bundler de Vite).
const bundlePath = path.join(ART, 'engine-browser.bundle.mjs');
await build({
  entryPoints: [path.join(ROOT, 'src', 'lib', 'pdf-studio', 'pdfEditEngine.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundlePath,
  logLevel: 'silent',
});
const { editPdf } = await import(pathToFileURL(bundlePath).href);

// Métricas Helvetica para el respaldo geométrico del ancla de S5.
const metricsDoc = await PDFDocForMetrics.create();
const helvMetrics = await metricsDoc.embedFont(SF.Helvetica);
const w12 = (s) => helvMetrics.widthOfTextAtSize(s, 12);

const SCENARIOS = [
  {
    id: 'S1 · Helvetica estándar (WinAnsi): español, reemplazo más largo y más corto',
    fixture: 'F1-simple-helvetica.pdf',
    edits: [
      { page: 0, find: 'zorro', replace: 'conejillo de indias' },
      { page: 0, find: '2026-001', replace: '2027-9' },
      { page: 0, find: '¡qué ilusión, corazón!', replace: '¡vaya lío, ñandú!' },
    ],
    removed: ['zorro', '2026-001', '¡qué ilusión, corazón!'],
    added: ['conejillo de indias', '2027-9', '¡vaya lío, ñandú!'],
    chars: ['ñ', 'á', 'é', 'í', 'ó', 'ú', '¡', '¿', 'º'],
    anchors: [],
  },
  {
    id: 'S2 · TTF embebida COMPLETA (Liberation Sans): sustitución real por glifos (más largo y más corto)',
    fixture: 'F2-embedded-full.pdf',
    edits: [
      { page: 0, find: 'rápido', replace: 'pausadamente' },
      { page: 0, find: '456', replace: '789012' },
    ],
    removed: ['rápido', '456'],
    added: ['pausadamente', '789012'],
    chars: ['ñ', 'Ñ', 'ó', 'ü'],
    anchors: [],
  },
  {
    id: 'S3 · TTF embebida SUBSET (Liberation Sans): reemplazo solo con glifos ya usados en el documento',
    fixture: 'F3-embedded-subset.pdf',
    edits: [{ page: 0, find: 'rápido', replace: 'ápidos' }],
    removed: ['rápido'],
    added: ['ápidos'],
    chars: ['ñ', 'Ñ'],
    anchors: [],
  },
  {
    id: 'S4 · TTF embebida SUBSET (Liberation Sans): glifos nuevos NO presentes (se espera fallo)',
    fixture: 'F3-embedded-subset.pdf',
    edits: [{ page: 0, find: '456', replace: '789012' }],
    removed: [],
    added: ['789012'],
    kept: ['456'],
    chars: [],
    anchors: [],
    expectedFail: true,
  },
  {
    id: 'S5 · PDF externo (no generado con pdf-lib): Tj + TJ con kerning, WinAnsi crudo',
    fixture: 'F4-foreign-minimal.pdf',
    edits: [
      { page: 0, find: 'mundo', replace: 'universo entero' },
      { page: 0, find: 'externo', replace: 'propio' },
      { page: 0, find: 'AV', replace: 'OV' },
    ],
    removed: ['mundo', 'externo', 'AV'],
    added: ['universo entero', 'propio', 'OV'],
    chars: ['ñ', '¡', '¿', '—'],
    anchors: [{ text: 'Kerning', fallbackX: () => 60 }],
  },
];

const FIXTURES = await buildFixtures(ART);
for (const [name, bytes] of Object.entries(FIXTURES)) {
  fs.writeFileSync(path.join(ART, name), bytes);
}
const summary = [];
let allOk = true;

for (const sc of SCENARIOS) {
  summary.push(`\n### ${sc.id}`);
  try {
    const src = fs.readFileSync(path.join(ART, sc.fixture));
    const { bytes, applied } = await editPdf(new Uint8Array(src), sc.edits, (l) => summary.push(`  ${l}`));
    fs.writeFileSync(path.join(ART, `out-browser-${sc.fixture}`), bytes);
    const orig = await extractPages(src);
    const edited = await extractPages(bytes);
    const fullE = edited.map((pg) => pg.map((i) => i.str).join(' ')).map(norm).join('');

    for (const a of applied) {
      summary.push(`  motor: ${JSON.stringify(a)}`);
      if (sc.expectedFail) {
        summary.push(`  ${a.error ? '✔' : '✘'} fallo esperado declarado por el motor`);
        if (!a.error) allOk = false;
      } else if (a.error) {
        summary.push(`  ✘ error inesperado del motor: ${a.error}`);
        allOk = false;
      }
    }
    for (const r of sc.removed ?? []) {
      const ok = !fullE.includes(norm(r));
      summary.push(`  ${ok ? '✔' : '✘'} texto antiguo ausente de la extracción: "${r}"`);
      if (!ok) allOk = false;
    }
    for (const k of sc.kept ?? []) {
      const ok = fullE.includes(norm(k));
      summary.push(`  ${ok ? '✔' : '✘'} texto original conservado (el motor se niega a romperlo): "${k}"`);
      if (!ok) allOk = false;
    }
    for (const c of sc.chars ?? []) {
      const ok = fullE.includes(c);
      summary.push(`  ${ok ? '✔' : '✘'} carácter español extraíble: "${c}"`);
      if (!ok) allOk = false;
    }

    for (const a of sc.added ?? []) {
      if (sc.expectedFail) continue; // el fallo es esperado: el texto nuevo NO debe aparecer
      const ok = fullE.includes(norm(a));
      summary.push(`  ${ok ? '✔' : '✘'} texto nuevo presente y seleccionable: "${a}"`);
      if (!ok) allOk = false;
    }

    const subs = [...sc.edits.map((e) => e.find), ...sc.edits.map((e) => e.replace)].filter(Boolean);
    const stripSubs = (text) => subs.reduce((t, x) => t.split(x).join(''), text);
    const resid = (pp) => JSON.stringify(pp.map((pg) => norm(stripSubs(pg.map((i) => i.str).join(' ')))));
    const same = resid(orig) === resid(edited);
    summary.push(`  ${same ? '✔' : '✘'} resto del documento sin cambios (extracción)`);
    if (!same) allOk = false;

    for (const a of sc.anchors ?? []) {
      const findItem = (pp) => pp.flat().find((i) => norm(i.str).startsWith(norm(a.text)));
      const o = findItem(orig);
      const e = findItem(edited);
      let ok = false;
      let dxLabel = 'n/a';
      if (o && e) {
        const dx = e.x - o.x;
        dxLabel = dx.toFixed(2);
        ok = Math.abs(dx) < 1.5 && Math.abs(o.y - e.y) < 1.5;
      } else if (e && typeof a.fallbackX === 'function') {
        const dx = e.x - a.fallbackX();
        dxLabel = `vs teórico ${dx.toFixed(2)}`;
        ok = Math.abs(dx) < 3;
      }
      summary.push(`  ${ok ? '✔' : '✘'} posición estable tras editar (ancla "${a.text}", Δx=${dxLabel})`);
      if (!ok) allOk = false;
    }
  } catch (err) {
    const msg = String((err && err.stack) || err);
    // Igual que en run-tests.mjs: un aborto por glifo ausente es la negativa esperada de S4.
    if (sc.expectedFail && /glifo no disponible en la fuente embebida subset/i.test(msg)) {
      summary.push('  ✔ el motor aborta con error de glifo ausente (negativa esperada)');
    } else {
      summary.push(`  ✘ ERROR: ${msg.split('\n')[0]}`);
      allOk = false;
    }
  }
}

console.log('=== VERIFICACIÓN DEL PORT DEL MOTOR AL NAVEGADOR (pdfEditEngine.ts) ===');
for (const line of summary) console.log(line);
console.log('\nResultado global:', allOk
  ? 'OK — el port se comporta igual que el motor original de la prueba.'
  : 'FALLO — hay diferencias respecto al motor original (ver arriba).');
console.log('Artefactos en:', ART);
fs.writeFileSync(path.join(ART, 'results-browser-engine.txt'), summary.join('\n') + '\n');
process.exit(allOk ? 0 : 1);
