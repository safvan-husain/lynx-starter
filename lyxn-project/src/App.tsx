import { useMemo } from '@lynx-js/react';

import './App.css';

export function App() {
  const now = useMemo(() => new Date().toLocaleString(), []);

  return (
    <view className="App">
      <view className="Card">
        <text className="Badge">Lynx Bundle Loaded</text>
        <text className="Title">lyxn-project</text>
        <text className="Description">
          This screen is rendered from a single
          <text className="Code"> main.lynx.bundle </text>
          file copied into each native host app.
        </text>
        <text className="Meta">Built at: {now}</text>
      </view>
    </view>
  );
}
