/* eslint-disable no-restricted-globals */
import path from 'path';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import { type NextConfig } from 'next';
import dotenv from 'dotenv';

dotenv.config({
  path: ['.env.local', '.env'].flatMap((filename) => [
    path.join(__dirname, filename),
    path.join(__dirname, '../..', filename),
  ]),
  quiet: true,
});

const env = {
  BACKEND_URL: process.env.BACKEND_URL,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_URL: process.env.SENTRY_URL,
  SENTRY_PROJECT_SITE: process.env.SENTRY_PROJECT_SITE,
  SENTRY_TOKEN: process.env.SENTRY_TOKEN,
  ANALYZE: process.env.ANALYZE,
};

const rewrites = () => {
  return [
    {
      source: '/api/:path*',
      destination: `${env.BACKEND_URL}/api/:path*`,
    },
  ];
};

const root = path.join(__dirname, '../..');

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  rewrites: process.env.NODE_ENV === 'development' ? rewrites : undefined,
  turbopack: {
    // Workaround for https://github.com/vercel/next.js/issues/81628
    root,
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
    SENTRY_DSN: env.SENTRY_DSN,
  },
  outputFileTracingRoot: root,
  webpack: (config) => {
    // `react-intl` without parser
    // https://formatjs.io/docs/guides/advanced-usage#react-intl-without-parser-40-smaller
    // https://github.com/vercel/next.js/issues/30434
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    config.resolve.alias['@formatjs/icu-messageformat-parser'] =
      '@formatjs/icu-messageformat-parser/no-parser';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return config;
  },
};

if (env.SENTRY_DSN) {
  module.exports = withSentryConfig(config, {
    org: env.SENTRY_ORG ?? 'mythal',
    sentryUrl: env.SENTRY_URL ?? 'https://sentry.io/',
    project: env.SENTRY_PROJECT_SITE ?? 'boluo-site',
    disableLogger: true,
    authToken: env.SENTRY_TOKEN,
    widenClientFileUpload: true,
    silent: true,
  });
} else if (env.ANALYZE === 'true') {
  module.exports = withBundleAnalyzer()(config);
} else {
  module.exports = config;
}
