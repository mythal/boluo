'use client';

import { useEffect } from 'react';
import { Button } from '@boluo/ui/Button';
import Link from 'next/link';
import { captureException } from '../../../error';

type NextError = Error & { digest?: string };

export default function Error({ error, reset }: { error: NextError; reset: () => void }) {
  useEffect(() => {
    captureException(error, {
      source: 'next-route-error-boundary',
      context: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="p-4">
      <div className="text-xl">Oops</div>
      <div className="py-2">
        Something went very wrong. Please try again later or contact admin.
      </div>

      <div className="flex gap-2 py-2">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/"
          className="text-text-link decoration-text-link-decoration hover:text-text-link-hover underline"
        >
          Back to Home
        </Link>
      </div>

      {error.digest && <div className="py-2 font-mono text-sm">Error ID: {error.digest}</div>}
    </div>
  );
}
