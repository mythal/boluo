'use client';

import { Refresh } from 'icons';
import { useEffect } from 'react';
import { Button } from 'ui/Button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="p-4">
      <div className="text-xl">Oops</div>
      <div className="py-2">Something went very wrong. Please try again later or contact admin.</div>

      <div className="py-2">
        <a className="underline text-blue-600" href="/">
          Back to Home
        </a>
      </div>

      <div>
        <div className="text-sm py-2">Tech details:</div>

        <div>
          <span className="rounded px-2 bg-error-600 text-lowest mr-2">{error.name}</span>
          <span className="font-mono">{error.message}</span>
        </div>
      </div>
    </div>
  );
}
