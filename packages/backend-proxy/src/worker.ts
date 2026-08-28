import type { ExportedHandler } from '@cloudflare/workers-types';

interface Env {
  ASSETS: Fetcher;
  BACKEND_URL: string;
}

const isStaticAssetPath = (pathname: string): boolean =>
  pathname === '/assets' || pathname.startsWith('/assets/');

const isApiPath = (pathname: string): boolean =>
  pathname === '/api' || pathname.startsWith('/api/');

const notFound = (method: string): Response =>
  new Response(method === 'HEAD' ? null : 'Not Found', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (isStaticAssetPath(url.pathname)) {
      return notFound(request.method);
    }

    if (!isApiPath(url.pathname)) {
      return await env.ASSETS.fetch(new Request(new URL('/', url), request));
    }

    const BACKEND_URL = new URL(env.BACKEND_URL);
    url.host = BACKEND_URL.host;
    url.protocol = BACKEND_URL.protocol;
    url.port = BACKEND_URL.port;
    const backendRequest = new Request(url, request);
    return await fetch(backendRequest);
  },
} satisfies ExportedHandler<Env>;
