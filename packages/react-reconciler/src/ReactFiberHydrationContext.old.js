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
import {NoMode, ConcurrentMode} from './ReactTypeOfMode';
import type {
  Instance,
  TextInstance,
  HydratableInstance,
  SuspenseInstance,
  Container,
  HostContext,
} from './ReactFiberHostConfig';
import type {SuspenseState} from './ReactFiberSuspenseComponent.old';
import type {TreeContext} from './ReactFiberTreeContext.old';

import {
  HostComponent,
  HostText,
  HostRoot,
  SuspenseComponent,
} from './ReactWorkTags';
import {ChildDeletion, Placement, Hydrating} from './ReactFiberFlags';

import {
  createFiberFromHostInstanceForDeletion,
  createFiberFromDehydratedFragment,
} from './ReactFiber.old';
import {
  shouldSetTextContent,
  supportsHydration,
  canHydrateInstance,
  canHydrateTextInstance,
  canHydrateSuspenseInstance,
  getNextHydratableSibling,
  getFirstHydratableChild,
  getFirstHydratableChildWithinContainer,
  getFirstHydratableChildWithinSuspenseInstance,
  hydrateInstance,
  hydrateTextInstance,
  hydrateSuspenseInstance,
  getNextHydratableInstanceAfterSuspenseInstance,
  shouldDeleteUnhydratedTailInstances,
  didNotMatchHydratedContainerTextInstance,
  didNotMatchHydratedTextInstance,
  didNotHydrateInstanceWithinContainer,
  didNotHydrateInstanceWithinSuspenseInstance,
  didNotHydrateInstance,
  didNotFindHydratableInstanceWithinContainer,
  didNotFindHydratableTextInstanceWithinContainer,
  didNotFindHydratableSuspenseInstanceWithinContainer,
  didNotFindHydratableInstanceWithinSuspenseInstance,
  didNotFindHydratableTextInstanceWithinSuspenseInstance,
  didNotFindHydratableSuspenseInstanceWithinSuspenseInstance,
  didNotFindHydratableInstance,
  didNotFindHydratableTextInstance,
  didNotFindHydratableSuspenseInstance,
} from './ReactFiberHostConfig';
import {
  enableClientRenderFallbackOnHydrationMismatch,
  enableSuspenseServerRenderer,
} from 'shared/ReactFeatureFlags';
import {OffscreenLane} from './ReactFiberLane.old';
import {
  getSuspendedTreeContext,
  restoreSuspendedTreeContext,
} from './ReactFiberTreeContext.old';

// The deepest Fiber on the stack involved in a hydration context.
// This may have been an insertion or a hydration.
let hydrationParentFiber: null | Fiber = null;
let nextHydratableInstance: null | HydratableInstance = null;
let isHydrating: boolean = false;

function warnIfHydrating() {
  if (__DEV__) {
    if (isHydrating) {
      console.error(
        'We should not be hydrating here. This is a bug in React. Please file a bug.',
      );
    }
  }
}

function enterHydrationState(fiber: Fiber): boolean {
  if (!supportsHydration) {
    return false;
  }

  const parentInstance: Container = fiber.stateNode.containerInfo;
  nextHydratableInstance = getFirstHydratableChildWithinContainer(
    parentInstance,
  );
  hydrationParentFiber = fiber;
  isHydrating = true;
  return true;
}

function reenterHydrationStateFromDehydratedSuspenseInstance(
  fiber: Fiber,
  suspenseInstance: SuspenseInstance,
  treeContext: TreeContext | null,
): boolean {
  if (!supportsHydration) {
    return false;
  }
  nextHydratableInstance = getFirstHydratableChildWithinSuspenseInstance(
    suspenseInstance,
  );
  hydrationParentFiber = fiber;
  isHydrating = true;
  if (treeContext !== null) {
    restoreSuspendedTreeContext(fiber, treeContext);
  }
  return true;
}

