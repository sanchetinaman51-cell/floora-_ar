export function filterStones(stones, { query = '', category = 'All stones' } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return stones.filter((stone) => {
    const matchesQuery = stone.name.toLocaleLowerCase().includes(normalizedQuery);
    const matchesCategory = category === 'All stones' || stone.category === category;

    return matchesQuery && matchesCategory;
  });
}
