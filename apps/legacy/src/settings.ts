export const LOCAL_BACKEND = false;

export const HEARTBEAT_INTERVAL = 2000;
export const ONLINE_TIMEOUT = 12000;

export const isCrossOrigin = (() => {
  const hostname = window.location.hostname;
  const localHosts = ['localhost', '127.0.0.1', '::1'];
  if (
    localHosts.includes(hostname) ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.')
  ) {
    return true;
  }
  if (hostname.endsWith('.boluo-legacy.pages.dev')) {
    return true;
  }
  return false;
})();
