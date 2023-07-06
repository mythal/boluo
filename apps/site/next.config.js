const path = require('path');

const ANALYZE = Boolean(process.env.ANALYZE);

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
  output: 'standalone',
  env: {
    MEDIA_PUBLIC_URL: process.env.MEDIA_PUBLIC_URL,
  },
  transpilePackages: ['ui', 'chat', 'common'],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  rewrites: process.env.NODE_ENV === 'production' ? undefined : rewrites,
  webpack: (config) => {
    if (ANALYZE) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      const plugin = new BundleAnalyzerPlugin({
        analyzerMode: 'static',
      });
      config.plugins.push(plugin);
    }

    // `react-intl` without parser
    // https://formatjs.io/docs/guides/advanced-usage#react-intl-without-parser-40-smaller
    // https://github.com/vercel/next.js/issues/30434
    config.resolve.alias['@formatjs/icu-messageformat-parser'] = '@formatjs/icu-messageformat-parser/no-parser';

    return config;
  },
};

module.exports = config;
