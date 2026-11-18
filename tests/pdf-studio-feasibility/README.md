# Prueba de viabilidad · Edición real de texto PDF

Comprueba si se puede **modificar el texto original de un PDF** (content streams) con las
bibliotecas ya presentes en el proyecto (`pdf-lib` + extracción con `pdfjs-dist`), **sin
rectángulos blancos ni superposiciones**.

## Ejecutar

```bash
node tests/pdf-studio-feasibility/run-tests.mjs
```

Genera en `artifacts/`: fixtures (`F1`–`F4`), PDFs editados (`out-*.pdf`), `results.txt`
y `render-diff.txt` (items de texto con posiciones, proxy visual para comparar).

No necesita PDFs de clientes, fuentes privadas ni archivos excluidos de Git: los fixtures se
generan al vuelo y la TTF embebida sale de `node_modules/pdfjs-dist` (Liberation Sans).
`PDF_STUDIO_TEST_FONT=/ruta/fuente.ttf` permite usar otra TTF.

## Escenarios

| ID | Fixture | Qué prueba |
|----|---------|------------|
| S1 | F1 simple (Helvetica estándar, 2 páginas) | WinAnsi, español (áéíóúñ¡¿º), reemplazo más largo y más corto, página de control intacta |
| S2 | F2 TTF embebida completa (Liberation Sans, incluida en `pdfjs-dist`) | Reescritura de glifos hex, reemplazos de distinta longitud |
| S3 | F3 TTF embebida SUBSET (Liberation Sans) | Reemplazo usando solo glifos ya presentes en el subset |
| S4 | F3 (subset) | Glifos NUEVOS no usados → **fallo esperado** (limitación de subsets) |
| S5 | F4 PDF externo escrito a mano | Productor ajeno a pdf-lib: `Tj`, `TJ` con kerning, bytes WinAnsi crudos, estabilidad de posición |

## Cómo edita el motor (`engine.mjs`)

1. Decodifica el content stream de cada página.
2. Localiza operadores `Tj`/`TJ` y sus cadenas (literales WinAnsi o hex de glifos).
3. Sustituye el texto codificado y compensa el ancho con un ajuste numérico `TJ`
   para que el resto de la línea no se desplace.
4. Re-embebe el `FontFile2` extraído solo para codificar/medir y lo elimina del
   documento resultante.

## Alcance

Prueba aislada: no toca código de la app, ni autenticación, ni Stripe, ni límites,
ni PWA/service workers, ni Monetag, ni menú/portada. No se hace commit, push ni deploy.

## PDFs reales (verificación de la causa reportada)

`repro-real.mjs` descarga/usa PDFs reales de distintos productores y verifica el fallo
original (“no se encontró el texto con la codificación esperada”):

- `real0.pdf` (pdfobject.com, Acrobat/pdfFactory): texto literal WinAnsi/MacRoman de
  1 byte sobre fuentes TrueType **subsets muy pequeños** (11–19 glifos).
- `real1.pdf` (W3C dummy, Acrobat): subset TrueType de 1 byte con `ToUnicode`, donde
  una palabra se dibuja fragmentada en varios `Tj`: `<01020303> Tj 50.1 0 Td <04> Tj …`.
- `real2.pdf` (arXiv, pdflatex): arrays `TJ` con kerning por palabra y fuentes Type1
  estándar no embebidas.

Causas confirmadas (diagnóstico instrumentado del motor):
1. El motor re-embebía toda TrueType como CID de 2 bytes, pero muchos PDFs reales usan
   códigos de **1 byte** → los bytes comparados nunca coinciden.
2. Las palabras se **fragmentan** entre `Tj`/`TJ` y `Td` → ninguna cadena unitaria
   contenía la palabra completa.
3. Los subsets reales **no contienen glifos para letras nuevas** (p. ej. `real0` sin `M`,
   `d`, `v`, `r`, `t`, `o`) → el motor debe rechazar la sustitución (no escribir `.notdef`).

`repro-real-browser.mjs` reejecuta los mismos casos contra `artifacts/engine-browser.bundle.mjs`
(el motor de la app transpilado con esbuild). `pages-intact.mjs` verifica que las páginas
no editadas conservan sus content streams byte a byte.

