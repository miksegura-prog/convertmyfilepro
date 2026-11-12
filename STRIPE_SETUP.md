# Configuración de Stripe para ConvertMyFilePro

## Requisitos previos

1. Tener una cuenta activa en [Stripe](https://dashboard.stripe.com/)
2. Haber creado un **Payment Link** (Enlace de Pago) desde el Dashboard de Stripe
3. Tener el proyecto desplegado en **Vercel**

---

## Variables de Entorno en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables** y agrega las siguientes:

### 1. `VITE_STRIPE_PAYMENT_LINK`

```
VITE_STRIPE_PAYMENT_LINK = https://buy.stripe.com/XXXXXXXXXX
```

🔹 **¿Qué es?** El enlace de pago de Stripe que se abre cuando un usuario hace clic en "Ir a PRO".

🔹 **¿Cómo obtenerlo?**
1. Inicia sesión en [dashboard.stripe.com](https://dashboard.stripe.com/)
2. Ve a **Productos** → **Crear producto** (si no tienes uno aún)
   - Pon nombre: `ConvertMyFilePro PRO`
   - Precio: el que quieras (ej. $9.99/mes o $49.99/año)
3. Luego ve a **Enlaces de pago** → **Crear enlace de pago**
   - Selecciona el producto que creaste
   - Configura el modo de pago (único o suscripción)
   - **Importante:** En "URL de redireccionamiento después del pago", pon:
     ```
     https://tudominio.com/pro-success?session_id={CHECKOUT_SESSION_ID}
     ```
   - Guarda el enlace (algo como `https://buy.stripe.com/XXXXXXXXXX`)

---

### 2. `STRIPE_SECRET_KEY`

```
STRIPE_SECRET_KEY = SU_STRIPE_SECRET_KEY_AQUI
```

🔹 **¿Qué es?** La clave secreta de Stripe que permite al backend de Vercel verificar que el pago se completó correctamente.

🔹 **¿Cómo obtenerla?**
1. En [dashboard.stripe.com](https://dashboard.stripe.com/), ve a **Desarrolladores** → **Claves API**
2. Copia la **Clave secreta** (`sk_live_...` o `sk_test_...`)
   - Usa la que empieza con `sk_live` cuando estés en producción
   - Usa la que empieza con `sk_test` para pruebas en modo de desarrollo

> ⚠️ **Nunca compartas esta clave.** Solo deberías pegarla directamente en las variables de entorno de Vercel.

---

## Verificar que funciona

1. Despliega el proyecto en Vercel
2. Abre tu web y haz clic en "PRO / Sin Anuncios" en el menú
3. Completa el pago en Stripe
4. Serás redirigido a `/pro-success?session_id=cs_...`
5. La página llamará automáticamente a la función serverless `/api/verify-stripe` con la `STRIPE_SECRET_KEY`
6. Si el pago es válido, se activará el estado PRO en tu navegador (guardado en `localStorage`)

---

## ¿Qué obtiene el usuario PRO?

| Beneficio | FREE | PRO |
|---|---|---|
| Anuncios (AdSlot, Monetag, AdSense) | Visibles | Ocultos 🔇 |
| Archivos por lote | Máximo 3 | Ilimitado ♾️ |
| Tamaño máximo de vídeo | 25 MB | 2 GB |
| OCR (imagen a texto) | 2 páginas/sesión | Ilimitado |
| Procesamiento | Normal | Prioritario ⚡ |

---

## Notas adicionales

- **Sanbox / pruebas:** Usa la clave que empieza con `sk_test` para desarrollar. Cambia a la que empieza con `sk_live` cuando estés listo para producción.
- **URL de redirección:** Asegúrate de que en el Payment Link de Stripe pusiste correctamente la URL de tu dominio real (no `localhost`).
- **Suscripciones vs pago único:** El sistema actual activa PRO por 1 año desde la fecha de pago. Si cambias a suscripción mensual, puedes ajustar la lógica en `api/verify-stripe.ts`.
