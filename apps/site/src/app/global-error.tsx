'use client';

import { useEffect } from 'react';
import { captureException } from '../error';

type NextError = Error & { digest?: string };

export default function GlobalError({ error, reset }: { error: NextError; reset: () => void }) {
  useEffect(() => {
    captureException(error, {
      source: 'next-global-error-boundary',
      context: { digest: error.digest },
    });
  }, [error]);

  return (
    <html>
      <body>
        <main
          style={{
            fontFamily: 'system-ui, sans-serif',
            margin: '4rem auto',
            maxWidth: '32rem',
            padding: '1rem',
          }}
        >
          <h1>Something went wrong</h1>
          <p>Please try again. If the problem continues, contact an administrator.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
          {error.digest && <p style={{ fontFamily: 'monospace' }}>Error ID: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
