/* eslint-disable no-restricted-globals */
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const APP_VERSION = process.env.APP_VERSION;

export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const PING = '♥';
export const PONG = '♡';
export const ZERO_WIDTH_SPACE = '\u200b';
