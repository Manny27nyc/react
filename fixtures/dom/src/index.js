// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
import './polyfills';
import loadReact from './react-loader';

loadReact()
  .then(() => import('./components/App'))
  .then(App => {
    const {React, ReactDOM} = window;

    ReactDOM.render(
      React.createElement(App.default),
      document.getElementById('root')
    );
  });
