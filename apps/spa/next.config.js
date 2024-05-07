const ANALYZE = Boolean(process.env.ANALYZE);
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const withBundleAnalyzer = require('@next/bundle-analyzer')();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  swcMinify: false,
  transpilePackages: ['@boluo/ui', '@boluo/common'],
  env: {
    PUBLIC_MEDIA_URL: process.env.PUBLIC_MEDIA_URL,
    PUBLIC_BACKEND_URL: process.env.PUBLIC_BACKEND_URL,
    SITE_URL: process.env.SITE_URL,
    DOMAIN: process.env.DOMAIN,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_TUNNEL: process.env.SENTRY_TUNNEL,
  },
  webpack: (config) => {
    if (ANALYZE) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      const plugin = new BundleAnalyzerPlugin({
        analyzerMode: 'static',
      });
      config.plugins.push(plugin);
    }
    if (SENTRY_AUTH_TOKEN) {
      const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');
      config.plugins.push(
        sentryWebpackPlugin({
          org: 'mythal-0s',
          project: 'boluo',
          authToken: process.env.SENTRY_AUTH_TOKEN,
        }),
      );
    }

    // `react-intl` without parser
    // https://formatjs.io/docs/guides/advanced-usage#react-intl-without-parser-40-smaller
    // https://github.com/vercel/next.js/issues/30434
    config.resolve.alias['@formatjs/icu-messageformat-parser'] = '@formatjs/icu-messageformat-parser/no-parser';

    return config;
  },
};
module.exports = process.env.ANALYZE === 'true' ? withBundleAnalyzer(config) : config;
