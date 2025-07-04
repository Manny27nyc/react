// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import LRU from 'lru-cache';
import {
  convertInspectedElementBackendToFrontend,
  hydrateHelper,
  inspectElement as inspectElementAPI,
} from 'react-devtools-shared/src/backendAPI';
import {fillInPath} from 'react-devtools-shared/src/hydration';

import type {LRUCache} from 'react-devtools-shared/src/types';
import type {FrontendBridge} from 'react-devtools-shared/src/bridge';
import type {
  InspectElementError,
  InspectElementFullData,
  InspectElementHydratedPath,
} from 'react-devtools-shared/src/backend/types';
import type {
  Element,
  InspectedElement as InspectedElementFrontend,
  InspectedElementResponseType,
} from 'react-devtools-shared/src/devtools/views/Components/types';

// Maps element ID to inspected data.
// We use an LRU for this rather than a WeakMap because of how the "no-change" optimization works.
// When the frontend polls the backend for an update on the element that's currently inspected,
// the backend will send a "no-change" message if the element hasn't updated (rendered) since the last time it was asked.
// In thid case, the frontend cache should reuse the previous (cached) value.
// Using a WeakMap keyed on Element generally works well for this, since Elements are mutable and stable in the Store.
// This doens't work properly though when component filters are changed,
// because this will cause the Store to dump all roots and re-initialize the tree (recreating the Element objects).
// So instead we key on Element ID (which is stable in this case) and use an LRU for eviction.
const inspectedElementCache: LRUCache<
  number,
  InspectedElementFrontend,
> = new LRU({
  max: 25,
});

type Path = Array<string | number>;

type InspectElementReturnType = [
  InspectedElementFrontend,
  InspectedElementResponseType,
];

export function inspectElement({
  bridge,
  element,
  path,
  rendererID,
}: {|
  bridge: FrontendBridge,
  element: Element,
  path: Path | null,
  rendererID: number,
|}): Promise<InspectElementReturnType> {
  const {id} = element;

  // This could indicate that the DevTools UI has been closed and reopened.
  // The in-memory cache will be clear but the backend still thinks we have cached data.
  // In this case, we need to tell it to resend the full data.
  const forceFullData = !inspectedElementCache.has(id);

  return inspectElementAPI({
    bridge,
    forceFullData,
    id,
    path,
    rendererID,
  }).then((data: any) => {
    const {type} = data;

    let inspectedElement;
    switch (type) {
      case 'error':
        const {message, stack} = ((data: any): InspectElementError);

        // The backend's stack (where the error originated) is more meaningful than this stack.
        const error = new Error(message);
        error.stack = stack;

        throw error;

      case 'no-change':
        // This is a no-op for the purposes of our cache.
        inspectedElement = inspectedElementCache.get(id);
        if (inspectedElement != null) {
          return [inspectedElement, type];
        }

        // We should only encounter this case in the event of a bug.
        throw Error(`Cached data for element "${id}" not found`);

      case 'not-found':
        // This is effectively a no-op.
        // If the Element is still in the Store, we can eagerly remove it from the Map.
        inspectedElementCache.remove(id);

        throw Error(`Element "${id}" not found`);

      case 'full-data':
        const fullData = ((data: any): InspectElementFullData);

        // New data has come in.
        // We should replace the data in our local mutable copy.
        inspectedElement = convertInspectedElementBackendToFrontend(
          fullData.value,
        );

        inspectedElementCache.set(id, inspectedElement);

        return [inspectedElement, type];

      case 'hydrated-path':
        const hydratedPathData = ((data: any): InspectElementHydratedPath);
        const {value} = hydratedPathData;

        // A path has been hydrated.
        // Merge it with the latest copy we have locally and resolve with the merged value.
        inspectedElement = inspectedElementCache.get(id) || null;
        if (inspectedElement !== null) {
          // Clone element
          inspectedElement = {...inspectedElement};

          // Merge hydrated data
          fillInPath(
            inspectedElement,
            value,
            ((path: any): Path),
            hydrateHelper(value, ((path: any): Path)),
          );

          inspectedElementCache.set(id, inspectedElement);

          return [inspectedElement, type];
        }
        break;

      default:
        // Should never happen.
        if (__DEV__) {
          console.error(
            `Unexpected inspected element response data: "${type}"`,
          );
        }
        break;
    }

    throw Error(`Unable to inspect element with id "${id}"`);
  });
}

export function clearCacheForTests(): void {
  inspectedElementCache.reset();
}
