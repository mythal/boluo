import { parseBool } from './helper/env';

export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const IS_DEBUG = parseBool(process.env.NEXT_PUBLIC_DEBUG);

if (!process.env.backendUrl) {
  throw new Error("Missing 'backendUrl' environment variable");
}
export const BACKEND_URL = process.env.backendUrl || '';
export const BACKEND_HOST: string = (() => {
  const httpsPrefix = 'https://';
  const httpPrefix = 'http://';
  if (BACKEND_URL.startsWith(httpsPrefix)) {
    return BACKEND_URL.substring(httpsPrefix.length);
  } else if (BACKEND_URL.startsWith(httpPrefix)) {
    return BACKEND_URL.substring(httpPrefix.length);
  } else {
    console.warn('Incorrect backend url:', BACKEND_URL);
    return BACKEND_URL;
  }
})();

export const PING = '♥';
export const PONG = '♡';
