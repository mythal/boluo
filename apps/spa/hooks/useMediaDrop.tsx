import { useSetAtom } from 'jotai';
import { useCallback, type DragEventHandler } from 'react';
import type React from 'react';
import { useComposeAtom } from './useComposeAtom';

interface MediaDropReturn {
  onDrop: DragEventHandler;
}

export const useMediaDrop = (): MediaDropReturn => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const { dataTransfer } = event;
      if (!dataTransfer) return;

      const item = Array.from(dataTransfer.items ?? []).find((it) => it.kind === 'file');
      const file = item?.getAsFile() ?? dataTransfer.files?.[0];
      if (!file) return;

      dispatch({ type: 'media', payload: { media: file } });
    },
    [dispatch],
  );
  return { onDrop };
};
