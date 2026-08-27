export const originMap = {
  'boluochat.com': 'https://production.boluochat.com',
  'boluo.chat': 'https://production.boluo.chat',
  'boluo-staging.mythal.net': 'https://server.boluo-staging.mythal.net',
  '.kagangtuya.top': 'https://boluo-net.kagangtuya.top',
};

export const normalizeProxyUrlForOrigin = (url: string, origin: string): string => {
  if (url.endsWith('boluo.chat') && origin.endsWith('boluochat.com')) {
    return url.replace('boluo.chat', 'boluochat.com');
  }
  return url;
};
