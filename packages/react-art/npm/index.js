// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-art.production.min.js');
} else {
  module.exports = require('./cjs/react-art.development.js');
}
