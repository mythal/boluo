const ANALYZE = Boolean(process.env.ANALYZE);
const withBundleAnalyzer = require('@next/bundle-analyzer')();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  swcMinify: false,
  transpilePackages: ['@boluo/ui', '@boluo/chat', '@boluo/common'],
  env: {
    PUBLIC_MEDIA_URL: process.env.PUBLIC_MEDIA_URL,
    PUBLIC_BACKEND_URL: process.env.PUBLIC_BACKEND_URL,
    DOMAIN: process.env.DOMAIN,
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

    return config;
  },
};
module.exports = process.env.ANALYZE === 'true' ? withBundleAnalyzer(config) : config;
