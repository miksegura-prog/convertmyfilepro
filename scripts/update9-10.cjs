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

// 9. Compress Image
upd('comprimir-imagenes-web-sin-perder-nitidez',
  '# Como Comprimir Imagenes Sin Perder Calidad\n\nLas imagenes pesadas ralentizan tu web. Comprimelas hasta un 80% manteniendo la calidad visual.\n\n## Por que comprimir?\n- Webs mas rapidas y mejor SEO\n- Menos consumo de datos moviles\n- Correos electronicos mas ligeros\n\n## Paso a paso\n1. Abre **Comprimir Imagen** (/compress-image)\n2. Arrastra tu imagen (JPG, PNG, WebP, max 50 MB)\n3. Ajusta la calidad con el deslizador (80% recomendado)\n4. Descarga tu imagen optimizada\n\n## Tabla de compresion\n\n| Calidad | Reduccion | Uso |\n|---|---|---|\n| 90-100% | 10-30% | Impresion |\n| 70-80% | 50-70% | Web (recomendado) |\n| 50-60% | 70-85% | Redes sociales |\n\n## Consejos\n1. Redimensiona antes de comprimir\n2. Usa WebP para web (mejor compresion)\n3. Comprime desde el archivo original\n\n> [Comprime ahora](/compress-image)',
  '# How to Compress Images Without Losing Quality\n\nHeavy images slow down your website. Compress them up to 80% while maintaining visual quality.\n\n## Why compress?\n- Faster websites and better SEO\n- Less mobile data usage\n- Lighter email attachments\n\n## Step by Step\n1. Open **Compress Image** (/compress-image)\n2. Drag your image (JPG, PNG, WebP, max 50 MB)\n3. Adjust quality with slider (80% recommended)\n4. Download your optimized image\n\n## Compression Table\n\n| Quality | Reduction | Use |\n|---|---|---|\n| 90-100% | 10-30% | Print |\n| 70-80% | 50-70% | Web (recommended) |\n| 50-60% | 70-85% | Social media |\n\n## Tips\n1. Resize before compressing\n2. Use WebP for web (best compression)\n3. Compress from the original file\n\n> [Compress now](/compress-image)'
);

// 10. PNG vs JPG
upd('convertir-png-a-jpg-y-viceversa-guia-formatos',
  '# PNG vs JPG: Guia de Formatos\n\nDos formatos de imagen dominan la web. Conoce sus diferencias y cuando usar cada uno.\n\n## PNG: Ventajas\n- Transparencia: soporta canal alfa\n- Sin perdida: compresion lossless\n- Ideal para logos, iconos y graficos\n\n## JPG: Ventajas\n- Tamano reducido: buena compresion\n- Ideal para fotografias y degradados\n- Compatible universalmente\n\n## Tabla comparativa\n\n| Caracteristica | PNG | JPG |\n|---|---|---|\n| Transparencia | Si | No |\n| Compresion | Sin perdida | Con perdida |\n| Ideal para | Graficos, logos | Fotos, paisajes |\n| Tamano | Mayor | Menor |\n\n## Como convertir\n\n### PNG a JPG\nUsa nuestro **Convertidor PNG a JPG** (/png-to-jpg), ajusta la calidad y descarga.\n\n### JPG a PNG\nUsa nuestro **Convertidor JPG a PNG** (/jpg-to-png), obtienes transparencia.\n\n> [Convierte ahora](/png-to-jpg)',
  '# PNG vs JPG: Format Guide\n\nTwo image formats dominate the web. Know their differences and when to use each.\n\n## PNG: Advantages\n- Transparency: supports alpha channel\n- Lossless compression\n- Ideal for logos, icons and graphics\n\n## JPG: Advantages\n- Small size: good compression\n- Ideal for photographs and gradients\n- Universally compatible\n\n## Comparison Table\n\n| Feature | PNG | JPG |\n|---|---|---|\n| Transparency | Yes | No |\n| Compression | Lossless | Lossy |\n| Best for | Graphics, logos | Photos, landscapes |\n| Size | Larger | Smaller |\n\n## How to convert\n\n### PNG to JPG\nUse our **PNG to JPG Converter** (/png-to-jpg), adjust quality and download.\n\n### JPG to PNG\nUse our **JPG to PNG Converter** (/jpg-to-png), get transparency.\n\n> [Convert now](/png-to-jpg)'
);