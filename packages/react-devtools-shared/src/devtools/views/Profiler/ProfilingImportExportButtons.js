// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {Fragment, useContext, useCallback, useRef} from 'react';
import {ProfilerContext} from './ProfilerContext';
import {ModalDialogContext} from '../ModalDialog';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import {StoreContext} from '../context';
import {
  prepareProfilingDataExport,
  prepareProfilingDataFrontendFromExport,
} from './utils';
import {downloadFile} from '../utils';
import {TimelineContext} from 'react-devtools-timeline/src/TimelineContext';

import styles from './ProfilingImportExportButtons.css';

import type {ProfilingDataExport} from './types';

export default function ProfilingImportExportButtons() {
  const {isProfiling, profilingData, rootID, selectedTabID} = useContext(
    ProfilerContext,
  );
  const {setFile} = useContext(TimelineContext);
  const store = useContext(StoreContext);
  const {profilerStore} = store;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const downloadRef = useRef<HTMLAnchorElement | null>(null);

  const {dispatch: modalDialogDispatch} = useContext(ModalDialogContext);

  const downloadData = useCallback(() => {
    if (rootID === null) {
      return;
    }

    const anchorElement = downloadRef.current;

    if (profilingData !== null && anchorElement !== null) {
      const profilingDataExport = prepareProfilingDataExport(profilingData);
      const date = new Date();
      const dateString = date
        .toLocaleDateString(undefined, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\//g, '-');
      const timeString = date
        .toLocaleTimeString(undefined, {
          hour12: false,
        })
        .replace(/:/g, '-');
      downloadFile(
        anchorElement,
        `profiling-data.${dateString}.${timeString}.json`,
        JSON.stringify(profilingDataExport, null, 2),
      );
    }
  }, [rootID, profilingData]);

  const clickInputElement = useCallback(() => {
    if (inputRef.current !== null) {
      inputRef.current.click();
    }
  }, []);

  const importProfilerData = useCallback(() => {
    const input = inputRef.current;
    if (input !== null && input.files.length > 0) {
      const fileReader = new FileReader();
      fileReader.addEventListener('load', () => {
        try {
          const raw = ((fileReader.result: any): string);
          const profilingDataExport = ((JSON.parse(
            raw,
          ): any): ProfilingDataExport);
          profilerStore.profilingData = prepareProfilingDataFrontendFromExport(
            profilingDataExport,
          );
        } catch (error) {
          modalDialogDispatch({
            id: 'ProfilingImportExportButtons',
            type: 'SHOW',
            title: 'Import failed',
            content: (
              <Fragment>
                <div>The profiling data you selected cannot be imported.</div>
                {error !== null && (
                  <div className={styles.ErrorMessage}>{error.message}</div>
                )}
              </Fragment>
            ),
          });
        }
      });
      // TODO (profiling) Handle fileReader errors.
      fileReader.readAsText(input.files[0]);
    }
  }, [modalDialogDispatch, profilerStore]);

  const importTimelineDataWrapper = event => {
    const input = inputRef.current;
    if (input !== null && input.files.length > 0) {
      const file = input.files[0];
      setFile(file);
    }
  };

  return (
    <Fragment>
      <div className={styles.VRule} />
      <input
        ref={inputRef}
        className={styles.Input}
        type="file"
        accept=".json"
        onChange={
          selectedTabID === 'timeline'
            ? importTimelineDataWrapper
            : importProfilerData
        }
        tabIndex={-1}
      />
      <a ref={downloadRef} className={styles.Input} />
      <Button
        disabled={isProfiling}
        onClick={clickInputElement}
        title="Load profile...">
        <ButtonIcon type="import" />
      </Button>
      <Button
        disabled={
          isProfiling ||
          !profilerStore.didRecordCommits ||
          selectedTabID === 'timeline'
        }
        onClick={downloadData}
        title="Save profile...">
        <ButtonIcon type="export" />
      </Button>
    </Fragment>
  );
}
