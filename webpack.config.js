'use strict';
// https://webpack.js.org/guides/

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const rootPath = path.resolve(__dirname);

module.exports = {
  entry: './src/index.tsx',

  devtool: 'source-map',
  mode: 'development',

  output: {
    filename: '[name].[hash].js',
    path: path.resolve(rootPath, 'dist'),
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(rootPath, 'public/index.html'),
      inject: true,
      favicon: path.resolve(rootPath, 'public/favicon.ico'),
    }),
    new CleanWebpackPlugin(),
  ],

  devServer: {
    contentBase: path.resolve(rootPath, 'public'),
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json', '.wasm'],
  },

  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'ts-loader' },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      { test: /\.(png|svg|jpg|gif)$/, use: ['file-loader'] },
    ],
  },
};
