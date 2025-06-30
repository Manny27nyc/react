// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
var path = require('path');

module.exports = {
  entry: './input',
  output: {
    filename: 'output.js',
  },
  resolve: {
    root: path.resolve('../../../../build/node_modules'),
    alias: {
      react: 'react/umd/react.production.min',
      'react-dom': 'react-dom/umd/react-dom.production.min',
    },
  },
};
