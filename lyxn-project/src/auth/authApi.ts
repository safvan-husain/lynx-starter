import { roleFromUserRole, userRoleFromAppRole } from './roles';
import type { AppRole, AuthUser } from './types';
import {
  COUNTER_DATABASE_NAME,
  COUNTER_SERVER_URL,
} from '../spacetimedb/connectionConfig';
import { getErrorMessage } from '../spacetimedb/errors';
import type { DbConnection } from '../spacetimedb/module_bindings';
import { runReducerWithTimeout } from '../spacetimedb/reducerUtils';
import { lynxFetch } from '../spacetimedb/lynx-adapters';

type SqlResult = Array<{
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

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function parseRoleValue(value: unknown): AppRole {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized.includes('admin')) return 'admin';
    if (normalized.includes('teacher')) return 'teacher';
    if (normalized.includes('parent')) return 'parent';
    return 'student';
  }

  if (Array.isArray(value)) {
    const tag = value[0];
    if (typeof tag === 'number') {
      switch (tag) {
        case 3:
          return 'admin';
        case 2:
          return 'teacher';
        case 1:
          return 'parent';
        default:
          return 'student';
      }
    }
  }

  if (value && typeof value === 'object') {
    if ('Admin' in value || 'admin' in value) return 'admin';
    if ('Teacher' in value || 'teacher' in value) return 'teacher';
    if ('Parent' in value || 'parent' in value) return 'parent';
    if ('Student' in value || 'student' in value) return 'student';
  }

  return 'student';
}

async function runSql(query: string): Promise<SqlResult> {
  const response = (await lynxFetch(getSqlEndpoint(), {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
    },
    body: query,
  })) as FetchLikeResponse;

  if (response.ok === false) {
    const body = response.text ? await response.text() : '';
    throw new Error(`SQL request failed (${response.status ?? 'unknown'}): ${body}`);
  }

  return (await response.json()) as SqlResult;
}

export async function fetchUserRole(username: string): Promise<AppRole> {
  const normalized = username.trim().toLowerCase();
  const query = `select role from app_user where username = '${escapeSqlString(normalized)}'`;
  const payload = await runSql(query);
  const roleValue = payload?.[0]?.rows?.[0]?.[0];
  return parseRoleValue(roleValue);
}

export async function login(
  connection: DbConnection,
  username: string,
  password: string,
): Promise<AuthUser> {
  try {
    await runReducerWithTimeout(
      'login',
      connection.reducers.login({
        username: username.trim(),
        password,
      }),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }

  const role = await fetchUserRole(username);
  return {
    username: username.trim().toLowerCase(),
    role,
  };
}

export async function logout(connection: DbConnection): Promise<void> {
  await runReducerWithTimeout('logout', connection.reducers.logout({}));
}

export async function register(
  connection: DbConnection,
  username: string,
  password: string,
  role: AppRole,
): Promise<void> {
  try {
    await runReducerWithTimeout(
      'register',
      connection.reducers.register({
        username: username.trim(),
        password,
        role: userRoleFromAppRole(role),
      }),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
