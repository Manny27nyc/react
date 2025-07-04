// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
#!/usr/bin/env node

'use strict';

const {join} = require('path');
const {addDefaultParamValue, handleError} = require('./utils');

const downloadBuildArtifacts = require('./shared-commands/download-build-artifacts');
const parseParams = require('./shared-commands/parse-params');
const printPrereleaseSummary = require('./shared-commands/print-prerelease-summary');
const testPackagingFixture = require('./shared-commands/test-packaging-fixture');

const run = async () => {
  try {
    addDefaultParamValue(null, '--commit', 'main');

    const params = await parseParams();
    params.cwd = join(__dirname, '..', '..');

    await downloadBuildArtifacts(params);

    if (!params.skipTests) {
      await testPackagingFixture(params);
    }

    const isLatestRelease = params.releaseChannel === 'latest';
    await printPrereleaseSummary(params, isLatestRelease);
  } catch (error) {
    handleError(error);
  }
};

run();
