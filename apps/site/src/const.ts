import { parseBool } from './helper/env';

export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_BROWSER = process.browser;
export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const IS_DEBUG = parseBool(process.env.NEXT_PUBLIC_DEBUG);
export const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://stage.boluo.chat/api';
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
