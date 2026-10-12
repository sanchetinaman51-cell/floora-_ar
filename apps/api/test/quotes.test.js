import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import app from '../src/app.js';
import quoteRepository from '../src/repositories/quoteRepository.js';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((done) => server.once('listening', done));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((done, reject) => {
    server.close((error) => (error ? reject(error) : done()));
  });
});

const validRequest = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+91 98765 43210',
  projectLocation: 'Bengaluru, Indiranagar',
  notes: 'Kitchen floor, honed finish preferred.',
  stoneId: 'morchana-white',
  roomDimensions: { lengthFeet: 12, widthFeet: 10 },
};

async function submit(body) {
  return fetch(`${baseUrl}/api/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('POST /api/quotes stores a valid request and returns a non-sensitive receipt', async () => {
  const countBefore = (await quoteRepository.listQuotes()).length;
  const response = await submit(validRequest);
  const result = await response.json();
  const stored = (await quoteRepository.listQuotes()).at(-1);

  assert.equal(response.status, 201);
  assert.equal(result.status, 'received');
  assert.ok(result.id);
  assert.equal('email' in result, false);
  assert.equal('phone' in result, false);
  assert.equal((await quoteRepository.listQuotes()).length, countBefore + 1);
  assert.equal(stored.customer.name, 'Asha Rao');
  assert.equal(stored.customer.email, 'asha@example.com');
  assert.equal(stored.stone.id, 'morchana-white');
  assert.deepEqual(stored.roomDimensions, { lengthFeet: 12, widthFeet: 10 });
});

test('POST /api/quotes returns field-specific errors for missing and malformed values', async () => {
  const countBefore = (await quoteRepository.listQuotes()).length;
  const response = await submit({ ...validRequest, name: '', email: 'not-an-email', phone: '123', projectLocation: '' });
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.ok(result.fields.name);
  assert.ok(result.fields.email);
  assert.ok(result.fields.phone);
  assert.ok(result.fields.projectLocation);
  assert.equal((await quoteRepository.listQuotes()).length, countBefore);
});

test('POST /api/quotes rejects unknown and unavailable stones', async () => {
  for (const stoneId of ['not-a-stone', 'nero-marquina-black']) {
    const response = await submit({ ...validRequest, stoneId });
    const result = await response.json();

    assert.equal(response.status, 400);
    assert.ok(result.fields.stoneId);
  }
});

test('POST /api/quotes validates optional room dimensions as a positive pair', async () => {
  const response = await submit({
    ...validRequest,
    roomDimensions: { lengthFeet: 12, widthFeet: 0 },
  });
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.ok(result.fields.roomLengthFeet);
  assert.ok(result.fields.roomWidthFeet);
});
