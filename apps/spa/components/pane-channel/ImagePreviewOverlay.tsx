/* eslint-disable @next/next/no-img-element */
import ExternalLink from '@boluo/icons/ExternalLink';
import Scaling from '@boluo/icons/Scaling';
import X from '@boluo/icons/X';
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
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const wheelTargetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMode('fit');
    setOffset({ x: 0, y: 0 });
    setScale(1);
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
    setScale(1);
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const zoomIn = event.deltaY < 0;
      if (mode === 'fit') {
        setMode('original');
        setOffset({ x: 0, y: 0 });
        setScale(1);
        return;
      }
      setScale((prev) => {
        const next = prev * (zoomIn ? 1.1 : 1 / 1.1);
        return Math.min(5, Math.max(0.2, next));
      });
    },
    [mode],
  );

  useEffect(() => {
    const target = wheelTargetRef.current;
    if (!target) return;
    target.addEventListener('wheel', handleWheel, { passive: false });
    return () => target.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const imageStyles = useMemo(() => {
    if (mode === 'fit') {
      return { maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' } as const;
    }
    return {
      maxWidth: 'none',
      maxHeight: 'none',
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
      transformOrigin: 'center center',
    } as const;
  }, [mode, offset.x, offset.y, scale]);

  const imageClassName = useMemo(
    () =>
      clsx(
        'select-none shadow-lg rounded-md transition-[max-height,max-width] duration-150',
        mode === 'fit' ? 'cursor-zoom-in' : isDragging ? 'cursor-grabbing' : 'cursor-grab',
      ),
    [isDragging, mode],
  );

  const openInNewWindow = useCallback(() => {
    window.open(src, '_blank', 'noopener,noreferrer');
  }, [src]);

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
        ref={wheelTargetRef}
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
        <div className="absolute top-4 left-4 flex gap-2">
          <Button
            small
            aria-pressed={mode === 'fit'}
            onClick={(e) => (e.stopPropagation(), toggleMode())}
          >
            <Icon icon={Scaling} />
            <FormattedMessage defaultMessage="Fit to Screen" />
          </Button>
          {mode !== 'fit' && (
            <Button
              small
              className="shadow"
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
              }}
            >
              {Math.round(scale * 100)}%
            </Button>
          )}
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            small
            className="shadow"
            onClick={(e) => {
              e.stopPropagation();
              openInNewWindow();
            }}
          >
            <Icon icon={ExternalLink} />
            <span className="hidden md:inline">
              <FormattedMessage defaultMessage="Open in New Window" />
            </span>
          </Button>
          <Button
            small
            className="shadow"
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
