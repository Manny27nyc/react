// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
/** @flow */

// This test harness mounts each test app as a separate root to test multi-root applications.

import * as React from 'react';
import * as ReactDOM from 'react-dom';

const container = document.createElement('div');

((document.body: any): HTMLBodyElement).appendChild(container);

// TODO We may want to parameterize this app
// so that it can load things other than just ToDoList.
const App = require('./apps/ListApp').default;

// $FlowFixMe Flow doesn't know about createRoot() yet.
const root = ReactDOM.createRoot(container);
root.render(<App />);

// ReactDOM Test Selector APIs used by Playwright e2e tests
window.parent.REACT_DOM_APP = ReactDOM;
