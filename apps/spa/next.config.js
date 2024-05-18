const withBundleAnalyzer = require('@next/bundle-analyzer')();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  productionBrowserSourceMaps: true,
  swcMinify: false,
  transpilePackages: ['@boluo/ui', '@boluo/common', 'jotai-devtools'],
  env: {
    PUBLIC_MEDIA_URL: process.env.PUBLIC_MEDIA_URL,
    PUBLIC_BACKEND_URL: process.env.PUBLIC_BACKEND_URL,
    SITE_URL: process.env.SITE_URL,
    APP_URL: process.env.APP_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_TUNNEL: process.env.SENTRY_TUNNEL,
  },
  webpack: (config) => {
    // `react-intl` without parser
    // https://formatjs.io/docs/guides/advanced-usage#react-intl-without-parser-40-smaller
    // https://github.com/vercel/next.js/issues/30434
    config.resolve.alias['@formatjs/icu-messageformat-parser'] = '@formatjs/icu-messageformat-parser/no-parser';

    return config;
  },
};
module.exports = process.env.ANALYZE ? withBundleAnalyzer(config) : config;
