import { Locale, narrowLocale } from '@boluo/common/locale';
import Negotiator from 'negotiator';
import { NextRequest, NextResponse } from 'next/server';

// Get the preferred locale, similar to above or using a library
function getLocale(request: NextRequest): Locale {
  const langCookieItem = request.cookies.get('boluo-locale');
  if (langCookieItem != null) {
    const locale = narrowLocale(langCookieItem.value);
    if (locale != null) {
      return locale;
    }
  }

  const accptLanguage = request.headers.get('accept-language') ?? 'en';
  const negotiator = new Negotiator({ headers: { 'accept-language': accptLanguage } });
  for (const language of negotiator.languages()) {
    const locale = narrowLocale(language);
    if (locale != null) {
      return locale;
    }
  }
  return 'en';
}

const locales = ['en', 'ja', 'zh', 'zh-CN'] as const;

const IS_STATIC_FILES = /^\/\w+\.(png|ico|svg)/;

export function middleware(request: NextRequest): NextResponse | void {
  const pathname = request.nextUrl.pathname;
  if (IS_STATIC_FILES.test(pathname)) {
    return;
  }
  if (pathname.startsWith('/api')) {
    return;
  }
  // Check if there is any supported locale in the pathname

  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);

    const url = new URL(`/${locale}${pathname}`, request.url);
    return NextResponse.rewrite(url);
  }
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next|api).*)',
    // Optional: only run on root (/) URL
    // '/'
  ],
};
