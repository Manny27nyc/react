// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import isArray from 'shared/isArray';

/**
 * Accumulates items that must not be null or undefined.
 *
 * This is used to conserve memory by avoiding array allocations.
 *
 * @return {*|array<*>} An accumulation of items.
 */
function accumulate<T>(
  current: ?(T | Array<T>),
  next: T | Array<T>,
): T | Array<T> {
  if (next == null) {
    throw new Error(
      'accumulate(...): Accumulated items must not be null or undefined.',
    );
  }

  if (current == null) {
    return next;
  }

  // Both are not empty. Warning: Never call x.concat(y) when you are not
  // certain that x is an Array (x could be a string with concat method).
  if (isArray(current)) {
    return current.concat(next);
  }

  if (isArray(next)) {
    return [current].concat(next);
  }

  return [current, next];
}

export default accumulate;
