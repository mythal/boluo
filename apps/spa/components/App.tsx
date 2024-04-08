'use client';

import React from 'react';
import { Providers } from '../app/Providers';
import { Suspense, useEffect, useState } from 'react';

const Chat = React.lazy(() => import('@boluo/chat/components/Chat'));

export const App = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Providers>
        <Chat />
      </Providers>
    </Suspense>
  );
};
