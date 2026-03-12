import { useCallback, useRef, useState } from '@lynx-js/react';
import type { NodesRef } from '@lynx-js/types';
import { SpacetimeDBTest } from './components/SpacetimeDBTest';

// Note: SystemInfo is available globally in Lynx, but we can just use the global scope

const WS_URL =
  SystemInfo.platform === 'Android'
    ? 'ws://10.0.2.2:8080'
    : 'ws://localhost:8080';

// Tab types for switching between tests
type TabType = 'websocket' | 'spacetimedb';

// Original WebSocket Echo Component
function WebSocketEcho() {
  const [status, setStatus] = useState<string>('disconnected');
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const inputTextRef = useRef('');
  const inputRef = useRef<NodesRef>(null);

  const handleConnect = useCallback(() => {
    NativeModules.WebSocketModule.connect(WS_URL, (newStatus: string) => {
      setStatus(newStatus);
    });
  }, []);

  const handleDisconnect = useCallback(() => {
    NativeModules.WebSocketModule.disconnect();
  }, []);

  const handleSend = useCallback(() => {
    const text = inputTextRef.current.trim();
    if (!text) return;
    const sent = text;
    inputTextRef.current = '';
    // Clear the input field via invoke
    inputRef.current
      ?.invoke({ method: 'setValue', params: { value: '' } })
      .exec();
    NativeModules.WebSocketModule.sendMessage(sent, (response: string) => {
      setLastResponse(response);
      setLog((prev) => [...prev, `→ ${sent}  ← ${response}`]);
    });
  }, []);

  const isConnected = status === 'connected';
  const statusDot = isConnected ? '🟢' : '🔴';

  return (
    <view className="flex-1">
      {/* Header */}
      <view className="mb-6">
        <text className="text-3xl font-bold text-white mb-1">
          WebSocket Echo
        </text>
        <text className="text-sm text-white/50">Rust server + Lynx + iOS</text>
      </view>

      {/* Status */}
      <view className="flex-row items-center mb-4 rounded-xl bg-white/10 px-4 py-3">
        <text className="text-lg mr-2">{statusDot}</text>
        <text className="text-base text-white/80 flex-1">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </text>
        <view
          className={`rounded-lg px-4 py-2 ${isConnected ? 'bg-red-500/80' : 'bg-emerald-500/80'}`}
          bindtap={isConnected ? handleDisconnect : handleConnect}
        >
          <text className="text-sm font-semibold text-white">
            {isConnected ? 'Disconnect' : 'Connect'}
          </text>
        </view>
      </view>

      {/* Input */}
      <view className="flex-row items-center mb-4 gap-3">
        <input
          ref={inputRef}
          className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-white text-base"
          bindinput={(e: any) => {
            inputTextRef.current = e.detail.value;
          }}
          placeholder="Type a message..."
        />
        <view
          className={`rounded-xl px-5 py-3 ${isConnected ? 'bg-blue-500' : 'bg-gray-600'}`}
          bindtap={isConnected ? handleSend : undefined}
        >
          <text className="text-sm font-semibold text-white">Send</text>
        </view>
      </view>

      {/* Last echo */}
      {lastResponse !== null && (
        <view className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 mb-4">
          <text className="text-xs text-emerald-300 mb-1">Last Echo</text>
          <text className="text-base text-white">{lastResponse}</text>
        </view>
      )}

      {/* Log */}
      {log.length > 0 && (
        <view className="rounded-xl bg-white/5 px-4 py-3">
          <text className="text-xs text-white/40 mb-2">Message Log</text>
          {log.map((entry, i) => (
            <text key={i} className="text-sm text-white/70 mb-1 font-mono">
              {entry}
            </text>
          ))}
        </view>
      )}
    </view>
  );
}

// Main App with Tab Switching
export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('websocket');

  return (
    <view className="min-h-screen bg-slate-900">
      {/* Tab Bar */}
      <view className="flex-row border-b border-white/10 bg-slate-800/50">
        <view
          className={`flex-1 py-4 px-2 ${activeTab === 'websocket' ? 'border-b-2 border-blue-500' : ''}`}
          bindtap={() => setActiveTab('websocket')}
        >
          <text
            className={`text-sm font-semibold text-center ${
              activeTab === 'websocket' ? 'text-white' : 'text-white/50'
            }`}
          >
            WebSocket
          </text>
        </view>
        <view
          className={`flex-1 py-4 px-2 ${activeTab === 'spacetimedb' ? 'border-b-2 border-emerald-500' : ''}`}
          bindtap={() => setActiveTab('spacetimedb')}
        >
          <text
            className={`text-sm font-semibold text-center ${
              activeTab === 'spacetimedb' ? 'text-white' : 'text-white/50'
            }`}
          >
            SpacetimeDB
          </text>
        </view>
      </view>

      {/* Content */}
      <view className="flex-1 px-5 py-6">
        {activeTab === 'websocket' ? <WebSocketEcho /> : <SpacetimeDBTest />}
      </view>
    </view>
  );
}
