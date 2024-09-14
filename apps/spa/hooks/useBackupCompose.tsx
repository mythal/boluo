import { useEffect, useRef } from 'react';
import { type ParseResult } from '../interpreter/parse-result';

export const COMPOSE_BACKUP_TIMEOUT = 2000;
export const composeBackupKey = (channelId: string) => `compose-backup:${channelId}`;

export const useBackupCompose = (channelId: string, parsed: ParseResult, disabled: boolean) => {
  const lastSave = useRef<number>(0);
  useEffect(() => {
    if (disabled) return;
    if (parsed.entities.length === 0) return;
    const trimed = parsed.text.trim();
    if (trimed === '') return;
    const now = Date.now();
    const save = () => {
      const prevSource = sessionStorage.getItem(composeBackupKey(channelId));
      if (prevSource && prevSource.includes(trimed)) {
        return;
      }
      sessionStorage.setItem(composeBackupKey(channelId), parsed.text);
    };
    const diff = now - lastSave.current;
    if (diff < COMPOSE_BACKUP_TIMEOUT) {
      const handle = window.setTimeout(save, COMPOSE_BACKUP_TIMEOUT - diff);
      return () => clearTimeout(handle);
    } else {
      save();
    }
    lastSave.current = now;
  }, [channelId, disabled, parsed]);
};
