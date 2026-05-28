import { LynxWebSocketAdapter, lynxFetch } from 'spacetimedb-lynx/lynx';
import { loadStdbToken, saveStdbToken } from '../auth/sessionStore';
import { writeHostLog } from '../debug/hostFileLogger';
import { COUNTER_DATABASE_NAME, COUNTER_SERVER_URL } from './connectionConfig';
import { DbConnection } from './module_bindings';

export async function createConnectionBuilder(
  token?: string,
): Promise<ReturnType<typeof DbConnection.builder>> {
  const resolvedToken = token ?? (await loadStdbToken());

  writeHostLog('info', '[Spacetime] Connecting', {
    source: 'connectionBuilder',
    url: COUNTER_SERVER_URL,
    database: COUNTER_DATABASE_NAME,
  });

  return DbConnection.builder()
    .withUri(COUNTER_SERVER_URL)
    .withDatabaseName(COUNTER_DATABASE_NAME)
    .withToken(resolvedToken || undefined)
    .withWS(LynxWebSocketAdapter)
    .withFetchFn(lynxFetch)
    .withCompression('none')
    .onConnect((_conn, identity, nextToken) => {
      void saveStdbToken(nextToken);

      writeHostLog('info', '[Spacetime] Connected', {
        source: 'connectionBuilder',
        identity: identity.toHexString(),
        tokenLength: nextToken.length,
      });
    })
    .onConnectError((_ctx, error) => {
      writeHostLog('error', '[Spacetime] Connection failed', {
        source: 'connectionBuilder',
        message: error.message,
      });
    })
    .onDisconnect((_ctx, error) => {
      writeHostLog('error', '[Spacetime] Disconnected', {
        source: 'connectionBuilder',
        message: error?.message ?? 'Disconnected from SpacetimeDB.',
      });
    });
}
