import { findNewVersion, readVersion } from '@boluo/api/version';
import { useCallback, useEffect, useState } from 'react';
import { withFaroSessionId } from '../frontend-telemetry';
import { useSelector } from '../store';

const CHECK_INTERVAL = 5 * 60 * 1000;
const DISMISSED_VERSION_KEY = 'boluo-legacy-dismissed-version-v1';

const getDismissedVersion = (): string | null => {
  try {
    return sessionStorage.getItem(DISMISSED_VERSION_KEY);
  } catch {
    return null;
  }
};

export const useNewVersion = (): { available: boolean; dismiss: () => void } => {
  const baseUrl = useSelector((state) => state.ui.baseUrl);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    let controller: AbortController | undefined;
    const check = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const url = new URL('/api/info', baseUrl || location.origin);
        url.searchParams.set('t', Date.now().toString());
        const response = await fetch(
          url,
          withFaroSessionId({ cache: 'no-store', signal: controller.signal }),
        );
        if (!response.ok) return;
        const latestVersion = readVersion(await response.json());
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
  }, [baseUrl]);

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
