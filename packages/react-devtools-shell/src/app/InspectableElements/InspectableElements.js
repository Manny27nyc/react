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
import {Fragment} from 'react';
import UnserializableProps from './UnserializableProps';
import CircularReferences from './CircularReferences';
import Contexts from './Contexts';
import CustomHooks from './CustomHooks';
import CustomObject from './CustomObject';
import EdgeCaseObjects from './EdgeCaseObjects.js';
import NestedProps from './NestedProps';
import SimpleValues from './SimpleValues';
import SymbolKeys from './SymbolKeys';

// TODO Add Immutable JS example

export default function InspectableElements() {
  return (
    <Fragment>
      <h1>Inspectable elements</h1>
      <SimpleValues />
      <UnserializableProps />
      <NestedProps />
      <Contexts />
      <CustomHooks />
      <CustomObject />
      <EdgeCaseObjects />
      <CircularReferences />
      <SymbolKeys />
    </Fragment>
  );
}
