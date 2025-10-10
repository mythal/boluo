'use client';

import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import { useEffect, useState } from 'react';

export const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setIsClient(true), []);
  return isClient;
};

export const ClientBox = ({
  children,
  ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) => {
  if (!useIsClient()) return <div {...props} />;
  return <div {...props}>{children}</div>;
};
