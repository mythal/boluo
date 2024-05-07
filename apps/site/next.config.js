const path = require('path');
const withBundleAnalyzer = require('@next/bundle-analyzer')();

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
    PUBLIC_MEDIA_URL: process.env.PUBLIC_MEDIA_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    APP_URL: process.env.APP_URL,
    DOMAIN: process.env.DOMAIN,
  },
  transpilePackages: ['@boluo/ui', '@boluo/common'],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  rewrites,
  webpack: (config) => {
    // `react-intl` without parser
    // https://formatjs.io/docs/guides/advanced-usage#react-intl-without-parser-40-smaller
    // https://github.com/vercel/next.js/issues/30434
    config.resolve.alias['@formatjs/icu-messageformat-parser'] = '@formatjs/icu-messageformat-parser/no-parser';

    return config;
  },
};

module.exports = process.env.ANALYZE === 'true' ? withBundleAnalyzer(config) : config;
