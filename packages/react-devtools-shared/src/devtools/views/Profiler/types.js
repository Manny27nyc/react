// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ElementType} from 'react-devtools-shared/src/types';
import type {SerializedElement} from '../Components/types';

export type CommitTreeNode = {|
  id: number,
  children: Array<number>,
  displayName: string | null,
  hocDisplayNames: Array<string> | null,
  key: number | string | null,
  parentID: number,
  treeBaseDuration: number,
  type: ElementType,
|};

export type CommitTree = {|
  nodes: Map<number, CommitTreeNode>,
  rootID: number,
|};

export type SnapshotNode = {|
  id: number,
  children: Array<number>,
  displayName: string | null,
  hocDisplayNames: Array<string> | null,
  key: number | string | null,
  type: ElementType,
|};

export type ChangeDescription = {|
  context: Array<string> | boolean | null,
  didHooksChange: boolean,
  isFirstMount: boolean,
  props: Array<string> | null,
  state: Array<string> | null,
  hooks?: Array<number> | null,
|};

export type CommitDataFrontend = {|
  // Map of Fiber (ID) to a description of what changed in this commit.
  changeDescriptions: Map<number, ChangeDescription> | null,

  // How long was the render phase?
  duration: number,

  // How long was the layout commit phase?
  // Note that not all builds of React expose this property.
  effectDuration: number | null,

  // Map of Fiber (ID) to actual duration for this commit;
  // Fibers that did not render will not have entries in this Map.
  fiberActualDurations: Map<number, number>,

  // Map of Fiber (ID) to "self duration" for this commit;
  // Fibers that did not render will not have entries in this Map.
  fiberSelfDurations: Map<number, number>,

  // How long was the passive commit phase?
  // Note that not all builds of React expose this property.
  passiveEffectDuration: number | null,

  // Priority level of the commit (if React provided this info)
  priorityLevel: string | null,

  // When did this commit occur (relative to the start of profiling)
  timestamp: number,

  // Fiber(s) responsible for scheduling this update.
  updaters: Array<SerializedElement> | null,
|};

export type ProfilingDataForRootFrontend = {|
  // Timing, duration, and other metadata about each commit.
  commitData: Array<CommitDataFrontend>,

  // Display name of the nearest descendant component (ideally a function or class component).
  // This value is used by the root selector UI.
  displayName: string,

  // Map of fiber id to (initial) tree base duration when Profiling session was started.
  // This info can be used along with commitOperations to reconstruct the tree for any commit.
  initialTreeBaseDurations: Map<number, number>,

  // List of tree mutation that occur during profiling.
  // These mutations can be used along with initial snapshots to reconstruct the tree for any commit.
  operations: Array<Array<number>>,

  // Identifies the root this profiler data corresponds to.
  rootID: number,

  // Map of fiber id to node when the Profiling session was started.
  // This info can be used along with commitOperations to reconstruct the tree for any commit.
  snapshots: Map<number, SnapshotNode>,
|};

// Combination of profiling data collected by the renderer interface (backend) and Store (frontend).
export type ProfilingDataFrontend = {|
  // Profiling data per root.
  dataForRoots: Map<number, ProfilingDataForRootFrontend>,
  imported: boolean,
|};

export type CommitDataExport = {|
  changeDescriptions: Array<[number, ChangeDescription]> | null,
  duration: number,
  effectDuration: number | null,
  // Tuple of fiber ID and actual duration
  fiberActualDurations: Array<[number, number]>,
  // Tuple of fiber ID and computed "self" duration
  fiberSelfDurations: Array<[number, number]>,
  passiveEffectDuration: number | null,
  priorityLevel: string | null,
  timestamp: number,
  updaters: Array<SerializedElement> | null,
|};

export type ProfilingDataForRootExport = {|
  commitData: Array<CommitDataExport>,
  displayName: string,
  // Tuple of Fiber ID and base duration
  initialTreeBaseDurations: Array<[number, number]>,
  operations: Array<Array<number>>,
  rootID: number,
  snapshots: Array<[number, SnapshotNode]>,
|};

// Serializable version of ProfilingDataFrontend data.
export type ProfilingDataExport = {|
  version: 5,
  dataForRoots: Array<ProfilingDataForRootExport>,
|};
