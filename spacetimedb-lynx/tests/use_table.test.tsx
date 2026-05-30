// @vitest-environment jsdom

import { render, waitFor } from '@testing-library/react';
import React, { useEffect, useMemo } from 'react';
import { describe, expect, test } from 'vitest';
import { ConnectionId, Identity } from '../src';
import { ServerMessage } from '../src/sdk/client_api/types';
import WebsocketTestAdapter from '../src/sdk/websocket_test_adapter';
import { SpacetimeDBContext } from '../src/react/useSpacetimeDB';
import { useTable } from '../src/react/useTable';
import { DbConnection, tables } from '../test-app/src/module_bindings';
import {
  encodeCounterSnapshot,
  makeQueryRows,
  makeQuerySetUpdate,
} from './utils';

type ViewTableState = {
  rows: readonly { id: number; count: number }[];
  isReady: boolean;
};

function getLastSubscribeMessageInfo(wsAdapter: WebsocketTestAdapter): {
  requestId: number;
  querySetId: number;
  queryString: string;
} {
  for (let i = wsAdapter.outgoingMessages.length - 1; i >= 0; i--) {
    const message = wsAdapter.outgoingMessages[i];
    if (message.tag === 'Subscribe') {
      return {
        requestId: message.value.requestId,
        querySetId: message.value.querySetId.id,
        queryString: message.value.queryStrings[0] ?? '',
      };
    }
  }
  throw new Error('No Subscribe message found in messageQueue.');
}

function ViewTableProbe({
  stateRef,
}: {
  stateRef: React.MutableRefObject<ViewTableState>;
}) {
  const [rows, isReady] = useTable(tables.counter_snapshot);

  useEffect(() => {
    stateRef.current = { rows, isReady };
  }, [rows, isReady, stateRef]);

  return null;
}

async function connectClient(
  wsAdapter: WebsocketTestAdapter,
): Promise<InstanceType<typeof DbConnection>> {
  const client = DbConnection.builder()
    .withUri('ws://127.0.0.1:1234')
    .withDatabaseName('use-table-view-test')
    .withWSFn(wsAdapter.createWebSocketFn.bind(wsAdapter) as any)
    .build();

  await client['wsPromise'];
  wsAdapter.acceptConnection();
  wsAdapter.sendToClient(
    ServerMessage.InitialConnection({
      identity: Identity.fromString(
        '0000000000000000000000000000000000000000000000000000000000000069',
      ),
      token: 'test-token',
      connectionId: ConnectionId.random(),
    }),
  );

  return client;
}

function renderWithConnection(
  client: InstanceType<typeof DbConnection>,
  stateRef: React.MutableRefObject<ViewTableState>,
) {
  function Harness() {
    const contextValue = useMemo(
      () => ({
        isActive: true,
        identity: client.identity,
        token: client.token,
        connectionId: client.connectionId,
        connectionError: undefined,
        getConnection: () => client,
      }),
      [],
    );

    return (
      <SpacetimeDBContext.Provider value={contextValue}>
        <ViewTableProbe stateRef={stateRef} />
      </SpacetimeDBContext.Provider>
    );
  }

  return render(<Harness />);
}

describe('useTable with generated server views', () => {
  test('subscribes to counter_snapshot and returns live rows when ready', async () => {
    const wsAdapter = new WebsocketTestAdapter();
    const stateRef: React.MutableRefObject<ViewTableState> = {
      current: { rows: [], isReady: false },
    };

    const client = await connectClient(wsAdapter);
    const { unmount } = renderWithConnection(client, stateRef);

    try {
      await waitFor(() => {
        const { queryString } = getLastSubscribeMessageInfo(wsAdapter);
        expect(queryString).toBe('SELECT * FROM "counter_snapshot"');
      });

      const { requestId, querySetId } = getLastSubscribeMessageInfo(wsAdapter);
      wsAdapter.sendToClient(
        ServerMessage.SubscribeApplied({
          requestId,
          querySetId: { id: querySetId },
          rows: makeQueryRows(
            'counter_snapshot',
            encodeCounterSnapshot({ id: 0, count: 7 }),
          ),
        }),
      );

      await waitFor(() => {
        expect(stateRef.current.isReady).toBe(true);
        expect(stateRef.current.rows).toEqual([{ id: 0, count: 7 }]);
      });
    } finally {
      unmount();
    }
  });

  test('updates counter_snapshot rows after a subscription transaction update', async () => {
    const wsAdapter = new WebsocketTestAdapter();
    const stateRef: React.MutableRefObject<ViewTableState> = {
      current: { rows: [], isReady: false },
    };

    const client = await connectClient(wsAdapter);
    const { unmount } = renderWithConnection(client, stateRef);

    try {
      const { requestId, querySetId } = await waitFor(() =>
        getLastSubscribeMessageInfo(wsAdapter),
      );

      wsAdapter.sendToClient(
        ServerMessage.SubscribeApplied({
          requestId,
          querySetId: { id: querySetId },
          rows: makeQueryRows(
            'counter_snapshot',
            encodeCounterSnapshot({ id: 0, count: 3 }),
          ),
        }),
      );

      await waitFor(() => {
        expect(stateRef.current.isReady).toBe(true);
        expect(stateRef.current.rows).toEqual([{ id: 0, count: 3 }]);
      });

      wsAdapter.sendToClient(
        ServerMessage.TransactionUpdate({
          querySets: [
            makeQuerySetUpdate(
              querySetId,
              'counter_snapshot',
              encodeCounterSnapshot({ id: 0, count: 9 }),
              encodeCounterSnapshot({ id: 0, count: 3 }),
            ),
          ],
        }),
      );

      await waitFor(() => {
        expect(stateRef.current.rows).toEqual([{ id: 0, count: 9 }]);
      });
    } finally {
      unmount();
    }
  });
});
