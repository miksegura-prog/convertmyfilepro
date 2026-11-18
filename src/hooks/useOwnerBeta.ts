import { useEffect, useState } from 'react';
import { isOwnerBetaDevBuild, validateOwnerBetaSession } from '@/config/ownerBeta';

/**
 * Estado del modo OWNER BETA.
 *
 * - Dev (localhost, `npm run dev`): activo sin red, porque `import.meta.env.DEV`
 *   es `true` y ese build no se publica.
 * - Producción / Cloudflare Preview: solo activo si el Worker confirma un JWT
 *   de Cloudflare Access válido. Nada de localStorage, URL o flags públicas.
 */
const DEV_OWNER = isOwnerBetaDevBuild();

// Una única comprobación por carga de página (Header, Layout y herramientas
// comparten la misma petición).
let ownerCheckPromise: Promise<boolean> | null = null;

const checkOwnerBeta = (): Promise<boolean> => {
  if (!ownerCheckPromise) {
    ownerCheckPromise = validateOwnerBetaSession();
  }
  return ownerCheckPromise;
};

export function useOwnerBeta() {
  const [isOwnerBeta, setIsOwnerBeta] = useState<boolean>(DEV_OWNER);

  useEffect(() => {
    // En dev el estado inicial ya es `true` (DEV_OWNER); no hace falta red.
    if (DEV_OWNER) return;

    let cancelled = false;
    checkOwnerBeta().then((owner) => {
      if (!cancelled) setIsOwnerBeta(owner);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { isOwnerBeta, isDevOwner: DEV_OWNER };
}
