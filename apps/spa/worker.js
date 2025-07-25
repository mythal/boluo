export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const BACKEND_HOST = env.BACKEND_HOST;
    url.host = BACKEND_HOST;
    url.protocol = 'https';
    url.port = '443';
    const backendRequest = new Request(url, request);
    return await fetch(backendRequest);
  },
};
