// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import typeof * as FeatureFlagsType from 'shared/ReactFeatureFlags';
import typeof * as ExportsType from './ReactFeatureFlags.test-renderer.www';

export const debugRenderPhaseSideEffectsForStrictMode = false;
export const enableDebugTracing = false;
export const enableSchedulingProfiler = false;
export const warnAboutDeprecatedLifecycles = true;
export const replayFailedUnitOfWorkWithInvokeGuardedCallback = false;
export const enableProfilerTimer = __PROFILE__;
export const enableProfilerCommitHooks = __PROFILE__;
export const enableProfilerNestedUpdatePhase = __PROFILE__;
export const enableProfilerNestedUpdateScheduledHook = false;
export const enableUpdaterTracking = false;
export const enableSuspenseServerRenderer = false;
export const enableSelectiveHydration = false;
export const enableLazyElements = false;
export const enableCache = true;
export const enableSchedulerDebugging = false;
export const disableJavaScriptURLs = false;
export const disableInputAttributeSyncing = false;
export const enableScopeAPI = true;
export const enableCreateEventHandleAPI = false;
export const enableSuspenseCallback = true;
export const warnAboutDefaultPropsOnFunctionComponents = false;
export const warnAboutStringRefs = false;
export const disableLegacyContext = false;
export const disableSchedulerTimeoutBasedOnReactExpirationTime = false;
export const enableTrustedTypesIntegration = false;
export const disableTextareaChildren = false;
export const disableModulePatternComponents = true;
export const warnUnstableRenderSubtreeIntoContainer = false;
export const warnAboutSpreadingKeyToJSX = false;
export const warnOnSubscriptionInsideStartTransition = false;
export const enableSuspenseAvoidThisFallback = true;
export const enableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay = true;
export const enableClientRenderFallbackOnHydrationMismatch = true;
export const enableComponentStackLocations = true;
export const enableLegacyFBSupport = false;
export const enableFilterEmptyStringAttributesDOM = false;
export const disableNativeComponentFrames = false;
export const skipUnmountedBoundaries = false;
export const deletedTreeCleanUpLevel = 3;
export const enableSuspenseLayoutEffectSemantics = false;
export const enableGetInspectorDataForInstanceInProduction = false;
export const enableNewReconciler = false;
export const deferRenderPhaseUpdateToNextBatch = false;

export const enableStrictEffects = true;
export const createRootStrictEffectsByDefault = false;
export const enableUseRefAccessWarning = false;
export const warnAboutCallbackRefReturningFunction = false;

export const disableSchedulerTimeoutInWorkLoop = false;
export const enableLazyContextPropagation = false;
export const enableSyncDefaultUpdates = true;
export const allowConcurrentByDefault = true;
export const enablePersistentOffscreenHostContainer = false;
export const enableCustomElementPropertySupport = false;

export const consoleManagedByDevToolsDuringStrictMode = false;

// Some www surfaces are still using this. Remove once they have been migrated.
export const enableUseMutableSource = true;

// Flow magic to verify the exports of this file match the original version.
// eslint-disable-next-line no-unused-vars
type Check<_X, Y: _X, X: Y = _X> = null;
// eslint-disable-next-line no-unused-expressions
(null: Check<ExportsType, FeatureFlagsType>);
