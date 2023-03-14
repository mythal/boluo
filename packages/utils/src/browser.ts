export const stopPropagation = <T extends { stopPropagation: () => void }>(e: T) => {
  e.stopPropagation();
};

export function getOS(): 'macOS' | 'iOS' | 'Windows' | 'Android' | 'Linux' | null {
  const userAgent = window.navigator.userAgent.toLowerCase(),
    macosPlatforms = /(macintosh|macintel|macppc|mac68k|macos)/i,
    windowsPlatforms = /(win32|win64|windows|wince)/i,
    iosPlatforms = /(iphone|ipad|ipod)/i;
  let os: ReturnType<typeof getOS> = null;

  if (macosPlatforms.test(userAgent)) {
    os = 'macOS';
  } else if (iosPlatforms.test(userAgent)) {
    os = 'iOS';
  } else if (windowsPlatforms.test(userAgent)) {
    os = 'Windows';
  } else if (userAgent.includes('android')) {
    os = 'Android';
  } else if (!os && userAgent.includes('linux')) {
    os = 'Linux';
  }

  return os;
}

export function isUseCommandKey(): boolean {
  const os = getOS();
  return os === 'macOS' || os === 'iOS';
}
