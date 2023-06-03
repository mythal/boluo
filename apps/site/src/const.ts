export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
