// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
#!/usr/bin/env node

'use strict';

const commandLineArgs = require('command-line-args');
const {splitCommaParams} = require('../utils');

const paramDefinitions = [
  {
    name: 'local',
    type: Boolean,
    description:
      'Skip NPM and use the build already present in "build/node_modules".',
    defaultValue: false,
  },
  {
    name: 'skipPackages',
    type: String,
    multiple: true,
    description: 'Packages to exclude from publishing',
    defaultValue: [],
  },
  {
    name: 'skipTests',
    type: Boolean,
    description: 'Skip automated fixture tests.',
    defaultValue: false,
  },
  {
    name: 'version',
    type: String,
    description:
      'Version of published "next" release (e.g. 0.0.0-0e526bcec-20210202)',
  },
];

module.exports = () => {
  const params = commandLineArgs(paramDefinitions);

  splitCommaParams(params.skipPackages);

  return params;
};
