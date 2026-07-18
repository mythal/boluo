import { useEffect, useState } from 'react';

interface ResolvedObjectUrl {
  blob: Blob;
  url: string;
}

/**
 * Give one mounted consumer ownership of an object URL for `blob`.
 *
 * A consumer must not share this URL with another component whose lifetime is
 * independent. For example, a message thumbnail and an open preview overlay
 * should each call this hook and release their own URL.
 */
export const useObjectUrl = (blob: Blob | null): string | null => {
  const [resolved, setResolved] = useState<ResolvedObjectUrl | null>(null);

  useEffect(() => {
    if (blob == null) {
      // Clearing effect-owned state releases its strong reference to the
      // previous Blob when this consumer switches to a non-Blob source.
      // eslint-disable-next-line @eslint-react/set-state-in-effect -- This state owns the previous Blob.
      setResolved(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    // Object URLs must be created in an effect so an abandoned render cannot
    // leak one. State publishes the effect-created URL to the next render;
    // retaining its Blob identity prevents returning a stale replacement URL.
    // eslint-disable-next-line @eslint-react/set-state-in-effect -- The URL is created and owned by this effect.
    setResolved({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return resolved?.blob === blob ? resolved.url : null;
};
