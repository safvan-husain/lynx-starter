type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';

declare global {
  var __hostFileLoggerInstalled: boolean | undefined;
}

function getDebugLogModule() {
  if (typeof NativeModules === 'undefined') {
    return null;
  }
  return NativeModules.DebugLogModule ?? null;
}

function stringifyArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack || arg.message;
  }

  if (typeof arg === 'string') {
    return arg;
  }

  if (
    typeof arg === 'number' ||
    typeof arg === 'boolean' ||
    typeof arg === 'bigint' ||
    typeof arg === 'symbol' ||
    arg == null
  ) {
    return String(arg);
  }

  try {
    return JSON.stringify(arg);
  } catch {
    return Object.prototype.toString.call(arg);
  }
}

export function writeHostLog(
  level: LogLevel,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  const logger = getDebugLogModule();
  if (!logger) {
    return;
  }

  try {
    logger.write(
      level,
      message,
      JSON.stringify({
        ...metadata,
        source: metadata.source ?? 'lynx',
      }),
    );
  } catch {
    // Logging must never break the app path being debugged.
  }
}

export function installHostFileLogger() {
  if (globalThis.__hostFileLoggerInstalled) {
    return;
  }

  const logger = getDebugLogModule();
  if (!logger) {
    return;
  }

  globalThis.__hostFileLoggerInstalled = true;

  const originalConsole = {
    debug: console.debug?.bind(console),
    info: console.info?.bind(console),
    log: console.log?.bind(console),
    warn: console.warn?.bind(console),
    error: console.error?.bind(console),
  };

  const patchConsole = (method: LogLevel) => {
    const original = originalConsole[method] ?? originalConsole.log;
    console[method] = (...args: unknown[]) => {
      original?.(...args);
      writeHostLog(method, args.map(stringifyArg).join(' '), {
        source: 'console',
        method,
      });
    };
  };

  patchConsole('debug');
  patchConsole('info');
  patchConsole('log');
  patchConsole('warn');
  patchConsole('error');

  writeHostLog('info', 'Host file logger installed', {
    source: 'hostFileLogger',
  });

  logger.getLogFilePath((path) => {
    writeHostLog('info', `Host file logger path: ${path}`, {
      source: 'hostFileLogger',
    });
  });
}
