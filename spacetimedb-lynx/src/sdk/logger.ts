export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'trace';

const LogLevelIdentifierIcon = {
  component: '📦',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  debug: '🐛',
  trace: '🔍',
};

const LogStyle = {
  component:
    'color: #fff; background-color: #8D6FDD; padding: 2px 5px; border-radius: 3px;',
  info: 'color: #fff; background-color: #007bff; padding: 2px 5px; border-radius: 3px;',
  warn: 'color: #fff; background-color: #ffc107; padding: 2px 5px; border-radius: 3px;',
  error:
    'color: #fff; background-color: #dc3545; padding: 2px 5px; border-radius: 3px;',
  debug:
    'color: #fff; background-color: #28a745; padding: 2px 5px; border-radius: 3px;',
  trace:
    'color: #fff; background-color: #17a2b8; padding: 2px 5px; border-radius: 3px;',
};

const LogTextStyle = {
  component: 'color: #8D6FDD;',
  info: 'color: #007bff;',
  warn: 'color: #ffc107;',
  error: 'color: #dc3545;',
  debug: 'color: #28a745;',
  trace: 'color: #17a2b8;',
};

const LogLevelRank: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

let globalLogLevel: LogLevel = 'info';

export const setGlobalLogLevel = (level: LogLevel): void => {
  globalLogLevel = level;
};

export const getGlobalLogLevel = (): LogLevel => globalLogLevel;

const shouldLog = (level: LogLevel): boolean =>
  LogLevelRank[level] <= LogLevelRank[globalLogLevel];

// Lazy can be a function or the actual thing, so we can make verbose logs cheap when disabled.
type Lazy<T> = T | (() => T);
const resolveLazy = <T>(v: Lazy<T>): T =>
  typeof v === 'function' ? (v as () => T)() : v;

const TOKEN_KEYS = new Set([
  'token',
  'authToken',
  'authorization',
  'accessToken',
  'refreshToken',
]);

const MAX_ARRAY_ITEMS = 20;
const ARRAY_HEAD_ITEMS = 10;
const UINT8_HEAD_BYTES = 10;

const toHex = (bytes: Uint8Array): string =>
  `0x${Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')}`;

const hasHexWrapper = (value: Record<string, unknown>): string | undefined => {
  const identity = value.__identity__;
  if (typeof identity === 'string') return identity;

  const connectionId = value.__connection_id__;
  if (typeof connectionId === 'string') return connectionId;

  const uuid = value.__uuid__;
  if (typeof uuid === 'string') return uuid;

  return undefined;
};

const sanitizeForLog = (value: unknown, seen: WeakSet<object>): unknown => {
  if (value instanceof Uint8Array) {
    if (value.length <= MAX_ARRAY_ITEMS) return toHex(value);
    return `Uint8Array(len=${value.length}, head=${toHex(value.slice(0, UINT8_HEAD_BYTES))})`;
  }

  if (Array.isArray(value)) {
    if (value.length <= MAX_ARRAY_ITEMS) {
      return value.map(item => sanitizeForLog(item, seen));
    }
    return `Array(len=${value.length}, head=${JSON.stringify(
      value.slice(0, ARRAY_HEAD_ITEMS).map(item => sanitizeForLog(item, seen))
    )})`;
  }

  if (!value || typeof value !== 'object') return value;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  const record = value as Record<string, unknown>;
  const hexWrapper = hasHexWrapper(record);
  if (hexWrapper !== undefined) return hexWrapper;

  const entries = Object.keys(record)
    .sort()
    .map(key => [
      key,
      TOKEN_KEYS.has(key)
        ? '[REDACTED]'
        : sanitizeForLog(record[key], seen),
    ]);

  seen.delete(value);
  return Object.fromEntries(entries);
};

export const stringify = (value: unknown): string | undefined => {
  try {
    return JSON.stringify(sanitizeForLog(value, new WeakSet()));
  } catch (e) {
    return '[Circular or Unstringifiable]';
  }
};

export const stdbLogger = (
  level: LogLevel,
  message: Lazy<any>,
  ...args: Lazy<any>
): void => {
  if (!shouldLog(level)) {
    return;
  }
  const resolvedMessage = resolveLazy(message);
  const resolvedArgs = args.map(resolveLazy);
  console.log(
    `[STDB ${level.toUpperCase()}] ${resolvedMessage}`,
    ...resolvedArgs
  );
};
