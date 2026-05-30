import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  fileURLToPath(new URL('../../..', import.meta.url)),
);
const modulePath = path.join(repoRoot, 'spacetimedb-counter');

export type SpacetimeTestServer = {
  serverUrl: string;
  wsUrl: string;
  databaseName: string;
  stop: () => Promise<void>;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('Could not resolve a free TCP port.'));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function waitForServer(
  serverUrl: string,
  child: ChildProcessWithoutNullStreams,
  logPath: string,
): Promise<void> {
  const deadline = Date.now() + 30_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `SpacetimeDB exited before becoming ready with code ${child.exitCode}.`,
      );
    }

    try {
      const response = await fetch(`${serverUrl}/v1/ping`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(500);
  }

  let logTail = '';
  try {
    const logText = await readFile(logPath, 'utf8');
    logTail = `\n\nLast server log output:\n${logText.split('\n').slice(-80).join('\n')}`;
  } catch {
    logTail = '';
  }

  throw new Error(
    `SpacetimeDB did not become ready at ${serverUrl}: ${String(lastError)}${logTail}`,
  );
}

function runSpacetime(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('spacetime', args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `spacetime ${args.join(' ')} failed with exit code ${code}: ${stderr}`,
        ),
      );
    });
  });
}

export async function startSpacetimeTestServer(): Promise<SpacetimeTestServer> {
  const port = await findFreePort();
  const tempDir = await mkdtemp(path.join(tmpdir(), 'lynx-spacetimedb-sdk-'));
  const listenAddr = `127.0.0.1:${port}`;
  const serverUrl = `http://${listenAddr}`;
  const wsUrl = `ws://${listenAddr}`;
  const databaseName = `lynx-counter-query-sql-${process.pid}`;
  const logPath = path.join(tempDir, 'spacetimedb.log');

  const server = spawn(
    'spacetime',
    [
      'start',
      '--listen-addr',
      listenAddr,
      '--data-dir',
      path.join(tempDir, 'data'),
      '--in-memory',
      '--non-interactive',
    ],
    {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const logStream = createWriteStream(logPath, { flags: 'a' });
  server.stdout.on('data', (chunk) => logStream.write(chunk));
  server.stderr.on('data', (chunk) => logStream.write(chunk));
  server.on('exit', () => logStream.end());

  await waitForServer(serverUrl, server, logPath);

  await runSpacetime([
    'publish',
    databaseName,
    '--server',
    serverUrl,
    '--module-path',
    modulePath,
    '--anonymous',
    '--yes',
  ]);

  let stopped = false;

  return {
    serverUrl,
    wsUrl,
    databaseName,
    stop: async () => {
      if (stopped) {
        return;
      }
      stopped = true;

      if (!server.killed) {
        server.kill('SIGTERM');
      }
      await delay(250);
      if (!server.killed) {
        server.kill('SIGKILL');
      }
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}

export async function requestIdentity(
  serverUrl: string,
): Promise<{ identity: string; token: string }> {
  const response = await fetch(`${serverUrl}/v1/identity`, { method: 'POST' });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Expected identity creation to return 200, got ${response.status}: ${body}`,
    );
  }

  const parsed = JSON.parse(body) as { identity: string; token: string };
  return parsed;
}

export async function callReducer(
  serverUrl: string,
  databaseName: string,
  token: string,
  reducer: string,
  args: unknown[],
): Promise<void> {
  const response = await fetch(
    `${serverUrl}/v1/database/${databaseName}/call/${reducer}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(args),
    },
  );
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Expected ${reducer} to succeed, got ${response.status}: ${body}`,
    );
  }
}
