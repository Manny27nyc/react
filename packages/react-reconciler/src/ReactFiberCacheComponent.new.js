// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactContext} from 'shared/ReactTypes';
import type {FiberRoot} from './ReactInternalTypes';
import type {Lanes} from './ReactFiberLane.new';
import type {StackCursor} from './ReactFiberStack.new';

import {enableCache} from 'shared/ReactFeatureFlags';
import {REACT_CONTEXT_TYPE} from 'shared/ReactSymbols';

import {isPrimaryRenderer} from './ReactFiberHostConfig';
import {createCursor, push, pop} from './ReactFiberStack.new';
import {pushProvider, popProvider} from './ReactFiberNewContext.new';
import * as Scheduler from 'scheduler';

export type Cache = {|
  controller: AbortController,
  data: Map<() => mixed, mixed>,
  refCount: number,
|};

export type CacheComponentState = {|
  +parent: Cache,
  +cache: Cache,
|};

export type SpawnedCachePool = {|
  +parent: Cache,
  +pool: Cache,
|};

// Intentionally not named imports because Rollup would
// use dynamic dispatch for CommonJS interop named imports.
const {
  unstable_scheduleCallback: scheduleCallback,
  unstable_NormalPriority: NormalPriority,
} = Scheduler;

export const CacheContext: ReactContext<Cache> = enableCache
  ? {
      $$typeof: REACT_CONTEXT_TYPE,
      // We don't use Consumer/Provider for Cache components. So we'll cheat.
      Consumer: (null: any),
      Provider: (null: any),
      // We'll initialize these at the root.
      _currentValue: (null: any),
      _currentValue2: (null: any),
      _threadCount: 0,
    }
  : (null: any);

if (__DEV__ && enableCache) {
  CacheContext._currentRenderer = null;
  CacheContext._currentRenderer2 = null;
}

// The cache that newly mounted Cache boundaries should use. It's either
// retrieved from the cache pool, or the result of a refresh.
let pooledCache: Cache | null = null;

// When retrying a Suspense/Offscreen boundary, we override pooledCache with the
// cache from the render that suspended.
const prevFreshCacheOnStack: StackCursor<Cache | null> = createCursor(null);

// Creates a new empty Cache instance with a ref-count of 0. The caller is responsible
// for retaining the cache once it is in use (retainCache), and releasing the cache
// once it is no longer needed (releaseCache).
export function createCache(): Cache {
  if (!enableCache) {
    return (null: any);
  }
  const cache: Cache = {
    controller: new AbortController(),
    data: new Map(),
    refCount: 0,
  };

  return cache;
}

export function retainCache(cache: Cache) {
  if (!enableCache) {
    return;
  }
  if (__DEV__) {
    if (cache.controller.signal.aborted) {
      console.warn(
        'A cache instance was retained after it was already freed. ' +
          'This likely indicates a bug in React.',
      );
    }
  }
  cache.refCount++;
}

// Cleanup a cache instance, potentially freeing it if there are no more references
export function releaseCache(cache: Cache) {
  if (!enableCache) {
    return;
  }
  cache.refCount--;
  if (__DEV__) {
    if (cache.refCount < 0) {
      console.warn(
        'A cache instance was released after it was already freed. ' +
          'This likely indicates a bug in React.',
      );
    }
  }
  if (cache.refCount === 0) {
    scheduleCallback(NormalPriority, () => {
      cache.controller.abort();
    });
  }
}

export function pushCacheProvider(workInProgress: Fiber, cache: Cache) {
  if (!enableCache) {
    return;
  }
  pushProvider(workInProgress, CacheContext, cache);
}

export function popCacheProvider(workInProgress: Fiber, cache: Cache) {
  if (!enableCache) {
    return;
  }
  popProvider(CacheContext, workInProgress);
}

export function requestCacheFromPool(renderLanes: Lanes): Cache {
  if (!enableCache) {
    return (null: any);
  }
  if (pooledCache !== null) {
    return pooledCache;
  }
  // Create a fresh cache. The pooled cache must be owned - it is freed
  // in releaseRootPooledCache() - but the cache instance handed out
  // is retained/released in the commit phase of the component that
  // references is (ie the host root, cache boundary, suspense component)
  // Ie, pooledCache is conceptually an Option<Arc<Cache>> (owned),
  // whereas the return value of this function is a &Arc<Cache> (borrowed).
  pooledCache = createCache();
  retainCache(pooledCache);
  return pooledCache;
}

