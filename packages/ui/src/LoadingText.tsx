'use client';
import { type FC, startTransition, useEffect, useState } from 'react';

export const LoadingText: FC = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => {
        setCount((count) => count + 1);
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);
  const x = count % 5;
  return (
    <span className="LoadingText cursor-progress select-none">
      Loading<span className={x > 1 ? '' : 'opacity-15'}>.</span>
      <span className={x > 2 ? '' : 'opacity-15'}>.</span>
      <span className={x > 3 ? '' : 'opacity-15'}>.</span>
    </span>
  );
};
