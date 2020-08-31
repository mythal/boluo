import { RefObject, useLayoutEffect } from 'react';

export const useAutoHeight = (
  enable: boolean,
  text: string,
  inputRef: RefObject<HTMLTextAreaElement>,
  maxHeight = 128
) => {
  useLayoutEffect(() => {
    if (!inputRef.current || !enable) {
      return;
    }
    const scrollHeight = inputRef.current.scrollHeight;
    inputRef.current.style.height = `${Math.min(maxHeight, scrollHeight)}px`;
  }, [inputRef, maxHeight, text, enable]);
};
