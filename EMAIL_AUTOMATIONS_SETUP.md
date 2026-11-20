# Automatizaciones de correo — ConvertMyFilePro

Rama: `feature/ocr-v2-free-quality-pro-volume`

## 1. Notificaciones Brevo de Owner (listas para desplegar)

El correo de **Crear invitación Pro Beta** ya existía y se mantiene sin cambios. Se añaden:

- **Reactivar:** aviso de que vuelve a estar activo, con la fecha de caducidad.
- **Regalar meses (1, 2, 3, 6, 12):** aviso con la nueva fecha de caducidad.
- Idioma de notificación elegible por colaboración: **ES/EN**.
- El Worker modifica D1 **una sola vez** antes de solicitar el envío.
- El panel Owner muestra por separado: **acceso guardado** y **correo aceptado/fallido por Brevo**. "Aceptado" no significa entregado a bandeja.
- Revocar **no envía correo**.
- **NUNCA repitas una ampliación solo por un fallo de email.** Para resolverlo, avisa manualmente; repetir regalaría meses otra vez.
- Las invitaciones siguen vinculadas al navegador y los enlaces usados son de un solo uso. Reingresar en otro navegador requiere enlace nuevo.
- BREVO_API_KEY se conserva como secreto de Worker; no copiarla al navegador ni a GitHub.

## 2. Respuesta automática a info@ (preparada, no activada)

El Worker HTTP `convertmyfilepro` incluye un controlador `email()`, **pero no modifica la regla existente de Cloudflare Email Routing**. Nada cambia para los mensajes entrantes hasta que se configure el reenvío y se cambie la regla desde el panel.

Comportamiento cuando se active:

1. **Reenvía primero** el original al buzón verificado existente.
2. Contesta con un acuse bilingüe que enlaza a https://www.convertmyfilepro.com/faq.
3. Máximo **una respuesta automática cada 7 días** por remitente, y 40 respuestas automáticas al día en total.
4. No contesta a `noreply`, rebotes, correos/listas automáticas ni al propio dominio.
5. Las respuestas requieren un remitente que supere las condiciones de autenticación DMARC aplicadas por Cloudflare. Si no pueden enviarse, el original ya fue reenviado.
6. Guarda en D1 solo hash SHA-256 del remitente y marcadores de fecha/volumen; no guarda cuerpo ni archivos adjuntos.
7. **Interruptor de seguridad:** `EMAIL_AUTOREPLY_ENABLED` solo activa respuestas cuando su valor es `true`; el reenvío permanece activo cuando es `false`.

### Requisitos de configuración manual

- Identificar la **dirección exacta verificada** que ahora recibe el correo de `info@convertmyfilepro.com`. No asumir que es una cuenta concreta y **no copiar direcciones ni secretos a GitHub**.
- Comprobar que `convertmyfilepro` sigue protegido mediante su Cloudflare Access en `/owner`.
- El Worker debe tener `DB` con la migración nueva y `EMAIL_FORWARD_TO` configurado; **no mover la regla de correo antes**.

## 3. Secuencia de despliegue segura en VS Code

En el repositorio, dentro de la rama con OCR/Owner/FAQ:

```powershell
git status
git branch --show-current
git pull --ff-only
npm run build
```

Si hay cambios locales, no continuar con `git pull` hasta revisarlos.

Revisar las migraciones remotas pendientes y aplicarlas a **la base existente**:

```powershell
npx wrangler d1 migrations list convertmyfilepro-owner --remote
npx wrangler d1 migrations apply convertmyfilepro-owner --remote
npx wrangler d1 execute convertmyfilepro-owner --remote --command "SELECT COUNT(*) AS total FROM email_autoreply_throttle"
```

La migración `20261120_email_autoreply_throttle.sql` **solo crea una tabla aditiva**, no borra las invitaciones.

Publicar:

```powershell
npm run deploy
```

Sin cambiar todavía Email Routing, comprobar en `https://www.convertmyfilepro.com/owner` una reactivación de prueba y su aviso Brevo. Enviar una nueva invitación de 90 días también debe seguir funcionando.

## 4. Configurar y comprobar el reenvío antes de activar la autorespuesta

En Cloudflare, **Email Service → Email Routing**, localizar la regla existente de `info@convertmyfilepro.com` y anotar su destino verificado. Debe coincidir con el buzón real que recibe actualmente los mensajes.

En VS Code (por el terminal interactivo, nunca en comandos publicados con el valor secreto):

```powershell
npx wrangler secret put EMAIL_FORWARD_TO
npx wrangler secret put EMAIL_AUTOREPLY_ENABLED
```

En `EMAIL_FORWARD_TO`, introducir la **dirección verificada** actual.
En `EMAIL_AUTOREPLY_ENABLED`, escribir inicialmente `false`.

**Ahora sí**, editar exclusivamente la regla `info@convertmyfilepro.com` en Cloudflare Email Routing para que su acción sea **Send to a Worker → convertmyfilepro**. No modificar otras reglas ni registros DNS.

Enviar un correo de prueba desde otra cuenta externa y verificar que llega al mismo buzón de antes. Si no llega, **revertir inmediatamente la regla** a su reenvío directo anterior, sin intentar activar la autorespuesta.

Cuando el reenvío desde Worker funcione, ejecutar:

```powershell
npx wrangler secret put EMAIL_AUTOREPLY_ENABLED
```

Introducir `true`. Probar desde una cuenta externa nueva:
- primer correo: llega a Gmail y se recibe un acuse con enlace a `/faq` si Cloudflare permite la respuesta;
- segundo correo desde la misma cuenta: llega a Gmail pero **no** genera un segundo acuse durante 7 días;
- mensajes automáticos o sin validación DMARC: se reenvían, pero no reciben autorespuesta.

Se pueden revisar eventos en Cloudflare Email Routing y los logs de Workers para investigar un fallo.

## 5. Interruptor rápido

Para detener las respuestas sin interrumpir los mensajes entrantes:

```powershell
npx wrangler secret put EMAIL_AUTOREPLY_ENABLED
```

Escribir `false`; no tocar `EMAIL_FORWARD_TO` ni la regla, porque el Worker seguirá reenviando el original.

Si el **reenvío** deja de funcionar, devolver temporalmente la regla de Email Routing a su acción original (**forward** al buzón verificado).

## 6. Pendientes y límites

- Sin prueba real de correo no se puede afirmar que la autorespuesta funciona en producción.
- Una respuesta aceptada por Brevo no garantiza entrega. Revisar logs transaccionales para fallos.
- La seguridad de Cloudflare no sustituye el control del spam entrante. Estos filtros solo evitan responder automáticamente a casos evidentes.
- La notificación de reactivación/cortesía se envía al pulsar el botón en Owner. No hay correos retroactivos para operaciones anteriores a este cambio.
- `main` y los PRs pendientes deben consolidarse cuando se verifique todo, para evitar despliegues futuros de código anterior.

Referencias Cloudflare: https://developers.cloudflare.com/email-service/api/route-emails/email-handler/ y https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/
