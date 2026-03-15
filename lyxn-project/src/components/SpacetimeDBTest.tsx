import React, { useEffect, useRef, useState } from 'react';
import { createSpacetimeClient } from '../spacetimedb';

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

export function SpacetimeDBTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [error, setError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState('https://maincloud.spacetimedb.com');
  const [databaseName, setDatabaseName] = useState('lynx-starter-jzx7d');

  const [identityHex, setIdentityHex] = useState<string | null>(null);
  const [connectionIdHex, setConnectionIdHex] = useState<string | null>(null);
  const [tokenLen, setTokenLen] = useState<number | null>(null);

  const [tableName, setTableName] = useState('todo');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastRowCount, setLastRowCount] = useState<number | null>(null);
  const unsubscribeRef = useRef<null | (() => void)>(null);

  const [reducerName, setReducerName] = useState('noop');
  const [lastReducerStatus, setLastReducerStatus] = useState<string | null>(null);

  const clientRef = useRef(
    createSpacetimeClient({
      url: serverUrl,
      database: databaseName,
    }),
  );

  useEffect(() => {
    const client = clientRef.current;
    // Set up event handlers
    client.onConnect((identity, token) => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionStatus('Connected');
      setError(null);

      const c = client.getClient();
      const id = identity.toHexString();
      const cid = c?.connectionId.toHexString();

      setIdentityHex(id);
      setConnectionIdHex(cid ?? null);
      setTokenLen(token ? token.length : null);
    });

    client.onDisconnect(() => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionStatus('Disconnected');
      setIsSubscribed(false);
      unsubscribeRef.current = null;
      setLastRowCount(null);
    });

    client.onConnectError((err) => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionStatus('Connection Error');
      setError(err.message);
    });

    return () => {
      unsubscribeRef.current?.();
      client.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('Connecting...');
      setError(null);
      
      console.log('[SpacetimeDBTest] Starting connection...');
      await clientRef.current.connect();
    } catch (err) {
      setIsConnecting(false);
      console.error('[SpacetimeDBTest] Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConnectionStatus('Connection Failed');
    }
  };

  const handleDisconnect = () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    clientRef.current.disconnect();
  };

  const handleSubscribe = () => {
    if (isSubscribed) return;
    try {
      unsubscribeRef.current?.();
      const handle = clientRef.current.subscribeToTable(tableName);
      unsubscribeRef.current = () => handle.unsubscribe();
      setIsSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleUnsubscribe = () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setIsSubscribed(false);
  };

  const handleCallReducer = async () => {
    setLastReducerStatus(null);
    try {
      await clientRef.current.callReducer(reducerName, new Uint8Array());
      setLastReducerStatus('Sent');
    } catch (e) {
      setLastReducerStatus(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
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

      {/* Connection Details */}
      <view style={{ marginTop: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 5 }}>
        <text style={{ fontWeight: 'bold', marginBottom: 5 }}>InitialConnection:</text>
        <text style={{ fontSize: 12, color: '#666' }}>
          Identity: {identityHex ? identityHex.slice(0, 16) + '…' : '(none)'}
        </text>
        <text style={{ fontSize: 12, color: '#666' }}>
          ConnectionId: {connectionIdHex ? connectionIdHex : '(none)'}
        </text>
        <text style={{ fontSize: 12, color: '#666' }}>
          Token length: {tokenLen ?? '(none)'}
        </text>
      </view>

      {/* Subscription Test */}
      <view style={{ marginTop: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 5 }}>
        <text style={{ fontWeight: 'bold', marginBottom: 5 }}>Subscribe (Raw Row Bytes):</text>
        <text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
          Table name must exist in your DB schema.
        </text>
        <text style={{ fontSize: 12, color: '#666' }}>Table: {tableName}</text>
        <input
          style={{ marginTop: 8, padding: 8, backgroundColor: '#fff', borderRadius: 5 }}
          placeholder="table name"
          bindinput={(e: any) => setTableName(e.detail.value)}
        />
        <text style={{ fontSize: 12, color: '#666' }}>
          Last row count: {lastRowCount ?? '(none)'}
        </text>

        <view style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <view
            bindtap={isConnected && !isSubscribed ? handleSubscribe : undefined}
            style={{
              padding: 10,
              backgroundColor: isConnected && !isSubscribed ? '#28a745' : '#ccc',
              borderRadius: 5,
              opacity: isConnected && !isSubscribed ? 1 : 0.5,
            }}
          >
            <text style={{ color: 'white', textAlign: 'center' }}>Subscribe</text>
          </view>
          <view
            bindtap={isSubscribed ? handleUnsubscribe : undefined}
            style={{
              padding: 10,
              backgroundColor: isSubscribed ? '#dc3545' : '#ccc',
              borderRadius: 5,
              opacity: isSubscribed ? 1 : 0.5,
            }}
          >
            <text style={{ color: 'white', textAlign: 'center' }}>Unsubscribe</text>
          </view>
        </view>
      </view>

      {/* Reducer Call Test */}
      <view style={{ marginTop: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 5 }}>
        <text style={{ fontWeight: 'bold', marginBottom: 5 }}>Call Reducer (Empty Args):</text>
        <text style={{ fontSize: 12, color: '#666' }}>Reducer: {reducerName}</text>
        <input
          style={{ marginTop: 8, padding: 8, backgroundColor: '#fff', borderRadius: 5 }}
          placeholder="reducer name"
          bindinput={(e: any) => setReducerName(e.detail.value)}
        />
        <text style={{ fontSize: 12, color: '#666' }}>
          Last reducer status: {lastReducerStatus ?? '(none)'}
        </text>
        <view
          bindtap={isConnected ? handleCallReducer : undefined}
          style={{
            marginTop: 10,
            padding: 10,
            backgroundColor: isConnected ? '#007bff' : '#ccc',
            borderRadius: 5,
            opacity: isConnected ? 1 : 0.5,
          }}
        >
          <text style={{ color: 'white', textAlign: 'center' }}>Call Reducer</text>
        </view>
      </view>

      {/* Instructions */}
      <view style={{ marginTop: 20, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 5 }}>
        <text style={{ fontWeight: 'bold', marginBottom: 5 }}>Instructions:</text>
        <text>1. Ensure WebSocket module is registered in iOS ViewController</text>
        <text>2. Click Connect to test SpacetimeDB connection</text>
        <text>3. Check console for detailed logs</text>
        <text>4. Connected only after InitialConnection (identity/connectionId/token)</text>
        <text>5. Subscribe expects raw row bytes (no schema decode yet)</text>
      </view>
    </view>
  );
}
