// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactInternalTypes';
import type {Lanes, Lane} from './ReactFiberLane.new';
import type {
  ReactScopeInstance,
  ReactContext,
  Wakeable,
} from 'shared/ReactTypes';
import type {FiberRoot} from './ReactInternalTypes';
import type {
  Instance,
  Type,
  Props,
  Container,
  ChildSet,
} from './ReactFiberHostConfig';
import type {
  SuspenseState,
  SuspenseListRenderState,
} from './ReactFiberSuspenseComponent.new';
import type {SuspenseContext} from './ReactFiberSuspenseContext.new';
import type {OffscreenState} from './ReactFiberOffscreenComponent';
import type {Cache, SpawnedCachePool} from './ReactFiberCacheComponent.new';
import {enableSuspenseAvoidThisFallback} from 'shared/ReactFeatureFlags';

import {resetWorkInProgressVersions as resetMutableSourceWorkInProgressVersions} from './ReactMutableSource.new';

import {now} from './Scheduler';

import {
  IndeterminateComponent,
  FunctionComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  HostPortal,
  ContextProvider,
  ContextConsumer,
  ForwardRef,
  Fragment,
  Mode,
  Profiler,
  SuspenseComponent,
  SuspenseListComponent,
  MemoComponent,
  SimpleMemoComponent,
  LazyComponent,
  IncompleteClassComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
} from './ReactWorkTags';
import {NoMode, ConcurrentMode, ProfileMode} from './ReactTypeOfMode';
import {
  Ref,
  RefStatic,
  Placement,
  Update,
  Visibility,
  NoFlags,
  DidCapture,
  Snapshot,
  ChildDeletion,
  StaticMask,
  MutationMask,
  Passive,
} from './ReactFiberFlags';

import {
  createInstance,
  createTextInstance,
  appendInitialChild,
  finalizeInitialChildren,
  prepareUpdate,
  supportsMutation,
  supportsPersistence,
  cloneInstance,
  cloneHiddenInstance,
  cloneHiddenTextInstance,
  createContainerChildSet,
  appendChildToContainerChildSet,
  finalizeContainerChildren,
  preparePortalMount,
  prepareScopeUpdate,
} from './ReactFiberHostConfig';
import {
  getRootHostContainer,
  popHostContext,
  getHostContext,
  popHostContainer,
} from './ReactFiberHostContext.new';
import {
  suspenseStackCursor,
  InvisibleParentSuspenseContext,
  hasSuspenseContext,
  popSuspenseContext,
  pushSuspenseContext,
  setShallowSuspenseContext,
  ForceSuspenseFallback,
  setDefaultShallowSuspenseContext,
} from './ReactFiberSuspenseContext.new';
import {findFirstSuspended} from './ReactFiberSuspenseComponent.new';
import {
  isContextProvider as isLegacyContextProvider,
  popContext as popLegacyContext,
  popTopLevelContextObject as popTopLevelLegacyContextObject,
} from './ReactFiberContext.new';
import {popProvider} from './ReactFiberNewContext.new';
import {
  prepareToHydrateHostInstance,
  prepareToHydrateHostTextInstance,
  prepareToHydrateHostSuspenseInstance,
  popHydrationState,
  resetHydrationState,
  getIsHydrating,
} from './ReactFiberHydrationContext.new';
import {
  enableSuspenseCallback,
  enableSuspenseServerRenderer,
  enableScopeAPI,
  enableProfilerTimer,
  enableCache,
  enableSuspenseLayoutEffectSemantics,
  enablePersistentOffscreenHostContainer,
} from 'shared/ReactFeatureFlags';
import {
  renderDidSuspend,
  renderDidSuspendDelayIfPossible,
  renderHasNotSuspendedYet,
  popRenderLanes,
  getRenderTargetTime,
  subtreeRenderLanes,
} from './ReactFiberWorkLoop.new';
import {
  OffscreenLane,
  SomeRetryLane,
  NoLanes,
  includesSomeLane,
  mergeLanes,
} from './ReactFiberLane.new';
import {resetChildFibers} from './ReactChildFiber.new';
import {createScopeInstance} from './ReactFiberScope.new';
import {transferActualDuration} from './ReactProfilerTimer.new';
import {
  popCacheProvider,
  popRootCachePool,
  popCachePool,
} from './ReactFiberCacheComponent.new';
import {popTreeContext} from './ReactFiberTreeContext.new';

function markUpdate(workInProgress: Fiber) {
  // Tag the fiber with an update effect. This turns a Placement into
  // a PlacementAndUpdate.
  workInProgress.flags |= Update;
}

function markRef(workInProgress: Fiber) {
  workInProgress.flags |= Ref;
  if (enableSuspenseLayoutEffectSemantics) {
    workInProgress.flags |= RefStatic;
  }
}

function hadNoMutationsEffects(current: null | Fiber, completedWork: Fiber) {
  const didBailout = current !== null && current.child === completedWork.child;
  if (didBailout) {
    return true;
  }

  if ((completedWork.flags & ChildDeletion) !== NoFlags) {
    return false;
  }

  // TODO: If we move the `hadNoMutationsEffects` call after `bubbleProperties`
  // then we only have to check the `completedWork.subtreeFlags`.
  let child = completedWork.child;
  while (child !== null) {
    if (
      (child.flags & MutationMask) !== NoFlags ||
      (child.subtreeFlags & MutationMask) !== NoFlags
    ) {
      return false;
    }
    child = child.sibling;
  }
  return true;
}

