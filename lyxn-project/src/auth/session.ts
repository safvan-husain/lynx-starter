import { getErrorMessage } from '../spacetimedb/errors';
import type { DbConnection } from '../spacetimedb/module_bindings';
import type { SpacetimeConnectionStatus } from '../spacetimedb/useSpacetimeConnection';
import {
  login,
  logout,
  readCurrentSessionUser,
  register as registerAccount,
} from './authApi';
import { clearAuthSession, loadAuthUser, saveAuthUser } from './sessionStore';
import type { AppRole, AuthStatus, AuthUser } from './types';

export type SessionConnection = {
  connection: DbConnection | null;
  status: SpacetimeConnectionStatus;
};

export type SessionSnapshot = {
  currentUser: AuthUser | null;
  errorMessage: string | null;
  status: AuthStatus;
};

export const CONNECTION_WAIT_MESSAGE =
  'Waiting for database connection. Try again in a moment.';

export type ConnectionStatusPresentation = {
  label: string;
  tone: 'error' | 'info' | 'success';
};

export function isConnectionReady(spacetime: SessionConnection): boolean {
  return spacetime.connection !== null && spacetime.status === 'connected';
}

export function getConnectionStatusPresentation(
  spacetime: SessionConnection,
): ConnectionStatusPresentation {
  if (spacetime.status === 'connected') {
    return { label: 'Database connected', tone: 'success' };
  }
  if (spacetime.status === 'failed') {
    return { label: 'Database offline', tone: 'error' };
  }
  return { label: 'Connecting…', tone: 'info' };
}

export function isSignedIn(
  snapshot: Pick<SessionSnapshot, 'currentUser' | 'status'>,
): boolean {
  return snapshot.status === 'signedIn' && snapshot.currentUser !== null;
}

export function signedOutSnapshot(
  errorMessage: string | null = null,
): SessionSnapshot {
  return {
    currentUser: null,
    errorMessage,
    status: 'signedOut',
  };
}

export function signedInSnapshot(user: AuthUser): SessionSnapshot {
  return {
    currentUser: user,
    errorMessage: null,
    status: 'signedIn',
  };
}

function requireConnection(
  spacetime: SessionConnection,
): asserts spacetime is SessionConnection & { connection: DbConnection } {
  if (!isConnectionReady(spacetime)) {
    throw new Error(CONNECTION_WAIT_MESSAGE);
  }
}

export async function restoreSession(
  spacetime: SessionConnection,
): Promise<Pick<SessionSnapshot, 'currentUser' | 'status'>> {
  const storedUser = await loadAuthUser();
  const { connection, status } = spacetime;

  if (!storedUser || !connection || status !== 'connected') {
    return signedOutSnapshot();
  }

  const serverUser = readCurrentSessionUser(connection);
  if (
    !serverUser ||
    serverUser.username !== storedUser.username ||
    serverUser.role !== storedUser.role
  ) {
    await clearAuthSession();
    return signedOutSnapshot();
  }

  return {
    currentUser: serverUser,
    status: 'signedIn',
  };
}

export async function signInSession(
  spacetime: SessionConnection,
  username: string,
  password: string,
): Promise<AuthUser> {
  requireConnection(spacetime);

  if (!username.trim() || !password) {
    throw new Error('Enter a username and password.');
  }

  const nextUser = await login(spacetime.connection, username, password);
  await saveAuthUser(nextUser);
  return nextUser;
}

export async function signOutSession(
  spacetime: SessionConnection,
): Promise<void> {
  const { connection, status } = spacetime;
  if (connection && status === 'connected') {
    try {
      await logout(connection);
    } catch {
      // Best-effort server logout.
    }
  }

  await clearAuthSession();
}

export function validateRegisterInput(
  username: string,
  password: string,
  role: AppRole,
): string | null {
  if (username.trim().length < 3) {
    return 'Username must be at least 3 characters.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  if (role === 'admin') {
    return 'Admin accounts can only be created by an existing admin.';
  }
  return null;
}

export async function registerSession(
  spacetime: SessionConnection,
  username: string,
  password: string,
  role: AppRole,
): Promise<AuthUser> {
  requireConnection(spacetime);

  const trimmed = username.trim();
  const validationError = validateRegisterInput(trimmed, password, role);
  if (validationError) {
    throw new Error(validationError);
  }

  await registerAccount(spacetime.connection, trimmed, password, role);
  return signInSession(spacetime, trimmed, password);
}

export function sessionErrorMessage(error: unknown): string {
  return getErrorMessage(error);
}
