import { all, get, getDatabase } from '../storage/database.js';

function toStone(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: {
      label: row.price_label,
      source: row.price_source,
      disclosure: row.price_disclosure,
      min: row.price_min,
      max: row.price_max,
    },
    availability: row.availability,
    image: row.image,
  };
}

const stoneSelect = `
  SELECT id, name, category, price_label, price_source, price_disclosure,
         price_min, price_max, availability, image
  FROM catalog_stones
`;

export async function listStones() {
  const database = await getDatabase();
  const rows = await all(database, `${stoneSelect} ORDER BY sort_order, id`);
  return rows.map(toStone);
}

export async function getStoneById(id) {
  const database = await getDatabase();
  const row = await get(database, `${stoneSelect} WHERE id = ?`, [id]);
  return toStone(row);
}
