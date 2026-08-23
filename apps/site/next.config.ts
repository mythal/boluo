/* eslint-disable no-restricted-globals */
import path from 'path';
import withBundleAnalyzer from '@next/bundle-analyzer';
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

if (env.ANALYZE === 'true') {
  module.exports = withBundleAnalyzer()(config);
} else {
  module.exports = config;
}
