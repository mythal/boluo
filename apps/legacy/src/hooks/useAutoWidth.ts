import { type RefObject, useLayoutEffect } from 'react';

export const useAutoWidth = (
  text: string,
  inputRef: RefObject<HTMLInputElement>,
  initialWidth = 48,
) => {
  useLayoutEffect(() => {
    if (!inputRef.current) {
      return;
    }
    inputRef.current.style.width = `${initialWidth}px`;
    const scrollWidth = inputRef.current.scrollWidth;
    inputRef.current.style.width = `${Math.max(initialWidth, scrollWidth)}px`;
  }, [text, inputRef, initialWidth]);
};
