# OCR 2.0 — comprobaciones antes de producción

**Rama:** `feature/ocr-v2-free-quality-pro-volume`  
**PR:** https://github.com/miksegura-prog/convertmyfilepro/pull/6

## Objetivo comercial

La única diferencia entre Free y PRO en la herramienta OCR es la **cantidad de imágenes o páginas PDF que se pueden procesar por día**.

- Free: **5 imágenes o páginas PDF al día**, en el navegador actual.
- PRO, Pro Beta y Owner: sin límite diario. 
- Modos de OCR, lenguas, contraste, rotación, PDF escaneado, lotes, edición, TXT y DOCX: **idénticos en Free y PRO**.
- Máximo técnico por operación para ambos: 10 archivos, 40 páginas/imágenes y 20 MB por archivo. Se pueden realizar varias operaciones.
- El contador Free usa almacenamiento local del navegador. **No es un límite resistente a borrado de datos, otros navegadores o cambios de dispositivo.** Exigir una cuota estricta requiere cuentas/sesiones y un backend antiabuso; este cambio no altera el sistema de autenticación ni Stripe.

## Verificaciones manuales

1. **Idioma:** usar una imagen en español con tildes y luego cambiar a inglés (y de vuelta a español). Confirmar que el motor utiliza el idioma elegido y que ya no reutiliza el idioma inicial.
2. **Dos idiomas:** probar Español + English con una imagen bilingüe.
3. **Contraste:** probar una foto de texto claro sobre fondo gris, con Automático, Original y Blanco y negro; confirmar que la opción agresiva no se impone a todas las imágenes.
4. **Rotación:** usar una imagen de texto girada 90º; elegir 90º/270º según corresponda.
5. **Bloques:** un documento con párrafos, una sola línea y una captura con texto disperso.
6. **Lote:** seleccionar tres JPG/PNG/WebP y comprobar tres resultados etiquetados por archivo.
7. **PDF escaneado:** subir un PDF con páginas de imagen; probar todas las páginas y luego seleccionar `1-3,5`. Cada página cuenta como una imagen.
8. **Límite Free:** procesar 5 imágenes, comprobar el contador y que la sexta esté bloqueada por volumen; volver mañana (fecha local) y comprobar que reinicia.
9. **PRO/Owner/Pro Beta:** abrir sesión válida y procesar más de 5 imágenes sin bloqueos por volumen. Ninguna función debe desaparecer o requerir pago.
10. **Exportación:** editar el resultado, copiarlo y descargar TXT y DOCX; comprobar tildes, saltos de línea y que Word pueda abrir el archivo.
11. **Procesamiento parcial:** detener un lote largo después de la página actual; comprobar que conserva el texto ya extraído y cuenta solo lo completado.
12. **Regresión:** comprobar que siguen funcionando WAV→MP3, compresión de vídeo y PDF Studio Beta. No modificar otras herramientas ni secretos.

## Despliegue

El código está en PR de borrador para revisión; no desplegar automáticamente.

```powershell
git status
git fetch origin
git switch --track origin/feature/ocr-v2-free-quality-pro-volume
npm run build
npx wrangler deploy --dry-run
```

Si la rama ya existe localmente: `git switch feature/ocr-v2-free-quality-pro-volume` y `git pull --ff-only`.

Probar preferentemente en el equipo local antes de `npm run deploy`. Después de validar, fusionar el PR contra la rama Owner y consolidar el PR de Owner contra `main` para que los despliegues posteriores no eliminen las nuevas funciones.

## Privacidad y limitaciones de OCR

El documento se procesa localmente en el navegador. Tesseract.js puede descargar los modelos de idioma al utilizar un idioma por primera vez, pero no envía las imágenes a un servicio externo. La calidad depende de la foto: escritura manual, tablas complejas, textos borrosos o columnas difíciles pueden requerir revisión manual. No hay inteligencia artificial de pago ni API OCR de terceros.
