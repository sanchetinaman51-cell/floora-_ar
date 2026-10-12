import { timingSafeEqual } from 'node:crypto';

export function isLoopbackAddress(address) {
  if (typeof address !== 'string') return false;
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  return normalized === '::1' || normalized.startsWith('127.');
}

function tokensMatch(expectedToken, suppliedToken) {
  if (typeof expectedToken !== 'string' || typeof suppliedToken !== 'string') return false;
  const expected = Buffer.from(expectedToken, 'utf8');
  const supplied = Buffer.from(suppliedToken, 'utf8');
  return expected.length === supplied.length && expected.length > 0 && timingSafeEqual(expected, supplied);
}

export function createOperatorReviewAccess({
  getToken = () => process.env.OPERATOR_REVIEW_TOKEN,
  getEnvironment = () => process.env.NODE_ENV,
  getRemoteAddress = (request) => request.socket?.remoteAddress,
} = {}) {
  return function operatorReviewAccess(request, response, next) {
    if (getEnvironment() === 'production') {
      response.status(404).json({ error: 'Local operator review is not available in this environment.' });
      return;
    }

    if (!isLoopbackAddress(getRemoteAddress(request))) {
      response.status(403).json({ error: 'Operator review is available only to the local development instance.' });
      return;
    }

    const expectedToken = getToken();
    if (typeof expectedToken !== 'string' || expectedToken.trim().length < 32) {
      response.status(503).json({ error: 'Local operator review is not configured.' });
      return;
    }

    if (!tokensMatch(expectedToken, request.get('x-operator-token'))) {
      response.status(401).json({ error: 'A valid local operator token is required.' });
      return;
    }

    next();
  };
}

export default createOperatorReviewAccess();
