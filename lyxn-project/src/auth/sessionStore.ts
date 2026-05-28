import type { AuthUser } from './types';

const STDB_TOKEN_KEY = 'stdb_token';
const AUTH_USER_KEY = 'auth_user';

type StorageModule = {
  getItem: (key: string, callback: (value: string) => void) => void;
  setItem: (key: string, value: string, callback: (result: string) => void) => void;
  removeItem: (key: string, callback: (result: string) => void) => void;
};

const memoryStore = new Map<string, string>();

function getStorageModule(): StorageModule | null {
  if (typeof NativeModules === 'undefined') {
    return null;
  }
  return NativeModules.StorageModule ?? null;
}

function getItem(key: string): Promise<string> {
  const storage = getStorageModule();
  if (!storage) {
    return Promise.resolve(memoryStore.get(key) ?? '');
  }

  return new Promise((resolve) => {
    storage.getItem(key, (value) => {
      resolve(value ?? '');
    });
  });
}

function setItem(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);
  const storage = getStorageModule();
  if (!storage) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    storage.setItem(key, value, () => {
      resolve();
    });
  });
}

function removeItem(key: string): Promise<void> {
  memoryStore.delete(key);
  const storage = getStorageModule();
  if (!storage) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    storage.removeItem(key, () => {
      resolve();
    });
  });
}

export async function loadStdbToken(): Promise<string> {
  return getItem(STDB_TOKEN_KEY);
}

export async function saveStdbToken(token: string): Promise<void> {
  await setItem(STDB_TOKEN_KEY, token);
}

export async function clearStdbToken(): Promise<void> {
  await removeItem(STDB_TOKEN_KEY);
}

export async function loadAuthUser(): Promise<AuthUser | null> {
  const raw = await getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.username || !parsed?.role) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveAuthUser(user: AuthUser): Promise<void> {
  await setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export async function clearAuthUser(): Promise<void> {
  await removeItem(AUTH_USER_KEY);
}

export async function clearAuthSession(): Promise<void> {
  await Promise.all([clearStdbToken(), clearAuthUser()]);
}
