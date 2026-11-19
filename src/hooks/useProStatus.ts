import { useState, useEffect, useCallback } from 'react';

export const PRO_STORAGE_KEY = 'convertmyfilepro_pro';
const STORAGE_KEY = PRO_STORAGE_KEY;
const PRO_STATUS_EVENT = 'convertmyfilepro:pro-status';
const INITIAL_TIME = Date.now();

// The production Worker validates both Owner (signed HttpOnly cookie) and
// invitation sessions (revocable D1 entry). Never trust localStorage for Beta.
interface VerifiedAccess {
  owner: boolean;
  beta: boolean;
  expiresAt: number | null;
}
const noVerifiedAccess: VerifiedAccess = { owner: false, beta: false, expiresAt: null };
let accessPromise: Promise<VerifiedAccess> | null = null;
let accessCachedAt = 0;
let accessCached: VerifiedAccess = noVerifiedAccess;

function getVerifiedAccess(force = false): Promise<VerifiedAccess> {
  if (!force && Date.now() - accessCachedAt < 10_000) return Promise.resolve(accessCached);
  if (accessPromise) return accessPromise;
  accessPromise = fetch('/api/pro-beta/status', {
    credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
  }).then(async res => {
    if (!res.ok) return noVerifiedAccess;
    const data = await res.json() as Partial<VerifiedAccess>;
    return {
      owner: data.owner === true,
      beta: data.beta === true,
      expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : null,
    };
  }).catch(() => noVerifiedAccess).then(data => {
    accessCached = data;
    accessCachedAt = Date.now();
    return data;
  }).finally(() => { accessPromise = null; });
  return accessPromise;
}


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
  const [verifiedAccess, setVerifiedAccess] = useState<VerifiedAccess>(noVerifiedAccess);

  useEffect(() => {
    // Keep every hook instance (header, layout, tools) in sync: activation happens
    // in ProSuccess, but the header must switch to "PRO activo" without a reload.
    let mounted = true;
    const refresh = () => {
      accessCachedAt = 0;
      void getVerifiedAccess().then(data => { if (mounted) setVerifiedAccess(data); });
      setStatus(loadStatus());
      setNow(Date.now());
    };

    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(PRO_STATUS_EVENT, refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    // Revalidate revocations while a tab stays open (not only on focus).
    const interval = window.setInterval(() => {
      setNow(Date.now());
      accessCachedAt = 0;
      void getVerifiedAccess().then(data => { if (mounted) setVerifiedAccess(data); });
    }, 60_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('storage', refresh);
      window.removeEventListener(PRO_STATUS_EVENT, refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const isPro = status.active && status.expiresAt !== null && status.expiresAt > now;
  const isOwner = verifiedAccess.owner;
  const isBetaPro = verifiedAccess.beta && verifiedAccess.expiresAt !== null && verifiedAccess.expiresAt > now;
  const hasProAccess = isPro || isOwner || isBetaPro;

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
    isOwner,
    isBetaPro,
    hasProAccess,
    betaExpiresAt: verifiedAccess.expiresAt,
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
