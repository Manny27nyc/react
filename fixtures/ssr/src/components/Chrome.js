// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
import React, {
  Component,
  Suspense,
  unstable_startTransition as startTransition,
} from 'react';

import Theme, {ThemeToggleButton} from './Theme';

import './Chrome.css';

export default class Chrome extends Component {
  state = {theme: 'light'};
  render() {
    const assets = this.props.assets;
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="shortcut icon" href="favicon.ico" />
          <link rel="stylesheet" href={assets['main.css']} />
          <title>{this.props.title}</title>
        </head>
        <body className={this.state.theme}>
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<b>Enable JavaScript to run this app.</b>`,
            }}
          />
          <Suspense fallback="Loading...">
            <Theme.Provider value={this.state.theme}>
              {this.props.children}
              <div>
                <ThemeToggleButton
                  onChange={theme => {
                    startTransition(() => {
                      this.setState({theme});
                    });
                  }}
                />
              </div>
            </Theme.Provider>
          </Suspense>
          <script
            dangerouslySetInnerHTML={{
              __html: `assetManifest = ${JSON.stringify(assets)};`,
            }}
          />
        </body>
      </html>
    );
  }
}
