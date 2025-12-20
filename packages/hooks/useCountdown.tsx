import { useEffect, useState } from 'react';

export const useCountdown = (seconds: number) => {
  const [countdown, setCountdown] = useState(seconds);

  useEffect(() => {
    setCountdown(seconds);

    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          window.clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [seconds]);

  return countdown;
};
