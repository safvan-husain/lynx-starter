import '@lynx-js/preact-devtools';
import '@lynx-js/react/debug';
import { root } from '@lynx-js/react';

import './runtime/compat.js';
import { App } from './App.js';
import { installHostFileLogger } from './debug/hostFileLogger.js';
import { SpacetimeAppShell } from './spacetimedb/SpacetimeAppShell.js';
import './index.css';

installHostFileLogger();

root.render(
  <SpacetimeAppShell>
    <App />
  </SpacetimeAppShell>,
);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
