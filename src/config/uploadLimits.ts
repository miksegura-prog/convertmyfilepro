import { PRO_FILE_SIZE_MB } from './plans';

/**
 * Límites de carga configurables por herramienta y modalidad.
 *
 * - `maxSizeMB`: límite público real de la herramienta (Free/PRO).
 * - `ownerMaxSizeMB`: límite adicional solo para OWNER BETA.
 *
 * Ninguna herramienta puede superar el límite global salvo que declare
 * explícitamente `ownerMaxSizeMB` y el modo OWNER esté verificado.
 */
export interface UploadLimitConfig {
  maxSizeMB?: number;
  ownerMaxSizeMB?: number;
}

export interface UploadLimitContext {
  isOwnerBeta: boolean;
  hasProAccess: boolean;
  /** Límite específico de Free (p. ej. 25 MB en vídeo). */
  freeMaxSizeMB?: number;
}

export const resolveUploadMaxSizeMB = (
  config: UploadLimitConfig | undefined,
  context: UploadLimitContext
): number => {
  if (context.isOwnerBeta) {
    return config?.ownerMaxSizeMB ?? config?.maxSizeMB ?? PRO_FILE_SIZE_MB;
  }
  if (!context.hasProAccess && context.freeMaxSizeMB) {
    return context.freeMaxSizeMB;
  }
  return config?.maxSizeMB ?? PRO_FILE_SIZE_MB;
};
