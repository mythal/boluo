/* eslint-disable no-restricted-globals */
import path from 'path';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    dirs: ['src', 'tests'],
  },
  output: 'standalone',
  turbopack: {
    resolveAlias: {
      '@formatjs/icu-messageformat-parser': '@formatjs/icu-messageformat-parser/no-parser',
    },
  },
  experimental: {
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
    APP_URL: process.env.APP_URL ?? 'https://app.boluo.chat',
    DOMAIN: process.env.DOMAIN,
    SENTRY_DSN: process.env.SENTRY_DSN,
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
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
    project: process.env.SENTRY_PROJECT_SITE ?? 'boluo-site',
    disableLogger: true,
    authToken: process.env.SENTRY_TOKEN,
    widenClientFileUpload: true,
    silent: true,
  });
} else if (process.env.ANALYZE === 'true') {
  module.exports = withBundleAnalyzer()(config);
} else {
  module.exports = config;
}
