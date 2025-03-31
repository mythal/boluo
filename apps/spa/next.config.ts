/* eslint-disable no-restricted-globals */
import generateWithBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import { NextConfig } from 'next';

const withBundleAnalyzer = generateWithBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  productionBrowserSourceMaps: true,
  experimental: {
    // Turn off it if the app switched to `app` router.
    externalDir: true,
    turbo: {
      resolveAlias: {
        '@formatjs/icu-messageformat-parser': '@formatjs/icu-messageformat-parser/no-parser',
      },
    },
    swcPlugins: [
      [
        '@swc/plugin-formatjs',
        {
          idInterpolationPattern: '[sha512:contenthash:base64:6]',
          ast: true,
        },
      ],
    ],
  },
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
    config.resolve.alias['@formatjs/icu-messageformat-parser'] =
      '@formatjs/icu-messageformat-parser/no-parser';

    return config;
  },
};
if (process.env.SENTRY_DSN) {
  module.exports = withSentryConfig(config, {
    org: process.env.SENTRY_ORG ?? 'mythal',
    sentryUrl: process.env.SENTRY_URL ?? 'https://sentry.io/',
    project: process.env.SENTRY_PROJECT ?? 'boluo-spa',
    autoInstrumentServerFunctions: false,
    autoInstrumentMiddleware: false,
    disableLogger: true,
    authToken: process.env.SENTRY_TOKEN,
    widenClientFileUpload: true,
    silent: true,
  });
} else {
  module.exports = withBundleAnalyzer(config);
}
