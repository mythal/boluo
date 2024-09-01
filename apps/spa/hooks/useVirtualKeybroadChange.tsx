import { useEffect, useRef } from 'react';

const emptyRect = new DOMRectReadOnly();

export type OnVirtualKeybroadChange = (rect: DOMRectReadOnly, prevRect: DOMRectReadOnly) => void;

export const useVirtualKeybroadChange = (onChange: OnVirtualKeybroadChange) => {
  const keyboradRectRef = useRef<DOMRectReadOnly>(emptyRect);

  useEffect(() => {
    if (!('virtualKeyboard' in navigator)) return;
    const listener = (e: GeometryChanegEvent) => {
      const rect = e.target.boundingRect;
      const prevRect = keyboradRectRef.current;
      // Currently, we only care about the height change
      if (rect.height === prevRect.height) return;
      keyboradRectRef.current = rect;
      onChange(rect, prevRect);
    };
    navigator.virtualKeyboard?.addEventListener('geometrychange', listener);
    return () => navigator.virtualKeyboard?.removeEventListener('geometrychange', listener);
  }, [onChange]);
};
