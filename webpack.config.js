'use strict';
// https://webpack.js.org/guides/

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const rootPath = path.resolve(__dirname);
const PRODUCTION = process.env.NODE_ENV === 'production';

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
      {
        test: /\.s[ac]ss$/,
        use: [
          PRODUCTION ? MiniCssExtractPlugin.loader : { loader: 'style-loader' },
          { loader: 'css-loader' },
          { loader: 'sass-loader' },
        ],
      },
      { test: /\.(png|svg|jpe?g|gif)$/, use: ['file-loader'] },
    ],
  },

  optimization: {
    minimize: PRODUCTION,
    minimizer: [new TerserPlugin()],
  },
};
