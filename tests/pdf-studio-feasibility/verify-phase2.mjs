// verify-phase2.mjs — Verificación de las funciones añadidas en la Fase 2 de PDF Studio:
// 1) `checkEditOverflow`: detecta reemplazos que superan el ancho/margen ANTES de aplicar.
// 2) `addTextToPdf` con tipografía (fuente, tamaño, color) → contenido real, seleccionable.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { extractPages } from './extract.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ART = path.join(DIR, 'artifacts');
const ROOT = path.resolve(DIR, '..', '..');
fs.mkdirSync(ART, { recursive: true });

// 1) Transpilar el motor del navegador (el bundler de Vite).
const bundlePath = path.join(ART, 'engine-browser.bundle.mjs');
await build({
  entryPoints: [path.join(ROOT, 'src', 'lib', 'pdf-studio', 'pdfEditEngine.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundlePath,
  logLevel: 'silent',
});
const engine = await import(pathToFileURL(bundlePath).href);
const { editPdf, addTextToPdf, verifyPdfBytes, checkEditOverflow } = engine;

let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name} ${extra}`); }
};

// --- Fixture: página de 595×842 (A4). Texto corto en x=40; texto largo con origen
//     desplazado a la derecha (x=300) para provocar desbordamiento con reemplazos largos.
const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const page = doc.addPage([595, 842]);
page.drawText('Nombre: Ana', { x: 40, y: 760, size: 14, font });
page.drawText('Palabra: zorro', { x: 300, y: 700, size: 14, font });
const src = new Uint8Array(await doc.save());
fs.writeFileSync(path.join(ART, 'phase2-fixture.pdf'), src);

console.log('\n=== FASE 2 · checkEditOverflow (advertencia de ancho/margen) ===');

// Reemplazo CORTITO dentro de "zorro" (en x=300, sin riesgo): NO debe avisar.
const shortCheck = await checkEditOverflow(src, { page: 0, find: 'zorro', replace: 'oso' });
check('reemplazo más corto → sin aviso', shortCheck === null, JSON.stringify(shortCheck));

// Reemplazo LARGO dentro de "zorro" (origen x=300): debe avisar (page o line).
const longCheck = await checkEditOverflow(src, { page: 0, find: 'zorro', replace: 'hipopotamo encantador' });
check('reemplazo mucho más largo → aviso de desbordamiento', !!longCheck, JSON.stringify(longCheck));

// Reemplazo largo en "Ana" (x=40, hay sitio hasta el margen derecho): aún así puede
// superar la extensión de la línea (line) si es exagerado; comprobamos que el check
// devuelve algo coherente (null si cabe).
const midCheck = await checkEditOverflow(src, { page: 0, find: 'Ana', replace: 'Anastasia' });
check('reemplazo medio sin exceder página → sin aviso de página', !midCheck || midCheck.kind === 'line', JSON.stringify(midCheck));

// La sustitución en sí sigue funcionando (aplicar de todos modos).
const applied = await editPdf(src, [{ page: 0, find: 'zorro', replace: 'lince veloz' }], () => {});
check('editPdf sigue aplicando sustituciones', applied.applied[0].count === 1 && !applied.applied[0].error, JSON.stringify(applied.applied[0]));
check('verifyPdfBytes acepta el resultado', await verifyPdfBytes(applied.bytes));

console.log('\n=== FASE 2 · addTextToPdf con tipografía (fuente/tamaño/color) ===');
const { bytes: styledBytes, added } = await addTextToPdf(src, [
  { page: 0, text: 'NOTA ROJA COURIER', x: 60, y: 120, size: 18, font: 'courier-bold', color: { r: 0.9, g: 0.1, b: 0.1 } },
  { page: 0, text: 'Nota azul Times', x: 60, y: 96, size: 14, font: 'times-roman', color: { r: 0.1, g: 0.2, b: 0.9 } },
  { page: 0, text: 'Nota por defecto', x: 60, y: 72, size: 12, font: 'helvetica' },
], () => {});
check(`addTextToPdf añadió ${added} textos`, added === 3, `added=${added}`);
check('resultado válido (verificación real)', await verifyPdfBytes(styledBytes));
fs.writeFileSync(path.join(ART, 'phase2-styled.pdf'), styledBytes);

// Extracción con pdfjs: el texto añadido debe ser contenido REAL y seleccionable.
// (En Node, pdfjs no carga los .pfb de Courier/Times; la extracción fiable es la de
// Helvetica. Para todas las fuentes verificamos además el content stream real.)
const extracted = await extractPages(styledBytes);
const joined = extracted.map((p) => p.map((it) => it.str).join('\n')).join('\n');
check('texto Helvetica añadido extraíble con pdfjs', joined.includes('Nota por defecto'), joined.slice(0, 200));
check('texto original intacto en la extracción', joined.includes('Nombre: Ana') && joined.includes('zorro'));

// Comprobación de contenido REAL en el content stream (operadores Tj/TJ): el texto
// añadido debe escribirse como operadores de texto, no como imagen ni overlay.
// pdf-lib escribe las cadenas como hex `<...>`; decodificamos para comparar.
const reloaded = await PDFDocument.load(styledBytes, { ignoreEncryption: true });
const page1 = reloaded.getPages()[0];
const ctx1 = page1.node.context;
const contentsRef = page1.node.get((await import('pdf-lib')).PDFName.of('Contents'));
const streamRefs = typeof contentsRef?.asArray === 'function' ? contentsRef.asArray() : [contentsRef];
let content = '';
for (const sr of streamRefs) {
  const s = ctx1.lookup(sr);
  if (s instanceof (await import('pdf-lib')).PDFRawStream) {
    content += Buffer.from((await import('pdf-lib')).decodePDFRawStream(s).decode()).toString('latin1');
  }
}
const hexTj = (s) => `<${Buffer.from(s, 'latin1').toString('hex').toUpperCase()}>`;
check('content stream contiene "NOTA ROJA COURIER" (Tj real)', content.includes(hexTj('NOTA ROJA COURIER')));
check('content stream contiene "Nota azul Times" (Tj real)', content.includes(hexTj('Nota azul Times')));
check('content stream contiene "Nota por defecto" (Tj real)', content.includes(hexTj('Nota por defecto')));
// Tipografía: fuentes estándar y colores aplicados como operadores PDF reales.
check('fuente Courier-Bold usada en el stream', content.includes('/Courier-Bold-'));
check('fuente Times-Roman usada en el stream', content.includes('/Times-Roman-'));
check('color rojo aplicado (0.9 0.1 0.1 rg)', content.includes('0.9 0.1 0.1 rg'));
check('color azul aplicado (0.1 0.2 0.9 rg)', content.includes('0.1 0.2 0.9 rg'));

console.log(`\nResultado: ${pass} ok, ${fail} fallos.`);
process.exit(fail > 0 ? 1 : 0);
