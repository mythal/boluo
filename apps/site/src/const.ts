export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (!process.env.BACKEND_URL) {
  throw new Error('Missing environment variable BACKEND_URL');
}

export const SERVER_SIDE_API_URL = process.env.BACKEND_URL + '/api';