function deleteHydratableInstance(
  returnFiber: Fiber,
  instance: HydratableInstance,
) {
  if (__DEV__) {
    switch (returnFiber.tag) {
      case HostRoot:
        didNotHydrateInstanceWithinContainer(
          returnFiber.stateNode.containerInfo,
          instance,
        );
        break;
      case HostComponent:
        didNotHydrateInstance(
          returnFiber.type,
          returnFiber.memoizedProps,
          returnFiber.stateNode,
          instance,
        );
        break;
      case SuspenseComponent:
        const suspenseState: SuspenseState = returnFiber.memoizedState;
        if (suspenseState.dehydrated !== null)
          didNotHydrateInstanceWithinSuspenseInstance(
            suspenseState.dehydrated,
            instance,
          );
        break;
    }
  }

  const childToDelete = createFiberFromHostInstanceForDeletion();
  childToDelete.stateNode = instance;
  childToDelete.return = returnFiber;

  const deletions = returnFiber.deletions;
  if (deletions === null) {
    returnFiber.deletions = [childToDelete];
    returnFiber.flags |= ChildDeletion;
  } else {
    deletions.push(childToDelete);
  }
}

function insertNonHydratedInstance(returnFiber: Fiber, fiber: Fiber) {
  fiber.flags = (fiber.flags & ~Hydrating) | Placement;
  if (__DEV__) {
    switch (returnFiber.tag) {
      case HostRoot: {
        const parentContainer = returnFiber.stateNode.containerInfo;
        switch (fiber.tag) {
          case HostComponent:
            const type = fiber.type;
            const props = fiber.pendingProps;
            didNotFindHydratableInstanceWithinContainer(
              parentContainer,
              type,
              props,
            );
            break;
          case HostText:
            const text = fiber.pendingProps;
            didNotFindHydratableTextInstanceWithinContainer(
              parentContainer,
              text,
            );
            break;
          case SuspenseComponent:
            didNotFindHydratableSuspenseInstanceWithinContainer(
              parentContainer,
            );
            break;
        }
        break;
      }
      case HostComponent: {
        const parentType = returnFiber.type;
        const parentProps = returnFiber.memoizedProps;
        const parentInstance = returnFiber.stateNode;
        switch (fiber.tag) {
          case HostComponent:
            const type = fiber.type;
            const props = fiber.pendingProps;
            didNotFindHydratableInstance(
              parentType,
              parentProps,
              parentInstance,
              type,
              props,
            );
            break;
          case HostText:
            const text = fiber.pendingProps;
            didNotFindHydratableTextInstance(
              parentType,
              parentProps,
              parentInstance,
              text,
            );
            break;
          case SuspenseComponent:
            didNotFindHydratableSuspenseInstance(
              parentType,
              parentProps,
              parentInstance,
            );
            break;
        }
        break;
      }
      case SuspenseComponent: {
        const suspenseState: SuspenseState = returnFiber.memoizedState;
        const parentInstance = suspenseState.dehydrated;
        if (parentInstance !== null)
          switch (fiber.tag) {
            case HostComponent:
              const type = fiber.type;
              const props = fiber.pendingProps;
              didNotFindHydratableInstanceWithinSuspenseInstance(
                parentInstance,
                type,
                props,
              );
              break;
            case HostText:
              const text = fiber.pendingProps;
              didNotFindHydratableTextInstanceWithinSuspenseInstance(
                parentInstance,
                text,
              );
              break;
            case SuspenseComponent:
              didNotFindHydratableSuspenseInstanceWithinSuspenseInstance(
                parentInstance,
              );
              break;
          }
        break;
      }
      default:
        return;
    }
  }
}

function tryHydrate(fiber, nextInstance) {
  switch (fiber.tag) {
    case HostComponent: {
      const type = fiber.type;
      const props = fiber.pendingProps;
      const instance = canHydrateInstance(nextInstance, type, props);
      if (instance !== null) {
        fiber.stateNode = (instance: Instance);
        hydrationParentFiber = fiber;
        nextHydratableInstance = getFirstHydratableChild(instance);
        return true;
      }
      return false;
    }
    case HostText: {
      const text = fiber.pendingProps;
      const textInstance = canHydrateTextInstance(nextInstance, text);
      if (textInstance !== null) {
        fiber.stateNode = (textInstance: TextInstance);
        hydrationParentFiber = fiber;
        // Text Instances don't have children so there's nothing to hydrate.
        nextHydratableInstance = null;
        return true;
      }
      return false;
    }
    case SuspenseComponent: {
      if (enableSuspenseServerRenderer) {
        const suspenseInstance: null | SuspenseInstance = canHydrateSuspenseInstance(
          nextInstance,
        );
        if (suspenseInstance !== null) {
          const suspenseState: SuspenseState = {
            dehydrated: suspenseInstance,
            treeContext: getSuspendedTreeContext(),
            retryLane: OffscreenLane,
          };
          fiber.memoizedState = suspenseState;
          // Store the dehydrated fragment as a child fiber.
          // This simplifies the code for getHostSibling and deleting nodes,
          // since it doesn't have to consider all Suspense boundaries and
          // check if they're dehydrated ones or not.
          const dehydratedFragment = createFiberFromDehydratedFragment(
            suspenseInstance,
          );
          dehydratedFragment.return = fiber;
          fiber.child = dehydratedFragment;
          hydrationParentFiber = fiber;
          // While a Suspense Instance does have children, we won't step into
          // it during the first pass. Instead, we'll reenter it later.
          nextHydratableInstance = null;
          return true;
        }
      }
      return false;
    }
    default:
      return false;
  }
}

