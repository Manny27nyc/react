// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
const {useMemo, useState} = require('react');

function Component(props) {
  const InnerComponent = useMemo(() => () => {
    const [state] = useState(0);

    return state;
  });
  props.callback(InnerComponent);
 
  return null;
};

module.exports = {Component};
