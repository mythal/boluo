import { findNewVersion, readFrontendVersion } from '@boluo/api/version';
import { useCallback, useEffect, useState } from 'react';
import { withFaroSessionId } from '../frontend-telemetry';

const CHECK_INTERVAL = 30 * 60 * 1000;
const DISMISSED_VERSION_KEY = 'boluo-legacy-dismissed-version-v1';

const getDismissedVersion = (): string | null => {
  try {
    return sessionStorage.getItem(DISMISSED_VERSION_KEY);
  } catch {
    return null;
  }
};

export const useNewVersion = (): { available: boolean; dismiss: () => void } => {
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    let controller: AbortController | undefined;
    let lastCheckAt = 0;
    const check = async () => {
      const now = Date.now();
      if (now - lastCheckAt < CHECK_INTERVAL) return;
      lastCheckAt = now;
      controller?.abort();
      controller = new AbortController();
      try {
        const url = new URL('/api/info/frontend-version', location.origin);
        url.searchParams.set('t', now.toString());
        const response = await fetch(
          url,
          withFaroSessionId({ cache: 'no-store', signal: controller.signal }),
        );
        if (!response.ok) return;
        const latestVersion = readFrontendVersion(await response.json());
        setNewVersion(
          findNewVersion(import.meta.env.APP_VERSION, latestVersion, getDismissedVersion()),
        );
      } catch {
        // Version checks are best-effort and should not disturb the legacy app.
      }
    };
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };

    void check();
    const interval = window.setInterval(check, CHECK_INTERVAL);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', checkWhenVisible);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', checkWhenVisible);
    };
  }, []);

  const dismiss = useCallback(() => {
    if (newVersion != null) {
      try {
        sessionStorage.setItem(DISMISSED_VERSION_KEY, newVersion);
      } catch {
        // The banner can still be dismissed when storage is unavailable.
      }
    }
    setNewVersion(null);
  }, [newVersion]);

  return { available: newVersion != null, dismiss };
};