function throwOnHydrationMismatchIfConcurrentMode(fiber: Fiber) {
  if (
    enableClientRenderFallbackOnHydrationMismatch &&
    (fiber.mode & ConcurrentMode) !== NoMode
  ) {
    throw new Error(
      'An error occurred during hydration. The server HTML was replaced with client content',
    );
  }
}

function tryToClaimNextHydratableInstance(fiber: Fiber): void {
  if (!isHydrating) {
    return;
  }
  let nextInstance = nextHydratableInstance;
  if (!nextInstance) {
    throwOnHydrationMismatchIfConcurrentMode(fiber);
    // Nothing to hydrate. Make it an insertion.
    insertNonHydratedInstance((hydrationParentFiber: any), fiber);
    isHydrating = false;
    hydrationParentFiber = fiber;
    return;
  }
  const firstAttemptedInstance = nextInstance;
  if (!tryHydrate(fiber, nextInstance)) {
    throwOnHydrationMismatchIfConcurrentMode(fiber);
    // If we can't hydrate this instance let's try the next one.
    // We use this as a heuristic. It's based on intuition and not data so it
    // might be flawed or unnecessary.
    nextInstance = getNextHydratableSibling(firstAttemptedInstance);
    const prevHydrationParentFiber: Fiber = (hydrationParentFiber: any);
    if (!nextInstance || !tryHydrate(fiber, nextInstance)) {
      // Nothing to hydrate. Make it an insertion.
      insertNonHydratedInstance((hydrationParentFiber: any), fiber);
      isHydrating = false;
      hydrationParentFiber = fiber;
      return;
    }
    // We matched the next one, we'll now assume that the first one was
    // superfluous and we'll delete it. Since we can't eagerly delete it
    // we'll have to schedule a deletion. To do that, this node needs a dummy
    // fiber associated with it.
    deleteHydratableInstance(prevHydrationParentFiber, firstAttemptedInstance);
  }
}