export function pushRootCachePool(root: FiberRoot) {
  if (!enableCache) {
    return;
  }
  // When we start rendering a tree, read the pooled cache for this render
  // from `root.pooledCache`. If it's currently `null`, we will lazily
  // initialize it the first type it's requested. However, we only mutate
  // the root itself during the complete/unwind phase of the HostRoot.
  const rootCache = root.pooledCache;
  if (rootCache != null) {
    pooledCache = rootCache;
    root.pooledCache = null;
  } else {
    pooledCache = null;
  }
}

export function popRootCachePool(root: FiberRoot, renderLanes: Lanes) {
  if (!enableCache) {
    return;
  }
  // The `pooledCache` variable points to the cache that was used for new
  // cache boundaries during this render, if any. Move ownership of the
  // cache to the root so that parallel transitions may share the same
  // cache. We will clear this field once all the transitions that depend
  // on it (which we track with `pooledCacheLanes`) have committed.
  root.pooledCache = pooledCache;
  if (pooledCache !== null) {
    root.pooledCacheLanes |= renderLanes;
  }
  // set to null, conceptually we are moving ownership to the root
  pooledCache = null;
}

export function restoreSpawnedCachePool(
  offscreenWorkInProgress: Fiber,
  prevCachePool: SpawnedCachePool,
): SpawnedCachePool | null {
  if (!enableCache) {
    return (null: any);
  }
  const nextParentCache = isPrimaryRenderer
    ? CacheContext._currentValue
    : CacheContext._currentValue2;
  if (nextParentCache !== prevCachePool.parent) {
    // There was a refresh. Don't bother restoring anything since the refresh
    // will override it.
    return null;
  } else {
    // No refresh. Resume with the previous cache. This will override the cache
    // pool so that any new Cache boundaries in the subtree use this one instead
    // of requesting a fresh one.
    push(prevFreshCacheOnStack, pooledCache, offscreenWorkInProgress);
    pooledCache = prevCachePool.pool;

    // Return the cache pool to signal that we did in fact push it. We will
    // assign this to the field on the fiber so we know to pop the context.
    return prevCachePool;
  }
}

// Note: Ideally, `popCachePool` would return this value, and then we would pass
// it to `getSuspendedCachePool`. But factoring reasons, those two functions are
// in different phases/files. They are always called in sequence, though, so we
// can stash the value here temporarily.
let _suspendedPooledCache: Cache | null = null;

export function popCachePool(workInProgress: Fiber) {
  if (!enableCache) {
    return;
  }
  _suspendedPooledCache = pooledCache;
  pooledCache = prevFreshCacheOnStack.current;
  pop(prevFreshCacheOnStack, workInProgress);
}

export function getSuspendedCachePool(): SpawnedCachePool | null {
  if (!enableCache) {
    return null;
  }
  // We check the cache on the stack first, since that's the one any new Caches
  // would have accessed.
  let pool = pooledCache;
  if (pool === null) {
    // There's no pooled cache above us in the stack. However, a child in the
    // suspended tree may have requested a fresh cache pool. If so, we would
    // have unwound it with `popCachePool`.
    if (_suspendedPooledCache !== null) {
      pool = _suspendedPooledCache;
      _suspendedPooledCache = null;
    } else {
      // There's no suspended cache pool.
      return null;
    }
  }

  return {
    // We must also save the parent, so that when we resume we can detect
    // a refresh.
    parent: isPrimaryRenderer
      ? CacheContext._currentValue
      : CacheContext._currentValue2,
    pool,
  };
}

export function getOffscreenDeferredCachePool(): SpawnedCachePool | null {
  if (!enableCache) {
    return null;
  }

  if (pooledCache === null) {
    // There's no deferred cache pool.
    return null;
  }

  return {
    // We must also store the parent, so that when we resume we can detect
    // a refresh.
    parent: isPrimaryRenderer
      ? CacheContext._currentValue
      : CacheContext._currentValue2,
    pool: pooledCache,
  };
}
