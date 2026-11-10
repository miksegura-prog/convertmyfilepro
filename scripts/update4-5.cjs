const fs = require('fs');
const SJ = JSON.stringify;
const DIR = 'src/blog/posts/';
function updateContent(slug, esC, enC) {
  const file = DIR + slug + '-guide.ts';
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/(es: \{[\s\S]*?content: )"[^"]*"(,[\s\S]*?en: \{[\s\S]*?content: )"[^"]*"([\s\S]*?\};)/, (m, p1, p2, p3) => p1 + SJ(esC) + p2 + SJ(enC) + p3);
  fs.writeFileSync(file, code, 'utf8');
  console.log('OK: ' + slug);
}

updateContent('convertir-excel-xlsx-a-pdf-tablas-perfectas',
  '# Como Convertir XLSX a PDF\n\nComparte informes de Excel con formato perfecto convirtiendolos a PDF.\n\n## Por que convertir?\nEl PDF mantiene la apariencia exacta de tu hoja de calculo, se ve igual en todos los dispositivos.\n\n## Paso a paso\n1. Abre **Convertidor XLSX a PDF** (/xlsx-to-pdf)\n2. Arrastra tu .xlsx (max 50 MB)\n3. Conversion inteligente: tablas, graficos y formulas\n4. Descarga tu PDF\n\n## Consejos\n1. Define el area de impresion\n2. Elige orientacion horizontal para tablas anchas\n3. Revisa los saltos de pagina\n\n> [Convierte ahora](/xlsx-to-pdf)',
  '# How to Convert XLSX to PDF\n\nShare Excel reports with perfect formatting by converting to PDF.\n\n## Why convert?\nPDF keeps the exact appearance of your spreadsheet, looks the same on all devices.\n\n## Step by Step\n1. Open **XLSX to PDF Converter** (/xlsx-to-pdf)\n2. Drag your .xlsx (max 50 MB)\n3. Smart conversion: tables, charts and formulas\n4. Download your PDF\n\n## Tips\n1. Set print area\n2. Choose landscape for wide tables\n3. Check page breaks\n\n> [Convert now](/xlsx-to-pdf)'
);

updateContent('extraer-texto-de-imagenes-ocr-gratis',
  '# Guia Completa de OCR\n\nOCR convierte imagenes de texto en texto digital editable.\n\n## Que es OCR?\nAnaliza la imagen, identifica caracteres y los convierte en texto seleccionable.\n\n## Aplicaciones\n- Digitalizar documentos\n- Extraer datos de facturas\n- Accesibilidad\n- Traduccion\n\n## Paso a paso\n1. Abre **Extractor OCR** (/ocr)\n2. Sube tu imagen (JPG, PNG, WebP, max 20 MB)\n3. Selecciona idioma\n4. Extrae y copia el texto\n\n## Precision\n| Tipo | Precision |\n|---|---|\n| Escaneado 300 DPI | 98-99% |\n| Foto movil | 90-95% |\n| Captura pantalla | 95-99% |\n\n> [Extrae texto ahora](/ocr)',
  '# Complete OCR Guide\n\nOCR converts text images into editable digital text.\n\n## What is OCR?\nAnalyzes the image, identifies characters, converts them into selectable text.\n\n## Applications\n- Digitize documents\n- Extract invoice data\n- Accessibility\n- Translation\n\n## Step by Step\n1. Open **OCR Text Extractor** (/ocr)\n2. Upload your image (JPG, PNG, WebP, max 20 MB)\n3. Select language\n4. Extract and copy text\n\n## Accuracy\n| Type | Accuracy |\n|---|---|\n| Scanned 300 DPI | 98-99% |\n| Phone photo | 90-95% |\n| Screenshot | 95-99% |\n\n> [Extract text now](/ocr)'
);