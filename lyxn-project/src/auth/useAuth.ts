import { useCallback, useEffect, useState } from '@lynx-js/react';
import { useSpacetimeConnection } from '../spacetimedb/useSpacetimeConnection';
import {
  isSignedIn,
  registerSession,
  restoreSession,
  type SessionSnapshot,
  sessionErrorMessage,
  signedInSnapshot,
  signedOutSnapshot,
  signInSession,
  signOutSession,
} from './session';
import type { AppRole } from './types';

export type { SessionConnection, SessionSnapshot } from './session';
export {
  getConnectionStatusPresentation,
  isConnectionReady,
  isSignedIn,
} from './session';

export interface UseAuthReturn extends SessionSnapshot {
  clearError: () => void;
  register: (
    username: string,
    password: string,
    role: AppRole,
  ) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const spacetime = useSpacetimeConnection();
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(
    signedOutSnapshot(),
  );

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const restored = await restoreSession(spacetime);
      if (cancelled) {
        return;
      }

      if (restored.status === 'signedIn' && restored.currentUser) {
        setSnapshot(signedInSnapshot(restored.currentUser));
        return;
      }

      if (restored.status === 'signedOut') {
        setSnapshot((current) =>
          current.status === 'signedIn' ? signedOutSnapshot() : current,
        );
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, [spacetime.connection, spacetime.status]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      setSnapshot((current) => ({
        ...current,
        errorMessage: null,
        status: 'signingIn',
      }));

      try {
        const nextUser = await signInSession(spacetime, username, password);
        setSnapshot(signedInSnapshot(nextUser));
      } catch (error) {
        setSnapshot(signedOutSnapshot(sessionErrorMessage(error)));
      }
    },
    [spacetime.connection, spacetime.status],
  );

  const clearError = useCallback(() => {
    setSnapshot((current) => ({
      ...current,
      errorMessage: null,
    }));
  }, []);

  const register = useCallback(
    async (username: string, password: string, role: AppRole) => {
      setSnapshot((current) => ({
        ...current,
        errorMessage: null,
        status: 'registering',
      }));

      try {
        const nextUser = await registerSession(
          spacetime,
          username,
          password,
          role,
        );
        setSnapshot(signedInSnapshot(nextUser));
      } catch (error) {
        setSnapshot(signedOutSnapshot(sessionErrorMessage(error)));
      }
    },
    [spacetime.connection, spacetime.status],
  );

  const signOut = useCallback(async () => {
    setSnapshot((current) => ({
      ...current,
      errorMessage: null,
    }));

    await signOutSession(spacetime);
    setSnapshot(signedOutSnapshot());
  }, [spacetime.connection, spacetime.status]);

  return {
    clearError,
    currentUser: snapshot.currentUser,
    errorMessage: snapshot.errorMessage,
    register,
    signIn,
    signOut,
    status: snapshot.status,
  };
}
