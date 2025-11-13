import { getOS } from '@boluo/utils/browser';
import { createContext, useContext, useEffect, useState } from 'react';

export const useDetectIsTouch = (): boolean => {
  const os = getOS();
  const [isTouch, setIsTouch] = useState(os === 'iOS' || os === 'Android');
  useEffect(() => {
    const listener = () => setIsTouch(true);
    window.addEventListener('touchstart', listener);
    return () => window.removeEventListener('touchstart', listener);
  }, []);
  return isTouch;
};

export const IsTouchContext = createContext<boolean>(false);

export const useIsTouch = (): boolean => useContext(IsTouchContext);
