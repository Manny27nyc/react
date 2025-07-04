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
import {useContext} from 'react';
import {enableProfilerChangedHookIndices} from 'react-devtools-feature-flags';
import {ProfilerContext} from '../Profiler/ProfilerContext';
import {StoreContext} from '../context';

import styles from './WhatChanged.css';

function hookIndicesToString(indices: Array<number>): string {
  // This is debatable but I think 1-based might ake for a nicer UX.
  const numbers = indices.map(value => value + 1);

  switch (numbers.length) {
    case 0:
      return 'No hooks changed';
    case 1:
      return `Hook ${numbers[0]} changed`;
    case 2:
      return `Hooks ${numbers[0]} and ${numbers[1]} changed`;
    default:
      return `Hooks ${numbers.slice(0, numbers.length - 1).join(', ')} and ${
        numbers[numbers.length - 1]
      } changed`;
  }
}

type Props = {|
  fiberID: number,
|};

export default function WhatChanged({fiberID}: Props) {
  const {profilerStore} = useContext(StoreContext);
  const {rootID, selectedCommitIndex} = useContext(ProfilerContext);

  // TRICKY
  // Handle edge case where no commit is selected because of a min-duration filter update.
  // If the commit index is null, suspending for data below would throw an error.
  // TODO (ProfilerContext) This check should not be necessary.
  if (selectedCommitIndex === null) {
    return null;
  }

  const {changeDescriptions} = profilerStore.getCommitData(
    ((rootID: any): number),
    selectedCommitIndex,
  );

  if (changeDescriptions === null) {
    return null;
  }

  const changeDescription = changeDescriptions.get(fiberID);
  if (changeDescription == null) {
    return null;
  }

  const {
    context,
    didHooksChange,
    hooks,
    isFirstMount,
    props,
    state,
  } = changeDescription;

  if (isFirstMount) {
    return (
      <div className={styles.Component}>
        <label className={styles.Label}>Why did this render?</label>
        <div className={styles.Item}>
          This is the first time the component rendered.
        </div>
      </div>
    );
  }

  const changes = [];

  if (context === true) {
    changes.push(
      <div key="context" className={styles.Item}>
        • Context changed
      </div>,
    );
  } else if (
    typeof context === 'object' &&
    context !== null &&
    context.length !== 0
  ) {
    changes.push(
      <div key="context" className={styles.Item}>
        • Context changed:
        {context.map(key => (
          <span key={key} className={styles.Key}>
            {key}
          </span>
        ))}
      </div>,
    );
  }

  if (didHooksChange) {
    if (enableProfilerChangedHookIndices && Array.isArray(hooks)) {
      changes.push(
        <div key="hooks" className={styles.Item}>
          • {hookIndicesToString(hooks)}
        </div>,
      );
    } else {
      changes.push(
        <div key="hooks" className={styles.Item}>
          • Hooks changed
        </div>,
      );
    }
  }

  if (props !== null && props.length !== 0) {
    changes.push(
      <div key="props" className={styles.Item}>
        • Props changed:
        {props.map(key => (
          <span key={key} className={styles.Key}>
            {key}
          </span>
        ))}
      </div>,
    );
  }

  if (state !== null && state.length !== 0) {
    changes.push(
      <div key="state" className={styles.Item}>
        • State changed:
        {state.map(key => (
          <span key={key} className={styles.Key}>
            {key}
          </span>
        ))}
      </div>,
    );
  }

  if (changes.length === 0) {
    changes.push(
      <div key="nothing" className={styles.Item}>
        The parent component rendered.
      </div>,
    );
  }

  return (
    <div className={styles.Component}>
      <label className={styles.Label}>Why did this render?</label>
      {changes}
    </div>
  );
}
