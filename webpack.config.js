'use strict';
// https://webpack.js.org/guides/

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const rootPath = path.resolve(__dirname);
const PRODUCTION = process.env.NODE_ENV === 'production';
const REMOTE_BACKEND = Boolean(process.env.REMOTE_BACKEND) || false;

module.exports = {
  entry: './src/index.tsx',

  // https://webpack.js.org/configuration/devtool/
  devtool: PRODUCTION ? 'eval-cheap-module-source-map' : 'source-map',
  mode: PRODUCTION ? 'production' : 'development',

  output: {
    filename: 'main.[hash].js',
    chunkFilename: '[id].[contenthash].js',
    path: path.resolve(rootPath, 'dist'),
    publicPath: '/',
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(rootPath, PRODUCTION ? 'public/index.html' : 'public/index.dev.html'),
      inject: true,
      favicon: PRODUCTION
        ? path.resolve(rootPath, 'src/assets/logo.svg')
        : path.resolve(rootPath, 'src/assets/logo-dev.svg'),
    }),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].[hash].css',
      chunkFilename: '[id].[hash].css',
    }),
    new SpriteLoaderPlugin(),
    // new require('webpack-bundle-analyzer').BundleAnalyzerPlugin,
  ],

  devServer: {
    contentBase: path.resolve(rootPath, 'public'),
    hot: true,
    compress: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: REMOTE_BACKEND ? 'https://boluo.chat' : 'http://127.0.0.1:3000',
        ws: true,
        secure: false,
      },
    },
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json', '.wasm'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'babel-loader' }, { loader: 'ts-loader' }],
      },
      {
        test: /\.css$/,
        use: [PRODUCTION ? MiniCssExtractPlugin.loader : { loader: 'style-loader' }, { loader: 'css-loader' }],
      },
      { test: /\.(png|jpe?g|gif)$/, use: ['file-loader'] },
      {
        test: /\.svg$/,
        loader: 'svg-sprite-loader',
        options: {
          extract: true,
          spriteFilename: '[hash].svg',
        },
      },
    ],
  },

  externals: PRODUCTION
    ? {
        react: 'React',
        'react-dom': 'ReactDOM',
      }
    : {},

  optimization: {
    minimize: PRODUCTION,
    splitChunks: {
      chunks: 'all',
      minSize: 1000000,
    },
    minimizer: [new TerserPlugin(), new OptimizeCSSAssetsPlugin({})],
  },
};
