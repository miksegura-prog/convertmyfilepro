# OWNER BETA (experimental) — compresión de vídeo hasta 200 MB

> **No publicar.** Este documento describe un modo exclusivo para desarrollo y
> previews. No forma parte del producto ni de los planes anunciados.

## Qué hace

- Desbloquea las mismas prestaciones que PRO **sin pago ni sesión de Stripe**:
  sin anuncios, OCR sin el tope gratuito, lotes PRO y compresor de vídeo
  experimental de hasta **200 MB**.
- Muestra un identificador discreto `OWNER BETA` en la cabecera y en la
  herramienta de vídeo.
- Los límites públicos **no cambian**: Free sigue limitado a 25 MB de vídeo y
  PRO a 50 MB. El límite de 200 MB solo existe en OWNER BETA.
- El procesamiento del vídeo sigue siendo local (FFmpeg WebAssembly en el
  navegador); los archivos no se suben al Worker.

## Cómo se activa (y cómo NO)

| Entorno | Activación |
| --- | --- |
| `npm run dev` (localhost) | Automática, porque `import.meta.env.DEV === true`. |
| Cloudflare Preview | Solo si el Worker valida un JWT real de Cloudflare Access (`GET /api/owner-status`). |
| Producción | Desactivado: `import.meta.env.DEV === false` y el Worker no tiene variables `OWNER_*`. |

No existe ninguna forma de activarlo desde el navegador:

- no se lee `localStorage`, ni la URL, ni cookies propias;
- no hay contraseñas, tokens ni secretos en el bundle;
- no se acepta un email enviado por el cliente: la identidad la firma
  Cloudflare Access y la verifica el Worker con las claves públicas del equipo;
- no se reutiliza ni se falsifica ninguna sesión de Stripe (`isPro` sigue
  dependiendo solo de `/api/verify-stripe`).

Código implicado:

- `src/config/ownerBeta.ts` — reglas y endpoint.
- `src/hooks/useOwnerBeta.ts` — estado del modo.
- `src/hooks/useProStatus.ts` — expone `hasProAccess = isPro || isOwnerBeta`.
- `src/worker.ts` — `GET /api/owner-status` con verificación RS256.
- `src/config/plans.ts` — `OWNER_VIDEO_MB = 200`.
- `src/components/ui-custom/ToolLayout.tsx` — límites de subida por herramienta.

## Habilitar Cloudflare Preview de forma segura (opcional)

Sin estos pasos, OWNER solo funciona en localhost (lo previsto por defecto).

1. **Cloudflare Access** → Applications → *Self-hosted*:
   - dominio de la preview (p. ej. `feature-owner-preview-video.convertmyfilepro.pages.dev`
     o el subdominio `*.workers.dev` de la preview);
   - política `Allow` con la identidad del desarrollador (One-time PIN o IdP
     corporativo). Sin política, Access bloquea el acceso entero;
   - anota el **Application Audience (AUD) Tag**.
2. **Variables del Worker en el entorno Preview** (nunca en Production):

   ```powershell
   wrangler secret put OWNER_BETA_ENABLED          # valor: true
   wrangler secret put OWNER_ACCESS_TEAM_DOMAIN    # valor: miteam.cloudflareaccess.com
   wrangler secret put OWNER_ACCESS_AUD            # valor: <AUD tag>
   wrangler secret put OWNER_EMAILS                # opcional: tu@correo.com,otro@correo.com
   ```

   También sirven `[env.preview.vars]` en `wrangler.toml` para los valores no
   sensibles; los secretos conviene gestionarlos con `wrangler secret`.

3. El Worker (`handleOwnerStatus`) hace lo siguiente antes de responder
   `{ owner: true }`:
   - exige `OWNER_BETA_ENABLED === 'true'`;
   - exige la cabecera `Cf-Access-Jwt-Assertion` (la inyecta Access);
   - descarga y cachea las claves públicas de
     `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`;
   - verifica firma RS256, `alg`, `kid`, `exp`/`nbf` (60 s de margen), `iss` y
     `aud` contra `OWNER_ACCESS_AUD`;
   - si `OWNER_EMAILS` está definido, exige que el email firmado esté en la
     lista.

Si algo falta o la firma no es válida, responde `{ owner: false }` (404/401/403)
y la app se comporta como Free/PRO normal.

**Limitación conocida:** con OWNER activo vía Access, los espacios publicitarios
de React se ocultan, pero el script de Monetag del `<head>` solo se omite en
localhost y en usuarios PRO con sesión de Stripe. Si se necesita una preview
totalmente sin anuncios, hay que mover esa comprobación al Worker o servir la
preview sin Monetag.

## Pruebas

| Comprobación | Resultado |
| --- | --- |
| `npm run build` (tsc + vite) | ✅ sin errores |
| `npm run test:owner` (15 comprobaciones) | ✅ 15/15 |
| Free limitado a 25 MB en vídeo | ✅ verificado (función de límites + DOM en `vite preview`) |
| PRO limitado a 50 MB en vídeo | ✅ verificado (función de límites) |
| OWNER ve 200 MB en el dropzone (`npm run dev`) | ✅ verificado con DOM headless de Chrome |
| OWNER desactivado en build de producción | ✅ `/api/owner-status` 404 y `import.meta.env.DEV` compilado a `false` |
| Worker rechaza JWT sin firma, `aud`/`iss` erróneos, caducados o identidad no autorizada | ✅ verificado |
| Compresión real de vídeo de 40 / 100 / 150 / 200 MB | ⏳ pendiente: requiere navegador con un vídeo real y un equipo con memoria suficiente |
| Reproducción del MP4 resultante | ⏳ pendiente junto con la prueba anterior |

`tests/owner-beta/run-tests.mjs` genera un par de claves RSA en memoria, firma
JWT de prueba y verifica el Worker; no usa secretos reales ni red externa.

### Limitaciones

- FFmpeg WebAssembly se ejecuta en un único hilo y mantiene el archivo de
  entrada y la salida en memoria: un vídeo de 200 MB puede necesitar varios
  cientos de MB de RAM. Si el navegador se queda sin memoria, la app muestra
  «Memoria insuficiente…» y descarta la instancia de FFmpeg para el siguiente
  intento.
- Los archivos temporales del sistema de archivos virtual se eliminan en
  `finally`, también cuando la conversión falla.
- No se garantiza que todos los tamaños se procesen en todos los dispositivos.
- Nada de esto se anuncia en la página de precios: PRO sigue indicando 50 MB.

## Probar en localhost

```powershell
npm run dev
```

1. Abrir `http://localhost:5173/compress-video-whatsapp`.
2. Comprobar el badge `OWNER BETA` y el texto «hasta 200 MB por vídeo».
3. Arrastrar un vídeo de 40 MB → debe aceptarse y comprimirse.
4. Repetir con 100/150/200 MB (ver limitaciones de memoria).

Sin `npm run dev` (por ejemplo `vite preview` o `wrangler pages dev dist`), el
bundle es de producción y OWNER queda apagado: es el comportamiento esperado.
