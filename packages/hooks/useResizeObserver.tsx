import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

export const useResizeObserver = (ref: RefObject<HTMLElement | null>): DOMRect | null => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries.length !== 1) {
        throw new Error('wrong count of entries.');
      }
      const entry = entries[0]!;
      const newRect = entry.target.getBoundingClientRect();
      setRect(newRect);
    });
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return rect;
};
