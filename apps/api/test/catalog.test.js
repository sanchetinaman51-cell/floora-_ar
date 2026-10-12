import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import app from '../src/app.js';
import stoneCatalog from '../src/data/stoneCatalog.js';
import { getStoneById, listStones } from '../src/repositories/stoneRepository.js';

let server;
let baseUrl;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');

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

test('catalog repository contains ten sample records with local imagery', async () => {
  const stones = await listStones();

  assert.ok(stones.length >= 10);
  for (const stone of stones) {
    assert.ok(stone.id && stone.name && stone.category);
    assert.ok(stone.price?.label && stone.price?.source && stone.price?.disclosure);
    assert.ok(Number.isFinite(stone.price.min) && stone.price.min > 0);
    assert.ok(stone.price.max === null || (Number.isFinite(stone.price.max) && stone.price.max >= stone.price.min));
    assert.ok(['available', 'limited', 'unavailable'].includes(stone.availability));
    assert.ok(stone.image.startsWith('/images/stones/'));
    assert.ok(existsSync(resolve(repositoryRoot, 'apps/web/public', stone.image.slice(1))));
  }
});

test('Morchana White is identified as supplier-provided and other prices are estimates', async () => {
  const morchana = await getStoneById('morchana-white');
  const stones = await listStones();
  const estimatedStones = stones.filter((stone) => stone.id !== 'morchana-white');
  const priceLabels = Object.fromEntries(stones.map((stone) => [stone.name, stone.price.label]));

  assert.equal(morchana.price.label, '₹60 / sq. ft.');
  assert.equal(morchana.price.source, 'supplier');
  assert.ok(estimatedStones.every((stone) => stone.price.source === 'estimate'));
  assert.deepEqual(priceLabels, {
    'Morchana White': '₹60 / sq. ft.',
    'Makrana White': '₹80–350+ / sq. ft.',
    'Rajnagar White': '₹70–120 / sq. ft.',
    'Morwad White': '₹35–120 / sq. ft.',
    'Banswara White': '₹44–300 / sq. ft.',
    'Wonder White': '₹60–200 / sq. ft.',
    'Indian Statuario': '₹350–2,000+ / sq. ft.',
    'Carrara White': '₹180–2,000+ / sq. ft.',
    'Calacatta Gold': '₹400–6,000+ / sq. ft.',
    'Nero Marquina Black': '₹250–800+ / sq. ft.',
  });
});

test('GET /api/stones returns the catalog records', async () => {
  const response = await fetch(`${baseUrl}/api/stones`);
  const stones = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(stones.map((stone) => stone.id), stoneCatalog.map((stone) => stone.id));
});

test('repository returns copies rather than its mutable catalog records', async () => {
  const firstRead = await listStones();
  firstRead[0].price.label = 'changed';

  assert.equal((await listStones())[0].price.label, '₹60 / sq. ft.');
});
