import { useCallback, useEffect, useState } from '@lynx-js/react';
import type { UseSpacetimeConnectionReturn } from '../spacetimedb/useSpacetimeConnection';
import { getErrorMessage } from '../spacetimedb/errors';
import { login, logout, register as registerAccount } from './authApi';
import type { AppRole } from './types';
import {
  clearAuthSession,
  loadAuthUser,
  saveAuthUser,
} from './sessionStore';
import type { AuthStatus, AuthUser } from './types';

export interface UseAuthReturn {
  clearError: () => void;
  errorMessage: string | null;
  register: (
    username: string,
    password: string,
    role: AppRole,
  ) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  status: AuthStatus;
  user: AuthUser | null;
}

export function useAuth(spacetime: UseSpacetimeConnectionReturn): UseAuthReturn {
  const [status, setStatus] = useState<AuthStatus>('signedOut');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const storedUser = await loadAuthUser();
      if (cancelled || !storedUser) {
        return;
      }

      if (spacetime.status === 'connected' && spacetime.connection) {
        setUser(storedUser);
        setStatus('signedIn');
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, [spacetime.connection, spacetime.status]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      setErrorMessage(null);

      if (!spacetime.connection || spacetime.status !== 'connected') {
        setErrorMessage('Waiting for database connection. Try again in a moment.');
        return;
      }

      if (!username.trim() || !password) {
        setErrorMessage('Enter a username and password.');
        return;
      }

      setStatus('signingIn');

      try {
        const nextUser = await login(
          spacetime.connection,
          username,
          password,
        );
        await saveAuthUser(nextUser);
        setUser(nextUser);
        setStatus('signedIn');
        setErrorMessage(null);
      } catch (error) {
        setStatus('signedOut');
        setUser(null);
        setErrorMessage(getErrorMessage(error));
      }
    },
    [spacetime.connection, spacetime.status],
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const register = useCallback(
    async (username: string, password: string, role: AppRole) => {
      setErrorMessage(null);

      if (!spacetime.connection || spacetime.status !== 'connected') {
        setErrorMessage('Waiting for database connection. Try again in a moment.');
        return;
      }

      const trimmed = username.trim();
      if (trimmed.length < 3) {
        setErrorMessage('Username must be at least 3 characters.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (role === 'admin') {
        setErrorMessage('Admin accounts can only be created by an existing admin.');
        return;
      }

      setStatus('registering');

      try {
        await registerAccount(
          spacetime.connection,
          trimmed,
          password,
          role,
        );
        const nextUser = await login(
          spacetime.connection,
          trimmed,
          password,
        );
        await saveAuthUser(nextUser);
        setUser(nextUser);
        setStatus('signedIn');
        setErrorMessage(null);
      } catch (error) {
        setStatus('signedOut');
        setUser(null);
        setErrorMessage(getErrorMessage(error));
      }
    },
    [spacetime.connection, spacetime.status],
  );

  const signOut = useCallback(async () => {
    setErrorMessage(null);

    if (spacetime.connection && spacetime.status === 'connected') {
      try {
        await logout(spacetime.connection);
      } catch {
        // Best-effort server logout.
      }
    }

    await clearAuthSession();
    setUser(null);
    setStatus('signedOut');
  }, [spacetime.connection, spacetime.status]);

  return {
    clearError,
    errorMessage,
    register,
    signIn,
    signOut,
    status,
    user,
  };
}
