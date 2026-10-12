import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import test from 'node:test';

const apiDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const token = 'restart-test-token-only-0123456789abcdef';

async function unusedPort() {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await new Promise((done) => listener.once('listening', done));
  const { port } = listener.address();
  await new Promise((done, reject) => listener.close((error) => (error ? reject(error) : done())));
  return port;
}

function startApi(port, databasePath) {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: apiDirectory,
    env: {
      ...process.env,
      API_PORT: String(port),
      DATABASE_PATH: databasePath,
      NODE_ENV: 'development',
      OPERATOR_REVIEW_TOKEN: token,
    },
    stdio: 'ignore',
  });

  return child;
}

async function waitUntilReady(child, baseUrl) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`API exited before becoming ready (code ${child.exitCode}).`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.status === 200) return;
    } catch {
      // The listener may not have bound yet.
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error('API did not become ready before the timeout.');
}

async function stopApi(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolveExit, reject) => {
    const timer = setTimeout(() => reject(new Error('API did not stop after SIGTERM.')), 10000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolveExit();
    });
  });
}

async function updateCatalogName(databasePath, name) {
  const database = await new Promise((resolveDatabase, reject) => {
    const connection = new sqlite3.Database(databasePath, sqlite3.OPEN_READWRITE, (error) => {
      if (error) reject(error);
      else resolveDatabase(connection);
    });
  });
  try {
    await new Promise((resolveUpdate, reject) => {
      database.run('UPDATE catalog_stones SET name = ? WHERE id = ?', [name, 'morchana-white'], function handleUpdate(error) {
        if (error) reject(error);
        else resolveUpdate(this.changes);
      });
    });
  } finally {
    await new Promise((done, reject) => database.close((error) => (error ? reject(error) : done())));
  }
}

test('quotes and activity persist across an actual API process restart', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'floora-sqlite-restart-'));
  const databasePath = join(temporaryRoot, 'persisted.sqlite3');
  const port = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child;

  try {
    child = startApi(port, databasePath);
    await waitUntilReady(child, baseUrl);
    const submitted = await fetch(`${baseUrl}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Restart Sample Customer',
        email: 'restart-private@example.test',
        phone: '+91 88888 12345',
        projectLocation: 'Udaipur test site',
        notes: 'Private restart test note',
        stoneId: 'morchana-white',
        roomDimensions: { lengthFeet: 12, widthFeet: 10 },
      }),
    });
    assert.equal(submitted.status, 201);
    const receipt = await submitted.json();

    const selected = await fetch(`${baseUrl}/api/activity/selections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stoneId: 'morchana-white' }),
    });
    assert.equal(selected.status, 201);
    await updateCatalogName(databasePath, 'Restart Maintained Stone');
    await stopApi(child);
    child = undefined;

    child = startApi(port, databasePath);
    await waitUntilReady(child, baseUrl);
    const headers = { 'x-operator-token': token };
    const [quotesResponse, activityResponse, healthResponse, stonesResponse] = await Promise.all([
      fetch(`${baseUrl}/api/operator/quotes`, { headers }),
      fetch(`${baseUrl}/api/operator/activity`, { headers }),
      fetch(`${baseUrl}/api/health`),
      fetch(`${baseUrl}/api/stones`),
    ]);

    assert.equal(healthResponse.status, 200);
    assert.equal(quotesResponse.status, 200);
    assert.equal(activityResponse.status, 200);
    assert.equal(stonesResponse.status, 200);
    const quotes = await quotesResponse.json();
    const activity = await activityResponse.json();
    const catalog = await stonesResponse.json();
    assert.ok(quotes.some((quote) => quote.id === receipt.id));
    assert.equal(quotes.find((quote) => quote.id === receipt.id).customerName, 'Restart Sample Customer');
    assert.ok(activity.some((event) => event.requestId === receipt.id && event.type === 'quotation-submitted'));
    assert.ok(activity.some((event) => event.type === 'material-selected'));
    assert.equal(catalog.find((stone) => stone.id === 'morchana-white').name, 'Restart Maintained Stone');
    assert.deepEqual(activity, activity.slice().sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)));
    const serializedActivity = JSON.stringify(activity);
    for (const privateValue of ['restart-private@example.test', '88888', 'Private restart test note']) {
      assert.equal(serializedActivity.includes(privateValue), false);
    }
  } finally {
    if (child) await stopApi(child);
    const resolvedTempRoot = resolve(temporaryRoot);
    assert.ok(resolvedTempRoot.startsWith(resolve(tmpdir())));
    await rm(resolvedTempRoot, { recursive: true, force: true });
  }
});
