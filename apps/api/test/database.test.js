import assert from 'node:assert/strict';
import { copyFile, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sqlite3 from 'sqlite3';
import test from 'node:test';
import { all, createDatabase, get, run } from '../src/storage/database.js';

async function openLegacyDatabase(path) {
  const database = await new Promise((resolveDatabase, reject) => {
    const connection = new sqlite3.Database(path, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (error) => {
      if (error) reject(error);
      else resolveDatabase(connection);
    });
  });
  await new Promise((resolveExec, reject) => {
    database.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE quotation_requests (
        id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        project_location TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        stone_id TEXT NOT NULL,
        stone_name TEXT NOT NULL,
        room_length_feet REAL,
        room_width_feet REAL
      );
      CREATE TABLE activity_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        request_id TEXT REFERENCES quotation_requests(id),
        stone_id TEXT NOT NULL,
        stone_name TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
      CREATE INDEX activity_events_recent ON activity_events(timestamp DESC, id DESC);
      INSERT INTO quotation_requests VALUES (
        'legacy-quote', '2026-10-11T10:00:00.000Z', 'Legacy Customer', 'legacy@example.test',
        '+91 99999 00000', 'Jaipur', 'keep this request', 'morchana-white', 'Morchana White', 10, 12
      );
      INSERT INTO activity_events (type, request_id, stone_id, stone_name, timestamp)
      VALUES ('quotation-submitted', 'legacy-quote', 'morchana-white', 'Morchana White', '2026-10-11T10:00:00.000Z');
    `, (error) => (error ? reject(error) : resolveExec()));
  });
  await new Promise((done, reject) => database.close((error) => (error ? reject(error) : done())));
}

async function removeTempDirectory(path) {
  const resolvedPath = resolve(path);
  assert.ok(resolvedPath.startsWith(resolve(tmpdir())));
  await rm(resolvedPath, { recursive: true, force: true });
}

test('fresh initialization tracks versions and repeat initialization preserves catalog edits', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'floora-sqlite-fresh-'));
  const databasePath = join(temporaryRoot, 'fresh.sqlite3');
  const database = createDatabase({ databasePath });

  try {
    const connection = await database.initialize();
    assert.equal((await get(connection, 'PRAGMA user_version')).user_version, 2);
    const initialStones = await all(connection, 'SELECT * FROM catalog_stones ORDER BY sort_order, id');
    assert.equal(initialStones.length, 10);
    assert.ok(initialStones.every((stone) => stone.is_demo === 1));
    assert.equal(initialStones[0].id, 'morchana-white');

    await run(connection, "UPDATE catalog_stones SET name = 'Maintained Morchana', price_min = 75, price_max = 75 WHERE id = ?", ['morchana-white']);
    await run(connection, `
      INSERT INTO catalog_stones (
        id, name, category, price_label, price_source, price_disclosure,
        price_min, price_max, availability, image, is_demo
      ) VALUES ('user-stone', 'User Stone', 'Custom', '₹90 / sq. ft.', 'supplier', 'Maintained record', 90, 90, 'available', '/custom/user-stone.jpg', 0)
    `);
    await database.close();

    const reopened = await database.initialize();
    assert.equal((await get(reopened, 'PRAGMA user_version')).user_version, 2);
    const records = await all(reopened, 'SELECT * FROM catalog_stones ORDER BY sort_order, id');
    assert.equal(records.length, 11);
    assert.equal(records.find((stone) => stone.id === 'morchana-white').name, 'Maintained Morchana');
    assert.equal(records.find((stone) => stone.id === 'morchana-white').price_min, 75);
    assert.equal(records.find((stone) => stone.id === 'user-stone').is_demo, 0);
  } finally {
    await database.close();
    await removeTempDirectory(temporaryRoot);
  }
});

test('version-zero SQLite database upgrades transactionally while preserving quotation and activity rows', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'floora-sqlite-upgrade-'));
  const databasePath = join(temporaryRoot, 'legacy.sqlite3');
  const backupPath = join(temporaryRoot, 'before-upgrade.sqlite3');
  await openLegacyDatabase(databasePath);
  await copyFile(databasePath, backupPath);
  const database = createDatabase({ databasePath });

  try {
    const connection = await database.initialize();
    assert.equal((await get(connection, 'PRAGMA user_version')).user_version, 2);
    assert.equal((await get(connection, 'SELECT customer_name FROM quotation_requests WHERE id = ?', ['legacy-quote'])).customer_name, 'Legacy Customer');
    assert.equal((await get(connection, 'SELECT COUNT(*) AS count FROM activity_events WHERE request_id = ?', ['legacy-quote'])).count, 1);
    assert.equal((await get(connection, 'SELECT COUNT(*) AS count FROM catalog_stones')).count, 10);
    assert.ok((await stat(backupPath)).size > 0);

    await database.close();
    await copyFile(databasePath, join(temporaryRoot, 'after-upgrade.sqlite3'));
    await copyFile(backupPath, databasePath);
    const restored = await new Promise((resolveDatabase, reject) => {
      const connection = new sqlite3.Database(databasePath, sqlite3.OPEN_READWRITE, (error) => {
        if (error) reject(error);
        else resolveDatabase(connection);
      });
    });
    assert.equal((await get(restored, 'SELECT customer_name FROM quotation_requests WHERE id = ?', ['legacy-quote'])).customer_name, 'Legacy Customer');
    assert.equal((await get(restored, 'SELECT COUNT(*) AS count FROM activity_events WHERE request_id = ?', ['legacy-quote'])).count, 1);
    await new Promise((done, reject) => restored.close((error) => (error ? reject(error) : done())));
  } finally {
    await database.close();
    await removeTempDirectory(temporaryRoot);
  }
});

test('initialization rejects a database schema version newer than this API supports', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'floora-sqlite-future-'));
  const databasePath = join(temporaryRoot, 'future.sqlite3');
  const future = createDatabase({ databasePath });

  try {
    const connection = await future.initialize();
    await run(connection, 'PRAGMA user_version = 99');
    await future.close();
    const outdatedApi = createDatabase({ databasePath });
    await assert.rejects(outdatedApi.initialize(), /newer than this API supports/);
  } finally {
    await future.close().catch(() => {});
    await removeTempDirectory(temporaryRoot);
  }
});

test('failed schema migration rolls back its DDL and leaves the version unchanged', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'floora-sqlite-migration-rollback-'));
  const databasePath = join(temporaryRoot, 'rollback.sqlite3');
  const database = createDatabase({
    databasePath,
    migrationPlan: [{
      version: 1,
      async up(connection) {
        await run(connection, 'CREATE TABLE migration_probe (id INTEGER PRIMARY KEY)');
        throw new Error('fixture migration failure');
      },
    }],
  });

  try {
    await assert.rejects(database.initialize(), /fixture migration failure/);
    const inspection = await new Promise((resolveDatabase, reject) => {
      const connection = new sqlite3.Database(databasePath, sqlite3.OPEN_READWRITE, (error) => {
        if (error) reject(error);
        else resolveDatabase(connection);
      });
    });
    assert.equal((await get(inspection, 'PRAGMA user_version')).user_version, 0);
    assert.equal(await get(inspection, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'migration_probe'"), undefined);
    await new Promise((done, reject) => inspection.close((error) => (error ? reject(error) : done())));
  } finally {
    await removeTempDirectory(temporaryRoot);
  }
});

test('database initialization reports an unusable configured path', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'floora-sqlite-error-'));
  const blocker = join(temporaryRoot, 'not-a-directory');
  await writeFile(blocker, 'test fixture');
  const database = createDatabase({ databasePath: join(blocker, 'floora.sqlite3') });

  try {
    await assert.rejects(database.initialize());
  } finally {
    await removeTempDirectory(temporaryRoot);
  }
});
