'use strict';
// https://webpack.js.org/guides/

require('dotenv').config();
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const rootPath = path.resolve(__dirname);
const PRODUCTION = process.env.NODE_ENV === 'production';

module.exports = {
  entry: './src/index.tsx',

  // https://webpack.js.org/configuration/devtool/
  devtool: PRODUCTION ? 'source-map' : 'eval-cheap-module-source-map',
  mode: PRODUCTION ? 'production' : 'development',

  output: {
    filename: 'main.[contenthash].js',
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
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css',
    }),
    new SpriteLoaderPlugin(),
    // new require('webpack-bundle-analyzer').BundleAnalyzerPlugin,
  ],

  devServer: {
    static: {
      directory: path.resolve(__dirname, 'public'),
    },
    proxy: {
      '/api': 'http://localhost:3000',
    },
    hot: true,
    compress: true,
    historyApiFallback: true,
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json', '.wasm'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'babel-loader' }],
      },
      {
        test: /\.css$/,
        use: [PRODUCTION ? MiniCssExtractPlugin.loader : { loader: 'style-loader' }, { loader: 'css-loader' }],
      },
      { test: /\.(png|jpe?g|gif|woff2)$/, use: ['file-loader'] },
      {
        test: /\.svg$/,
        loader: 'svg-sprite-loader',
        options: {
          extract: true,
          spriteFilename: '[contenthash].svg',
          esModule: false,
        },
      },
    ],
  },

  optimization: {
    minimize: PRODUCTION,
    splitChunks: {
      chunks: 'all',
      minSize: 1000000,
    },
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
  },
};
