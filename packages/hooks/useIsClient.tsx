import { useEffect, useState } from 'react';

export const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);
  // Hydration guard: intentionally flips after mount.
  // eslint-disable-next-line @eslint-react/set-state-in-effect
  useEffect(() => setIsClient(true), []);
  return isClient;
};
