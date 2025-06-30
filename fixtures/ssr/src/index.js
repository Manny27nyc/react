// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
import React from 'react';
import {hydrateRoot} from 'react-dom';

import App from './components/App';

let root = hydrateRoot(document, <App assets={window.assetManifest} />);
