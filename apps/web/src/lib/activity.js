export function recordMaterialSelection(stoneId) {
  return fetch('/api/activity/selections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stoneId }),
  }).catch(() => undefined);
}
