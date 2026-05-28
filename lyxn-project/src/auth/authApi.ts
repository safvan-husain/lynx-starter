import { roleFromUserRole, userRoleFromAppRole } from './capabilities';
import { getErrorMessage } from '../spacetimedb/errors';
import type { DbConnection } from '../spacetimedb/module_bindings';
import type { AuthSession } from '../spacetimedb/module_bindings/types';
import { runReducerWithTimeout } from '../spacetimedb/reducerUtils';
import { querySql } from '../spacetimedb/sqlRead';
import type { AppRole, AuthUser } from './types';

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

export async function fetchUserRole(username: string): Promise<AppRole> {
  const normalized = username.trim().toLowerCase();
  const query = `select role from app_user where username = '${escapeSqlString(normalized)}'`;
  const payload = await querySql(query);
  const roleValue = payload?.[0]?.rows?.[0]?.[0];
  return parseRoleValue(roleValue);
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

  return {
    username: username.trim().toLowerCase(),
    role: await fetchUserRole(username),
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
