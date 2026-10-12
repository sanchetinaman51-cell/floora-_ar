import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import app from '../src/app.js';
import { createOperatorReviewAccess, isLoopbackAddress } from '../src/middleware/operatorReviewAccess.js';

const testToken = 'local-test-token-only-0123456789abcdef';
const previousToken = process.env.OPERATOR_REVIEW_TOKEN;
let server;
let baseUrl;

before(async () => {
  process.env.OPERATOR_REVIEW_TOKEN = testToken;
  server = app.listen(0, '127.0.0.1');
  await new Promise((done) => server.once('listening', done));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((done, reject) => {
    server.close((error) => (error ? reject(error) : done()));
  });
  if (previousToken === undefined) delete process.env.OPERATOR_REVIEW_TOKEN;
  else process.env.OPERATOR_REVIEW_TOKEN = previousToken;
});

const requestBody = {
  name: 'Operator Review Sample',
  email: 'private-review@example.test',
  phone: '+91 99999 11111',
  projectLocation: 'Jaipur sample site',
  notes: 'Private customer notes are stored, not returned in summaries.',
  stoneId: 'morchana-white',
  roomDimensions: { lengthFeet: 14, widthFeet: 9 },
};

test('loopback guard accepts localhost addresses and rejects remote peers', () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true);
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  assert.equal(isLoopbackAddress('203.0.113.9'), false);
  assert.equal(isLoopbackAddress(undefined), false);

  let advanced = false;
  let statusCode;
  const guard = createOperatorReviewAccess({
    getToken: () => testToken,
    getEnvironment: () => 'development',
    getRemoteAddress: () => '203.0.113.9',
  });
  guard({ get: () => testToken }, {
    status(code) { statusCode = code; return this; },
    json() {},
  }, () => { advanced = true; });
  assert.equal(statusCode, 403);
  assert.equal(advanced, false);
});

test('public quote reads are unavailable and operator reads require a valid token', async () => {
  const publicResponse = await fetch(`${baseUrl}/api/quotes`);
  assert.equal(publicResponse.status, 404);

  const missingToken = await fetch(`${baseUrl}/api/operator/quotes`);
  assert.equal(missingToken.status, 401);
  assert.deepEqual(await missingToken.json(), { error: 'A valid local operator token is required.' });

  const wrongToken = await fetch(`${baseUrl}/api/operator/quotes`, {
    headers: { 'x-operator-token': 'wrong-local-test-token-0123456789' },
  });
  assert.equal(wrongToken.status, 401);
});

test('authorized local operator sees quote summaries without contact details', async () => {
  const submitted = await fetch(`${baseUrl}/api/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const receipt = await submitted.json();
  assert.equal(submitted.status, 201);

  const response = await fetch(`${baseUrl}/api/operator/quotes`, {
    headers: { 'x-operator-token': testToken },
  });
  const requests = await response.json();
  const visible = requests.find((request) => request.id === receipt.id);

  assert.equal(response.status, 200);
  assert.ok(visible);
  assert.equal(visible.customerName, 'Operator Review Sample');
  assert.equal(visible.stone.name, 'Morchana White');
  assert.equal(visible.projectLocation, 'Jaipur sample site');
  assert.deepEqual(visible.roomDimensions, { lengthFeet: 14, widthFeet: 9 });
  assert.ok(visible.createdAt);
  assert.equal('email' in visible, false);
  assert.equal('phone' in visible, false);
  assert.equal('customer' in visible, false);
  assert.equal(JSON.stringify(requests).includes('private-review@example.test'), false);
  assert.equal(JSON.stringify(requests).includes('+91 99999 11111'), false);
});

test('operator reviews stay disabled in production and when no token is configured', async () => {
  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const productionResponse = await fetch(`${baseUrl}/api/operator/quotes`, {
      headers: { 'x-operator-token': testToken },
    });
    assert.equal(productionResponse.status, 404);
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }

  const configuredToken = process.env.OPERATOR_REVIEW_TOKEN;
  process.env.OPERATOR_REVIEW_TOKEN = '';
  try {
    const response = await fetch(`${baseUrl}/api/operator/quotes`, {
      headers: { 'x-operator-token': testToken },
    });
    assert.equal(response.status, 503);
  } finally {
    process.env.OPERATOR_REVIEW_TOKEN = configuredToken;
  }
});
