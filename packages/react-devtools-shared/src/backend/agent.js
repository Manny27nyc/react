// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import EventEmitter from '../events';
import throttle from 'lodash.throttle';
import {
  SESSION_STORAGE_LAST_SELECTION_KEY,
  SESSION_STORAGE_RELOAD_AND_PROFILE_KEY,
  SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY,
  __DEBUG__,
} from '../constants';
import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from 'react-devtools-shared/src/storage';
import setupHighlighter from './views/Highlighter';
import {
  initialize as setupTraceUpdates,
  toggleEnabled as setTraceUpdatesEnabled,
} from './views/TraceUpdates';
import {patch as patchConsole} from './console';
import {currentBridgeProtocol} from 'react-devtools-shared/src/bridge';

import type {BackendBridge} from 'react-devtools-shared/src/bridge';
import type {
  InstanceAndStyle,
  NativeType,
  OwnersList,
  PathFrame,
  PathMatch,
  RendererID,
  RendererInterface,
} from './types';
import type {ComponentFilter} from '../types';
import {isSynchronousXHRSupported} from './utils';
import type {BrowserTheme} from 'react-devtools-shared/src/devtools/views/DevTools';

const debug = (methodName, ...args) => {
  if (__DEBUG__) {
    console.log(
      `%cAgent %c${methodName}`,
      'color: purple; font-weight: bold;',
      'font-weight: bold;',
      ...args,
    );
  }
};

type ElementAndRendererID = {|
  id: number,
  rendererID: number,
|};

type StoreAsGlobalParams = {|
  count: number,
  id: number,
  path: Array<string | number>,
  rendererID: number,
|};

type CopyElementParams = {|
  id: number,
  path: Array<string | number>,
  rendererID: number,
|};

type InspectElementParams = {|
  forceFullData: boolean,
  id: number,
  path: Array<string | number> | null,
  rendererID: number,
  requestID: number,
|};

type OverrideHookParams = {|
  id: number,
  hookID: number,
  path: Array<string | number>,
  rendererID: number,
  wasForwarded?: boolean,
  value: any,
|};

type SetInParams = {|
  id: number,
  path: Array<string | number>,
  rendererID: number,
  wasForwarded?: boolean,
  value: any,
|};

type PathType = 'props' | 'hooks' | 'state' | 'context';

type DeletePathParams = {|
  type: PathType,
  hookID?: ?number,
  id: number,
  path: Array<string | number>,
  rendererID: number,
|};

type RenamePathParams = {|
  type: PathType,
  hookID?: ?number,
  id: number,
  oldPath: Array<string | number>,
  newPath: Array<string | number>,
  rendererID: number,
|};

type OverrideValueAtPathParams = {|
  type: PathType,
  hookID?: ?number,
  id: number,
  path: Array<string | number>,
  rendererID: number,
  value: any,
|};

type OverrideErrorParams = {|
  id: number,
  rendererID: number,
  forceError: boolean,
|};

type OverrideSuspenseParams = {|
  id: number,
  rendererID: number,
  forceFallback: boolean,
|};

type PersistedSelection = {|
  rendererID: number,
  path: Array<PathFrame>,
|};

