import { useEffect, useState } from 'react';
import { isBrowserSupported } from '@boluo/utils/browser';

export const useDetectBrowserSupport = () => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  useEffect(() => {
    // CSS.supports needs the client, so detection runs after mount.
    // eslint-disable-next-line @eslint-react/set-state-in-effect
    setIsSupported(isBrowserSupported());
  }, []);
  return isSupported;
};
