import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { DbConnection } from '../../lyxn-project/src/spacetimedb/module_bindings/index.ts';
import {
  callReducer,
  requestIdentity,
  startSpacetimeTestServer,
  type SpacetimeTestServer,
} from './helpers/spacetime_test_server.ts';

const hasSpacetimeCli =
  spawnSync('spacetime', ['--help'], { encoding: 'utf8' }).status === 0;
const hasWebSocket = typeof globalThis.WebSocket === 'function';
const canRunIntegration = hasSpacetimeCli && hasWebSocket;

describe.runIf(canRunIntegration)('querySql integration against local SpacetimeDB', () => {
  let server: SpacetimeTestServer;
  let adminToken: string;

  beforeAll(async () => {
    server = await startSpacetimeTestServer();
    const admin = await requestIdentity(server.serverUrl);
    await callReducer(
      server.serverUrl,
      server.databaseName,
      admin.token,
      'login',
      ['admin', 'admin123'],
    );
    await callReducer(
      server.serverUrl,
      server.databaseName,
      admin.token,
      'increment_counter',
      [],
    );
    adminToken = admin.token;
  }, 120_000);

  afterAll(async () => {
    await server?.stop();
  }, 30_000);

  async function connectClient(token: string): Promise<DbConnection> {
    return new Promise((resolve, reject) => {
      const client = DbConnection.builder()
        .withUri(server.wsUrl)
        .withDatabaseName(server.databaseName)
        .withToken(token)
        .withCompression('none')
        .withWS(globalThis.WebSocket)
        .withFetchFn(globalThis.fetch.bind(globalThis))
        .onConnect(() => resolve(client))
        .onConnectError((_ctx, error) => reject(error))
        .build();
    });
  }

  test(
    'querySql returns typed auth_session and counter rows from a live server',
    async () => {
      const client = await connectClient(adminToken);

      try {
        const authSessionResult = await client.querySql(
          'select * from auth_session',
        );
        const authRows = authSessionResult.find(
          (table) => table.tableName === 'auth_session',
        )?.rows;
        expect(authRows?.length).toBeGreaterThan(0);
        expect(authRows?.[0]).toEqual(
          expect.objectContaining({
            username: 'admin',
          }),
        );

        const counterResult = await client.querySql('select * from counter');
        expect(counterResult).toEqual([
          {
            tableName: 'counter',
            rows: [{ id: 0, count: 1 }],
          },
        ]);
      } finally {
        client.disconnect();
      }
    },
    30_000,
  );

  test(
    'querySql rejects unknown tables with a server SQL error',
    async () => {
      const client = await connectClient(adminToken);

      try {
        await expect(
          client.querySql('select * from missing_table'),
        ).rejects.toThrow(/missing_table/i);
      } finally {
        client.disconnect();
      }
    },
    30_000,
  );
});

describe.runIf(!canRunIntegration)(
  'querySql integration against local SpacetimeDB',
  () => {
    test.skip('requires spacetime CLI and global WebSocket', () => {});
  },
);
