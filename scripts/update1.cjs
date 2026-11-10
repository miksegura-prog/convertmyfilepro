const fs = require('fs');
const SJ = JSON.stringify;
const DIR = 'src/blog/posts/';

function updateContent(slug, newESContent, newENContent) {
  const file = DIR + slug + '-guide.ts';
  let code = fs.readFileSync(file, 'utf8');
  
  code = code.replace(
    /(es: \{[\s\S]*?content: )"[^"]*"(,[\s\S]*?en: \{[\s\S]*?content: )"[^"]*"([\s\S]*?\};)/,
    (match, pre1, mid, post1) => {
      return pre1 + SJ(newESContent) + mid + SJ(newENContent) + post1;
    }
  );
  
  fs.writeFileSync(file, code, 'utf8');
  console.log('Updated: ' + slug);
}

// ====== 1. WAV to MP3 ======
updateContent('convertir-wav-a-mp3-navegador',
  '# Como Convertir WAV a MP3: Guia Completa\n\nLos archivos WAV ocupan mucho espacio porque almacenan el audio sin compresion. Un audio de 3 minutos puede pesar mas de 30 MB. Al convertirlo a MP3 reduces el tamano hasta un 90%.\n\n## Por que convertir WAV a MP3?\n\n### Ahorro de espacio\nWAV: ~10 MB/minuto. MP3 a 192 kbps: ~1.5 MB/minuto. Ahorras hasta un 85%.\n\n### Compatibilidad universal\nEl MP3 funciona en todos los dispositivos del mercado: smartphones, tablets, reproductores, consolas, televisiones y software de edicion.\n\n### Calidad ajustable\nElige entre 128 kbps (ideal para voz y podcasts) o 192 kbps (calidad optima para musica). A 192 kbps, la mayoria no nota la diferencia con el WAV original.\n\n## Como convertir paso a paso\n\n1. Abre nuestro **Convertidor WAV a MP3** (/wav-to-mp3)\n2. Arrastra tu archivo WAV o haz clic para seleccionarlo (max 50 MB)\n3. Elige la calidad: 128 kbps para voz, 192 kbps para musica\n4. Haz clic en Convertir y espera unos segundos\n5. Descarga tu MP3 listo para usar\n\n## Tabla: WAV vs MP3\n\n| Caracteristica | WAV | MP3 |\n|---|---|---|\n| Peso/minuto | ~10 MB | ~1.5 MB |\n| Calidad | Sin perdida | Con perdida |\n| Compresion | Ninguna | Alta |\n| Ideal para | Edicion | Uso diario |\n\n## Preguntas frecuentes\n\n### Se pierde calidad?\nSi, pero a 192 kbps la diferencia audible es minima para el oido medio.\n\n### Es seguro?\n**Completamente.** El procesamiento ocurre en tu navegador. Tus archivos nunca se suben a ningun servidor.\n\n## Conclusion\nPrueba nuestro **Convertidor WAV a MP3** (/wav-to-mp3) y libera espacio en tu dispositivo.\n\n> [Convierte tu primer WAV a MP3 ahora](/wav-to-mp3)',
  '# How to Convert WAV to MP3: Complete Guide\n\nWAV files take up lots of space because they store audio without compression. A 3-minute audio can weigh over 30 MB. Converting to MP3 reduces size by up to 90%.\n\n## Why Convert WAV to MP3?\n\n### Space savings\nWAV: ~10 MB/min. MP3 at 192 kbps: ~1.5 MB/min. Save up to 85%.\n\n### Universal compatibility\nMP3 works on every device: smartphones, tablets, media players, consoles, smart TVs, and editing software.\n\n### Adjustable quality\nChoose 128 kbps (ideal for voice and podcasts) or 192 kbps (optimal for music). At 192 kbps, most people cant tell the difference from the original WAV.\n\n## Step by Step\n\n1. Open our **WAV to MP3 Converter** (/wav-to-mp3)\n2. Drag your WAV file or click to select (max 50 MB)\n3. Choose quality: 128 kbps for voice, 192 kbps for music\n4. Click Convert and wait a few seconds\n5. Download your MP3 ready to use\n\n## Table: WAV vs MP3\n\n| Feature | WAV | MP3 |\n|---|---|---|\n| Size/min | ~10 MB | ~1.5 MB |\n| Quality | Lossless | Lossy |\n| Compression | None | High |\n| Best for | Editing | Daily use |\n\n## FAQ\n\n### Does it lose quality?\nYes, but at 192 kbps the audible difference is minimal for average ears.\n\n### Is it safe?\n**Completely.** Processing happens in your browser. Your files never get uploaded.\n\n## Conclusion\nTry our **WAV to MP3 Converter** (/wav-to-mp3) and free up space on your device.\n\n> [Convert your first WAV to MP3 now](/wav-to-mp3)'
);