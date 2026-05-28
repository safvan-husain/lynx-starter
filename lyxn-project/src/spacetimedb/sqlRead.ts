import { lynxFetch } from 'spacetimedb-lynx/lynx';
import { COUNTER_DATABASE_NAME, COUNTER_SERVER_URL } from './connectionConfig';

export type SqlResult = Array<{
  rows?: Array<Array<unknown>>;
}>;

type FetchLikeResponse = {
  json: () => Promise<unknown>;
  ok?: boolean;
  status?: number;
  text?: () => Promise<string>;
};

function getSqlEndpoint(): string {
  return `${COUNTER_SERVER_URL}/v1/database/${COUNTER_DATABASE_NAME}/sql`;
}

export async function querySql(sql: string): Promise<SqlResult> {
  const response = (await lynxFetch(getSqlEndpoint(), {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
    },
    body: sql,
  })) as FetchLikeResponse;

  if (response.ok === false) {
    const body = response.text ? await response.text() : '';
    throw new Error(
      `SQL request failed (${response.status ?? 'unknown'}): ${body}`,
    );
  }

  return (await response.json()) as SqlResult;
}
