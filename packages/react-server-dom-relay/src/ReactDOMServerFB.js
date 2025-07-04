// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';

import type {Request} from 'react-server/src/ReactFizzServer';

import type {Destination} from 'react-server/src/ReactServerStreamConfig';

import {
  createRequest,
  startWork,
  performWork,
  startFlowing,
  abort,
} from 'react-server/src/ReactFizzServer';

import {
  createResponseState,
  createRootFormatContext,
} from 'react-server/src/ReactServerFormatConfig';

type Options = {
  identifierPrefix?: string,
  bootstrapScriptContent?: string,
  bootstrapScripts: Array<string>,
  bootstrapModules: Array<string>,
  progressiveChunkSize?: number,
  onError: (error: mixed) => void,
};

opaque type Stream = {
  destination: Destination,
  request: Request,
};

function renderToStream(children: ReactNodeList, options: Options): Stream {
  const destination = {
    buffer: '',
    done: false,
    fatal: false,
    error: null,
  };
  const request = createRequest(
    children,
    createResponseState(
      options ? options.identifierPrefix : undefined,
      undefined,
      options ? options.bootstrapScriptContent : undefined,
      options ? options.bootstrapScripts : undefined,
      options ? options.bootstrapModules : undefined,
    ),
    createRootFormatContext(undefined),
    options ? options.progressiveChunkSize : undefined,
    options.onError,
    undefined,
    undefined,
  );
  startWork(request);
  if (destination.fatal) {
    throw destination.error;
  }
  return {
    destination,
    request,
  };
}

function abortStream(stream: Stream): void {
  abort(stream.request);
}

function renderNextChunk(stream: Stream): string {
  const {request, destination} = stream;
  performWork(request);
  startFlowing(request, destination);
  if (destination.fatal) {
    throw destination.error;
  }
  const chunk = destination.buffer;
  destination.buffer = '';
  return chunk;
}

function hasFinished(stream: Stream): boolean {
  return stream.destination.done;
}

export {renderToStream, renderNextChunk, hasFinished, abortStream};
