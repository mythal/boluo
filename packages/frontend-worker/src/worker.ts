import type { ExportedHandler, WorkerVersionMetadata } from '@cloudflare/workers-types';

interface Env {
  ASSETS: Fetcher;
  DEPLOYMENT_ENV: 'production' | 'staging';
  BACKEND_URL: string;
  HISTORY_FILES: R2Bucket;
  WORKER_VERSION?: WorkerVersionMetadata;
}

type FrontendApp = 'legacy' | 'spa';

const FRONTEND_VERSION_PATH = '/api/info/frontend-version';
// Use a separate namespace: caches.default may contain SPA HTML for an asset URL.
const HISTORY_CACHE_NAME = 'history-assets-v1';

const isStaticAssetPath = (pathname: string): boolean =>
  pathname === '/assets' ||
  pathname.startsWith('/assets/') ||
  pathname === '/_next/static' ||
  pathname.startsWith('/_next/static/');

const isApiPath = (pathname: string): boolean => pathname.startsWith('/api/');

const notFound = (method: string): Response =>
  new Response(method === 'HEAD' ? null : 'Not Found', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });

const frontendVersion = (request: Request, env: Env): Response => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return notFound(request.method);
  }

  const tag = env.WORKER_VERSION?.tag;
  const body = tag == null ? {} : { frontendVersion: tag };
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};

const historyKey = (url: URL, env: Env, frontendApp: FrontendApp): string =>
  `${env.DEPLOYMENT_ENV}/${frontendApp}${url.pathname}`;

const isNotModifiedRequest = (request: Request): boolean =>
  request.headers.has('If-None-Match') || request.headers.has('If-Modified-Since');

const historyCacheRequest = (url: URL, request?: Request): Request => {
  const cacheUrl = new URL(url);
  // R2 keys are based on the pathname, ignore query string.
  cacheUrl.search = '';

  return new Request(cacheUrl, {
    method: 'GET',
    headers: request?.headers,
  });
};

const withoutBody = (response: Response): Response =>
  new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

const historyAsset = async (
  request: Request,
  url: URL,
  env: Env,
  frontendApp: FrontendApp,
  ctx: ExecutionContext,
): Promise<Response> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return notFound(request.method);
  }

  const cache = await caches.open(HISTORY_CACHE_NAME);
  const cacheRequest = historyCacheRequest(url, request);
  const cachedResponse = await cache.match(cacheRequest);
  if (cachedResponse) {
    return request.method === 'HEAD' ? withoutBody(cachedResponse) : cachedResponse;
  }

  const object = await env.HISTORY_FILES.get(historyKey(url, env, frontendApp), {
    onlyIf: request.headers,
  });
  if (object === null) return notFound(request.method);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('X-Content-Type-Options', 'nosniff');
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=15552000, immutable');
  }

  if (!('body' in object)) {
    return new Response(null, {
      status: isNotModifiedRequest(request) ? 304 : 412,
      headers,
    });
  }

  headers.set('Content-Length', String(object.size));

  const response = new Response(object.body, {
    status: 200,
    headers,
  });
  ctx.waitUntil(cache.put(historyCacheRequest(url), response.clone()));

  return request.method === 'HEAD' ? withoutBody(response) : response;
};

const frontendNotFound = async (
  request: Request,
  url: URL,
  env: Env,
  frontendApp: FrontendApp,
): Promise<Response> => {
  const pathname = frontendApp === 'spa' ? '/404' : '/';
  const response = await env.ASSETS.fetch(new Request(new URL(pathname, url), request));
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');

  if (frontendApp === 'legacy') {
    return new Response(request.method === 'HEAD' ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: 404,
    statusText: 'Not Found',
    headers,
  });
};

export const createFrontendWorker = (frontendApp: FrontendApp): ExportedHandler<Env> => ({
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === FRONTEND_VERSION_PATH) {
      return frontendVersion(request, env);
    }

    if (isStaticAssetPath(url.pathname)) {
      return await historyAsset(request, url, env, frontendApp, ctx);
    }

    // The backend only recognizes `/api/` subpaths. Forwarding bare `/api`
    // makes it redirect back to the legacy frontend, creating a redirect loop.
    if (url.pathname === '/api') {
      return notFound(request.method);
    }

    if (!isApiPath(url.pathname)) {
      return await frontendNotFound(request, url, env, frontendApp);
    }

    const BACKEND_URL = new URL(env.BACKEND_URL);
    url.host = BACKEND_URL.host;
    url.protocol = BACKEND_URL.protocol;
    url.port = BACKEND_URL.port;
    const backendRequest = new Request(url, request);
    return await fetch(backendRequest);
  },
});
