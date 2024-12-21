const path = require('path');
const withBundleAnalyzer = require('@next/bundle-analyzer')();
const { withSentryConfig } = require('@sentry/nextjs');
const BACKEND_URL = process.env.BACKEND_URL;
const STANDALONE = process.env.STANDALONE === 'true';
if (!BACKEND_URL) {
  throw new Error('BACKEND_URL is required');
}

const rewrites = async () => [
  {
    source: '/api/:path*',
    destination: `${process.env.BACKEND_URL}/api/:path*`, // Proxy to Backend
  },
];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  swcMinify: false,
  eslint: {
    dirs: ['src', 'tests'],
  },
  output: STANDALONE ? 'standalone' : undefined,
  env: {
    PUBLIC_MEDIA_URL: process.env.PUBLIC_MEDIA_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    APP_URL: process.env.APP_URL,
    DOMAIN: process.env.DOMAIN,
    SENTRY_DSN: process.env.SENTRY_DSN,
  },
  transpilePackages: ['@boluo/ui', '@boluo/common'],
  experimental: {
    outputFileTracingRoot: STANDALONE ? path.join(__dirname, '../../') : undefined,
  },
  rewrites,
  webpack: (config) => {
    // `react-intl` without parser
    // https://formatjs.io/docs/guides/advanced-usage#react-intl-without-parser-40-smaller
    // https://github.com/vercel/next.js/issues/30434
    config.resolve.alias['@formatjs/icu-messageformat-parser'] = '@formatjs/icu-messageformat-parser/no-parser';

    return config;
  },
};

if (process.env.SENTRY_DSN) {
  module.exports = withSentryConfig(config, {
    org: 'mythal' ?? process.env.SENTRY_ORG,
    sentryUrl: process.env.SENTRY_URL ?? 'https://sentry.io/',
    project: 'boluo-site' ?? process.env.SENTRY_PROJECT_SITE,
    disableLogger: true,
    authToken: process.env.SENTRY_TOKEN,
    widenClientFileUpload: true,
    silent: true,
  });
} else if (process.env.ANALYZE === 'true') {
  module.exports = withBundleAnalyzer(config);
} else {
  module.exports = config;
}
