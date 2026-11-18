// fixtures.mjs — Genera los PDF de prueba con pdf-lib (+ un PDF "externo" escrito a mano).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts } from 'pdf-lib';

// @pdf-lib/fontkit ya es dependencia del proyecto (package.json): se usa para medir/mapear glifos.
const reqFromHere = createRequire(import.meta.url);
const fontkit = reqFromHere('@pdf-lib/fontkit');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Fuente TTF para los fixtures F2/F3. NO se versiona ninguna fuente en el repo:
// se usa la Liberation Sans que ya distribuye pdfjs-dist (dependencia del proyecto).
// PDF_STUDIO_TEST_FONT permite usar otra TTF local sin tocar el código.
const FONT_CANDIDATES = [
  process.env.PDF_STUDIO_TEST_FONT,
  path.join(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts', 'LiberationSans-Regular.ttf'),
  'C:\\Windows\\Fonts\\arial.ttf', // respaldo local (no versionado)
].filter(Boolean);
const FONT_SRC = FONT_CANDIDATES.find((p) => fs.existsSync(p));

if (!FONT_SRC) {
  throw new Error(
    'No se encontró ninguna TTF para los fixtures F2/F3. Ejecuta `npm install` o define PDF_STUDIO_TEST_FONT.',
  );
}


// PDF mínimo generado SIN pdf-lib (productor externo), content stream sin comprimir,
// bytes WinAnsi crudos (>0x7E) dentro de las cadenas, Tj simple y TJ con kerning.
function makeForeignPdf() {
  const contentStr = [
    'BT /F1 14 Tf 1 0 0 1 60 780 Tm (Hola mundo \x97 PDF externo v1.2) Tj ET',
    'BT /F1 12 Tf 1 0 0 1 60 760 Tm [(Kerning: ) -400 (WAV) 400 (e texto final)] TJ ET',
    'BT /F1 12 Tf 1 0 0 1 60 740 Tm (Revisi\xF3n: a\xF1o \xF1o\xF1o \xA1ol\xE9! \xBFves?) Tj ET',
    '',
  ].join('\n');
  const content = Buffer.from(contentStr, 'latin1');

  const bodies = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>',
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>',
    `<< /Length ${content.length} >>\nstream\n${contentStr}endstream`,
  ];

  const chunks = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets = [];
  let len = chunks[0].length;
  bodies.forEach((b, i) => {
    offsets.push(len);
    const obj = Buffer.from(`${i + 1} 0 obj\n${b}\nendobj\n`, 'latin1');
    chunks.push(obj);
    len += obj.length;
  });
  const xrefPos = len;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`;
  const trailer = `trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`;
  chunks.push(Buffer.from(xref + trailer, 'latin1'));
  return Buffer.concat(chunks);
}

export async function buildFixtures(artDir) {
  const files = {};
  fs.copyFileSync(FONT_SRC, path.join(artDir, 'fixture-font.ttf'));
  const embeddedTtf = fs.readFileSync(path.join(artDir, 'fixture-font.ttf'));

  // F1 · Helvetica estándar (WinAnsi), 2 páginas: español, longitudes distintas, página de control.
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p1 = doc.addPage([595, 842]);
    ['El zorro ágil salta sobre el perro perezoso.',
     'Factura N.º 2026-001 Total: 1.250,50',
     'Año ñoño: ¡qué ilusión, corazón!'].forEach((t, i) => {
      p1.drawText(t, { x: 60, y: 760 - i * 22, size: 12, font });
    });
    const p2 = doc.addPage([595, 842]);
    p2.drawText('Página dos sin cambios.', { x: 60, y: 760, size: 12, font });
    p2.drawText('Texto de control: áéíóú Ñ ¡¿', { x: 60, y: 738, size: 12, font });
    files['F1-simple-helvetica.pdf'] = await doc.save();
  }

  // F2/F3 · TTF arial embebida (completa y subset). Los objetivos de edición se dibujan
  // como drawText independientes para que cada uno sea un token hex de glifos aislado.
  for (const [name, subset] of [['F2-embedded-full.pdf', false], ['F3-embedded-subset.pdf', true]]) {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(embeddedTtf, { subset });
    const size = 14;
    const page = doc.addPage([595, 842]);
    const seg = (parts, y) => {
      let x = 60;
      for (const t of parts) {
        page.drawText(t, { x, y, size, font });
        x += font.widthOfTextAtSize(t, size);
      }
    };
    seg(['El pingüino ñoño viaja ', 'rápido', '. Hoy hay sol.'], 760);
    if (!subset) seg(['Código: ', 'Ñ', '-', '456', '.'], 738);
    else seg(['Código: ', 'Ñ', '-', '456', ' ñ s á p í d o.'], 738);
    files[name] = await doc.save();
  }

  files['F4-foreign-minimal.pdf'] = makeForeignPdf();
  return files;
}
