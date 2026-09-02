// Matches the pre-migration `apps/legacy` UUID path encoding (URL-safe base64, no padding).
const ENCODED_UUID_PATTERN = /^[A-Za-z0-9~-]{22}$/;

export const decodeLegacyUuidSegment = (segment: string): string => {
  if (!ENCODED_UUID_PATTERN.test(segment)) {
    return segment;
  }
  const base64 = segment.replace(/-/g, '+').replace(/~/g, '/') + '==';
  try {
    const binary = atob(base64);
    if (binary.length !== 16) {
      return segment;
    }
    let hex = '';
    for (let i = 0; i < binary.length; i++) {
      hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  } catch {
    return segment;
  }
};

// Redirects a pre-migration legacy path URL to the equivalent hash route.
export const legacyHashRedirect = (request: Request, url: URL): Response | null => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return null;
  }
  if (url.pathname === '/') {
    return null;
  }
  const decodedPath = url.pathname.split('/').map(decodeLegacyUuidSegment).join('/');
  const target = new URL(url);
  target.pathname = '/';
  target.hash = decodedPath;
  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      'Cache-Control': 'no-store',
    },
  });
};
