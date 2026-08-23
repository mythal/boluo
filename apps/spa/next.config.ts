/* eslint-disable no-restricted-globals */
import generateWithBundleAnalyzer from '@next/bundle-analyzer';
import { type NextConfig } from 'next';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: ['.env.local', '.env'].flatMap((filename) => [
    path.join(__dirname, filename),
    path.join(__dirname, '../..', filename),
  ]),
  quiet: true,
});

const env = {
  BACKEND_URL: process.env.BACKEND_URL,
  APP_VERSION: process.env.APP_VERSION ?? process.env.GITHUB_SHA,
  ANALYZE: process.env.ANALYZE,
};

// console.log(env);

const withBundleAnalyzer = generateWithBundleAnalyzer({
  enabled: env.ANALYZE === 'true',
});

const rewrites = () => {
  return [
    {
      source: '/api/:path*',
      destination: `${env.BACKEND_URL}/api/:path*`,
    },
  ];
};

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  productionBrowserSourceMaps: true,
  rewrites: process.env.NODE_ENV === 'development' ? rewrites : undefined,
  turbopack: {
    // Remove the parser from `react-intl` to reduce the bundle size
    // https://formatjs.github.io/docs/guides/advanced-usage#react-intl-without-parser-40-smaller
    // https://github.com/vercel/next.js/issues/30434
    resolveAlias: {
      '@formatjs/icu-messageformat-parser': '@formatjs/icu-messageformat-parser/no-parser',
    },
  },
  devIndicators: false,
  experimental: {
    // TODO: Turn off it if the app switched to `app` router.
    externalDir: true,
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
    APP_VERSION: env.APP_VERSION,
    BACKEND_URL: env.BACKEND_URL,
  },

  webpack: (config) => {
    // See `config.turbo.resolveAlias`
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    config.resolve.alias['@formatjs/icu-messageformat-parser'] =
      '@formatjs/icu-messageformat-parser/no-parser';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return config;
  },
};
module.exports = withBundleAnalyzer(config);
