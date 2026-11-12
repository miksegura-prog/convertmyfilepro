import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'convertmyfilepro_pro';
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

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const isPro = status.active && status.expiresAt !== null && status.expiresAt > now;

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
  }, []);

  const deactivatePro = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStatus(defaultStatus);
  }, []);

  return {
    isPro,
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
