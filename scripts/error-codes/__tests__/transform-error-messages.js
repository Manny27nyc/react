// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable quotes */
'use strict';

let babel = require('@babel/core');
let devExpressionWithCodes = require('../transform-error-messages');

function transform(input, options = {}) {
  return babel.transform(input, {
    plugins: [[devExpressionWithCodes, options]],
  }).code;
}

let oldEnv;

describe('error transform', () => {
  beforeEach(() => {
    oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = '';
  });

  afterEach(() => {
    process.env.NODE_ENV = oldEnv;
  });

  it('should replace error constructors', () => {
    expect(
      transform(`
new Error('Do not override existing functions.');
`)
    ).toMatchSnapshot();
  });

  it('should replace error constructors (no new)', () => {
    expect(
      transform(`
Error('Do not override existing functions.');
`)
    ).toMatchSnapshot();
  });

  it("should output FIXME for errors that don't have a matching error code", () => {
    expect(
      transform(`
Error('This is not a real error message.');
`)
    ).toMatchSnapshot();
  });

  it(
    "should output FIXME for errors that don't have a matching error " +
      'code, unless opted out with a comment',
    () => {
      // TODO: Since this only detects one of many ways to disable a lint
      // rule, we should instead search for a custom directive (like
      // no-minify-errors) instead of ESLint. Will need to update our lint
      // rule to recognize the same directive.
      expect(
        transform(`
// eslint-disable-next-line react-internal/prod-error-codes
Error('This is not a real error message.');
`)
      ).toMatchSnapshot();
    }
  );

  it('should not touch other calls or new expressions', () => {
    expect(
      transform(`
new NotAnError();
NotAnError();
`)
    ).toMatchSnapshot();
  });

  it('should support interpolating arguments with template strings', () => {
    expect(
      transform(`
new Error(\`Expected \${foo} target to be an array; got \${bar}\`);
`)
    ).toMatchSnapshot();
  });

  it('should support interpolating arguments with concatenation', () => {
    expect(
      transform(`
new Error('Expected ' + foo + ' target to be an array; got ' + bar);
`)
    ).toMatchSnapshot();
  });

  it('should support error constructors with concatenated messages', () => {
    expect(
      transform(`
new Error(\`Expected \${foo} target to \` + \`be an array; got \${bar}\`);
`)
    ).toMatchSnapshot();
  });

  it('handles escaped backticks in template string', () => {
    expect(
      transform(`
new Error(\`Expected \\\`\$\{listener\}\\\` listener to be a function, instead got a value of \\\`\$\{type\}\\\` type.\`);
`)
    ).toMatchSnapshot();
  });
});
