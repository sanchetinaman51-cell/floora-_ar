import { all, get, getDatabase, run } from '../storage/database.js';

export function createActivityRepository({ database = getDatabase, now = () => new Date() } = {}) {
  async function add(entry) {
    const timestamp = now().toISOString();
    const db = await database();
    await run(db, `
      INSERT INTO activity_events (type, request_id, stone_id, stone_name, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [entry.type, entry.requestId ?? null, entry.stone.id, entry.stone.name, timestamp]);

    return {
      type: entry.type,
      ...(entry.requestId ? { requestId: entry.requestId } : {}),
      timestamp,
      stone: { ...entry.stone },
    };
  }

  return {
    recordMaterialSelected(stone) {
      return add({
        type: 'material-selected',
        stone: { id: stone.id, name: stone.name },
      });
    },
    recordQuotationSubmitted(quote) {
      return add({
        type: 'quotation-submitted',
        requestId: quote.id,
        stone: { id: quote.stone.id, name: quote.stone.name },
      });
    },
    async listRecent() {
      const db = await database();
      const rows = await all(db, `
        SELECT type, request_id, stone_id, stone_name, timestamp
        FROM activity_events
        ORDER BY timestamp DESC, id DESC
      `);

      return rows.map((row) => ({
        type: row.type,
        ...(row.request_id ? { requestId: row.request_id } : {}),
        timestamp: row.timestamp,
        stone: { id: row.stone_id, name: row.stone_name },
      }));
    },
    async checkStorage() {
      const db = await database();
      const result = await get(db, 'SELECT COUNT(*) AS ready FROM activity_events');
      return Number.isInteger(result?.ready);
    },
  };
}

const activityRepository = createActivityRepository();

export default activityRepository;
