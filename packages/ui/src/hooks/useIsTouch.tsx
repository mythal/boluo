import { getOS } from '@boluo/utils/browser';
import { createContext, useContext, useSyncExternalStore } from 'react';

const isTouchOS = (): boolean => {
  const os = getOS();
  return os === 'iOS' || os === 'Android';
};

let touchDetected = false;

const notifyTouchDetected = (): boolean => {
  if (touchDetected) {
    return false;
  }
  touchDetected = true;
  return true;
};

const getTouchSnapshot = () => touchDetected;
const getServerTouchSnapshot = () => false;

const subscribeTouch = (onStoreChange: () => void) => {
  const handleTouchStart = () => {
    if (notifyTouchDetected()) {
      onStoreChange();
    }
  };

  if (isTouchOS()) {
    handleTouchStart();
  }

  window.addEventListener('touchstart', handleTouchStart);
  return () => window.removeEventListener('touchstart', handleTouchStart);
};

export const useDetectIsTouch = (): boolean => {
  return useSyncExternalStore(subscribeTouch, getTouchSnapshot, getServerTouchSnapshot);
};

export const IsTouchContext = createContext<boolean>(false);

export const useIsTouch = (): boolean => useContext(IsTouchContext);
