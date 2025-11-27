import { useEffect, useRef } from 'react';
import { saveDraftInWorker } from '../state/compose-backup.worker-client';

export const COMPOSE_BACKUP_TIMEOUT = 2000;

const COMPOSING_GRACE_TIMEOUT = 6000;

export const useBackupCompose = (
  channelId: string,
  text: string,
  disabled: boolean,
  composingAt: number | null = null,
) => {
  const lastSave = useRef<number>(0);
  useEffect(() => {
    if (disabled) return;
    const trimmed = text.trim();
    if (trimmed === '') return;
    const now = Date.now();
    const composingElapsed = composingAt == null ? Number.POSITIVE_INFINITY : now - composingAt;
    const composingDelay =
      composingElapsed < COMPOSING_GRACE_TIMEOUT ? COMPOSING_GRACE_TIMEOUT - composingElapsed : 0;
    const sinceLastSave = now - lastSave.current;
    const saveCooldown =
      sinceLastSave < COMPOSE_BACKUP_TIMEOUT ? COMPOSE_BACKUP_TIMEOUT - sinceLastSave : 0;
    const delay = Math.max(composingDelay, saveCooldown);

    const save = () => {
      saveDraftInWorker(channelId, text);
      lastSave.current = Date.now();
    };

    if (delay <= 0) {
      save();
      return;
    }

    const timeoutId = window.setTimeout(save, delay);
    return () => clearTimeout(timeoutId);
  }, [channelId, composingAt, disabled, text]);
};
