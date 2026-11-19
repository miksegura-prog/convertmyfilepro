# ConvertMyFilePro · Owner REAL en producción + invitaciones Pro Beta (90 días)

Esta funcionalidad se desarrolla sobre `main`, **no** sobre la antigua rama `feature/owner-preview-video`, para no perder las correcciones posteriores de WAV/MP3 y compresión de vídeo.

**Estado:** el código está preparado en una rama de trabajo. **No está publicado en producción** hasta completar la configuración siguiente, ejecutar las pruebas y fusionar/desplegar.

## Qué hace

- `/owner`: panel privado de producción, protegido con **Cloudflare Access**.
- Generación de enlaces individuales para acceso Pro Beta, de un solo uso.
- Caducidad del enlace si no se usa en **14 días**.
- **90 días de Pro Beta a partir de la activación** del enlace, no de la creación.
- Sesión Pro Beta mediante cookie `HttpOnly; Secure; SameSite=Lax`, verificada contra D1 en cada consulta.
- Revocación inmediata, o expiración automática a los 90 días.
- No se almacena el token de invitación en texto claro; solo su SHA-256. El enlace completo se muestra una sola vez en Owner.
- Owner puede usar los conversores PRO en la web pública durante **24 horas por sesión Owner**, renovando al entrar a `/owner`.
- El compresor de vídeo admite **200 MB para Owner**; Free y Pro conservan 50 MB. El navegador puede fallar por RAM y el proceso puede ser lento.
- Invitados Pro Beta usan los límites Pro anunciados (50 MB en vídeo), **no** los privilegios experimentales Owner.
- No se modifica Stripe ni el precio del plan Pro.
- Los archivos siguen procesándose en el navegador, como antes.

## Pasos obligatorios para activar

### 1) Crear Cloudflare D1

Desde la carpeta del repositorio, con tu sesión de Cloudflare:

```bash
npx wrangler d1 create convertmyfilepro-owner
```

Copia el `database_id` real que devuelve el comando. Añade a `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "convertmyfilepro-owner"
database_id = "AQUÍ_EL_UUID_REAL"
migrations_dir = "migrations"
```

**No uses un UUID inventado.** Después:

```bash
npx wrangler d1 migrations apply convertmyfilepro-owner --remote
```

Comprueba que se haya creado `pro_beta_invites`. No ejecutes las migraciones en otra base de datos ni copies la tabla de invitaciones de tRADUWORKS.

Documentación oficial: https://developers.cloudflare.com/d1/get-started/

### 2) Aplicación Cloudflare Access específica para Owner

Zero Trust → Access → Applications → Add application → **Self-hosted**.

Protege **solo** estos dos destinos bajo la **misma aplicación / AUD** (ajustando el dominio canónico real):

- `www.convertmyfilepro.com/owner*`
- `www.convertmyfilepro.com/api/owner/*`

En algunas versiones de Cloudflare el primer destino debe configurarse como `/owner` y además `/owner/*`, según la coincidencia de rutas. **Verifica ambos URLs antes de publicar.**

Política **Allow**: solo el correo autorizado del propietario, con One-time PIN o tu proveedor de identidad. No usar `Everyone`. Mantener `/api/pro-beta/status` y `/api/pro-beta/redeem` públicos; se protegen mediante tokens y cookies en el Worker.

Copia el `Application Audience (AUD) Tag`. El flujo de Cloudflare Access inserta `Cf-Access-Jwt-Assertion` en las solicitudes autorizadas. El Worker valida la firma RSA, emisor, audiencia, caducidad y correo.

Documentación: https://developers.cloudflare.com/workers/configuration/cloudflare-access/

### 3) Variables de entorno de producción

En el Worker desplegado, configurar:

- `OWNER_ACCESS_TEAM_DOMAIN` = `tu-equipo.cloudflareaccess.com` (no incluir `https://`).
- `OWNER_ACCESS_AUD` = AUD de la misma aplicación Access que protege `/owner` y `/api/owner/*`.
- `OWNER_EMAILS` = lista **obligatoria** de direcciones Owner, separadas por comas.
- `OWNER_SESSION_SECRET` = cadena aleatoria **secreta de al menos 32 caracteres**; generar criptográficamente.

Guardar el secreto con `npx wrangler secret put OWNER_SESSION_SECRET` o desde la sección Secrets de Cloudflare. Nunca añadirlo a GitHub o a una variable `VITE_*`. Las otras variables pueden ser variables de entorno del Worker.

Si falta alguna variable de autorización, el API de administración deniega el acceso. Si falta D1, el panel puede abrirse pero no generar invitaciones.

### 4) Build y despliegue

```bash
npm ci
npm run build
npx wrangler deploy
```

Publicar **solo después de revisar el PR**, comprobar la compilación y validar la configuración de D1 + Access. Mantener la rama `feature/owner-preview-video` como preview aislada.

### 5) Pruebas imprescindibles

1. Sin login Access, `/api/owner/status` debe rechazar al visitante.
2. Con login Owner, `/owner` debe mostrar tu email y D1 conectada.
3. Crea una invitación a un correo de pruebas y copia el enlace al generar.
4. Ábrelo en navegador incógnito, activa el enlace y comprueba que Pro Beta funciona, sin anuncios.
5. Verifica que el enlace no se pueda canjear por segunda vez.
6. Comprueba que el invitado no puede entrar a `/owner` ni gestionar invitaciones.
7. Revoca la licencia desde Owner: al refrescar la web invitada debe pasar a Free.
8. Comprueba que Stripe y las herramientas públicas mantienen el funcionamiento anterior.
9. Comprueba que Owner puede utilizar 200 MB en vídeo y que Free/Pro no supera 50 MB.
10. Revisa cookies, política de privacidad y procedimiento de borrado de datos antes de invitar a terceros.

## Limitaciones deliberadas

- La invitación es un **enlace de portador de un solo uso**: quien posea el enlace antes del primer canje puede activarlo. El email guardado es una referencia administrativa, **no es una comprobación de identidad**. Para vincular la invitación a una identidad en cualquier dispositivo se requiere un segundo paso de autenticación por correo.
- La sesión Beta queda ligada al navegador y a sus cookies. Si se borran, el enlace ya utilizado no puede reactivarse; Owner tendrá que emitir otro.
- No se envían emails automáticamente: Owner genera un enlace para copiar y enviar.
- No se guardan los nombres ni el contenido de los archivos procesados.
- Pro de Stripe conserva su implementación existente; este cambio no es una auditoría general de facturación o seguridad.
- El panel no está indexado; los enlaces de invitación tampoco (cabeceras del Worker).

## Métricas sin Umami

Cloudflare Web Analytics + Google Search Console siguen funcionando sin cambios. Para saber cuántas conversiones triunfan o fallan podemos implementar eventos agregados en Cloudflare o conectar GA4 en una mejora posterior. Este PR no añade un cuarto sitio en Umami.
