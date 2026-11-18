/**
 * OWNER BETA — acceso experimental exclusivo para desarrollo y previews.
 *
 * Reglas de seguridad (revisar antes de tocar este archivo):
 *
 * 1. En localhost con Vite en modo desarrollo (`import.meta.env.DEV === true`)
 *    el acceso OWNER se habilita automáticamente. Un `vite build` de
 *    producción define `DEV` en `false`, por lo que ese camino nunca existe en
 *    el sitio publicado.
 * 2. Fuera de desarrollo (p. ej. Cloudflare Preview) la única vía es
 *    `GET /api/owner-status`. Ese endpoint vive en el Worker, verifica la firma
 *    del JWT de Cloudflare Access (`Cf-Access-Jwt-Assertion`) y solo responde
 *    `owner: true` si el entorno del Worker tiene configuradas las variables
 *    `OWNER_BETA_ENABLED`, `OWNER_ACCESS_TEAM_DOMAIN` y `OWNER_ACCESS_AUD`.
 *    En producción esas variables no existen, así que OWNER queda desactivado
 *    por defecto.
 * 3. Nunca se acepta como prueba de identidad un email, un rol, una cookie
 *    arbitraria, `localStorage`, un parámetro de URL o una variable `VITE_*`
 *    enviada por el navegador: cualquiera podría falsificarlos.
 * 4. No hay que introducir contraseñas, tokens ni secretos en el bundle.
 */

/** Etiqueta visual discreta del modo experimental. */
export const OWNER_BETA_LABEL = 'OWNER BETA';

/** Endpoint del Worker que verifica Cloudflare Access. */
export const OWNER_STATUS_ENDPOINT = '/api/owner-status';

/**
 * `true` únicamente en el servidor de desarrollo de Vite (`npm run dev`).
 * En builds de producción/Preview siempre es `false`.
 */
export const isOwnerBetaDevBuild = (): boolean => import.meta.env.DEV === true;

/**
 * Pide al Worker que verifique la sesión de Cloudflare Access del visitante.
 * El navegador no aporta identidad: solo viaja la cookie de Access y el Worker
 * valida la firma del JWT.
 */
export const validateOwnerBetaSession = (): Promise<boolean> => {
  return fetch(OWNER_STATUS_ENDPOINT, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) return false;
      const data = (await response.json()) as { owner?: boolean };
      return data?.owner === true;
    })
    .catch(() => false);
};
