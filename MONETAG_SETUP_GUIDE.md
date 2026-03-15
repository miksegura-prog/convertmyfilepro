# 💰 Guía Completa: Configurar Monetag en ConvertMyFilePro

## Paso 1: Crear Cuenta en Monetag

1. Ve a **https://monetag.com/**
2. Haz clic en **"Sign Up"** o **"Register"**
3. Regístrate con:
   - Email
   - Contraseña
   - O usa Google/Facebook

## Paso 2: Añadir tu Sitio

1. Inicia sesión en Monetag
2. Ve a **"Sites"** en el menú lateral
3. Haz clic en **"Add Site"**
4. Completa la información:
   - **Website URL**: `https://convertmyfilepro.com`
   - **Category**: Selecciona "Tools & Utilities"
   - **Language**: English (o tu idioma principal)
5. Haz clic en **"Add Site"**

## Paso 3: Esperar Aprobación

- La aprobación suele tomar **24-48 horas**
- Recibirás un email cuando sea aprobado
- Mientras tanto, puedes explorar la plataforma

## Paso 4: Crear Zonas de Anuncios

Una vez aprobado, crea diferentes tipos de anuncios:

### 1. Popunder (Más Rentable)

1. Ve a **"Ad Units"** → **"Create"**
2. Selecciona **"Popunder"**
3. Configura:
   - **Name**: "Main Popunder"
   - **Frequency**: 1 per 24 hours (recomendado)
4. Copia el **Zone ID**

### 2. Banner Ads

1. Ve a **"Ad Units"** → **"Create"**
2. Selecciona **"Banner"**
3. Selecciona tamaño: **728x90** (para desktop)
4. Copia el **Zone ID**
5. Repite para **320x50** (móvil)

### 3. Native Ads

1. Ve a **"Ad Units"** → **"Create"**
2. Selecciona **"Native Banner"**
3. Copia el **Zone ID**

### 4. Push Notifications (Opcional pero Rentable)

1. Ve a **"Push"** → **"Collections"**
2. Crea una nueva colección
3. Sigue las instrucciones de implementación
4. Copia el **Zone ID**

## Paso 5: Configurar los IDs en tu Proyecto

### Editar `index.html`

```html
<!-- Reemplaza TU_ZONE_ID con tu ID real de Popunder -->
<script src="https://alwingulla.com/88/tag.min.js" 
        data-zone="12345678" 
        async 
        data-cfasync="false">
</script>
```

### Editar `src/components/ui-custom/MonetagAds.tsx`

```typescript
export const MONETAG_ZONES = {
  POPUNDER: '12345678',           // Tu ID de Popunder
  BANNER_TOP: '12345679',         // Tu ID de Banner 728x90
  BANNER_BOTTOM: '12345680',      // Tu ID de Banner 728x90 (segundo)
  BANNER_MOBILE: '12345681',      // Tu ID de Banner 320x50
  NATIVE_INLINE: '12345682',      // Tu ID de Native
  NATIVE_RESULT: '12345683',      // Tu ID de Native (segundo)
  VIGNETTE: '12345684',           // Tu ID de Vignette
  SIDEBAR: '12345685',            // Tu ID de Sidebar
  PUSH: '12345686'                // Tu ID de Push Notifications
} as const;
```

## Paso 6: Actualizar GitHub y Vercel

### Subir cambios a GitHub

```bash
# En tu proyecto local
git add .
git commit -m "Add Monetag ads integration"
git push origin main
```

### Vercel se actualiza automáticamente

- Vercel detecta el push
- Construye automáticamente
- Despliega en tu dominio

## Paso 7: Verificar Implementación

1. Abre tu sitio en modo incógnito
2. Revisa que los anuncios aparecen:
   - Banner en la parte superior
   - Banner en la parte inferior
   - Popunder al hacer clic
3. Usa las herramientas de desarrollador (F12) para verificar que los scripts cargan

## Configuraciones Recomendadas

### Popunder (Configuración Óptima)

```
Frequency Cap: 1 per 24 hours
Delay: 0 seconds
Trigger: Click anywhere
```

### Banner Ads

```
Refresh Rate: 30-60 seconds
Position: Above the fold
Size: 728x90 (desktop), 320x50 (mobile)
```

### Native Ads

```
Position: Between content
Style: Match your site design
Label: "Sponsored" or "Advertisement"
```

## Estimación de Ingresos

| Visitas/Día | Ingresos/Día | Ingresos/Mes |
|-------------|--------------|--------------|
| 1,000 | $2-5 | $60-150 |
| 5,000 | $10-25 | $300-750 |
| 10,000 | $20-50 | $600-1,500 |
| 50,000 | $100-250 | $3,000-7,500 |

**Factores que afectan:**
- País de los visitantes (USA/Europa pagan más)
- Tipo de tráfico (orgánico > social)
- Posición de los anuncios
- CTR (Click Through Rate)

## Mejores Prácticas

### ✅ Hacer:
- Usar máximo 3-4 anuncios visibles
- Mantener buena experiencia de usuario
- Probar diferentes posiciones
- Monitorear métricas en el dashboard
- Responder a tickets de soporte

### ❌ No Hacer:
- Sobrecargar con anuncios
- Usar popups intrusivos
- Ocultar el label "Advertisement"
- Clickear en tus propios anuncios (baneo)
- Usar tráfico falso/bots

## Solución de Problemas

### Los anuncios no aparecen
1. Verifica que el Zone ID es correcto
2. Comprueba que el sitio está aprobado
3. Revisa la consola del navegador (F12)
4. Prueba en modo incógnito

### Ingresos muy bajos
1. Aumenta el tráfico
2. Mejora posiciones de anuncios
3. Prueba diferentes formatos
4. Enfócate en tráfico de USA/Europa

### Popunder no funciona
1. Algunos navegadores bloquean popups
2. Es normal que no funcione en todos
3. El banner/native es más confiable

## Soporte de Monetag

- **Email**: support@monetag.com
- **Dashboard**: Mensajes dentro de la plataforma
- **Telegram**: @monetag_support
- **Skype**: live:monetag

## Recursos Adicionales

- Documentación oficial: https://monetag.com/help
- Blog: https://monetag.com/blog
- FAQ: https://monetag.com/faq

---

## Resumen de Implementación

1. ✅ Crear cuenta en Monetag
2. ✅ Añadir sitio y esperar aprobación
3. ✅ Crear zonas de anuncios
4. ✅ Copiar Zone IDs
5. ✅ Pegar IDs en el código
6. ✅ Hacer commit y push
7. ✅ Verificar en producción
8. 💰 Empezar a ganar dinero

---

**¿Preguntas?** Contacta a Monetag o revisa su documentación oficial.
