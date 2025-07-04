// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {StrictMode} from 'react';

export default function PartiallyStrictApp() {
  return (
    <>
      <Child />
      <StrictMode>
        <StrictChild />
      </StrictMode>
    </>
  );
}

function Child() {
  return <Grandchild />;
}

function StrictChild() {
  return <Grandchild />;
}

function Grandchild() {
  return null;
}
