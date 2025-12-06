/* eslint-disable @next/next/no-img-element */
import { Scaling, X } from '@boluo/icons';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';
import clsx from 'clsx';
import {
  createContext,
  type FC,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { FormattedMessage } from 'react-intl';

type ContextValue = {
  open: (src: string) => void;
};

const ImagePreviewContext = createContext<ContextValue | null>(null);

export const useImagePreview = (): ContextValue => {
  const ctx = useContext(ImagePreviewContext);
  if (ctx == null) {
    throw new Error('useImagePreview must be used within ImagePreviewProvider');
  }
  return ctx;
};

const ImagePreviewOverlay: FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
  const [mode, setMode] = useState<'fit' | 'original'>('fit');
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  useEffect(() => {
    setMode('fit');
    setOffset({ x: 0, y: 0 });
  }, [src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const dragState = dragStateRef.current;
    if (dragState == null) return;
    event.preventDefault();
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    setOffset({ x: dragState.baseX + dx, y: dragState.baseY + dy });
  }, []);

  const stopDragging = useCallback(() => {
    dragStateRef.current = null;
    setIsDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    // eslint-disable-next-line react-hooks/immutability
    window.removeEventListener('pointerup', stopDragging);
    window.removeEventListener('pointercancel', stopDragging);
  }, [handlePointerMove]);

  useEffect(() => {
    return () => {
      dragStateRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [handlePointerMove, stopDragging]);

  const startDragging = useCallback(
    (event: ReactPointerEvent<HTMLImageElement>) => {
      if (mode !== 'original') return;
      event.preventDefault();
      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        baseX: offset.x,
        baseY: offset.y,
      };
      setIsDragging(true);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopDragging);
      window.addEventListener('pointercancel', stopDragging);
    },
    [handlePointerMove, mode, offset.x, offset.y, stopDragging],
  );

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'fit' ? 'original' : 'fit'));
    setOffset({ x: 0, y: 0 });
  }, []);

  const imageStyles = useMemo(() => {
    if (mode === 'fit') {
      return { maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' } as const;
    }
    return {
      maxWidth: 'none',
      maxHeight: 'none',
      transform: `translate(${offset.x}px, ${offset.y}px)`,
    } as const;
  }, [mode, offset.x, offset.y]);

  const imageClassName = useMemo(
    () =>
      clsx(
        'select-none shadow-lg rounded-md transition-[max-height,max-width] duration-150',
        mode === 'fit' ? 'cursor-zoom-in' : isDragging ? 'cursor-grabbing' : 'cursor-grab',
      ),
    [isDragging, mode],
  );

  const handleContainerClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      } else {
        event.stopPropagation();
      }
    },
    [onClose],
  );

  const container = (
    <div className="fixed inset-0 z-50 cursor-pointer">
      <div
        className="bg-surface-default/30 absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        className="absolute inset-0 flex items-center justify-center px-4 py-6"
        onClick={handleContainerClick}
      >
        <img
          src={src}
          alt="preview"
          style={imageStyles}
          className={imageClassName}
          draggable={false}
          onPointerDown={startDragging}
          onClick={(e) => {
            e.stopPropagation();
            if (mode === 'fit') {
              toggleMode();
            }
          }}
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <Button small onClick={(e) => (e.stopPropagation(), toggleMode())}>
            <Icon icon={Scaling} />
            {mode === 'fit' ? (
              <FormattedMessage defaultMessage="Original Size" />
            ) : (
              <FormattedMessage defaultMessage="Fit to Screen" />
            )}
          </Button>
          <Button
            small
            className="bg-surface-elevated border-border-default text-text-primary rounded border px-3 py-1 shadow"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <Icon icon={X} />
            <FormattedMessage defaultMessage="Close" />
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? null : createPortal(container, document.body);
};

export const ImagePreviewProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const open = useCallback((src: string) => {
    setPreviewSrc(src);
  }, []);

  const close = useCallback(() => setPreviewSrc(null), []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <ImagePreviewContext.Provider value={value}>
      {children}
      {previewSrc ? <ImagePreviewOverlay src={previewSrc} onClose={close} /> : null}
    </ImagePreviewContext.Provider>
  );
};
