// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/use-subscription.production.min.js');
} else {
  module.exports = require('./cjs/use-subscription.development.js');
}
