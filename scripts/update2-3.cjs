const fs = require('fs');
const SJ = JSON.stringify;
const DIR = 'src/blog/posts/';
function updateContent(slug, newESContent, newENContent) {
  const file = DIR + slug + '-guide.ts';
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/(es: \{[\s\S]*?content: )"[^"]*"(,[\s\S]*?en: \{[\s\S]*?content: )"[^"]*"([\s\S]*?\};)/, (m, p1, p2, p3) => p1 + SJ(newESContent) + p2 + SJ(newENContent) + p3);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Updated: ' + slug);
}

// 2. Compress Video
updateContent('comprimir-video-para-whatsapp-sin-perder-calidad',
  '# Como Comprimir Videos para WhatsApp\n\nWhatsApp limita los videos a 16 MB. La solucion es comprimirlos.\n\n## Por que el limite?\nVelocidad, almacenamiento y fiabilidad.\n\n## Paso a paso\n1. Abre **Comprimir Video para WhatsApp** (/compress-video-whatsapp)\n2. Arrastra tu video (max 300 MB)\n3. Elige modo Automatico o Personalizado\n4. Descarga y comparte\n\n| Original | Comprimido |\n|---|---|\n| 120 MB | 14.5 MB |\n| 4K | 480p |\n\n## Consejos\n1. Reduce a 480p\n2. Usa H.264\n3. Recorta lo innecesario\n\n> [Comprime ahora](/compress-video-whatsapp)',
  '# How to Compress Videos for WhatsApp\n\nWhatsApp limits videos to 16 MB. The solution is compression.\n\n## Why the limit?\nSpeed, storage, and reliability.\n\n## Step by Step\n1. Open **Compress Video for WhatsApp** (/compress-video-whatsapp)\n2. Drag your video (max 300 MB)\n3. Choose Auto or Custom mode\n4. Download and share\n\n| Original | Compressed |\n|---|---|\n| 120 MB | 14.5 MB |\n| 4K | 480p |\n\n## Tips\n1. Reduce to 480p\n2. Use H.264\n3. Trim unnecessary parts\n\n> [Compress now](/compress-video-whatsapp)'
);

// 3. DOCX to PDF
updateContent('convertir-word-docx-a-pdf-sin-word',
  '# Como Convertir DOCX a PDF Sin Word\n\nConvierte tus documentos a PDF sin Microsoft Word.\n\n## Por que convertir?\nFormato universal, seguro y ligero.\n\n## Paso a paso\n1. Abre **Convertidor DOCX a PDF** (/docx-to-pdf)\n2. Arrastra tu .docx (max 50 MB)\n3. Conversion automatica\n4. Descarga tu PDF\n\n| DOCX | PDF |\n|---|---|\n| Editable | Solo lectura |\n| Requiere Word | Cualquier lector |\n| Tamano mayor | Tamano menor |\n\n> [Convierte ahora](/docx-to-pdf)',
  '# How to Convert DOCX to PDF Without Word\n\nConvert your documents to PDF without Microsoft Word.\n\n## Why convert?\nUniversal format, secure and lightweight.\n\n## Step by Step\n1. Open **DOCX to PDF Converter** (/docx-to-pdf)\n2. Drag your .docx (max 50 MB)\n3. Auto conversion\n4. Download your PDF\n\n| DOCX | PDF |\n|---|---|\n| Editable | Read only |\n| Needs Word | Any reader |\n| Larger size | Smaller size |\n\n> [Convert now](/docx-to-pdf)'
);