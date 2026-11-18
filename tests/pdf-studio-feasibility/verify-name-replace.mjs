// verify-name-replace.mjs — Verificación temporal del escenario real del usuario:
// sustituir "Name" por "Name Miguel Segura" (más largo), por "Nm" (más corto),
// conservación del resto del documento y no-destrucción del original.
// También demuestra la causa raíz del bug: PDF.js DETACHA el ArrayBuffer pasado
// a getDocument({ data }).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractPages } from './extract.mjs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(DIR, 'artifacts');
const ROOT = path.resolve(DIR, '..', '..');

// 1) Transpilar el motor REAL de la app.
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

const norm = (s) => s.normalize('NFC').replace(/\s+/g, '');
const allText = async (bytes) => norm((await extractPages(bytes)).map((pg) => pg.map((i) => i.str).join(' ')).join(''));

let failures = 0;
const check = (name, ok) => { console.log(`  ${ok ? '✔' : '✘'} ${name}`); if (!ok) failures += 1; };

// 2) Demo causa raíz: getDocument detacha el búfer.
{
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const p = doc.addPage([300, 120]);
  p.drawText('Name', { x: 40, y: 60, size: 12, font: f });
  const bytes = new Uint8Array(await doc.save());
  const before = bytes.length;
  await getDocument({ data: bytes }).promise; // sin copia
  const after = bytes.byteLength;
  console.log(`\n[Raíz] Uint8Array.byteLength antes getDocument: ${before} → después: ${after}`);
  check('PDF.js transfiere/detacha el búfer (byteLength queda 0)', after === 0);
}

// 3) Fixture con "Name" y texto de control.
const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const page = doc.addPage([400, 200]);
page.drawText('Nombre: Name', { x: 50, y: 150, size: 14, font });
page.drawText('Linea de control intacta', { x: 50, y: 100, size: 14, font });
const src = new Uint8Array(await doc.save());
const srcCopy = new Uint8Array(src);

const origText = await allText(src);
check('original contiene "Name"', origText.includes('Name'));
check('original contiene línea de control', origText.includes('Lineadecontrolintacta'));

// 4) Sustitución MÁS LARGA: Name → Name Miguel Segura
{
  const r = await editPdf(src, [{ page: 0, find: 'Name', replace: 'Name Miguel Segura' }], () => {});
  const applied = r.applied[0];
  const txt = await allText(r.bytes);
  console.log(`\n[Larga] applied: ${JSON.stringify(applied)}`);
  check('sin error del motor', !applied.error && applied.count > 0);
  check('"Name" ya no aparece como palabra independiente', !/(^|[^A-Za-z])Name([^A-Za-z]|$)/.test(txt));
  check('"NameMiguelSegura" aparece en el PDF resultante', txt.includes('NameMiguelSegura'));
  check('resto del documento conservado (línea de control)', txt.includes('Lineadecontrolintacta'));
  const pdf = await PDFDocument.load(r.bytes);
  check('resultado es un PDF válido', pdf.getPageCount() === 1);
}

// 5) Sustitución MÁS CORTA: Name → Nm
{
  const r = await editPdf(src, [{ page: 0, find: 'Name', replace: 'Nm' }], () => {});
  const applied = r.applied[0];
  const txt = await allText(r.bytes);
  console.log(`\n[Corta] applied: ${JSON.stringify(applied)}`);
  check('sin error del motor', !applied.error && applied.count > 0);
  check('"Nm" aparece en el PDF resultante', txt.includes('Nm'));
  check('"Name" ya no aparece', !txt.includes('Name'));
  check('resto del documento conservado (línea de control)', txt.includes('Lineadecontrolintacta'));
}

// 6) El PDF original NO se destruye ni se muta.
check('búfer original intacto tras las ediciones', new Uint8Array(srcCopy).every((b, i) => b === src[i]) && src.length === srcCopy.length);

// 7) Error de edición no destruye el original: reemplazo imposible (texto ausente).
{
  const r = await editPdf(src, [{ page: 0, find: 'ZzZ', replace: 'X' }], () => {});
  const applied = r.applied[0];
  console.log(`\n[No encontrado] applied: ${JSON.stringify(applied)}`);
  check('el motor informa error controlado (no encontrado)', !!applied.error && applied.count === 0);
  const txt = await allText(src);
  check('original sigue intacto y sin modificaciones', txt === origText);
}

console.log('\n=== Resultado:', failures ? `FALLO (${failures})` : 'OK — escenario "Name → Name Miguel Segura" verificado', '===');
process.exit(failures ? 1 : 0);
