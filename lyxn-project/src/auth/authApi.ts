import { roleFromUserRole, userRoleFromAppRole } from "./capabilities";
import { getErrorMessage } from "../spacetimedb/errors";
import type { DbConnection } from "../spacetimedb/module_bindings";
import type {
  AppUser,
  AuthSession,
} from "../spacetimedb/module_bindings/types";
import type { AppRole, AuthUser } from "./types";

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

type SqlTableResult = Awaited<ReturnType<DbConnection["querySql"]>>;

function getTableRows<Row>(result: SqlTableResult, tableName: string): Row[] {
  return (result.find((table) => table.tableName === tableName)?.rows ??
    []) as Row[];
}

function normalizeIdentityHex(value: string): string {
  return value.toLowerCase().replace(/^0x/, "");
}

export async function fetchUserRole(
  connection: DbConnection,
  username: string,
): Promise<AppRole | null> {
  const normalized = username.trim().toLowerCase();
  const query = `select * from app_user where username = '${escapeSqlString(normalized)}'`;
  const payload = await connection.querySql(query);
  const user = getTableRows<AppUser>(payload, "app_user")[0];
  return user ? roleFromUserRole(user.role) : null;
}

async function usernameExists(
  connection: DbConnection,
  username: string,
): Promise<boolean> {
  return (await fetchUserRole(connection, username)) !== null;
}

function parseIdentityValue(value: unknown): string | null {
  if (typeof value === "string") {
    return normalizeIdentityHex(value);
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return normalizeIdentityHex(value[0]);
  }

  if (
    value &&
    typeof value === "object" &&
    "toHexString" in value &&
    typeof value.toHexString === "function"
  ) {
    return normalizeIdentityHex(value.toHexString());
  }

  return null;
}

export async function fetchCurrentSessionUser(
  connection: DbConnection,
): Promise<AuthUser | null> {
  const identity = connection.identity;
  if (!identity) {
    return null;
  }

  const identityHex = normalizeIdentityHex(identity.toHexString());
  const payload = await connection.querySql("select * from auth_session");
  const rows = getTableRows<AuthSession>(payload, "auth_session");

  for (const row of rows) {
    const sessionIdentity = parseIdentityValue(row.identity);
    const username = row.username;
    const role = roleFromUserRole(row.role);

    if (
      sessionIdentity === identityHex &&
      typeof username === "string" &&
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
    await connection.reducers.login({
      username: normalizedUsername,
      password,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }

  const sessionUser = await waitForCurrentSessionUser(connection);
  if (sessionUser) {
    return sessionUser;
  }

  if (await usernameExists(connection, normalizedUsername)) {
    throw new Error("Password is incorrect.");
  }

  throw new Error("Username does not exist.");
}

export async function logout(connection: DbConnection): Promise<void> {
  await connection.reducers.logout({});
}

export async function register(
  connection: DbConnection,
  username: string,
  password: string,
  role: AppRole,
): Promise<void> {
  try {
    await connection.reducers.register({
      username: username.trim(),
      password,
      role: userRoleFromAppRole(role),
    });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
