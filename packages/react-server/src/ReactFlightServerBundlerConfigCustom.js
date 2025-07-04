// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

declare var $$$hostConfig: any;

export opaque type BundlerConfig = mixed; // eslint-disable-line no-undef
export opaque type ModuleReference<T> = mixed; // eslint-disable-line no-undef
export opaque type ModuleMetaData: any = mixed; // eslint-disable-line no-undef
export opaque type ModuleKey: any = mixed; // eslint-disable-line no-undef
export const isModuleReference = $$$hostConfig.isModuleReference;
export const getModuleKey = $$$hostConfig.getModuleKey;
export const resolveModuleMetaData = $$$hostConfig.resolveModuleMetaData;
