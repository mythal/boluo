import { ExportedHandler } from '@cloudflare/workers-types';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const BACKEND_URL = new URL(env.BACKEND_URL);
    url.host = BACKEND_URL.host;
    url.protocol = BACKEND_URL.protocol;
    url.port = BACKEND_URL.port;
    const backendRequest = new Request(url, request);
    return await fetch(backendRequest);
  },
} satisfies ExportedHandler<{
  BACKEND_URL: string;
}>;