let appendAllChildren;
let updateHostContainer;
let updateHostComponent;
let updateHostText;
if (supportsMutation) {
  // Mutation mode

  appendAllChildren = function(
    parent: Instance,
    workInProgress: Fiber,
    needsVisibilityToggle: boolean,
    isHidden: boolean,
  ) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    let node = workInProgress.child;
    while (node !== null) {
      if (node.tag === HostComponent || node.tag === HostText) {
        appendInitialChild(parent, node.stateNode);
      } else if (node.tag === HostPortal) {
        // If we have a portal child, then we don't want to traverse
        // down its children. Instead, we'll get insertions from each child in
        // the portal directly.
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      if (node === workInProgress) {
        return;
      }
      while (node.sibling === null) {
        if (node.return === null || node.return === workInProgress) {
          return;
        }
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  };

  updateHostContainer = function(current: null | Fiber, workInProgress: Fiber) {
    // Noop
  };
  updateHostComponent = function(
    current: Fiber,
    workInProgress: Fiber,
    type: Type,
    newProps: Props,
    rootContainerInstance: Container,
  ) {
    // If we have an alternate, that means this is an update and we need to
    // schedule a side-effect to do the updates.
    const oldProps = current.memoizedProps;
    if (oldProps === newProps) {
      // In mutation mode, this is sufficient for a bailout because
      // we won't touch this node even if children changed.
      return;
    }

    // If we get updated because one of our children updated, we don't
    // have newProps so we'll have to reuse them.
    // TODO: Split the update API as separate for the props vs. children.
    // Even better would be if children weren't special cased at all tho.
    const instance: Instance = workInProgress.stateNode;
    const currentHostContext = getHostContext();
    // TODO: Experiencing an error where oldProps is null. Suggests a host
    // component is hitting the resume path. Figure out why. Possibly
    // related to `hidden`.
    const updatePayload = prepareUpdate(
      instance,
      type,
      oldProps,
      newProps,
      rootContainerInstance,
      currentHostContext,
    );
    // TODO: Type this specific to this type of component.
    workInProgress.updateQueue = (updatePayload: any);
    // If the update payload indicates that there is a change or if there
    // is a new ref we mark this as an update. All the work is done in commitWork.
    if (updatePayload) {
      markUpdate(workInProgress);
    }
  };
  updateHostText = function(
    current: Fiber,
    workInProgress: Fiber,
    oldText: string,
    newText: string,
  ) {
    // If the text differs, mark it as an update. All the work in done in commitWork.
    if (oldText !== newText) {
      markUpdate(workInProgress);
    }
  };
} else if (supportsPersistence) {
  // Persistent host tree mode

  appendAllChildren = function(
    parent: Instance,
    workInProgress: Fiber,
    needsVisibilityToggle: boolean,
    isHidden: boolean,
  ) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    let node = workInProgress.child;
    while (node !== null) {
      // eslint-disable-next-line no-labels
      branches: if (node.tag === HostComponent) {
        let instance = node.stateNode;
        if (needsVisibilityToggle && isHidden) {
          // This child is inside a timed out tree. Hide it.
          const props = node.memoizedProps;
          const type = node.type;
          instance = cloneHiddenInstance(instance, type, props, node);
        }
        appendInitialChild(parent, instance);
      } else if (node.tag === HostText) {
        let instance = node.stateNode;
        if (needsVisibilityToggle && isHidden) {
          // This child is inside a timed out tree. Hide it.
          const text = node.memoizedProps;
          instance = cloneHiddenTextInstance(instance, text, node);
        }
        appendInitialChild(parent, instance);
      } else if (node.tag === HostPortal) {
        // If we have a portal child, then we don't want to traverse
        // down its children. Instead, we'll get insertions from each child in
        // the portal directly.
      } else if (
        node.tag === OffscreenComponent &&
        node.memoizedState !== null
      ) {
        // The children in this boundary are hidden. Toggle their visibility
        // before appending.
        const child = node.child;
        if (child !== null) {
          child.return = node;
        }
        if (enablePersistentOffscreenHostContainer) {
          appendAllChildren(parent, node, false, false);
        } else {
          appendAllChildren(parent, node, true, true);
        }
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      // $FlowFixMe This is correct but Flow is confused by the labeled break.
      node = (node: Fiber);
      if (node === workInProgress) {
        return;
      }
      while (node.sibling === null) {
        if (node.return === null || node.return === workInProgress) {
          return;
        }
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  };

  // An unfortunate fork of appendAllChildren because we have two different parent types.
  const appendAllChildrenToContainer = function(
    containerChildSet: ChildSet,
    workInProgress: Fiber,
    needsVisibilityToggle: boolean,
    isHidden: boolean,
  ) {
    // We only have the top Fiber that was created but we need recurse down its
    // children to find all the terminal nodes.
    let node = workInProgress.child;
    while (node !== null) {
      // eslint-disable-next-line no-labels
      branches: if (node.tag === HostComponent) {
        let instance = node.stateNode;
        if (needsVisibilityToggle && isHidden) {
          // This child is inside a timed out tree. Hide it.
          const props = node.memoizedProps;
          const type = node.type;
          instance = cloneHiddenInstance(instance, type, props, node);
        }
        appendChildToContainerChildSet(containerChildSet, instance);
      } else if (node.tag === HostText) {
        let instance = node.stateNode;
        if (needsVisibilityToggle && isHidden) {
          // This child is inside a timed out tree. Hide it.
          const text = node.memoizedProps;
          instance = cloneHiddenTextInstance(instance, text, node);
        }
        appendChildToContainerChildSet(containerChildSet, instance);
      } else if (node.tag === HostPortal) {
        // If we have a portal child, then we don't want to traverse
        // down its children. Instead, we'll get insertions from each child in
        // the portal directly.
      } else if (
        node.tag === OffscreenComponent &&
        node.memoizedState !== null
      ) {
        // The children in this boundary are hidden. Toggle their visibility
        // before appending.
        const child = node.child;
        if (child !== null) {
          child.return = node;
        }
        if (enablePersistentOffscreenHostContainer) {
          appendAllChildrenToContainer(containerChildSet, node, false, false);
        } else {
          appendAllChildrenToContainer(containerChildSet, node, true, true);
        }
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      // $FlowFixMe This is correct but Flow is confused by the labeled break.
      node = (node: Fiber);
      if (node === workInProgress) {
        return;
      }
      while (node.sibling === null) {
        if (node.return === null || node.return === workInProgress) {
          return;
        }
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  };
  updateHostContainer = function(current: null | Fiber, workInProgress: Fiber) {
    const portalOrRoot: {
      containerInfo: Container,
      pendingChildren: ChildSet,
      ...
    } = workInProgress.stateNode;
    const childrenUnchanged = hadNoMutationsEffects(current, workInProgress);
    if (childrenUnchanged) {
      // No changes, just reuse the existing instance.
    } else {
      const container = portalOrRoot.containerInfo;
      const newChildSet = createContainerChildSet(container);
      // If children might have changed, we have to add them all to the set.
      appendAllChildrenToContainer(newChildSet, workInProgress, false, false);
      portalOrRoot.pendingChildren = newChildSet;
      // Schedule an update on the container to swap out the container.
      markUpdate(workInProgress);
      finalizeContainerChildren(container, newChildSet);
    }
  };
  updateHostComponent = function(
    current: Fiber,
    workInProgress: Fiber,
    type: Type,
    newProps: Props,
    rootContainerInstance: Container,
  ) {
    const currentInstance = current.stateNode;
    const oldProps = current.memoizedProps;
    // If there are no effects associated with this node, then none of our children had any updates.
    // This guarantees that we can reuse all of them.
    const childrenUnchanged = hadNoMutationsEffects(current, workInProgress);
    if (childrenUnchanged && oldProps === newProps) {
      // No changes, just reuse the existing instance.
      // Note that this might release a previous clone.
      workInProgress.stateNode = currentInstance;
      return;
    }
    const recyclableInstance: Instance = workInProgress.stateNode;
    const currentHostContext = getHostContext();
    let updatePayload = null;
    if (oldProps !== newProps) {
      updatePayload = prepareUpdate(
        recyclableInstance,
        type,
        oldProps,
        newProps,
        rootContainerInstance,
        currentHostContext,
      );
    }
    if (childrenUnchanged && updatePayload === null) {
      // No changes, just reuse the existing instance.
      // Note that this might release a previous clone.
      workInProgress.stateNode = currentInstance;
      return;
    }
    const newInstance = cloneInstance(
      currentInstance,
      updatePayload,
      type,
      oldProps,
      newProps,
      workInProgress,
      childrenUnchanged,
      recyclableInstance,
    );
    if (
      finalizeInitialChildren(
        newInstance,
        type,
        newProps,
        rootContainerInstance,
        currentHostContext,
      )
    ) {
      markUpdate(workInProgress);
    }
    workInProgress.stateNode = newInstance;
    if (childrenUnchanged) {
      // If there are no other effects in this tree, we need to flag this node as having one.
      // Even though we're not going to use it for anything.
      // Otherwise parents won't know that there are new children to propagate upwards.
      markUpdate(workInProgress);
    } else {
      // If children might have changed, we have to add them all to the set.
      appendAllChildren(newInstance, workInProgress, false, false);
    }
  };
  updateHostText = function(
    current: Fiber,
    workInProgress: Fiber,
    oldText: string,
    newText: string,
  ) {
    if (oldText !== newText) {
      // If the text content differs, we'll create a new text instance for it.
      const rootContainerInstance = getRootHostContainer();
      const currentHostContext = getHostContext();
      workInProgress.stateNode = createTextInstance(
        newText,
        rootContainerInstance,
        currentHostContext,
        workInProgress,
      );
      // We'll have to mark it as having an effect, even though we won't use the effect for anything.
      // This lets the parents know that at least one of their children has changed.
      markUpdate(workInProgress);
    } else {
      workInProgress.stateNode = current.stateNode;
    }
  };
} else {
  // No host operations
  updateHostContainer = function(current: null | Fiber, workInProgress: Fiber) {
    // Noop
  };
  updateHostComponent = function(
    current: Fiber,
    workInProgress: Fiber,
    type: Type,
    newProps: Props,
    rootContainerInstance: Container,
  ) {
    // Noop
  };
  updateHostText = function(
    current: Fiber,
    workInProgress: Fiber,
    oldText: string,
    newText: string,
  ) {
    // Noop
  };
}

function cutOffTailIfNeeded(
  renderState: SuspenseListRenderState,
  hasRenderedATailFallback: boolean,
) {
  if (getIsHydrating()) {
    // If we're hydrating, we should consume as many items as we can
    // so we don't leave any behind.
    return;
  }
  switch (renderState.tailMode) {
    case 'hidden': {
      // Any insertions at the end of the tail list after this point
      // should be invisible. If there are already mounted boundaries
      // anything before them are not considered for collapsing.
      // Therefore we need to go through the whole tail to find if
      // there are any.
      let tailNode = renderState.tail;
      let lastTailNode = null;
      while (tailNode !== null) {
        if (tailNode.alternate !== null) {
          lastTailNode = tailNode;
        }
        tailNode = tailNode.sibling;
      }
      // Next we're simply going to delete all insertions after the
      // last rendered item.
      if (lastTailNode === null) {
        // All remaining items in the tail are insertions.
        renderState.tail = null;
      } else {
        // Detach the insertion after the last node that was already
        // inserted.
        lastTailNode.sibling = null;
      }
      break;
    }
    case 'collapsed': {
      // Any insertions at the end of the tail list after this point
      // should be invisible. If there are already mounted boundaries
      // anything before them are not considered for collapsing.
      // Therefore we need to go through the whole tail to find if
      // there are any.
      let tailNode = renderState.tail;
      let lastTailNode = null;
      while (tailNode !== null) {
        if (tailNode.alternate !== null) {
          lastTailNode = tailNode;
        }
        tailNode = tailNode.sibling;
      }
      // Next we're simply going to delete all insertions after the
      // last rendered item.
      if (lastTailNode === null) {
        // All remaining items in the tail are insertions.
        if (!hasRenderedATailFallback && renderState.tail !== null) {
          // We suspended during the head. We want to show at least one
          // row at the tail. So we'll keep on and cut off the rest.
          renderState.tail.sibling = null;
        } else {
          renderState.tail = null;
        }
      } else {
        // Detach the insertion after the last node that was already
        // inserted.
        lastTailNode.sibling = null;
      }
      break;
    }
  }
}

function bubbleProperties(completedWork: Fiber) {
  const didBailout =
    completedWork.alternate !== null &&
    completedWork.alternate.child === completedWork.child;

  let newChildLanes = NoLanes;
  let subtreeFlags = NoFlags;

  if (!didBailout) {
    // Bubble up the earliest expiration time.
    if (enableProfilerTimer && (completedWork.mode & ProfileMode) !== NoMode) {
      // In profiling mode, resetChildExpirationTime is also used to reset
      // profiler durations.
      let actualDuration = completedWork.actualDuration;
      let treeBaseDuration = ((completedWork.selfBaseDuration: any): number);

      let child = completedWork.child;
      while (child !== null) {
        newChildLanes = mergeLanes(
          newChildLanes,
          mergeLanes(child.lanes, child.childLanes),
        );

        subtreeFlags |= child.subtreeFlags;
        subtreeFlags |= child.flags;

        // When a fiber is cloned, its actualDuration is reset to 0. This value will
        // only be updated if work is done on the fiber (i.e. it doesn't bailout).
        // When work is done, it should bubble to the parent's actualDuration. If
        // the fiber has not been cloned though, (meaning no work was done), then
        // this value will reflect the amount of time spent working on a previous
        // render. In that case it should not bubble. We determine whether it was
        // cloned by comparing the child pointer.
        actualDuration += child.actualDuration;

        treeBaseDuration += child.treeBaseDuration;
        child = child.sibling;
      }

      completedWork.actualDuration = actualDuration;
      completedWork.treeBaseDuration = treeBaseDuration;
    } else {
      let child = completedWork.child;
      while (child !== null) {
        newChildLanes = mergeLanes(
          newChildLanes,
          mergeLanes(child.lanes, child.childLanes),
        );

        subtreeFlags |= child.subtreeFlags;
        subtreeFlags |= child.flags;

        // Update the return pointer so the tree is consistent. This is a code
        // smell because it assumes the commit phase is never concurrent with
        // the render phase. Will address during refactor to alternate model.
        child.return = completedWork;

        child = child.sibling;
      }
    }

    completedWork.subtreeFlags |= subtreeFlags;
  } else {
    // Bubble up the earliest expiration time.
    if (enableProfilerTimer && (completedWork.mode & ProfileMode) !== NoMode) {
      // In profiling mode, resetChildExpirationTime is also used to reset
      // profiler durations.
      let treeBaseDuration = ((completedWork.selfBaseDuration: any): number);

      let child = completedWork.child;
      while (child !== null) {
        newChildLanes = mergeLanes(
          newChildLanes,
          mergeLanes(child.lanes, child.childLanes),
        );

        // "Static" flags share the lifetime of the fiber/hook they belong to,
        // so we should bubble those up even during a bailout. All the other
        // flags have a lifetime only of a single render + commit, so we should
        // ignore them.
        subtreeFlags |= child.subtreeFlags & StaticMask;
        subtreeFlags |= child.flags & StaticMask;

        treeBaseDuration += child.treeBaseDuration;
        child = child.sibling;
      }

      completedWork.treeBaseDuration = treeBaseDuration;
    } else {
      let child = completedWork.child;
      while (child !== null) {
        newChildLanes = mergeLanes(
          newChildLanes,
          mergeLanes(child.lanes, child.childLanes),
        );

        // "Static" flags share the lifetime of the fiber/hook they belong to,
        // so we should bubble those up even during a bailout. All the other
        // flags have a lifetime only of a single render + commit, so we should
        // ignore them.
        subtreeFlags |= child.subtreeFlags & StaticMask;
        subtreeFlags |= child.flags & StaticMask;

        // Update the return pointer so the tree is consistent. This is a code
        // smell because it assumes the commit phase is never concurrent with
        // the render phase. Will address during refactor to alternate model.
        child.return = completedWork;

        child = child.sibling;
      }
    }

    completedWork.subtreeFlags |= subtreeFlags;
  }

  completedWork.childLanes = newChildLanes;

  return didBailout;
}

export function completeSuspendedOffscreenHostContainer(
  current: Fiber | null,
  workInProgress: Fiber,
) {
  // This is a fork of the complete phase for HostComponent. We use it when
  // a suspense tree is in its fallback state, because in that case the primary
  // tree that includes the offscreen boundary is skipped over without a
  // regular complete phase.
  //
  // We can optimize this path further by inlining the update logic for
  // offscreen instances specifically, i.e. skipping the `prepareUpdate` call.
  const rootContainerInstance = getRootHostContainer();
  const type = workInProgress.type;
  const newProps = workInProgress.memoizedProps;
  if (current !== null) {
    updateHostComponent(
      current,
      workInProgress,
      type,
      newProps,
      rootContainerInstance,
    );
  } else {
    const currentHostContext = getHostContext();
    const instance = createInstance(
      type,
      newProps,
      rootContainerInstance,
      currentHostContext,
      workInProgress,
    );

    appendAllChildren(instance, workInProgress, false, false);

    workInProgress.stateNode = instance;

    // Certain renderers require commit-time effects for initial mount.
    // (eg DOM renderer supports auto-focus for certain elements).
    // Make sure such renderers get scheduled for later work.
    if (
      finalizeInitialChildren(
        instance,
        type,
        newProps,
        rootContainerInstance,
        currentHostContext,
      )
    ) {
      markUpdate(workInProgress);
    }

    if (workInProgress.ref !== null) {
      // If there is a ref on a host node we need to schedule a callback
      markRef(workInProgress);
    }
  }
  bubbleProperties(workInProgress);
}

function completeWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  const newProps = workInProgress.pendingProps;
  // Note: This intentionally doesn't check if we're hydrating because comparing
  // to the current tree provider fiber is just as fast and less error-prone.
  // Ideally we would have a special version of the work loop only
  // for hydration.
  popTreeContext(workInProgress);
  switch (workInProgress.tag) {
    case IndeterminateComponent:
    case LazyComponent:
    case SimpleMemoComponent:
    case FunctionComponent:
    case ForwardRef:
    case Fragment:
    case Mode:
    case Profiler:
    case ContextConsumer:
    case MemoComponent:
      bubbleProperties(workInProgress);
      return null;
    case ClassComponent: {
      const Component = workInProgress.type;
      if (isLegacyContextProvider(Component)) {
        popLegacyContext(workInProgress);
      }
      bubbleProperties(workInProgress);
      return null;
    }
    case HostRoot: {
      const fiberRoot = (workInProgress.stateNode: FiberRoot);
      if (enableCache) {
        popRootCachePool(fiberRoot, renderLanes);

        let previousCache: Cache | null = null;
        if (workInProgress.alternate !== null) {
          previousCache = workInProgress.alternate.memoizedState.cache;
        }
        const cache: Cache = workInProgress.memoizedState.cache;
        if (cache !== previousCache) {
          // Run passive effects to retain/release the cache.
          workInProgress.flags |= Passive;
        }
        popCacheProvider(workInProgress, cache);
      }
      popHostContainer(workInProgress);
      popTopLevelLegacyContextObject(workInProgress);
      resetMutableSourceWorkInProgressVersions();
      if (fiberRoot.pendingContext) {
        fiberRoot.context = fiberRoot.pendingContext;
        fiberRoot.pendingContext = null;
      }
      if (current === null || current.child === null) {
        // If we hydrated, pop so that we can delete any remaining children
        // that weren't hydrated.
        const wasHydrated = popHydrationState(workInProgress);
        if (wasHydrated) {
          // If we hydrated, then we'll need to schedule an update for
          // the commit side-effects on the root.
          markUpdate(workInProgress);
        } else if (!fiberRoot.isDehydrated) {
          // Schedule an effect to clear this container at the start of the next commit.
          // This handles the case of React rendering into a container with previous children.
          // It's also safe to do for updates too, because current.child would only be null
          // if the previous render was null (so the container would already be empty).
          workInProgress.flags |= Snapshot;
        }
      }
      updateHostContainer(current, workInProgress);
      bubbleProperties(workInProgress);
      return null;
    }
    case HostComponent: {
      popHostContext(workInProgress);
      const rootContainerInstance = getRootHostContainer();
      const type = workInProgress.type;
      if (current !== null && workInProgress.stateNode != null) {
        updateHostComponent(
          current,
          workInProgress,
          type,
          newProps,
          rootContainerInstance,
        );

        if (current.ref !== workInProgress.ref) {
          markRef(workInProgress);
        }
      } else {
        if (!newProps) {
          if (workInProgress.stateNode === null) {
            throw new Error(
              'We must have new props for new mounts. This error is likely ' +
                'caused by a bug in React. Please file an issue.',
            );
          }

          // This can happen when we abort work.
          bubbleProperties(workInProgress);
          return null;
        }

        const currentHostContext = getHostContext();
        // TODO: Move createInstance to beginWork and keep it on a context
        // "stack" as the parent. Then append children as we go in beginWork
        // or completeWork depending on whether we want to add them top->down or
        // bottom->up. Top->down is faster in IE11.
        const wasHydrated = popHydrationState(workInProgress);
        if (wasHydrated) {
          // TODO: Move this and createInstance step into the beginPhase
          // to consolidate.
          if (
            prepareToHydrateHostInstance(
              workInProgress,
              rootContainerInstance,
              currentHostContext,
            )
          ) {
            // If changes to the hydrated node need to be applied at the
            // commit-phase we mark this as such.
            markUpdate(workInProgress);
          }
        } else {
          const instance = createInstance(
            type,
            newProps,
            rootContainerInstance,
            currentHostContext,
            workInProgress,
          );

          appendAllChildren(instance, workInProgress, false, false);

          workInProgress.stateNode = instance;

          // Certain renderers require commit-time effects for initial mount.
          // (eg DOM renderer supports auto-focus for certain elements).
          // Make sure such renderers get scheduled for later work.
          if (
            finalizeInitialChildren(
              instance,
              type,
              newProps,
              rootContainerInstance,
              currentHostContext,
            )
          ) {
            markUpdate(workInProgress);
          }
        }

        if (workInProgress.ref !== null) {
          // If there is a ref on a host node we need to schedule a callback
          markRef(workInProgress);
        }
      }
      bubbleProperties(workInProgress);
      return null;
    }
    case HostText: {
      const newText = newProps;
      if (current && workInProgress.stateNode != null) {
        const oldText = current.memoizedProps;
        // If we have an alternate, that means this is an update and we need
        // to schedule a side-effect to do the updates.
        updateHostText(current, workInProgress, oldText, newText);
      } else {
        if (typeof newText !== 'string') {
          if (workInProgress.stateNode === null) {
            throw new Error(
              'We must have new props for new mounts. This error is likely ' +
                'caused by a bug in React. Please file an issue.',
            );
          }
          // This can happen when we abort work.
        }
        const rootContainerInstance = getRootHostContainer();
        const currentHostContext = getHostContext();
        const wasHydrated = popHydrationState(workInProgress);
        if (wasHydrated) {
          if (prepareToHydrateHostTextInstance(workInProgress)) {
            markUpdate(workInProgress);
          }
        } else {
          workInProgress.stateNode = createTextInstance(
            newText,
            rootContainerInstance,
            currentHostContext,
            workInProgress,
          );
        }
      }
      bubbleProperties(workInProgress);
      return null;
    }
    case SuspenseComponent: {
      popSuspenseContext(workInProgress);
      const nextState: null | SuspenseState = workInProgress.memoizedState;

      if (enableSuspenseServerRenderer) {
        if (nextState !== null && nextState.dehydrated !== null) {
          // We might be inside a hydration state the first time we're picking up this
          // Suspense boundary, and also after we've reentered it for further hydration.
          const wasHydrated = popHydrationState(workInProgress);
          if (current === null) {
            if (!wasHydrated) {
              throw new Error(
                'A dehydrated suspense component was completed without a hydrated node. ' +
                  'This is probably a bug in React.',
              );
            }
            prepareToHydrateHostSuspenseInstance(workInProgress);
            bubbleProperties(workInProgress);
            if (enableProfilerTimer) {
              if ((workInProgress.mode & ProfileMode) !== NoMode) {
                const isTimedOutSuspense = nextState !== null;
                if (isTimedOutSuspense) {
                  // Don't count time spent in a timed out Suspense subtree as part of the base duration.
                  const primaryChildFragment = workInProgress.child;
                  if (primaryChildFragment !== null) {
                    // $FlowFixMe Flow doesn't support type casting in combination with the -= operator
                    workInProgress.treeBaseDuration -= ((primaryChildFragment.treeBaseDuration: any): number);
                  }
                }
              }
            }
            return null;
          } else {
            // We might have reentered this boundary to hydrate it. If so, we need to reset the hydration
            // state since we're now exiting out of it. popHydrationState doesn't do that for us.
            resetHydrationState();
            if ((workInProgress.flags & DidCapture) === NoFlags) {
              // This boundary did not suspend so it's now hydrated and unsuspended.
              workInProgress.memoizedState = null;
            }
            // If nothing suspended, we need to schedule an effect to mark this boundary
            // as having hydrated so events know that they're free to be invoked.
            // It's also a signal to replay events and the suspense callback.
            // If something suspended, schedule an effect to attach retry listeners.
            // So we might as well always mark this.
            workInProgress.flags |= Update;
            bubbleProperties(workInProgress);
            if (enableProfilerTimer) {
              if ((workInProgress.mode & ProfileMode) !== NoMode) {
                const isTimedOutSuspense = nextState !== null;
                if (isTimedOutSuspense) {
                  // Don't count time spent in a timed out Suspense subtree as part of the base duration.
                  const primaryChildFragment = workInProgress.child;
                  if (primaryChildFragment !== null) {
                    // $FlowFixMe Flow doesn't support type casting in combination with the -= operator
                    workInProgress.treeBaseDuration -= ((primaryChildFragment.treeBaseDuration: any): number);
                  }
                }
              }
            }
            return null;
          }
        }
      }

      if ((workInProgress.flags & DidCapture) !== NoFlags) {
        // Something suspended. Re-render with the fallback children.
        workInProgress.lanes = renderLanes;
        // Do not reset the effect list.
        if (
          enableProfilerTimer &&
          (workInProgress.mode & ProfileMode) !== NoMode
        ) {
          transferActualDuration(workInProgress);
        }
        // Don't bubble properties in this case.
        return workInProgress;
      }

      const nextDidTimeout = nextState !== null;
      let prevDidTimeout = false;
      if (current === null) {
        popHydrationState(workInProgress);
      } else {
        const prevState: null | SuspenseState = current.memoizedState;
        prevDidTimeout = prevState !== null;
      }

      if (enableCache && nextDidTimeout) {
        const offscreenFiber: Fiber = (workInProgress.child: any);
        let previousCache: Cache | null = null;
        if (
          offscreenFiber.alternate !== null &&
          offscreenFiber.alternate.memoizedState !== null &&
          offscreenFiber.alternate.memoizedState.cachePool !== null
        ) {
          previousCache = offscreenFiber.alternate.memoizedState.cachePool.pool;
        }
        let cache: Cache | null = null;
        if (
          offscreenFiber.memoizedState !== null &&
          offscreenFiber.memoizedState.cachePool !== null
        ) {
          cache = offscreenFiber.memoizedState.cachePool.pool;
        }
        if (cache !== previousCache) {
          // Run passive effects to retain/release the cache.
          offscreenFiber.flags |= Passive;
        }
      }

      // If the suspended state of the boundary changes, we need to schedule
      // an effect to toggle the subtree's visibility. When we switch from
      // fallback -> primary, the inner Offscreen fiber schedules this effect
      // as part of its normal complete phase. But when we switch from
      // primary -> fallback, the inner Offscreen fiber does not have a complete
      // phase. So we need to schedule its effect here.
      //
      // We also use this flag to connect/disconnect the effects, but the same
      // logic applies: when re-connecting, the Offscreen fiber's complete
      // phase will handle scheduling the effect. It's only when the fallback
      // is active that we have to do anything special.
      if (nextDidTimeout && !prevDidTimeout) {
        const offscreenFiber: Fiber = (workInProgress.child: any);
        offscreenFiber.flags |= Visibility;

        // TODO: This will still suspend a synchronous tree if anything
        // in the concurrent tree already suspended during this render.
        // This is a known bug.
        if ((workInProgress.mode & ConcurrentMode) !== NoMode) {
          // TODO: Move this back to throwException because this is too late
          // if this is a large tree which is common for initial loads. We
          // don't know if we should restart a render or not until we get
          // this marker, and this is too late.
          // If this render already had a ping or lower pri updates,
          // and this is the first time we know we're going to suspend we
          // should be able to immediately restart from within throwException.
          const hasInvisibleChildContext =
            current === null &&
            (workInProgress.memoizedProps.unstable_avoidThisFallback !== true ||
              !enableSuspenseAvoidThisFallback);
          if (
            hasInvisibleChildContext ||
            hasSuspenseContext(
              suspenseStackCursor.current,
              (InvisibleParentSuspenseContext: SuspenseContext),
            )
          ) {
            // If this was in an invisible tree or a new render, then showing
            // this boundary is ok.
            renderDidSuspend();
          } else {
            // Otherwise, we're going to have to hide content so we should
            // suspend for longer if possible.
            renderDidSuspendDelayIfPossible();
          }
        }
      }

      const wakeables: Set<Wakeable> | null = (workInProgress.updateQueue: any);
      if (wakeables !== null) {
        // Schedule an effect to attach a retry listener to the promise.
        // TODO: Move to passive phase
        workInProgress.flags |= Update;
      }

      if (
        enableSuspenseCallback &&
        workInProgress.updateQueue !== null &&
        workInProgress.memoizedProps.suspenseCallback != null
      ) {
        // Always notify the callback
        // TODO: Move to passive phase
        workInProgress.flags |= Update;
      }
      bubbleProperties(workInProgress);
      if (enableProfilerTimer) {
        if ((workInProgress.mode & ProfileMode) !== NoMode) {
          if (nextDidTimeout) {
            // Don't count time spent in a timed out Suspense subtree as part of the base duration.
            const primaryChildFragment = workInProgress.child;
            if (primaryChildFragment !== null) {
              // $FlowFixMe Flow doesn't support type casting in combination with the -= operator
              workInProgress.treeBaseDuration -= ((primaryChildFragment.treeBaseDuration: any): number);
            }
          }
        }
      }
      return null;
    }
    case HostPortal:
      popHostContainer(workInProgress);
      updateHostContainer(current, workInProgress);
      if (current === null) {
        preparePortalMount(workInProgress.stateNode.containerInfo);
      }
      bubbleProperties(workInProgress);
      return null;
    case ContextProvider:
      // Pop provider fiber
      const context: ReactContext<any> = workInProgress.type._context;
      popProvider(context, workInProgress);
      bubbleProperties(workInProgress);
      return null;
    case IncompleteClassComponent: {
      // Same as class component case. I put it down here so that the tags are
      // sequential to ensure this switch is compiled to a jump table.
      const Component = workInProgress.type;
      if (isLegacyContextProvider(Component)) {
        popLegacyContext(workInProgress);
      }
      bubbleProperties(workInProgress);
      return null;
    }
    case SuspenseListComponent: {
      popSuspenseContext(workInProgress);

      const renderState: null | SuspenseListRenderState =
        workInProgress.memoizedState;

      if (renderState === null) {
        // We're running in the default, "independent" mode.
        // We don't do anything in this mode.
        bubbleProperties(workInProgress);
        return null;
      }

      let didSuspendAlready = (workInProgress.flags & DidCapture) !== NoFlags;

      const renderedTail = renderState.rendering;
      if (renderedTail === null) {
        // We just rendered the head.
        if (!didSuspendAlready) {
          // This is the first pass. We need to figure out if anything is still
          // suspended in the rendered set.

          // If new content unsuspended, but there's still some content that
          // didn't. Then we need to do a second pass that forces everything
          // to keep showing their fallbacks.

          // We might be suspended if something in this render pass suspended, or
          // something in the previous committed pass suspended. Otherwise,
          // there's no chance so we can skip the expensive call to
          // findFirstSuspended.
          const cannotBeSuspended =
            renderHasNotSuspendedYet() &&
            (current === null || (current.flags & DidCapture) === NoFlags);
          if (!cannotBeSuspended) {
            let row = workInProgress.child;
            while (row !== null) {
              const suspended = findFirstSuspended(row);
              if (suspended !== null) {
                didSuspendAlready = true;
                workInProgress.flags |= DidCapture;
                cutOffTailIfNeeded(renderState, false);

                // If this is a newly suspended tree, it might not get committed as
                // part of the second pass. In that case nothing will subscribe to
                // its thenables. Instead, we'll transfer its thenables to the
                // SuspenseList so that it can retry if they resolve.
                // There might be multiple of these in the list but since we're
                // going to wait for all of them anyway, it doesn't really matter
                // which ones gets to ping. In theory we could get clever and keep
                // track of how many dependencies remain but it gets tricky because
                // in the meantime, we can add/remove/change items and dependencies.
                // We might bail out of the loop before finding any but that
                // doesn't matter since that means that the other boundaries that
                // we did find already has their listeners attached.
                const newThenables = suspended.updateQueue;
                if (newThenables !== null) {
                  workInProgress.updateQueue = newThenables;
                  workInProgress.flags |= Update;
                }

                // Rerender the whole list, but this time, we'll force fallbacks
                // to stay in place.
                // Reset the effect flags before doing the second pass since that's now invalid.
                // Reset the child fibers to their original state.
                workInProgress.subtreeFlags = NoFlags;
                resetChildFibers(workInProgress, renderLanes);

                // Set up the Suspense Context to force suspense and immediately
                // rerender the children.
                pushSuspenseContext(
                  workInProgress,
                  setShallowSuspenseContext(
                    suspenseStackCursor.current,
                    ForceSuspenseFallback,
                  ),
                );
                // Don't bubble properties in this case.
                return workInProgress.child;
              }
              row = row.sibling;
            }
          }

          if (renderState.tail !== null && now() > getRenderTargetTime()) {
            // We have already passed our CPU deadline but we still have rows
            // left in the tail. We'll just give up further attempts to render
            // the main content and only render fallbacks.
            workInProgress.flags |= DidCapture;
            didSuspendAlready = true;

            cutOffTailIfNeeded(renderState, false);

            // Since nothing actually suspended, there will nothing to ping this
            // to get it started back up to attempt the next item. While in terms
            // of priority this work has the same priority as this current render,
            // it's not part of the same transition once the transition has
            // committed. If it's sync, we still want to yield so that it can be
            // painted. Conceptually, this is really the same as pinging.
            // We can use any RetryLane even if it's the one currently rendering
            // since we're leaving it behind on this node.
            workInProgress.lanes = SomeRetryLane;
          }
        } else {
          cutOffTailIfNeeded(renderState, false);
        }
        // Next we're going to render the tail.
      } else {
        // Append the rendered row to the child list.
        if (!didSuspendAlready) {
          const suspended = findFirstSuspended(renderedTail);
          if (suspended !== null) {
            workInProgress.flags |= DidCapture;
            didSuspendAlready = true;

            // Ensure we transfer the update queue to the parent so that it doesn't
            // get lost if this row ends up dropped during a second pass.
            const newThenables = suspended.updateQueue;
            if (newThenables !== null) {
              workInProgress.updateQueue = newThenables;
              workInProgress.flags |= Update;
            }

            cutOffTailIfNeeded(renderState, true);
            // This might have been modified.
            if (
              renderState.tail === null &&
              renderState.tailMode === 'hidden' &&
              !renderedTail.alternate &&
              !getIsHydrating() // We don't cut it if we're hydrating.
            ) {
              // We're done.
              bubbleProperties(workInProgress);
              return null;
            }
          } else if (
            // The time it took to render last row is greater than the remaining
            // time we have to render. So rendering one more row would likely
            // exceed it.
            now() * 2 - renderState.renderingStartTime >
              getRenderTargetTime() &&
            renderLanes !== OffscreenLane
          ) {
            // We have now passed our CPU deadline and we'll just give up further
            // attempts to render the main content and only render fallbacks.
            // The assumption is that this is usually faster.
            workInProgress.flags |= DidCapture;
            didSuspendAlready = true;

            cutOffTailIfNeeded(renderState, false);

            // Since nothing actually suspended, there will nothing to ping this
            // to get it started back up to attempt the next item. While in terms
            // of priority this work has the same priority as this current render,
            // it's not part of the same transition once the transition has
            // committed. If it's sync, we still want to yield so that it can be
            // painted. Conceptually, this is really the same as pinging.
            // We can use any RetryLane even if it's the one currently rendering
            // since we're leaving it behind on this node.
            workInProgress.lanes = SomeRetryLane;
          }
        }
        if (renderState.isBackwards) {
          // The effect list of the backwards tail will have been added
          // to the end. This breaks the guarantee that life-cycles fire in
          // sibling order but that isn't a strong guarantee promised by React.
          // Especially since these might also just pop in during future commits.
          // Append to the beginning of the list.
          renderedTail.sibling = workInProgress.child;
          workInProgress.child = renderedTail;
        } else {
          const previousSibling = renderState.last;
          if (previousSibling !== null) {
            previousSibling.sibling = renderedTail;
          } else {
            workInProgress.child = renderedTail;
          }
          renderState.last = renderedTail;
        }
      }

      if (renderState.tail !== null) {
        // We still have tail rows to render.
        // Pop a row.
        const next = renderState.tail;
        renderState.rendering = next;
        renderState.tail = next.sibling;
        renderState.renderingStartTime = now();
        next.sibling = null;

        // Restore the context.
        // TODO: We can probably just avoid popping it instead and only
        // setting it the first time we go from not suspended to suspended.
        let suspenseContext = suspenseStackCursor.current;
        if (didSuspendAlready) {
          suspenseContext = setShallowSuspenseContext(
            suspenseContext,
            ForceSuspenseFallback,
          );
        } else {
          suspenseContext = setDefaultShallowSuspenseContext(suspenseContext);
        }
        pushSuspenseContext(workInProgress, suspenseContext);
        // Do a pass over the next row.
        // Don't bubble properties in this case.
        return next;
      }
      bubbleProperties(workInProgress);
      return null;
    }
    case ScopeComponent: {
      if (enableScopeAPI) {
        if (current === null) {
          const scopeInstance: ReactScopeInstance = createScopeInstance();
          workInProgress.stateNode = scopeInstance;
          prepareScopeUpdate(scopeInstance, workInProgress);
          if (workInProgress.ref !== null) {
            markRef(workInProgress);
            markUpdate(workInProgress);
          }
        } else {
          if (workInProgress.ref !== null) {
            markUpdate(workInProgress);
          }
          if (current.ref !== workInProgress.ref) {
            markRef(workInProgress);
          }
        }
        bubbleProperties(workInProgress);
        return null;
      }
      break;
    }
    case OffscreenComponent:
    case LegacyHiddenComponent: {
      popRenderLanes(workInProgress);
      const nextState: OffscreenState | null = workInProgress.memoizedState;
      const nextIsHidden = nextState !== null;

      if (current !== null) {
        const prevState: OffscreenState | null = current.memoizedState;
        const prevIsHidden = prevState !== null;
        if (
          prevIsHidden !== nextIsHidden &&
          newProps.mode !== 'unstable-defer-without-hiding' &&
          // LegacyHidden doesn't do any hiding — it only pre-renders.
          workInProgress.tag !== LegacyHiddenComponent
        ) {
          workInProgress.flags |= Visibility;
        }
      }

      if (!nextIsHidden || (workInProgress.mode & ConcurrentMode) === NoMode) {
        bubbleProperties(workInProgress);
      } else {
        // Don't bubble properties for hidden children unless we're rendering
        // at offscreen priority.
        if (includesSomeLane(subtreeRenderLanes, (OffscreenLane: Lane))) {
          bubbleProperties(workInProgress);
          if (supportsMutation) {
            // Check if there was an insertion or update in the hidden subtree.
            // If so, we need to hide those nodes in the commit phase, so
            // schedule a visibility effect.
            if (
              workInProgress.tag !== LegacyHiddenComponent &&
              workInProgress.subtreeFlags & (Placement | Update) &&
              newProps.mode !== 'unstable-defer-without-hiding'
            ) {
              workInProgress.flags |= Visibility;
            }
          }
        }
      }

      if (enableCache) {
        let previousCache: Cache | null = null;
        if (
          workInProgress.alternate !== null &&
          workInProgress.alternate.memoizedState !== null &&
          workInProgress.alternate.memoizedState.cachePool !== null
        ) {
          previousCache = workInProgress.alternate.memoizedState.cachePool.pool;
        }
        let cache: Cache | null = null;
        if (
          workInProgress.memoizedState !== null &&
          workInProgress.memoizedState.cachePool !== null
        ) {
          cache = workInProgress.memoizedState.cachePool.pool;
        }
        if (cache !== previousCache) {
          // Run passive effects to retain/release the cache.
          workInProgress.flags |= Passive;
        }
        const spawnedCachePool: SpawnedCachePool | null = (workInProgress.updateQueue: any);
        if (spawnedCachePool !== null) {
          popCachePool(workInProgress);
        }
      }

      return null;
    }
    case CacheComponent: {
      if (enableCache) {
        let previousCache: Cache | null = null;
        if (workInProgress.alternate !== null) {
          previousCache = workInProgress.alternate.memoizedState.cache;
        }
        const cache: Cache = workInProgress.memoizedState.cache;
        if (cache !== previousCache) {
          // Run passive effects to retain/release the cache.
          workInProgress.flags |= Passive;
        }
        popCacheProvider(workInProgress, cache);
        bubbleProperties(workInProgress);
        return null;
      }
    }
  }

  throw new Error(
    `Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
      'React. Please file an issue.',
  );
}

export {completeWork};
