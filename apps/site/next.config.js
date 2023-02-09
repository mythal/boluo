const path = require('path');
const withMDX = require('@next/mdx')();

const ANALYZE = Boolean(process.env.ANALYZE);
const BACKEND_URL = process.env.BACKEND_PROXY_URL || 'https://boluo.chat/api';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  swcMinify: false,
  eslint: {
    dirs: ['src', 'tests'],
  },
  output: 'standalone',
  transpilePackages: ['ui'],
  experimental: {
    appDir: true,
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/:path*`, // Proxy to Backend
      },
    ];
  },
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

    // avoid extra bundle cost, see https://github.com/reduxjs/react-redux/releases/tag/v8.0.0
    config.resolve.alias['react-redux'] = 'react-redux/es/next';
    return config;
  },
};

module.exports = withMDX(config);
