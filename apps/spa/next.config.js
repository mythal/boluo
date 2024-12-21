const withBundleAnalyzer = require('@next/bundle-analyzer')();
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  productionBrowserSourceMaps: true,
  swcMinify: false,
  transpilePackages: ['@boluo/ui', '@boluo/common'],
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
if (process.env.SENTRY_DSN) {
  module.exports = withSentryConfig(config, {
    org: 'mythal' ?? process.env.SENTRY_ORG,
    sentryUrl: process.env.SENTRY_URL ?? 'https://sentry.io/',
    project: 'boluo-spa' ?? process.env.SENTRY_PROJECT,
    autoInstrumentServerFunctions: false,
    autoInstrumentMiddleware: false,
    disableLogger: true,
    authToken: process.env.SENTRY_TOKEN,
    widenClientFileUpload: true,
    silent: true,
  });
} else if (process.env.ANALYZE) {
  module.exports = withBundleAnalyzer(config);
} else {
  module.exports = config;
}
