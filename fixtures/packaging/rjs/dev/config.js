// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
module.exports = {
  baseUrl: '.',
  name: 'input',
  out: 'output.js',
  optimize: 'none',
  paths: {
    react: '../../../../build/node_modules/react/umd/react.development',
    'react-dom':
      '../../../../build/node_modules/react-dom/umd/react-dom.development',
    schedule:
      '../../../../build/node_modules/scheduler/umd/schedule.development',
  },
};
