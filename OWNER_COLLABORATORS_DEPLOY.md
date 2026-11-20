# Owner · colaboradores: reactivar y regalar meses

**Versión:** 20 de noviembre de 2026 · rama `feature/ocr-v2-free-quality-pro-volume`.

## Estado y límites

- Las invitaciones siguen siendo de **un solo uso** y caducan a los 14 días si no se activan.
- Un colaborador con invitación **ya activada** puede tener acceso revocado y reactivado.
- **Reactivar** vuelve a habilitar un acceso revocado que todavía no ha caducado.
- **Regalar** 1, 2, 3, 6 o 12 **meses naturales** amplía la fecha actual de caducidad (o desde hoy si ya caducó). También elimina la revocación, si la había.
- No se exige pago, no se modifica Stripe ni Brevo y no se envían emails por reactivación/ampliación (el email automático sigue reservado para *crear* invitaciones).
- Si la invitación nunca se activó, si se perdió la cookie del navegador o el navegador dejó caducar la cookie, **hay que crear una invitación nueva**. Reactivar no vuelve reutilizable un enlace ya canjeado.
- La cookie de Pro Beta activa ahora se renueva al consultar `/api/pro-beta/status` por el tiempo restante que figure en D1, para que una ampliación no quede limitada a los primeros 90 días. No recupera una cookie ya eliminada.
- Las acciones quedan registradas en `pro_beta_access_events` (actor Owner, acción, meses, fecha y nueva caducidad). No se almacenan tokens ni el contenido de los archivos.

## Paso obligatorio 1: migración de D1 remota

Abrir VS Code en el repositorio y detener Vite Preview (Ctrl+C). Asegurarse de tener los cambios de la rama, sin trabajo local pendiente:

```powershell
git status
git branch --show-current
git pull --ff-only
```

La rama debe ser `feature/ocr-v2-free-quality-pro-volume`. La migration es **aditiva** y no modifica la tabla `pro_beta_invites`.

Revisar las migraciones pendientes:

```powershell
npx wrangler d1 migrations list convertmyfilepro-owner --remote
```

Después aplicarlas en **la base remota indicada**, si la lista es la esperada:

```powershell
npx wrangler d1 migrations apply convertmyfilepro-owner --remote
```

Verificar la tabla:

```powershell
npx wrangler d1 execute convertmyfilepro-owner --remote --command "SELECT COUNT(*) AS eventos FROM pro_beta_access_events"
```

Si Wrangler avisa sobre migraciones inesperadas, **no continuar** antes de revisarlas. No usar `--local`.

## Paso 2: compilación y despliegue

```powershell
npm run build
npx wrangler deploy --dry-run
npm run deploy
```

Comprobar `env.DB` y `env.ASSETS` y que finaliza con `Deployed convertmyfilepro`. El deploy no cambia secretos de Brevo, JWT, Cloudflare Access ni Stripe.

## Paso 3: verificaciones

1. Entrar a `https://www.convertmyfilepro.com/owner` con Cloudflare Access.
2. Confirmar `Invitaciones y accesos` y `Historial de accesos` sin aviso de migración.
3. Probar con **una invitación de prueba ya canjeada**. Regalar 1 mes, confirmar fecha e historial.
4. Revocarla y confirmar que el navegador invitado pierde Pro tras recarga.
5. Pulsar `Reactivar` si todavía no caducó. Volver a abrir la web invitada en ese **mismo navegador**, comprobar que Pro vuelve.
6. Revocarla y regalar otro mes: debe ampliarse la fecha y reactivarse en la misma operación.
7. Confirmar que una invitación *pendiente sin activar* **no** muestra `Regalar` ni `Reactivar`; el enlace original sigue siendo de un solo uso.
8. Verificar que `/owner` y `/api/owner/*` siguen inaccesibles sin la identidad Owner.
9. Comprobar OCR 2.0, WAV→MP3 y compresión de vídeo, sin retrocesos.

## Pendiente para consolidar GitHub

Las ramas de producción aún no están fusionadas con `main`. Tras confirmar el funcionamiento, consolidar el PR del OCR/Owner y `main` para prevenir despliegues futuros con código antiguo.

**Ayuda Cloudflare D1:** https://developers.cloudflare.com/d1/reference/migrations/
