import React, { useState, useEffect } from 'react';
import { getSpacetimeClient } from '../spacetimedb';

export function SpacetimeDBTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [error, setError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState('https://maincloud.spacetimedb.com');
  const [databaseName, setDatabaseName] = useState('lynx-starter-jzx7d');

  const client = getSpacetimeClient({
    url: serverUrl,
    database: databaseName
  });

  useEffect(() => {
    // Set up event handlers
    client.onConnect(() => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionStatus('Connected');
      setError(null);
    });

    client.onDisconnect(() => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionStatus('Disconnected');
    });

    client.onConnectError((err) => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionStatus('Connection Error');
      setError(err.message);
    });

    return () => {
      client.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('Connecting...');
      setError(null);
      
      console.log('[SpacetimeDBTest] Starting connection...');
      await client.connect();
    } catch (err) {
      setIsConnecting(false);
      console.error('[SpacetimeDBTest] Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConnectionStatus('Connection Failed');
    }
  };

  const handleDisconnect = () => {
    client.disconnect();
  };

  return (
    <view style={{ padding: 20 }}>
      <text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        SpacetimeDB Test (Lynx Native)
      </text>
      
      {/* Implementation Info */}
      <view style={{ marginBottom: 15, padding: 10, backgroundColor: '#e7f3ff', borderRadius: 5 }}>
        <text style={{ fontWeight: 'bold', marginBottom: 5 }}>Implementation:</text>
        <text>✅ Using spacetimedb-lynx package</text>
        <text>✅ Native Lynx WebSocket adapter</text>
        <text>✅ Native Lynx HTTP adapter (with XMLHttpRequest fallback)</text>
      </view>

      {/* Server Configuration */}
      <view style={{ marginBottom: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 5 }}>
        <text style={{ fontWeight: 'bold', marginBottom: 5 }}>Server Configuration:</text>
        <text>URL: {serverUrl}</text>
        <text>Database: {databaseName}</text>
        <text style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
          Note: Update these values in the component code to match your SpacetimeDB server
        </text>
      </view>

      {/* Connection Status */}
      <view style={{ marginBottom: 15 }}>
        <text style={{ fontWeight: 'bold' }}>Status: </text>
        <text style={{ 
          color: isConnected ? 'green' : connectionStatus.indexOf('Error') !== -1 ? 'red' : 'orange' 
        }}>
          {connectionStatus}
        </text>
      </view>

      {/* Error Display */}
      {error && (
        <view style={{ marginBottom: 15, padding: 10, backgroundColor: '#ffebee', borderRadius: 5 }}>
          <text style={{ color: 'red', fontWeight: 'bold' }}>Error:</text>
          <text style={{ color: 'red' }}>{error}</text>
        </view>
      )}

      {/* Connection Controls */}
      <view style={{ flexDirection: 'row', gap: 10 }}>
        <view 
          bindtap={handleConnect}
          style={{ 
            padding: 10, 
            backgroundColor: (isConnected || isConnecting) ? '#ccc' : '#007bff', 
            borderRadius: 5,
            opacity: (isConnected || isConnecting) ? 0.5 : 1
          }}
        >
          <text style={{ color: 'white', textAlign: 'center' }}>
            {isConnecting ? 'Connecting...' : 'Connect'}
          </text>
        </view>

        <view 
          bindtap={handleDisconnect}
          style={{ 
            padding: 10, 
            backgroundColor: isConnected ? '#dc3545' : '#ccc', 
            borderRadius: 5,
            opacity: isConnected ? 1 : 0.5
          }}
        >
          <text style={{ color: 'white', textAlign: 'center' }}>Disconnect</text>
        </view>
      </view>

      {/* Instructions */}
      <view style={{ marginTop: 20, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 5 }}>
        <text style={{ fontWeight: 'bold', marginBottom: 5 }}>Instructions:</text>
        <text>1. Ensure WebSocket module is registered in iOS ViewController</text>
        <text>2. Click Connect to test SpacetimeDB connection</text>
        <text>3. Check console for detailed logs</text>
        <text>4. This uses the native spacetimedb-lynx package (no polyfills)</text>
      </view>
    </view>
  );
}