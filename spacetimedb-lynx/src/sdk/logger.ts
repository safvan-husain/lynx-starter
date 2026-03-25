// import { stringify as ssStringify } from 'safe-stable-stringify';
import { u128ToHexString, u256ToHexString } from '../lib/util';
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

export const stringify = (value: unknown): string | undefined => {
    try {
        return JSON.stringify(value);
    } catch (e) {
        return "[Circular or Unstringifiable]";
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
