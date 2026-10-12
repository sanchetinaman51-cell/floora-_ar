import { mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import stoneCatalog from '../data/stoneCatalog.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const migrations = [
  {
    version: 1,
    async up(database) {
      await exec(database, `
        CREATE TABLE IF NOT EXISTS quotation_requests (
          id TEXT PRIMARY KEY NOT NULL,
          created_at TEXT NOT NULL,
          customer_name TEXT NOT NULL CHECK (length(trim(customer_name)) BETWEEN 2 AND 100),
          customer_email TEXT NOT NULL CHECK (length(customer_email) BETWEEN 3 AND 254),
          customer_phone TEXT NOT NULL CHECK (length(trim(customer_phone)) > 0),
          project_location TEXT NOT NULL CHECK (length(trim(project_location)) BETWEEN 2 AND 200),
          notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 1000),
          stone_id TEXT NOT NULL,
          stone_name TEXT NOT NULL,
          room_length_feet REAL,
          room_width_feet REAL,
          CHECK (
            (room_length_feet IS NULL AND room_width_feet IS NULL)
            OR (room_length_feet > 0 AND room_width_feet > 0)
          )
        );

        CREATE TABLE IF NOT EXISTS activity_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('material-selected', 'quotation-submitted')),
          request_id TEXT REFERENCES quotation_requests(id),
          stone_id TEXT NOT NULL,
          stone_name TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          CHECK (
            (type = 'material-selected' AND request_id IS NULL)
            OR (type = 'quotation-submitted' AND request_id IS NOT NULL)
          )
        );

        CREATE INDEX IF NOT EXISTS activity_events_recent
          ON activity_events(timestamp DESC, id DESC);
      `);
    },
  },
  {
    version: 2,
    async up(database) {
      await exec(database, `
        CREATE TABLE IF NOT EXISTS catalog_stones (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
          category TEXT NOT NULL CHECK (length(trim(category)) BETWEEN 1 AND 80),
          price_label TEXT NOT NULL,
          price_source TEXT NOT NULL CHECK (price_source IN ('supplier', 'estimate')),
          price_disclosure TEXT NOT NULL,
          price_min REAL NOT NULL CHECK (price_min > 0),
          price_max REAL CHECK (price_max IS NULL OR price_max >= price_min),
          availability TEXT NOT NULL CHECK (availability IN ('available', 'limited', 'unavailable')),
          image TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 1000,
          is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1))
        );
      `);
    },
  },
];

function resolvePath(configuredPath) {
  if (configuredPath === ':memory:') return configuredPath;
  if (!configuredPath) return resolve(repositoryRoot, '.data', 'floora.sqlite3');
  return isAbsolute(configuredPath) ? configuredPath : resolve(repositoryRoot, configuredPath);
}

function exec(database, sql) {
  return new Promise((resolveExec, reject) => {
    database.exec(sql, (error) => (error ? reject(error) : resolveExec()));
  });
}

export function run(database, sql, parameters = []) {
  return new Promise((resolveRun, reject) => {
    database.run(sql, parameters, function handleRun(error) {
      if (error) reject(error);
      else resolveRun({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function all(database, sql, parameters = []) {
  return new Promise((resolveAll, reject) => {
    database.all(sql, parameters, (error, rows) => (error ? reject(error) : resolveAll(rows)));
  });
}

export function get(database, sql, parameters = []) {
  return new Promise((resolveGet, reject) => {
    database.get(sql, parameters, (error, row) => (error ? reject(error) : resolveGet(row)));
  });
}

async function seedSampleCatalog(database) {
  for (const [index, stone] of stoneCatalog.entries()) {
    await run(database, `
      INSERT INTO catalog_stones (
        id, name, category, price_label, price_source, price_disclosure,
        price_min, price_max, availability, image, sort_order, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO NOTHING
    `, [
      stone.id,
      stone.name,
      stone.category,
      stone.price.label,
      stone.price.source,
      stone.price.disclosure,
      stone.price.min,
      stone.price.max,
      stone.availability,
      stone.image,
      index + 1,
    ]);
  }
}

async function migrate(database, migrationPlan = migrations) {
  const versionRow = await get(database, 'PRAGMA user_version');
  let currentVersion = Number(versionRow?.user_version ?? 0);
  const latestVersion = migrationPlan.at(-1)?.version ?? 0;

  if (currentVersion > latestVersion) {
    throw new Error(`Database schema version ${currentVersion} is newer than this API supports.`);
  }

  for (const migration of migrationPlan) {
    if (migration.version <= currentVersion) continue;

    await exec(database, 'BEGIN IMMEDIATE');
    try {
      await migration.up(database);
      await exec(database, `PRAGMA user_version = ${migration.version}`);
      await exec(database, 'COMMIT');
      currentVersion = migration.version;
    } catch (error) {
      await exec(database, 'ROLLBACK').catch(() => {});
      throw error;
    }
  }

  await exec(database, 'BEGIN IMMEDIATE');
  try {
    await seedSampleCatalog(database);
    await exec(database, 'COMMIT');
  } catch (error) {
    await exec(database, 'ROLLBACK').catch(() => {});
    throw error;
  }
}

export function createDatabase({
  databasePath = process.env.DATABASE_PATH,
  driver = sqlite3,
  migrationPlan = migrations,
} = {}) {
  const path = resolvePath(databasePath);
  let databasePromise;

  async function getDatabase() {
    if (!databasePromise) {
      databasePromise = (async () => {
        if (path !== ':memory:') await mkdir(dirname(path), { recursive: true });
        const database = await new Promise((resolveDatabase, reject) => {
          const connection = new driver.Database(path, driver.OPEN_READWRITE | driver.OPEN_CREATE, (error) => {
            if (error) reject(error);
            else resolveDatabase(connection);
          });
        });

        try {
          await exec(database, 'PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
          await migrate(database, migrationPlan);
          return database;
        } catch (error) {
          await new Promise((done) => database.close(() => done()));
          throw error;
        }
      })();
    }

    return databasePromise;
  }

  async function closeDatabase() {
    if (!databasePromise) return;
    const database = await databasePromise;
    await new Promise((resolveClose, reject) => {
      database.close((error) => (error ? reject(error) : resolveClose()));
    });
    databasePromise = undefined;
  }

  return { path, getDatabase, initialize: getDatabase, close: closeDatabase };
}

const defaultDatabase = createDatabase();

export const getDatabase = defaultDatabase.getDatabase;
export const initializeDatabase = defaultDatabase.initialize;
export const closeDatabase = defaultDatabase.close;
export const databasePath = defaultDatabase.path;

export default defaultDatabase;
