export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const PING = '♥';
export const PONG = '♡';
export const MEDIA_PUBLIC_URL: string = (() => {
  const url = process.env.MEDIA_PUBLIC_URL;
  if (url == null) {
    throw new Error('MEDIA_PUBLIC_URL is not defined');
  }
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
})();
