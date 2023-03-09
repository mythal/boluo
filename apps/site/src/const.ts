import { DEFAULT_API_URL } from 'common/const';

export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const SERVER_SIDE_API_URL = process.env.BACKEND_URL || process.env.PUBLIC_DEFAULT_API_URL || DEFAULT_API_URL;
