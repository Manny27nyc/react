// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// This file uses workerize to load ./importFile.worker as a webworker and instanciates it,
// exposing flow typed functions that can be used on other files.

import * as importFileModule from './importFile';
import WorkerizedImportFile from './importFile.worker';

import type {ReactProfilerData} from '../types';

type ImportFileModule = typeof importFileModule;

const workerizedImportFile: ImportFileModule = window.Worker
  ? WorkerizedImportFile()
  : importFileModule;

export type ImportWorkerOutputData =
  | {|status: 'SUCCESS', processedData: ReactProfilerData|}
  | {|status: 'INVALID_PROFILE_ERROR', error: Error|}
  | {|status: 'UNEXPECTED_ERROR', error: Error|};

export type importFileFunction = (file: File) => ImportWorkerOutputData;

export const importFile = (file: File) => workerizedImportFile.importFile(file);
