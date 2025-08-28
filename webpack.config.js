const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: "production",
  entry: './src/index.js',
  output: {
    filename: '[name].js',
    chunkFilename: "[name].js",
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  optimization: {
    splitChunks: {
      chunks: "all"
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // use your template
      filename: 'index.html',          // output in dist/
    }),
  ],
  devServer: {
    static: './public',
    hot: true,
    open: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      //font loader
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]',
        }
      },
      //asset loader
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]',  // emitted to dist/images
        },
      },
      //JSON loader
      {
        test: /\.geojson$/,
        type: 'asset/resource',
        generator: {
          filename: 'data/[name][ext]'
        }
      }
    ],
  },
};