export default class Agent extends EventEmitter<{|
  hideNativeHighlight: [],
  showNativeHighlight: [NativeType],
  shutdown: [],
  traceUpdates: [Set<NativeType>],
|}> {
  _bridge: BackendBridge;
  _isProfiling: boolean = false;
  _recordChangeDescriptions: boolean = false;
  _rendererInterfaces: {[key: RendererID]: RendererInterface, ...} = {};
  _persistedSelection: PersistedSelection | null = null;
  _persistedSelectionMatch: PathMatch | null = null;
  _traceUpdatesEnabled: boolean = false;

  constructor(bridge: BackendBridge) {
    super();

    if (
      sessionStorageGetItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY) === 'true'
    ) {
      this._recordChangeDescriptions =
        sessionStorageGetItem(
          SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY,
        ) === 'true';
      this._isProfiling = true;

      sessionStorageRemoveItem(SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY);
      sessionStorageRemoveItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY);
    }

    const persistedSelectionString = sessionStorageGetItem(
      SESSION_STORAGE_LAST_SELECTION_KEY,
    );
    if (persistedSelectionString != null) {
      this._persistedSelection = JSON.parse(persistedSelectionString);
    }

    this._bridge = bridge;

    bridge.addListener('clearErrorsAndWarnings', this.clearErrorsAndWarnings);
    bridge.addListener('clearErrorsForFiberID', this.clearErrorsForFiberID);
    bridge.addListener('clearWarningsForFiberID', this.clearWarningsForFiberID);
    bridge.addListener('copyElementPath', this.copyElementPath);
    bridge.addListener('deletePath', this.deletePath);
    bridge.addListener('getBridgeProtocol', this.getBridgeProtocol);
    bridge.addListener('getProfilingData', this.getProfilingData);
    bridge.addListener('getProfilingStatus', this.getProfilingStatus);
    bridge.addListener('getOwnersList', this.getOwnersList);
    bridge.addListener('inspectElement', this.inspectElement);
    bridge.addListener('logElementToConsole', this.logElementToConsole);
    bridge.addListener('overrideError', this.overrideError);
    bridge.addListener('overrideSuspense', this.overrideSuspense);
    bridge.addListener('overrideValueAtPath', this.overrideValueAtPath);
    bridge.addListener('reloadAndProfile', this.reloadAndProfile);
    bridge.addListener('renamePath', this.renamePath);
    bridge.addListener('setTraceUpdatesEnabled', this.setTraceUpdatesEnabled);
    bridge.addListener('startProfiling', this.startProfiling);
    bridge.addListener('stopProfiling', this.stopProfiling);
    bridge.addListener('storeAsGlobal', this.storeAsGlobal);
    bridge.addListener(
      'syncSelectionFromNativeElementsPanel',
      this.syncSelectionFromNativeElementsPanel,
    );
    bridge.addListener('shutdown', this.shutdown);
    bridge.addListener(
      'updateConsolePatchSettings',
      this.updateConsolePatchSettings,
    );
    bridge.addListener('updateComponentFilters', this.updateComponentFilters);
    bridge.addListener('viewAttributeSource', this.viewAttributeSource);
    bridge.addListener('viewElementSource', this.viewElementSource);

    // Temporarily support older standalone front-ends sending commands to newer embedded backends.
    // We do this because React Native embeds the React DevTools backend,
    // but cannot control which version of the frontend users use.
    bridge.addListener('overrideContext', this.overrideContext);
    bridge.addListener('overrideHookState', this.overrideHookState);
    bridge.addListener('overrideProps', this.overrideProps);
    bridge.addListener('overrideState', this.overrideState);

    if (this._isProfiling) {
      bridge.send('profilingStatus', true);
    }

    // Send the Bridge protocol after initialization in case the frontend has already requested it.
    this._bridge.send('bridgeProtocol', currentBridgeProtocol);

    // Notify the frontend if the backend supports the Storage API (e.g. localStorage).
    // If not, features like reload-and-profile will not work correctly and must be disabled.
    let isBackendStorageAPISupported = false;
    try {
      localStorage.getItem('test');
      isBackendStorageAPISupported = true;
    } catch (error) {}
    bridge.send('isBackendStorageAPISupported', isBackendStorageAPISupported);
    bridge.send('isSynchronousXHRSupported', isSynchronousXHRSupported());

    setupHighlighter(bridge, this);
    setupTraceUpdates(this);
  }

  get rendererInterfaces(): {[key: RendererID]: RendererInterface, ...} {
    return this._rendererInterfaces;
  }

  clearErrorsAndWarnings = ({rendererID}: {|rendererID: RendererID|}) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}"`);
    } else {
      renderer.clearErrorsAndWarnings();
    }
  };

  clearErrorsForFiberID = ({id, rendererID}: ElementAndRendererID) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}"`);
    } else {
      renderer.clearErrorsForFiberID(id);
    }
  };

  clearWarningsForFiberID = ({id, rendererID}: ElementAndRendererID) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}"`);
    } else {
      renderer.clearWarningsForFiberID(id);
    }
  };

  copyElementPath = ({id, path, rendererID}: CopyElementParams) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.copyElementPath(id, path);
    }
  };

  deletePath = ({hookID, id, path, rendererID, type}: DeletePathParams) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.deletePath(type, id, hookID, path);
    }
  };

  getInstanceAndStyle({
    id,
    rendererID,
  }: ElementAndRendererID): InstanceAndStyle | null {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}"`);
      return null;
    }
    return renderer.getInstanceAndStyle(id);
  }

  getIDForNode(node: Object): number | null {
    for (const rendererID in this._rendererInterfaces) {
      const renderer = ((this._rendererInterfaces[
        (rendererID: any)
      ]: any): RendererInterface);

      try {
        const id = renderer.getFiberIDForNative(node, true);
        if (id !== null) {
          return id;
        }
      } catch (error) {
        // Some old React versions might throw if they can't find a match.
        // If so we should ignore it...
      }
    }
    return null;
  }

  getBridgeProtocol = () => {
    this._bridge.send('bridgeProtocol', currentBridgeProtocol);
  };

  getProfilingData = ({rendererID}: {|rendererID: RendererID|}) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}"`);
    }

    this._bridge.send('profilingData', renderer.getProfilingData());
  };

  getProfilingStatus = () => {
    this._bridge.send('profilingStatus', this._isProfiling);
  };

  getOwnersList = ({id, rendererID}: ElementAndRendererID) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      const owners = renderer.getOwnersList(id);
      this._bridge.send('ownersList', ({id, owners}: OwnersList));
    }
  };

  inspectElement = ({
    forceFullData,
    id,
    path,
    rendererID,
    requestID,
  }: InspectElementParams) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      this._bridge.send(
        'inspectedElement',
        renderer.inspectElement(requestID, id, path, forceFullData),
      );

      // When user selects an element, stop trying to restore the selection,
      // and instead remember the current selection for the next reload.
      if (
        this._persistedSelectionMatch === null ||
        this._persistedSelectionMatch.id !== id
      ) {
        this._persistedSelection = null;
        this._persistedSelectionMatch = null;
        renderer.setTrackedPath(null);
        this._throttledPersistSelection(rendererID, id);
      }

      // TODO: If there was a way to change the selected DOM element
      // in native Elements tab without forcing a switch to it, we'd do it here.
      // For now, it doesn't seem like there is a way to do that:
      // https://github.com/bvaughn/react-devtools-experimental/issues/102
      // (Setting $0 doesn't work, and calling inspect() switches the tab.)
    }
  };

  logElementToConsole = ({id, rendererID}: ElementAndRendererID) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.logElementToConsole(id);
    }
  };

  overrideError = ({id, rendererID, forceError}: OverrideErrorParams) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.overrideError(id, forceError);
    }
  };

  overrideSuspense = ({
    id,
    rendererID,
    forceFallback,
  }: OverrideSuspenseParams) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.overrideSuspense(id, forceFallback);
    }
  };

  overrideValueAtPath = ({
    hookID,
    id,
    path,
    rendererID,
    type,
    value,
  }: OverrideValueAtPathParams) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.overrideValueAtPath(type, id, hookID, path, value);
    }
  };

  // Temporarily support older standalone front-ends by forwarding the older message types
  // to the new "overrideValueAtPath" command the backend is now listening to.
  overrideContext = ({
    id,
    path,
    rendererID,
    wasForwarded,
    value,
  }: SetInParams) => {
    // Don't forward a message that's already been forwarded by the front-end Bridge.
    // We only need to process the override command once!
    if (!wasForwarded) {
      this.overrideValueAtPath({
        id,
        path,
        rendererID,
        type: 'context',
        value,
      });
    }
  };

  // Temporarily support older standalone front-ends by forwarding the older message types
  // to the new "overrideValueAtPath" command the backend is now listening to.
  overrideHookState = ({
    id,
    hookID,
    path,
    rendererID,
    wasForwarded,
    value,
  }: OverrideHookParams) => {
    // Don't forward a message that's already been forwarded by the front-end Bridge.
    // We only need to process the override command once!
    if (!wasForwarded) {
      this.overrideValueAtPath({
        id,
        path,
        rendererID,
        type: 'hooks',
        value,
      });
    }
  };

  // Temporarily support older standalone front-ends by forwarding the older message types
  // to the new "overrideValueAtPath" command the backend is now listening to.
  overrideProps = ({
    id,
    path,
    rendererID,
    wasForwarded,
    value,
  }: SetInParams) => {
    // Don't forward a message that's already been forwarded by the front-end Bridge.
    // We only need to process the override command once!
    if (!wasForwarded) {
      this.overrideValueAtPath({
        id,
        path,
        rendererID,
        type: 'props',
        value,
      });
    }
  };

  // Temporarily support older standalone front-ends by forwarding the older message types
  // to the new "overrideValueAtPath" command the backend is now listening to.
  overrideState = ({
    id,
    path,
    rendererID,
    wasForwarded,
    value,
  }: SetInParams) => {
    // Don't forward a message that's already been forwarded by the front-end Bridge.
    // We only need to process the override command once!
    if (!wasForwarded) {
      this.overrideValueAtPath({
        id,
        path,
        rendererID,
        type: 'state',
        value,
      });
    }
  };

  reloadAndProfile = (recordChangeDescriptions: boolean) => {
    sessionStorageSetItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY, 'true');
    sessionStorageSetItem(
      SESSION_STORAGE_RECORD_CHANGE_DESCRIPTIONS_KEY,
      recordChangeDescriptions ? 'true' : 'false',
    );

    // This code path should only be hit if the shell has explicitly told the Store that it supports profiling.
    // In that case, the shell must also listen for this specific message to know when it needs to reload the app.
    // The agent can't do this in a way that is renderer agnostic.
    this._bridge.send('reloadAppForProfiling');
  };

  renamePath = ({
    hookID,
    id,
    newPath,
    oldPath,
    rendererID,
    type,
  }: RenamePathParams) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.renamePath(type, id, hookID, oldPath, newPath);
    }
  };

  selectNode(target: Object): void {
    const id = this.getIDForNode(target);
    if (id !== null) {
      this._bridge.send('selectFiber', id);
    }
  }

  setRendererInterface(
    rendererID: RendererID,
    rendererInterface: RendererInterface,
  ) {
    this._rendererInterfaces[rendererID] = rendererInterface;

    if (this._isProfiling) {
      rendererInterface.startProfiling(this._recordChangeDescriptions);
    }

    rendererInterface.setTraceUpdatesEnabled(this._traceUpdatesEnabled);

    // When the renderer is attached, we need to tell it whether
    // we remember the previous selection that we'd like to restore.
    // It'll start tracking mounts for matches to the last selection path.
    const selection = this._persistedSelection;
    if (selection !== null && selection.rendererID === rendererID) {
      rendererInterface.setTrackedPath(selection.path);
    }
  }

  setTraceUpdatesEnabled = (traceUpdatesEnabled: boolean) => {
    this._traceUpdatesEnabled = traceUpdatesEnabled;

    setTraceUpdatesEnabled(traceUpdatesEnabled);

    for (const rendererID in this._rendererInterfaces) {
      const renderer = ((this._rendererInterfaces[
        (rendererID: any)
      ]: any): RendererInterface);
      renderer.setTraceUpdatesEnabled(traceUpdatesEnabled);
    }
  };

  syncSelectionFromNativeElementsPanel = () => {
    const target = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.$0;
    if (target == null) {
      return;
    }
    this.selectNode(target);
  };

  shutdown = () => {
    // Clean up the overlay if visible, and associated events.
    this.emit('shutdown');
  };

  startProfiling = (recordChangeDescriptions: boolean) => {
    this._recordChangeDescriptions = recordChangeDescriptions;
    this._isProfiling = true;
    for (const rendererID in this._rendererInterfaces) {
      const renderer = ((this._rendererInterfaces[
        (rendererID: any)
      ]: any): RendererInterface);
      renderer.startProfiling(recordChangeDescriptions);
    }
    this._bridge.send('profilingStatus', this._isProfiling);
  };

  stopProfiling = () => {
    this._isProfiling = false;
    this._recordChangeDescriptions = false;
    for (const rendererID in this._rendererInterfaces) {
      const renderer = ((this._rendererInterfaces[
        (rendererID: any)
      ]: any): RendererInterface);
      renderer.stopProfiling();
    }
    this._bridge.send('profilingStatus', this._isProfiling);
  };

  storeAsGlobal = ({count, id, path, rendererID}: StoreAsGlobalParams) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.storeAsGlobal(id, path, count);
    }
  };

  updateConsolePatchSettings = ({
    appendComponentStack,
    breakOnConsoleErrors,
    showInlineWarningsAndErrors,
    hideConsoleLogsInStrictMode,
    browserTheme,
  }: {|
    appendComponentStack: boolean,
    breakOnConsoleErrors: boolean,
    showInlineWarningsAndErrors: boolean,
    hideConsoleLogsInStrictMode: boolean,
    browserTheme: BrowserTheme,
  |}) => {
    // If the frontend preference has change,
    // or in the case of React Native- if the backend is just finding out the preference-
    // then reinstall the console overrides.
    // It's safe to call these methods multiple times, so we don't need to worry about that.
    patchConsole({
      appendComponentStack,
      breakOnConsoleErrors,
      showInlineWarningsAndErrors,
      hideConsoleLogsInStrictMode,
      browserTheme,
    });
  };

  updateComponentFilters = (componentFilters: Array<ComponentFilter>) => {
    for (const rendererID in this._rendererInterfaces) {
      const renderer = ((this._rendererInterfaces[
        (rendererID: any)
      ]: any): RendererInterface);
      renderer.updateComponentFilters(componentFilters);
    }
  };

  viewAttributeSource = ({id, path, rendererID}: CopyElementParams) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.prepareViewAttributeSource(id, path);
    }
  };

  viewElementSource = ({id, rendererID}: ElementAndRendererID) => {
    const renderer = this._rendererInterfaces[rendererID];
    if (renderer == null) {
      console.warn(`Invalid renderer id "${rendererID}" for element "${id}"`);
    } else {
      renderer.prepareViewElementSource(id);
    }
  };

  onTraceUpdates = (nodes: Set<NativeType>) => {
    this.emit('traceUpdates', nodes);
  };

  onFastRefreshScheduled = () => {
    if (__DEBUG__) {
      debug('onFastRefreshScheduled');
    }

    this._bridge.send('fastRefreshScheduled');
  };

  onHookOperations = (operations: Array<number>) => {
    if (__DEBUG__) {
      debug(
        'onHookOperations',
        `(${operations.length}) [${operations.join(', ')}]`,
      );
    }

    // TODO:
    // The chrome.runtime does not currently support transferables; it forces JSON serialization.
    // See bug https://bugs.chromium.org/p/chromium/issues/detail?id=927134
    //
    // Regarding transferables, the postMessage doc states:
    // If the ownership of an object is transferred, it becomes unusable (neutered)
    // in the context it was sent from and becomes available only to the worker it was sent to.
    //
    // Even though Chrome is eventually JSON serializing the array buffer,
    // using the transferable approach also sometimes causes it to throw:
    //   DOMException: Failed to execute 'postMessage' on 'Window': ArrayBuffer at index 0 is already neutered.
    //
    // See bug https://github.com/bvaughn/react-devtools-experimental/issues/25
    //
    // The Store has a fallback in place that parses the message as JSON if the type isn't an array.
    // For now the simplest fix seems to be to not transfer the array.
    // This will negatively impact performance on Firefox so it's unfortunate,
    // but until we're able to fix the Chrome error mentioned above, it seems necessary.
    //
    // this._bridge.send('operations', operations, [operations.buffer]);
    this._bridge.send('operations', operations);

    if (this._persistedSelection !== null) {
      const rendererID = operations[0];
      if (this._persistedSelection.rendererID === rendererID) {
        // Check if we can select a deeper match for the persisted selection.
        const renderer = this._rendererInterfaces[rendererID];
        if (renderer == null) {
          console.warn(`Invalid renderer id "${rendererID}"`);
        } else {
          const prevMatch = this._persistedSelectionMatch;
          const nextMatch = renderer.getBestMatchForTrackedPath();
          this._persistedSelectionMatch = nextMatch;
          const prevMatchID = prevMatch !== null ? prevMatch.id : null;
          const nextMatchID = nextMatch !== null ? nextMatch.id : null;
          if (prevMatchID !== nextMatchID) {
            if (nextMatchID !== null) {
              // We moved forward, unlocking a deeper node.
              this._bridge.send('selectFiber', nextMatchID);
            }
          }
          if (nextMatch !== null && nextMatch.isFullMatch) {
            // We've just unlocked the innermost selected node.
            // There's no point tracking it further.
            this._persistedSelection = null;
            this._persistedSelectionMatch = null;
            renderer.setTrackedPath(null);
          }
        }
      }
    }
  };

  onUnsupportedRenderer(rendererID: number) {
    this._bridge.send('unsupportedRendererVersion', rendererID);
  }

  _throttledPersistSelection = throttle((rendererID: number, id: number) => {
    // This is throttled, so both renderer and selected ID
    // might not be available by the time we read them.
    // This is why we need the defensive checks here.
    const renderer = this._rendererInterfaces[rendererID];
    const path = renderer != null ? renderer.getPathForElement(id) : null;
    if (path !== null) {
      sessionStorageSetItem(
        SESSION_STORAGE_LAST_SELECTION_KEY,
        JSON.stringify(({rendererID, path}: PersistedSelection)),
      );
    } else {
      sessionStorageRemoveItem(SESSION_STORAGE_LAST_SELECTION_KEY);
    }
  }, 1000);
}
