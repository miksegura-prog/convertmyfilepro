# 🚀 Guía: Actualizar tu Proyecto en GitHub y Vercel

## Paso 1: Configurar Git (Primera Vez)

Si aún no has configurado Git en tu máquina:

```bash
# Configurar tu nombre y email
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

## Paso 2: Inicializar el Repositorio (Si es nuevo)

```bash
# Navegar a tu proyecto
cd /mnt/okcomputer/output/app

# Inicializar Git (si no está inicializado)
git init

# Añadir todos los archivos
git add .

# Hacer el primer commit
git commit -m "Initial commit - ConvertMyFilePro with blog and Monetag"

# Conectar con GitHub (reemplaza con tu URL)
git remote add origin https://github.com/TU_USUARIO/convertmyfilepro.git

# Subir a GitHub
git push -u origin main
```

## Paso 3: Actualizar Cambios (Uso Diario)

Cada vez que hagas cambios:

```bash
# Ver qué archivos cambiaron
git status

# Añadir todos los cambios
git add .

# O añadir archivos específicos
git add src/components/ui-custom/MonetagAds.tsx

# Hacer commit con mensaje descriptivo
git commit -m "Add Monetag ads integration"

# Subir a GitHub
git push origin main
```

## Paso 4: Vercel se Actualiza Automáticamente

Cuando haces `git push`, Vercel:

1. Detecta el cambio en GitHub
2. Inicia una nueva build automáticamente
3. Construye el proyecto
4. Despliega la nueva versión
5. Actualiza tu dominio

### Ver el Progreso en Vercel

1. Ve a **https://vercel.com/dashboard**
2. Selecciona tu proyecto
3. Ve a la pestaña **"Deployments"**
4. Verás el estado de la build

### Estados de Build

| Estado | Significado |
|--------|-------------|
| 🟡 Building | Construyendo... |
| 🟢 Ready | Listo y desplegado |
| 🔴 Error | Hubo un error |

## Paso 5: Solución de Problemas

### Error: "No changes to commit"

```bash
# Verifica que hay cambios
git status

# Si no hay cambios, edita algún archivo primero
```

### Error: "Permission denied"

```bash
# Configura las credenciales
git config --global credential.helper cache

# O usa token de acceso personal
```

### Error: "Failed to compile" en Vercel

1. Revisa los logs en Vercel Dashboard
2. Corrige el error localmente
3. Haz commit y push nuevamente

### Build falla por errores de TypeScript

```bash
# Verificar errores localmente
npm run build

# Corregir errores
# Hacer commit y push
```

## Comandos Útiles

### Ver Historial

```bash
# Ver commits recientes
git log --oneline -10

# Ver qué cambió en el último commit
git show
```

### Deshacer Cambios

```bash
# Deshacer cambios no commiteados
git checkout -- .

# Deshacer el último commit (manteniendo cambios)
git reset --soft HEAD~1

# Deshacer el último commit (eliminando cambios)
git reset --hard HEAD~1
```

### Ramas (Branches)

```bash
# Ver ramas
git branch

# Crear nueva rama
git checkout -b nueva-funcionalidad

# Cambiar de rama
git checkout main

# Fusionar rama
git merge nueva-funcionalidad
```

## Flujo de Trabajo Recomendado

### Para Cambios Pequeños

```bash
# 1. Hacer cambios en el código
# 2. Verificar que funciona: npm run dev
# 3. Construir: npm run build
# 4. Si todo OK:
git add .
git commit -m "Descripción del cambio"
git push origin main
# 5. Esperar a que Vercel despliegue
```

### Para Cambios Grandes

```bash
# 1. Crear rama de desarrollo
git checkout -b desarrollo

# 2. Hacer todos los cambios
# 3. Probar localmente

# 4. Subir rama
git add .
git commit -m "Nueva funcionalidad X"
git push origin desarrollo

# 5. Crear Pull Request en GitHub
# 6. Revisar y fusionar a main
```

## Configuración de Vercel

### Variables de Entorno (Si las necesitas)

1. Ve a **Vercel Dashboard** → Tu Proyecto
2. **Settings** → **Environment Variables**
3. Añade variables si las necesitas:
   - `NODE_ENV=production`
   - Otras API keys

### Dominio Personalizado

1. Ve a **Vercel Dashboard** → Tu Proyecto
2. **Settings** → **Domains**
3. Añade tu dominio: `convertmyfilepro.com`
4. Sigue las instrucciones de DNS

## Scripts Útiles en package.json

Asegúrate de tener estos scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx"
  }
}
```

## Checklist Antes de Cada Push

- [ ] El código compila localmente (`npm run build`)
- [ ] No hay errores de TypeScript
- [ ] Los cambios están probados
- [ ] El mensaje de commit es descriptivo
- [ ] Se incluyen todos los archivos necesarios

## Estructura de Commits Recomendada

### Tipos de Commits

```
feat: Nueva funcionalidad
fix: Corrección de bug
docs: Cambios en documentación
style: Cambios de estilo (formato)
refactor: Refactorización de código
test: Añadir tests
chore: Tareas de mantenimiento
```

### Ejemplos

```bash
git commit -m "feat: Add Monetag ads integration"
git commit -m "fix: Correct image compression quality"
git commit -m "docs: Update README with setup instructions"
git commit -m "style: Format code with prettier"
```

## Recursos

- **Git Documentation**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com/
- **Vercel Documentation**: https://vercel.com/docs

---

## Resumen Rápido

```bash
# Diariamente:
git add .
git commit -m "Descripción"
git push origin main

# Vercel se actualiza automáticamente! 🚀
```

---

**¿Problemas?** Revisa los logs en Vercel Dashboard o ejecuta `npm run build` localmente para ver errores.
