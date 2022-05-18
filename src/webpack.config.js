var webpack = require('webpack');

const path = require('path');

const dotenv = require('dotenv').config({ path: __dirname + '/.env' })
const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: './script.js',
  resolve: { fallback: { 
                fs: false, 
                "util": require.resolve("util/"),
                "stream": require.resolve("stream-browserify"),
                "buffer": require.resolve("buffer/"),
                "zlib": require.resolve("browserify-zlib"),
                "querystring": require.resolve("querystring-es3"),
                "path": require.resolve("path-browserify"),
                "crypto": require.resolve("crypto-browserify"),
                "http": require.resolve("stream-http"),
                "assert": require.resolve("assert/"),
                "url": require.resolve("url/"),
                "console": require.resolve("console-browserify")
            } },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, ''),
    libraryTarget: 'var',
    library: 'EntryPoint'
  },
  module: { //https://medium.com/hackernoon/using-html-components-with-webpack-f383797a5ca
    rules: [
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              minimize: true,
              interpolation: false
            }
          }
        ]
      }
    ]
  }
};