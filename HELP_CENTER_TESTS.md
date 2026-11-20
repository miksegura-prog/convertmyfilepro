# Centro de ayuda bilingüe — comprobaciones antes de publicar

La nueva página `/faq` presenta **70 preguntas en 12 categorías** en español e inglés, basadas en las rutas, límites, herramientas y flujos que existen en el repositorio. Se ha actualizado el FAQ corto por herramienta para evitar garantías absolutas sobre privacidad o tamaños.

## Revisiones automáticas

- GitHub Actions: `npm run build` debe pasar.
- Verificación: Vercel debe notificar estado correcto.
- Archivos: `src/data/helpFaqEs.json` y `src/data/helpFaqEn.json` contienen los mismos 70 identificadores y categorías.

## Comprobaciones en navegador

1. Detener Vite Dev si está bloqueado en Windows y usar **`npm run build`** + **`npx vite preview --host 127.0.0.1 --port 4173`** (la vista previa no utiliza la caché problemática).
2. Abrir `http://127.0.0.1:4173/faq`. Confirmar 70 preguntas, 12 categorías, búsqueda y acordeones.
3. Buscar `wav`, `OCR`, `50 MB`, `Brevo` y `suscripción`. Verificar que la búsqueda filtra por contenido, también tras cambiar categoría.
4. Cambiar el idioma en el encabezado; revisar que pregunta, respuesta, categoría y estado de búsqueda cambian a inglés/español y no hay cadenas sin traducir.
5. Revisar enlaces `Abrir herramienta / Open tool` para OCR, audio, vídeo, documentos, PDF, pagos y términos; confirmar que los destinos son correctos.
6. Confirmar acceso desde **Ayuda** en navegación de escritorio y móvil, pie de página y enlace bajo el FAQ corto de cada conversor.
7. Comprobar en el navegador el título/SEO canónico `https://www.convertmyfilepro.com/faq` y que `/faq` figura en `/sitemap.xml`.
8. Regresión de seguridad: verificar que los scripts publicitarios externos eliminados (Monetag y push) **no han reaparecido**. Mantener el aviso de Search Console en seguimiento antes de captar tráfico.
9. Probar ambas rutas de WAV→FLAC con un WAV PCM conocido (por ejemplo, 5 segundos): ejecutar, descargar `.flac`, abrirlo en un reproductor compatible y confirmar la firma inicial `fLaC`; probar también un `.txt` renombrado `.wav` y confirmar que muestra error, no «Éxito».
10. Comprobar que funcionan `/owner`, `/ocr`, `/wav-to-mp3` y `/compress-video-whatsapp`; no es necesario repetir pruebas extensas de cada conversor para publicar solo una página de ayuda.

## Límites y afirmaciones importantes

- OCR: Free 5 imágenes/páginas por día; Pro/Owner/Pro Beta sin límite diario; **las funciones y la precisión son iguales**. Hasta 10 archivos, 20 MB por archivo y 40 unidades técnicas por operación en ambos planes.
- Vídeo: 50 MB gratis, conversión en el navegador mediante FFmpeg WebAssembly que puede tardar minutos.
- Plan de pago: 5,99 €/año mostrado en código, Stripe; la renovación de Stripe no sincroniza automáticamente el almacenamiento del navegador.
- Pro Beta: un solo uso, activación en 14 días, 90 días iniciales, cookie por navegador, meses regalados por Owner.
- `/wav-to-flac` y `/convert/wav-to-flac` ahora usan codificación FFmpeg FLAC, descargan `.flac` y validan que el archivo empiece por `fLaC`. El primer uso descarga un componente FFmpeg. **Pendiente de prueba manual en el navegador** con un WAV PCM corto; verifica extensión, firma y reproducción/lectura del archivo. No dar por validado el códec solo porque compile.
- El procesamiento de archivos de los conversores actuales está concebido para ser local. No asegurar que absolutamente ninguna información pase por infraestructura, Cloudflare o Stripe.
- La notificación por Brevo para reactivaciones y una respuesta automática a `info@` **aún no se han implementado**; la nueva `/faq` proporciona el destino futuro de los correos.

## Publicación

No fusionar ni desplegar sin ver la página local. Desde la rama `feature/ocr-v2-free-quality-pro-volume`, tras validar:

```powershell
git status
git pull --ff-only
npm run build
npm run deploy
```

Mantener `main` pendiente de consolidación hasta comprobar que la producción conserva Owner, OCR y las nuevas FAQ.
