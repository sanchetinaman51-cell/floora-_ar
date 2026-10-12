import assert from 'node:assert/strict';
import express from 'express';
import test, { after, before } from 'node:test';
import app from '../src/app.js';
import { createHealthHandler } from '../src/services/healthCheck.js';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((done) => server.once('listening', done));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((done, reject) => server.close((error) => (error ? reject(error) : done())));
});

test('GET /api/health returns machine-readable readiness without operator authentication', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(Object.keys(body).sort(), ['checks', 'status', 'timestamp']);
  assert.equal(body.status, 'healthy');
  assert.ok(Number.isFinite(Date.parse(body.timestamp)));
  assert.deepEqual(body.checks, { catalog: 'ok', quotations: 'ok', activity: 'ok' });
  assert.equal(JSON.stringify(body).includes('email'), false);
  assert.equal(JSON.stringify(body).includes('OPERATOR_REVIEW_TOKEN'), false);
});

test('health endpoint returns 503 when a required repository dependency is unhealthy', async () => {
  const healthApp = express();
  healthApp.get('/api/health', createHealthHandler({
    checks: {
      catalog: () => true,
      quotations: () => { throw new Error('private error detail'); },
      activity: () => true,
    },
    now: () => new Date('2026-10-12T04:00:00.000Z'),
  }));
  const unhealthyServer = healthApp.listen(0, '127.0.0.1');
  await new Promise((done) => unhealthyServer.once('listening', done));

  try {
    const response = await fetch(`http://127.0.0.1:${unhealthyServer.address().port}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.deepEqual(body, {
      status: 'unhealthy',
      timestamp: '2026-10-12T04:00:00.000Z',
      checks: { catalog: 'ok', quotations: 'unavailable', activity: 'ok' },
    });
    assert.equal(JSON.stringify(body).includes('private error detail'), false);
  } finally {
    await new Promise((done, reject) => unhealthyServer.close((error) => (error ? reject(error) : done())));
  }
});
