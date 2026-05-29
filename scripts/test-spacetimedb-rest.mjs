#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import net from 'node:net';

const repoRoot = path.resolve(import.meta.dirname, '..');
const modulePath = path.join(repoRoot, 'spacetimedb-counter');
const dbName = `lynx-counter-rest-test-${process.pid}`;

const startedProcesses = new Set();
let tempDir;
let shuttingDown = false;

function log(message) {
  process.stdout.write(`[rest-test] ${message}\n`);
}

function fail(message) {
  throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findFreePort() {
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

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log(`+ ${[command, ...args].join(' ')}`);
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const suffix = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(`${command} ${args.join(' ')} failed with ${suffix}`));
    });
  });
}

function startSpacetime({ listenAddr, dataDir, logPath }) {
  log(
    `+ spacetime start --listen-addr ${listenAddr} --data-dir ${dataDir} --in-memory --non-interactive`,
  );

  const child = spawn(
    'spacetime',
    [
      'start',
      '--listen-addr',
      listenAddr,
      '--data-dir',
      dataDir,
      '--in-memory',
      '--non-interactive',
    ],
    {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  startedProcesses.add(child);

  const logStream = createWriteStream(logPath, { flags: 'a' });

  child.stdout.on('data', (chunk) => {
    logStream.write(chunk);
  });

  child.stderr.on('data', (chunk) => {
    logStream.write(chunk);
  });

  child.on('exit', (code, signal) => {
    startedProcesses.delete(child);
    logStream.end();

    if (shuttingDown) {
      return;
    }

    if (code !== null && code !== 0) {
      process.stderr.write(
        `[rest-test] spacetime server exited early with code ${code}; log path ${logPath}\n`,
      );
    }
    if (signal) {
      process.stderr.write(
        `[rest-test] spacetime server exited from signal ${signal}; log path ${logPath}\n`,
      );
    }
  });

  return child;
}

async function cleanup() {
  shuttingDown = true;

  for (const child of startedProcesses) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  await delay(250);

  for (const child of startedProcesses) {
    if (!child.killed) {
      child.kill('SIGKILL');
    }
  }

  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function waitForServer(serverUrl, child) {
  const deadline = Date.now() + 30_000;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      fail(`SpacetimeDB exited before becoming ready with code ${child.exitCode}.`);
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
    const logText = await readFile(path.join(tempDir, 'spacetimedb.log'), 'utf8');
    logTail = `\n\nLast server log output:\n${logText.split('\n').slice(-80).join('\n')}`;
  } catch {
    logTail = '';
  }

  fail(`SpacetimeDB did not become ready at ${serverUrl}: ${lastError}${logTail}`);
}

async function requestIdentity(serverUrl) {
  const response = await fetch(`${serverUrl}/v1/identity`, { method: 'POST' });
  const body = await response.text();

  assert.equal(
    response.status,
    200,
    `Expected identity creation to return 200, got ${response.status}: ${body}`,
  );

  const parsed = JSON.parse(body);
  assert.equal(typeof parsed.identity, 'string');
  assert.equal(typeof parsed.token, 'string');
  return parsed;
}

async function callReducer(serverUrl, token, reducer, args, expectedStatus = 200) {
  const headers = {
    'content-type': 'application/json',
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${serverUrl}/v1/database/${dbName}/call/${reducer}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(args),
    },
  );
  const body = await response.text();

  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${reducer} to return ${expectedStatus}, got ${response.status}: ${body}`,
  );

  return body;
}

async function expectReducerFailure(serverUrl, token, reducer, args, expectedText) {
  const body = await callReducer(serverUrl, token, reducer, args, 530);
  assert.match(
    body,
    expectedText,
    `Expected ${reducer} failure body to match ${expectedText}, got: ${body}`,
  );
  return body;
}

async function querySql(serverUrl, sql) {
  const response = await fetch(`${serverUrl}/v1/database/${dbName}/sql`, {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
    },
    body: sql,
  });
  const body = await response.text();

  assert.equal(
    response.status,
    200,
    `Expected SQL query to return 200, got ${response.status}: ${body}`,
  );

  return JSON.parse(body);
}

async function queryCounter(serverUrl) {
  const payload = await querySql(serverUrl, 'select * from counter');
  const row = payload?.[0]?.rows?.[0];
  assert.ok(Array.isArray(row), `Expected one counter row, got: ${JSON.stringify(payload)}`);
  return {
    id: row[0],
    count: row[1],
  };
}

async function main() {
  const port = await findFreePort();
  tempDir = await mkdtemp(path.join(tmpdir(), 'lynx-spacetimedb-rest-'));

  const listenAddr = `127.0.0.1:${port}`;
  const serverUrl = `http://${listenAddr}`;
  const logPath = path.join(tempDir, 'spacetimedb.log');

  const server = startSpacetime({
    listenAddr,
    dataDir: path.join(tempDir, 'data'),
    logPath,
  });

  await waitForServer(serverUrl, server);
  log(`SpacetimeDB ready at ${serverUrl}`);

  await run('spacetime', [
    'publish',
    dbName,
    '--server',
    serverUrl,
    '--module-path',
    modulePath,
    '--anonymous',
    '--yes',
  ]);

  const initialCounter = await queryCounter(serverUrl);
  assert.deepEqual(initialCounter, { id: 0, count: 0 });
  log('Initial counter is 0');

  await expectReducerFailure(
    serverUrl,
    null,
    'increment_counter',
    [],
    /Not signed in\./,
  );
  log('Anonymous increment is rejected');

  const admin = await requestIdentity(serverUrl);
  await callReducer(serverUrl, admin.token, 'login', ['admin', 'admin123']);
  await callReducer(serverUrl, admin.token, 'increment_counter', []);
  assert.deepEqual(await queryCounter(serverUrl), { id: 0, count: 1 });
  log('Admin increment moved counter to 1');

  await callReducer(serverUrl, admin.token, 'decrement_counter', []);
  assert.deepEqual(await queryCounter(serverUrl), { id: 0, count: 0 });
  log('Admin decrement moved counter back to 0');

  const student = await requestIdentity(serverUrl);
  await callReducer(serverUrl, student.token, 'login', ['student', 'student123']);
  await expectReducerFailure(
    serverUrl,
    student.token,
    'increment_counter',
    [],
    /You do not have permission to perform this action\./,
  );
  assert.deepEqual(await queryCounter(serverUrl), { id: 0, count: 0 });
  log('Student increment is rejected');

  const wrongPasswordLogin = await requestIdentity(serverUrl);
  await expectReducerFailure(
    serverUrl,
    wrongPasswordLogin.token,
    'login',
    ['admin', 'wrong-password'],
    /Password is incorrect\./,
  );
  log('Wrong password login is rejected');

  const unknownUserLogin = await requestIdentity(serverUrl);
  await expectReducerFailure(
    serverUrl,
    unknownUserLogin.token,
    'login',
    ['missing-user', 'wrong-password'],
    /Username does not exist\./,
  );
  log('Unknown username login is rejected');

  await callReducer(serverUrl, admin.token, 'increment_counter', []);
  assert.deepEqual(await queryCounter(serverUrl), { id: 0, count: 1 });
  await callReducer(serverUrl, admin.token, 'reset_counter', []);
  assert.deepEqual(await queryCounter(serverUrl), { id: 0, count: 0 });
  log('Admin reset counter works');

  log('All REST integration checks passed');
}

process.on('SIGINT', () => {
  cleanup()
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error}\n`);
    })
    .finally(() => process.exit(130));
});

process.on('SIGTERM', () => {
  cleanup()
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error}\n`);
    })
    .finally(() => process.exit(143));
});

try {
  await main();
} finally {
  await cleanup();
}
