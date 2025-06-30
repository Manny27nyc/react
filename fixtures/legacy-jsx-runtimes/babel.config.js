// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
module.exports = {
  presets: [
    [
      '@babel/react',
      {
        runtime: 'automatic',
        development: process.env.BABEL_ENV === 'development',
      },
    ],
  ],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
};
