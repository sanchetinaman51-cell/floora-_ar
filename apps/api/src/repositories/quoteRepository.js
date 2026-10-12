import { randomUUID } from 'node:crypto';
import { all, get, getDatabase, run } from '../storage/database.js';

export function createQuoteRepository({ database = getDatabase, now = () => new Date() } = {}) {
  return {
    async createQuote(value) {
      const quote = {
        id: randomUUID(),
        createdAt: now().toISOString(),
        customer: {
          name: value.name,
          email: value.email,
          phone: value.phone,
          projectLocation: value.projectLocation,
          notes: value.notes,
        },
        stone: { id: value.stoneId, name: value.stoneName },
        ...(value.roomDimensions ? { roomDimensions: { ...value.roomDimensions } } : {}),
      };
      const db = await database();

      await run(db, `
        INSERT INTO quotation_requests (
          id, created_at, customer_name, customer_email, customer_phone,
          project_location, notes, stone_id, stone_name, room_length_feet, room_width_feet
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        quote.id,
        quote.createdAt,
        quote.customer.name,
        quote.customer.email,
        quote.customer.phone,
        quote.customer.projectLocation,
        quote.customer.notes,
        quote.stone.id,
        quote.stone.name,
        quote.roomDimensions?.lengthFeet ?? null,
        quote.roomDimensions?.widthFeet ?? null,
      ]);

      return copyQuote(quote);
    },

    async listQuotes() {
      const db = await database();
      const rows = await all(db, `
        SELECT id, created_at, customer_name, customer_email, customer_phone,
               project_location, notes, stone_id, stone_name, room_length_feet, room_width_feet
        FROM quotation_requests
        ORDER BY created_at ASC, id ASC
      `);

      return rows.map((row) => copyQuote({
        id: row.id,
        createdAt: row.created_at,
        customer: {
          name: row.customer_name,
          email: row.customer_email,
          phone: row.customer_phone,
          projectLocation: row.project_location,
          notes: row.notes,
        },
        stone: { id: row.stone_id, name: row.stone_name },
        ...(row.room_length_feet !== null && row.room_width_feet !== null ? {
          roomDimensions: {
            lengthFeet: row.room_length_feet,
            widthFeet: row.room_width_feet,
          },
        } : {}),
      }));
    },

    async checkStorage() {
      const db = await database();
      const result = await get(db, 'SELECT COUNT(*) AS ready FROM quotation_requests');
      return Number.isInteger(result?.ready);
    },
  };
}

function copyQuote(quote) {
  return {
    ...quote,
    customer: { ...quote.customer },
    stone: { ...quote.stone },
    ...(quote.roomDimensions ? { roomDimensions: { ...quote.roomDimensions } } : {}),
  };
}

const quoteRepository = createQuoteRepository();

export default quoteRepository;
