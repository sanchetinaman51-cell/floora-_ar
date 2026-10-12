import activityRepository from '../repositories/activityRepository.js';
import quoteRepository from '../repositories/quoteRepository.js';
import { listStones } from '../repositories/stoneRepository.js';

const defaultChecks = {
  catalog: async () => Array.isArray(await listStones()),
  quotations: () => quoteRepository.checkStorage(),
  activity: () => activityRepository.checkStorage(),
};

export function createHealthHandler({ checks = defaultChecks, now = () => new Date() } = {}) {
  return async (_request, response) => {
    const results = Object.fromEntries(await Promise.all(Object.entries(checks).map(async ([name, check]) => {
      try {
        return [name, await check() === true ? 'ok' : 'unavailable'];
      } catch {
        return [name, 'unavailable'];
      }
    })));
    const healthy = Object.values(results).every((status) => status === 'ok');

    response.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: now().toISOString(),
      checks: results,
    });
  };
}

export default createHealthHandler();
