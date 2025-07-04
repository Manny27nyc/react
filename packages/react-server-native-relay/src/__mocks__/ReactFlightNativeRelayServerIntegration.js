// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const ReactFlightNativeRelayServerIntegration = {
  emitRow(destination, json) {
    destination.push(json);
  },
  close(destination) {},
  resolveModuleMetaData(config, resource) {
    return resource._moduleId;
  },
};

module.exports = ReactFlightNativeRelayServerIntegration;
