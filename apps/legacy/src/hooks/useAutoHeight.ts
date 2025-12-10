import { type RefObject, useEffect } from 'react';

export const useAutoHeight = (
  enable: boolean,
  inputRef: RefObject<HTMLTextAreaElement | null>,
  maxHeight = 128,
) => {
  useEffect(() => {
    if (inputRef.current == null || !enable) {
      return;
    }
    const input = inputRef.current;
    const changeHeight = () => {
      if (input.value === '') {
        input.style.height = '';
        return;
      }
      const scrollHeight = input.scrollHeight;
      if (scrollHeight > 50) {
        input.style.height = `${Math.min(maxHeight, scrollHeight)}px`;
      }
    };
    changeHeight();
    input.addEventListener('keyup', changeHeight);
    input.addEventListener('change', changeHeight);
    return () => {
      input.removeEventListener('keyup', changeHeight);
      input.removeEventListener('change', changeHeight);
    };
  }, [maxHeight, inputRef, enable]);
};
