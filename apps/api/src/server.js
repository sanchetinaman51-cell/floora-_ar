import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
dotenv.config({ path: resolve(repositoryRoot, '.env') });

const { closeDatabase, initializeDatabase } = await import('./storage/database.js');
const port = Number(process.env.PORT || process.env.API_PORT || 3001);
await initializeDatabase();
const { default: app } = await import('./app.js');
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Floora AR API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close(async (error) => {
    await closeDatabase();
    if (error) {
      console.error('API shutdown failed.');
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
