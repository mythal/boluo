import { RefObject, useLayoutEffect } from 'react';

export const useAutoHeight = (text: string, inputRef: RefObject<HTMLTextAreaElement>, maxHeight = 128) => {
  useLayoutEffect(() => {
    if (!inputRef.current) {
      return;
    }
    inputRef.current.style.height = '0';
    const scrollHeight = inputRef.current.scrollHeight;
    inputRef.current.style.height = `${Math.min(maxHeight, scrollHeight)}px`;
  }, [inputRef, maxHeight, text]);
};
