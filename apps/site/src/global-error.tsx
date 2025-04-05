'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';
import { SENTRY_CONFIG } from './const';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (SENTRY_CONFIG.enabled) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html>
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
