import { useEffect, useState } from 'react';

export const useDetectBrowserSupport = () => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  useEffect(() => {
    // CSS.supports needs the client, so detection runs after mount.
    // eslint-disable-next-line @eslint-react/set-state-in-effect
    setIsSupported(
      CSS.supports('container-type', 'inline-size') &&
        CSS.supports('grid-template-rows', 'subgrid'),
    );
  }, []);
  return isSupported;
};
