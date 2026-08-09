import Avatar from 'boring-avatars';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server.edge';

const DEFAULT_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];
const DEFAULT_SIZE = 256;
const MAX_NAME_LENGTH = 128;
const SIZE_PATTERN = /^\d{1,4}$/;

type AvatarVariant = NonNullable<ComponentProps<typeof Avatar>['variant']>;

const AVATAR_VARIANTS = [
  'marble',
  'beam',
  'pixel',
  'sunset',
  'ring',
  'bauhaus',
] as const satisfies readonly AvatarVariant[];

function errorResponse(message: string, status: number, headers?: HeadersInit): Response {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      ...headers,
    },
  });
}

function getName(pathname: string): string {
  const path = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return path.slice(1, MAX_NAME_LENGTH + 1);
}

function getSize(value: string | null): number {
  return value && SIZE_PATTERN.test(value) ? Number.parseInt(value, 10) : DEFAULT_SIZE;
}

function getCacheRequest(url: URL, size: number): Request {
  const cacheUrl = new URL(url);
  cacheUrl.search = '';
  cacheUrl.searchParams.set('size', String(size));
  return new Request(cacheUrl.toString(), { method: 'GET' });
}

function withoutBody(response: Response): Response {
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function createAvatarResponse(name: string, size: number): Promise<Response> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(name));
  const seed = new DataView(digest).getUint32(0);
  const variant = AVATAR_VARIANTS[seed % AVATAR_VARIANTS.length] ?? 'marble';
  const svg = renderToStaticMarkup(
    createElement(Avatar, {
      colors: DEFAULT_COLORS,
      name,
      size,
      square: true,
      variant,
    }),
  );

  return new Response(svg, {
    headers: {
      'Cache-Control': 'public, max-age=86400',
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default {
  async fetch(request, _env, ctx): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return errorResponse('Method not allowed', 405, { Allow: 'GET, HEAD' });
    }

    const url = new URL(request.url);
    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    const name = getName(url.pathname);
    if (!name) {
      return errorResponse('Please provide a name', 400);
    }

    const size = getSize(url.searchParams.get('size'));
    const cacheRequest = getCacheRequest(url, size);
    const cachedResponse = await caches.default.match(cacheRequest);
    if (cachedResponse) {
      return request.method === 'HEAD' ? withoutBody(cachedResponse) : cachedResponse;
    }

    const response = await createAvatarResponse(name, size);
    ctx.waitUntil(caches.default.put(cacheRequest, response.clone()));
    return request.method === 'HEAD' ? withoutBody(response) : response;
  },
} satisfies ExportedHandler;
