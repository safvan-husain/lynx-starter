import { roleFromUserRole, userRoleFromAppRole } from './capabilities';
import { getErrorMessage } from '../spacetimedb/errors';
import type { DbConnection } from '../spacetimedb/module_bindings';
import type { AuthSession } from '../spacetimedb/module_bindings/types';
import { runReducerWithTimeout } from '../spacetimedb/reducerUtils';
import { querySql } from '../spacetimedb/sqlRead';
import type { AppRole, AuthUser } from './types';

const LOGIN_SESSION_WAIT_MS = 3000;
const LOGIN_SESSION_POLL_MS = 100;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function normalizeIdentityHex(value: string): string {
  return value.toLowerCase().replace(/^0x/, '');
}

function parseRoleValue(value: unknown): AppRole | null {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized.includes('admin')) return 'admin';
    if (normalized.includes('teacher')) return 'teacher';
    if (normalized.includes('parent')) return 'parent';
    if (normalized.includes('student')) return 'student';
    return null;
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
        case 0:
          return 'student';
        default:
          return null;
      }
    }
  }

  if (value && typeof value === 'object') {
    if ('Admin' in value || 'admin' in value) return 'admin';
    if ('Teacher' in value || 'teacher' in value) return 'teacher';
    if ('Parent' in value || 'parent' in value) return 'parent';
    if ('Student' in value || 'student' in value) return 'student';
  }

  return null;
}

export async function fetchUserRole(username: string): Promise<AppRole | null> {
  const normalized = username.trim().toLowerCase();
  const query = `select role from app_user where username = '${escapeSqlString(normalized)}'`;
  const payload = await querySql(query);
  const roleValue = payload?.[0]?.rows?.[0]?.[0];
  return parseRoleValue(roleValue);
}

async function usernameExists(username: string): Promise<boolean> {
  return (await fetchUserRole(username)) !== null;
}

function parseIdentityValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return normalizeIdentityHex(value);
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return normalizeIdentityHex(value[0]);
  }

  return null;
}

async function fetchCurrentSessionUser(
  connection: DbConnection,
): Promise<AuthUser | null> {
  const identity = connection.identity;
  if (!identity) {
    return null;
  }

  const identityHex = normalizeIdentityHex(identity.toHexString());
  const payload = await querySql('select identity, username, role from auth_session');
  const rows = payload?.[0]?.rows ?? [];

  for (const row of rows) {
    const sessionIdentity = parseIdentityValue(row[0]);
    const username = row[1];
    const role = parseRoleValue(row[2]);

    if (
      sessionIdentity === identityHex &&
      typeof username === 'string' &&
      role
    ) {
      return {
        username,
        role,
      };
    }
  }

  return null;
}

export function readCurrentSessionUser(
  connection: DbConnection,
): AuthUser | null {
  const identity = connection.identity;
  if (!identity) {
    return null;
  }

  const identityHex = identity.toHexString();

  for (const session of connection.db.auth_session.iter() as Iterable<AuthSession>) {
    if (session.identity.toHexString() === identityHex) {
      return {
        username: session.username,
        role: roleFromUserRole(session.role),
      };
    }
  }

  return null;
}

async function waitForCurrentSessionUser(
  connection: DbConnection,
): Promise<AuthUser | null> {
  const deadline = Date.now() + LOGIN_SESSION_WAIT_MS;

  while (Date.now() < deadline) {
    const user =
      readCurrentSessionUser(connection) ??
      (await fetchCurrentSessionUser(connection));
    if (user) {
      return user;
    }
    await delay(LOGIN_SESSION_POLL_MS);
  }

  return readCurrentSessionUser(connection);
}

export async function login(
  connection: DbConnection,
  username: string,
  password: string,
): Promise<AuthUser> {
  const normalizedUsername = username.trim().toLowerCase();

  try {
    await runReducerWithTimeout(
      'login',
      connection.reducers.login({
        username: normalizedUsername,
        password,
      }),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }

  const sessionUser = await waitForCurrentSessionUser(connection);
  if (sessionUser) {
    return sessionUser;
  }

  if (await usernameExists(normalizedUsername)) {
    throw new Error('Password is incorrect.');
  }

  throw new Error('Username does not exist.');
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
