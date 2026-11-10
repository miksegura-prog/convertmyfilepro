const fs = require('fs');
const SJ = JSON.stringify;
const DIR = 'src/blog/posts/';
function upd(slug, esC, enC) {
  const file = DIR + slug + '-guide.ts';
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/(es: \{[\s\S]*?content: )"[^"]*"(,[\s\S]*?en: \{[\s\S]*?content: )"[^"]*"([\s\S]*?\};)/, (m, p1, p2, p3) => p1 + SJ(esC) + p2 + SJ(enC) + p3);
  fs.writeFileSync(file, code, 'utf8');
  console.log('OK: ' + slug);
}

// 6. Merge PDF
upd('unir-archivos-pdf-online-gratis',
  '# Como Unir PDF en Uno Solo\n\nTienes varios PDFs y necesitas unirlos? Nuestra herramienta te permite combinar hasta 10 archivos en un solo documento.\n\n## Paso a paso\n1. Abre **Unir PDF** (/merge-pdf)\n2. Arrastra hasta 10 PDFs\n3. Reordena los archivos si es necesario\n4. Haz clic en Unir\n5. Descarga el PDF unico\n\n## Ventajas\n- Unifica documentos relacionados\n- Facil de compartir un solo archivo\n- Gratis y sin registro\n\n> [Une tus PDFs ahora](/merge-pdf)',
  '# How to Merge PDFs Into One\n\nHave several PDFs you need to combine? Our tool lets you merge up to 10 files into one document.\n\n## Step by Step\n1. Open **Merge PDF** (/merge-pdf)\n2. Drag up to 10 PDFs\n3. Reorder files if needed\n4. Click Merge\n5. Download the single PDF\n\n## Benefits\n- Unify related documents\n- Easy to share one file\n- Free and no registration\n\n> [Merge your PDFs now](/merge-pdf)'
);

// 7. Split PDF
upd('dividir-paginas-pdf-extraer-documentos',
  '# Como Dividir un PDF\n\nNecesitas solo algunas paginas de un PDF grande? Divide tu documento y extrae solo lo que necesitas.\n\n## Paso a paso\n1. Abre **Dividir PDF** (/split-pdf)\n2. Arrastra tu PDF (max 50 MB)\n3. Elige las paginas: rango, pares/impares o todas\n4. Descarga las paginas extraidas\n\n## Opciones\n- Rango: 1-5, 10-20\n- Pares o impares\n- Cada pagina individual\n\n> [Divide tu PDF ahora](/split-pdf)',
  '# How to Split a PDF\n\nNeed only some pages from a large PDF? Split your document and extract what you need.\n\n## Step by Step\n1. Open **Split PDF** (/split-pdf)\n2. Drag your PDF (max 50 MB)\n3. Choose pages: range, even/odd, or all\n4. Download extracted pages\n\n## Options\n- Range: 1-5, 10-20\n- Even or odd pages\n- Each individual page\n\n> [Split your PDF now](/split-pdf)'
);

// 8. JPG to PDF
upd('convertir-imagenes-jpg-a-pdf-alta-calidad',
  '# Como Convertir Imagenes a PDF\n\nConvierte varias fotos JPG o PNG en un solo documento PDF de forma rapida y sencilla.\n\n## Paso a paso\n1. Abre **JPG a PDF** (/jpg-to-pdf)\n2. Arrastra hasta 20 imagenes\n3. Reordena si es necesario\n4. Elige orientacion y margenes\n5. Descarga tu PDF\n\n## Caracteristicas\n- Hasta 20 imagenes por conversion\n- Soporta JPG y PNG\n- Calidad original sin perdida\n- Reordenar por arrastre\n\n> [Convierte ahora](/jpg-to-pdf)',
  '# How to Convert Images to PDF\n\nConvert multiple JPG or PNG photos into a single PDF document quickly and easily.\n\n## Step by Step\n1. Open **JPG to PDF** (/jpg-to-pdf)\n2. Drag up to 20 images\n3. Reorder if needed\n4. Choose orientation and margins\n5. Download your PDF\n\n## Features\n- Up to 20 images per conversion\n- Supports JPG and PNG\n- Original quality no loss\n- Drag and drop reordering\n\n> [Convert now](/jpg-to-pdf)'
);