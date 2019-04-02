var webpack = require('webpack')
var path = require('path')

module.exports = {
  entry: {
    ruleset: './ruleset.js'
  , rate: './rate.js'
  , cdr: './cdr.js'
  , trace: './trace.js'
  },
  output: {
    // Use relative path (to the module)
    path: path.join(__dirname,'.')
  , filename: '[name].bundle.js'
  , library: '[name]'
  , libraryTarget: 'commonjs'
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        exclude: /node_modules/,
        loader: "json-loader"
      }
    ]
  }
  , mode: 'production'
}
