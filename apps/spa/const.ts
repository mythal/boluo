export const IS_BROWSER = typeof window !== 'undefined';
export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const PING = '♥';
export const PONG = '♡';
