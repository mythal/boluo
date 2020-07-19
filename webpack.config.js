'use strict';
// https://webpack.js.org/guides/

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const rootPath = path.resolve(__dirname);
const PRODUCTION = process.env.NODE_ENV === 'production';

const iconPath = path.resolve(__dirname, './src/assets/icons');

module.exports = {
  entry: './src/index.tsx',

  // https://webpack.js.org/configuration/devtool/
  devtool: PRODUCTION ? 'source-map' : 'eval-cheap-source-map',
  mode: PRODUCTION ? 'production' : 'development',

  output: {
    filename: '[name].js',
    path: path.resolve(rootPath, 'dist'),
    publicPath: '/',
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(rootPath, 'public/index.html'),
      inject: true,
      favicon: path.resolve(rootPath, 'public/favicon.ico'),
    }),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin(),
    new SpriteLoaderPlugin(),
    // new BundleAnalyzerPlugin(),
  ],

  devServer: {
    contentBase: path.resolve(rootPath, 'public'),
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        ws: true,
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
      { test: /\.(png|svg|jpe?g|gif)$/, use: ['file-loader'], exclude: [iconPath] },
      { test: /\.svg$/, loader: 'svg-sprite-loader', options: { extract: true }, include: [iconPath] },
    ],
  },

  optimization: {
    minimize: PRODUCTION,
    minimizer: [new TerserPlugin()],
  },
};
