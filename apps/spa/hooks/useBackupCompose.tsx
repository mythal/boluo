import { useEffect, useRef } from 'react';
import { type ParseResult } from '../interpreter/parse-result';
import { saveDraftInWorker } from '../state/compose-backup.worker-client';

export const COMPOSE_BACKUP_TIMEOUT = 2000;

export const useBackupCompose = (channelId: string, parsed: ParseResult, disabled: boolean) => {
  const lastSave = useRef<number>(0);
  const text = parsed.text;
  const entityCount = parsed.entities.length;
  useEffect(() => {
    if (disabled) return;
    if (entityCount === 0) return;
    const trimmed = text.trim();
    if (trimmed === '') return;
    const now = Date.now();
    const save = () => {
      saveDraftInWorker(channelId, text);
      lastSave.current = Date.now();
    };
    const diff = now - lastSave.current;
    if (diff < COMPOSE_BACKUP_TIMEOUT) {
      const handle = window.setTimeout(save, COMPOSE_BACKUP_TIMEOUT - diff);
      return () => clearTimeout(handle);
    }
    save();
  }, [channelId, disabled, entityCount, text]);
};
