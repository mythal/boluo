import { useEffect, useState } from 'react';

export const useDetectBrowserSupport = () => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  useEffect(() => {
    // setIsSupported(false);
    setIsSupported(
      CSS.supports('container-type', 'inline-size') &&
        CSS.supports('grid-template-rows', 'subgrid'),
    );
  }, []);
  return isSupported;
};