function prepareToHydrateHostInstance(
  fiber: Fiber,
  rootContainerInstance: Container,
  hostContext: HostContext,
): boolean {
  if (!supportsHydration) {
    throw new Error(
      'Expected prepareToHydrateHostInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  const instance: Instance = fiber.stateNode;
  const updatePayload = hydrateInstance(
    instance,
    fiber.type,
    fiber.memoizedProps,
    rootContainerInstance,
    hostContext,
    fiber,
  );
  // TODO: Type this specific to this type of component.
  fiber.updateQueue = (updatePayload: any);
  // If the update payload indicates that there is a change or if there
  // is a new ref we mark this as an update.
  if (updatePayload !== null) {
    return true;
  }
  return false;
}

function prepareToHydrateHostTextInstance(fiber: Fiber): boolean {
  if (!supportsHydration) {
    throw new Error(
      'Expected prepareToHydrateHostTextInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  const textInstance: TextInstance = fiber.stateNode;
  const textContent: string = fiber.memoizedProps;
  const shouldUpdate = hydrateTextInstance(textInstance, textContent, fiber);
  if (__DEV__) {
    if (shouldUpdate) {
      // We assume that prepareToHydrateHostTextInstance is called in a context where the
      // hydration parent is the parent host component of this host text.
      const returnFiber = hydrationParentFiber;
      if (returnFiber !== null) {
        switch (returnFiber.tag) {
          case HostRoot: {
            const parentContainer = returnFiber.stateNode.containerInfo;
            didNotMatchHydratedContainerTextInstance(
              parentContainer,
              textInstance,
              textContent,
            );
            break;
          }
          case HostComponent: {
            const parentType = returnFiber.type;
            const parentProps = returnFiber.memoizedProps;
            const parentInstance = returnFiber.stateNode;
            didNotMatchHydratedTextInstance(
              parentType,
              parentProps,
              parentInstance,
              textInstance,
              textContent,
            );
            break;
          }
        }
      }
    }
  }
  return shouldUpdate;
}

function prepareToHydrateHostSuspenseInstance(fiber: Fiber): void {
  if (!supportsHydration) {
    throw new Error(
      'Expected prepareToHydrateHostSuspenseInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  const suspenseState: null | SuspenseState = fiber.memoizedState;
  const suspenseInstance: null | SuspenseInstance =
    suspenseState !== null ? suspenseState.dehydrated : null;

  if (!suspenseInstance) {
    throw new Error(
      'Expected to have a hydrated suspense instance. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  hydrateSuspenseInstance(suspenseInstance, fiber);
}

function skipPastDehydratedSuspenseInstance(
  fiber: Fiber,
): null | HydratableInstance {
  if (!supportsHydration) {
    throw new Error(
      'Expected skipPastDehydratedSuspenseInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }
  const suspenseState: null | SuspenseState = fiber.memoizedState;
  const suspenseInstance: null | SuspenseInstance =
    suspenseState !== null ? suspenseState.dehydrated : null;

  if (!suspenseInstance) {
    throw new Error(
      'Expected to have a hydrated suspense instance. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  return getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance);
}

function popToNextHostParent(fiber: Fiber): void {
  let parent = fiber.return;
  while (
    parent !== null &&
    parent.tag !== HostComponent &&
    parent.tag !== HostRoot &&
    parent.tag !== SuspenseComponent
  ) {
    parent = parent.return;
  }
  hydrationParentFiber = parent;
}

function popHydrationState(fiber: Fiber): boolean {
  if (!supportsHydration) {
    return false;
  }
  if (fiber !== hydrationParentFiber) {
    // We're deeper than the current hydration context, inside an inserted
    // tree.
    return false;
  }
  if (!isHydrating) {
    // If we're not currently hydrating but we're in a hydration context, then
    // we were an insertion and now need to pop up reenter hydration of our
    // siblings.
    popToNextHostParent(fiber);
    isHydrating = true;
    return false;
  }

  // If we have any remaining hydratable nodes, we need to delete them now.
  // We only do this deeper than head and body since they tend to have random
  // other nodes in them. We also ignore components with pure text content in
  // side of them. We also don't delete anything inside the root container.
  if (
    fiber.tag !== HostRoot &&
    (fiber.tag !== HostComponent ||
      (shouldDeleteUnhydratedTailInstances(fiber.type) &&
        !shouldSetTextContent(fiber.type, fiber.memoizedProps)))
  ) {
    let nextInstance = nextHydratableInstance;
    while (nextInstance) {
      deleteHydratableInstance(fiber, nextInstance);
      nextInstance = getNextHydratableSibling(nextInstance);
    }
  }

  popToNextHostParent(fiber);
  if (fiber.tag === SuspenseComponent) {
    nextHydratableInstance = skipPastDehydratedSuspenseInstance(fiber);
  } else {
    nextHydratableInstance = hydrationParentFiber
      ? getNextHydratableSibling(fiber.stateNode)
      : null;
  }
  return true;
}

function resetHydrationState(): void {
  if (!supportsHydration) {
    return;
  }

  hydrationParentFiber = null;
  nextHydratableInstance = null;
  isHydrating = false;
}

function getIsHydrating(): boolean {
  return isHydrating;
}

export {
  warnIfHydrating,
  enterHydrationState,
  getIsHydrating,
  reenterHydrationStateFromDehydratedSuspenseInstance,
  resetHydrationState,
  tryToClaimNextHydratableInstance,
  prepareToHydrateHostInstance,
  prepareToHydrateHostTextInstance,
  prepareToHydrateHostSuspenseInstance,
  popHydrationState,
};
