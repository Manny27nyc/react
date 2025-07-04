// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Mock of the Native Hooks
// TODO: Should this move into the components themselves? E.g. focusable

const TextInputState = {
  blurTextInput: jest.fn(),
  focusTextInput: jest.fn(),
};

module.exports = TextInputState;
