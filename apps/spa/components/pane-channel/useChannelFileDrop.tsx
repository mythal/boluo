import { useCallback, useRef, useState } from 'react';
import { useSetAtom } from 'jotai';
import type { ChannelAtoms } from '../../hooks/useChannelAtoms';

interface Options {
  composeAtom: ChannelAtoms['composeAtom'];
}

export const useChannelFileDrop = ({ composeAtom }: Options) => {
  const dispatchCompose = useSetAtom(composeAtom);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragDepthRef = useRef(0);

  const hasFile = useCallback((event: React.DragEvent) => {
    const { dataTransfer } = event;
    if (!dataTransfer) return false;
    if (Array.from(dataTransfer.items ?? []).some((item) => item.kind === 'file')) return true;
    return dataTransfer.types?.includes?.('Files') ?? false;
  }, []);

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFile(event)) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current += 1;
      setIsDraggingFile(true);
    },
    [hasFile],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFile(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
      setIsDraggingFile(true);
    },
    [hasFile],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFile(event) && !isDraggingFile) return;
      event.preventDefault();
      event.stopPropagation();
      const nextDepth = Math.max(0, dragDepthRef.current - 1);
      dragDepthRef.current = nextDepth;
      if (nextDepth === 0) {
        setIsDraggingFile(false);
      }
    },
    [hasFile, isDraggingFile],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFile(event)) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = 0;
      setIsDraggingFile(false);
      const { dataTransfer } = event;
      if (!dataTransfer) return;
      const item = Array.from(dataTransfer.items ?? []).find((it) => it.kind === 'file');
      const file = item?.getAsFile() ?? dataTransfer.files?.[0];
      if (!file) return;
      dispatchCompose({ type: 'media', payload: { media: file } });
    },
    [dispatchCompose, hasFile],
  );

  return {
    isDraggingFile,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } as const;
};
