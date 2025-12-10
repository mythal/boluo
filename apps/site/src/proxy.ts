import { narrowLocale, LOCALES } from '@boluo/locale';
import { type Locale, type Theme } from '@boluo/types';
import Negotiator from 'negotiator';
import { type NextRequest, NextResponse } from 'next/server';

function getLocale(request: NextRequest): Locale {
  // From cookie
  const langCookieItem = request.cookies.get('boluo-locale');
  if (langCookieItem != null) {
    const locale = narrowLocale(langCookieItem.value);
    if (locale != null) {
      return locale;
    }
  }

  // From accept-language header
  const accptLanguage = request.headers.get('accept-language') ?? 'en';
  const negotiator = new Negotiator({ headers: { 'accept-language': accptLanguage } });
  for (const language of negotiator.languages()) {
    const locale = narrowLocale(language);
    if (locale != null) {
      return locale;
    }
  }
  // Default to English
  return 'en';
}

function getTheme(request: NextRequest): Theme {
  return 'light';
}
const isLocale = (locale: string = ''): locale is Locale =>
  (LOCALES as readonly string[]).includes(locale);

const IS_STATIC_FILES = /^\/\w+\.(png|ico|svg)/;
const themePrefix = 'theme:';

export function proxy(request: NextRequest): NextResponse | void {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api')) {
    // eslint-disable-next-line no-restricted-globals
    const hostname = process.env.BACKEND_URL;
    if (!hostname) {
      throw new Error('BACKEND_URL is not set');
    }
    const url = new URL(hostname + pathname + request.nextUrl.search, request.url);

    // eslint-disable-next-line no-restricted-globals, turbo/no-undeclared-env-vars
    const backEndApp = process.env.FLY_BACKEND_APP_NAME;
    const hostInHeader = request.headers.get('host');
    if (backEndApp && hostInHeader) {
      // fly-replay
      // https://fly.io/docs/networking/dynamic-request-routing/
      // https://community.fly.io/t/cacheable-fly-replay-and-better-subdomain-routing/24665
      const response = NextResponse.redirect(url);
      response.headers.set('fly-replay', `app=${backEndApp}`);
      response.headers.set('fly-replay-cache', `${hostInHeader}/api/*`);
      response.headers.set('fly-replay-cache-ttl-secs', '60');
      return response;
    }
    return NextResponse.rewrite(url);
  }
  if (IS_STATIC_FILES.test(pathname) || pathname.startsWith('/api')) {
    return;
  }
  const segments = pathname.split('/');
  const [segment0, segment1, segment2] = segments;
  console.assert(segment0 === '', 'Unexpected root segment');
  if (segments.length === 1 || !isLocale(segment1)) {
    const locale = getLocale(request);
    const theme = getTheme(request);
    const url = new URL(`/${locale}/theme:${theme}${pathname}`, request.url);
    return NextResponse.rewrite(url);
  } else if (!segment2 || !segment2.startsWith(themePrefix)) {
    const theme = getTheme(request);
    const url = new URL(`/${segment1}/theme:${theme}${pathname}`, request.url);
    return NextResponse.rewrite(url);
  }
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next).*)',
    // Optional: only run on root (/) URL
    // '/'
  ],
};
