'use client';

import Refresh from '@boluo/icons/Refresh';
import { useEffect } from 'react';
import { Button } from '@boluo/ui/Button';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="p-4">
      <div className="text-xl">Oops</div>
      <div className="py-2">
        Something went very wrong. Please try again later or contact admin.
      </div>

      <div className="py-2">
        <Link
          href="/"
          className="text-text-link decoration-text-link-decoration hover:text-text-link-hover underline"
        >
          Back to Home
        </Link>
      </div>

      <div>
        <div className="py-2 text-sm">Tech details:</div>

        <div>
          <span className="bg-state-danger-bg mr-2 rounded px-2">{error.name}</span>
          <span className="font-mono">{error.message}</span>
        </div>
      </div>
    </div>
  );
}
