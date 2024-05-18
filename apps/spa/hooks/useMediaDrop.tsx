import { useSetAtom } from 'jotai';
import React, { DragEventHandler, useCallback } from 'react';
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
      if (event.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        if (event.dataTransfer.items[0]?.kind === 'file') {
          const fileDropped = event.dataTransfer.items[0].getAsFile();
          if (fileDropped) {
            dispatch({ type: 'media', payload: { media: fileDropped } });
          }
        }
      }
    },
    [dispatch],
  );
  return { onDrop };
};
