import { useState, useEffect, useCallback } from 'react';
import { useOwnerBeta } from './useOwnerBeta';

export const PRO_STORAGE_KEY = 'convertmyfilepro_pro';
const STORAGE_KEY = PRO_STORAGE_KEY;
const PRO_STATUS_EVENT = 'convertmyfilepro:pro-status';
const INITIAL_TIME = Date.now();

interface ProStatus {
  active: boolean;
  expiresAt: number | null;
  sessionId: string | null;
  activatedAt: number | null;
}

const defaultStatus: ProStatus = {
  active: false,
  expiresAt: null,
  sessionId: null,
  activatedAt: null,
};

function loadStatus(): ProStatus {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ProStatus;
      // Check if expired
      if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return defaultStatus;
      }
      return parsed;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return defaultStatus;
}

export function useProStatus() {
  const [status, setStatus] = useState<ProStatus>(loadStatus);
  const [now, setNow] = useState(INITIAL_TIME);
  const { isOwnerBeta } = useOwnerBeta();

  useEffect(() => {
    // Keep every hook instance (header, layout, tools) in sync: activation happens
    // in ProSuccess, but the header must switch to "PRO activo" without a reload.
    const refresh = () => {
      setStatus(loadStatus());
      setNow(Date.now());
    };

    window.addEventListener('storage', refresh);
    window.addEventListener(PRO_STATUS_EVENT, refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', refresh);
      window.removeEventListener(PRO_STATUS_EVENT, refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const isPro = status.active && status.expiresAt !== null && status.expiresAt > now;

  // El modo OWNER BETA desbloquea las prestaciones PRO sin pasar por Stripe.
  // El acceso de los clientes de pago no cambia: `isPro` sigue dependiendo
  // exclusivamente de la sesión verificada de Stripe.
  const hasProAccess = isPro || isOwnerBeta;

  const activatePro = useCallback((sessionId: string, expiresAt?: number) => {
    // Default PRO: 1 year from now if no expiration provided
    const expiry = expiresAt || Date.now() + 365 * 24 * 60 * 60 * 1000;
    const newStatus: ProStatus = {
      active: true,
      expiresAt: expiry,
      sessionId,
      activatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStatus));
    setStatus(newStatus);
    setNow(Date.now());
    window.dispatchEvent(new Event(PRO_STATUS_EVENT));
  }, []);

  const deactivatePro = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStatus(defaultStatus);
    setNow(Date.now());
    window.dispatchEvent(new Event(PRO_STATUS_EVENT));
  }, []);

  return {
    isPro,
    isOwnerBeta,
    hasProAccess,
    isProVisible: true,
    activatePro,
    deactivatePro,
    sessionId: status.sessionId,
    expiresAt: status.expiresAt,
  };
}

// Singleton getter for non-hook contexts (e.g. AdSlot inline usage)
export function isProSync(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ProStatus;
      if (parsed.active && parsed.expiresAt && parsed.expiresAt > Date.now()) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}
