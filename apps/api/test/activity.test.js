import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import app from '../src/app.js';
import { createActivityRepository } from '../src/repositories/activityRepository.js';
import { createQuoteRepository } from '../src/repositories/quoteRepository.js';
import { createDatabase } from '../src/storage/database.js';

const token = 'activity-test-token-only-0123456789abcdef';
const priorToken = process.env.OPERATOR_REVIEW_TOKEN;
let server;
let baseUrl;

before(async () => {
  process.env.OPERATOR_REVIEW_TOKEN = token;
  server = app.listen(0, '127.0.0.1');
  await new Promise((done) => server.once('listening', done));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((done, reject) => server.close((error) => (error ? reject(error) : done())));
  if (priorToken === undefined) delete process.env.OPERATOR_REVIEW_TOKEN;
  else process.env.OPERATOR_REVIEW_TOKEN = priorToken;
});

test('activity repository creates ISO timestamps and lists newest events first', async () => {
  let now = new Date('2026-10-11T10:00:00.000Z');
  const database = createDatabase({ databasePath: ':memory:' });
  const repository = createActivityRepository({ database: database.getDatabase, now: () => now });
  const quotes = createQuoteRepository({ database: database.getDatabase, now: () => now });
  const stone = { id: 'morchana-white', name: 'Morchana White' };

  await repository.recordMaterialSelected(stone);
  now = new Date('2026-10-11T10:05:00.000Z');
  const quote = await quotes.createQuote({
    name: 'Activity test', email: 'activity@example.test', phone: '+91 99999 00000',
    projectLocation: 'Jaipur', notes: '', stoneId: stone.id, stoneName: stone.name,
  });
  await repository.recordQuotationSubmitted(quote);

  const recent = await repository.listRecent();
  assert.deepEqual(recent.map((entry) => entry.type), ['quotation-submitted', 'material-selected']);
  assert.equal(recent[0].timestamp, '2026-10-11T10:05:00.000Z');
  assert.equal(recent[1].timestamp, '2026-10-11T10:00:00.000Z');
  assert.equal(recent[0].requestId, quote.id);
  assert.equal('sequence' in recent[0], false);
  await database.close();
});

test('material selection records only a catalog stone summary with a server timestamp', async () => {
  const response = await fetch(`${baseUrl}/api/activity/selections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stoneId: 'morchana-white',
      email: 'should-not-log@example.test',
      phone: '+91 88888 11111',
      notes: 'should not be logged',
      token: 'should not be logged',
    }),
  });
  const entry = await response.json();

  assert.equal(response.status, 201);
  assert.equal(entry.type, 'material-selected');
  assert.deepEqual(entry.stone, { id: 'morchana-white', name: 'Morchana White' });
  assert.ok(Number.isFinite(Date.parse(entry.timestamp)));
  assert.equal(JSON.stringify(entry).includes('should-not-log@example.test'), false);
  assert.equal(JSON.stringify(entry).includes('88888'), false);
  assert.equal(JSON.stringify(entry).includes('should not be logged'), false);
});

test('invalid material-selection event is rejected without adding activity', async () => {
  const before = await fetch(`${baseUrl}/api/operator/activity`, { headers: { 'x-operator-token': token } });
  const previous = await before.json();
  const response = await fetch(`${baseUrl}/api/activity/selections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stoneId: 'not-in-catalog', email: 'private@example.test' }),
  });

  assert.equal(response.status, 400);
  const afterResponse = await fetch(`${baseUrl}/api/operator/activity`, { headers: { 'x-operator-token': token } });
  assert.equal((await afterResponse.json()).length, previous.length);
});

test('operator activity is access-checked and contains no quotation contact details or notes', async () => {
  const denied = await fetch(`${baseUrl}/api/operator/activity`);
  assert.equal(denied.status, 401);

  const submitted = await fetch(`${baseUrl}/api/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Activity Sample Customer',
      email: 'private-activity@example.test',
      phone: '+91 77777 22222',
      projectLocation: 'Jaipur',
      notes: 'private renovation notes',
      stoneId: 'morchana-white',
    }),
  });
  const receipt = await submitted.json();
  assert.equal(submitted.status, 201);

  const response = await fetch(`${baseUrl}/api/operator/activity`, { headers: { 'x-operator-token': token } });
  const events = await response.json();
  const quoteEvent = events.find((event) => event.requestId === receipt.id);

  assert.equal(response.status, 200);
  assert.equal(quoteEvent.type, 'quotation-submitted');
  assert.equal(quoteEvent.stone.name, 'Morchana White');
  assert.ok(Number.isFinite(Date.parse(quoteEvent.timestamp)));
  assert.deepEqual(events, events.slice().sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)));
  const serialized = JSON.stringify(events);
  for (const privateValue of ['private-activity@example.test', '77777', 'private renovation notes']) {
    assert.equal(serialized.includes(privateValue), false);
  }
});
