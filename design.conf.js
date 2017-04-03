var webpack = require('webpack')
var path = require('path')

module.exports = {
  entry: {
    ruleset: './ruleset.coffee.md'
  , rate: './rate.coffee.md'
  , cdr: './cdr.coffee.md'
  , trace: './trace.coffee.md'
  , reference: './reference.coffee.md'
  },
  output: {
    // Use relative path (to the module)
    path: path.join(__dirname,'.')
  , filename: '[name].bundle.js'
  , library: '[name]'
  , libraryTarget: 'umd'
  },
  module: {
    loaders: [
      {
        test: /\.json$/,
        exclude: /node_modules/,
        loader: "json-loader"
      }
    , {
        test: /\.coffee\.md$/,
        exclude: /node_modules/,
        loaders: [
          "babel-loader"
        , "coffee-loader?literate"
        ]
      }
    ]
  }
}
