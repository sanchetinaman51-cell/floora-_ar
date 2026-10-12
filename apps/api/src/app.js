import express from 'express';
import activityRepository from './repositories/activityRepository.js';
import operatorReviewAccess from './middleware/operatorReviewAccess.js';
import quoteRepository from './repositories/quoteRepository.js';
import healthCheck from './services/healthCheck.js';
import { getStoneById, listStones } from './repositories/stoneRepository.js';
import { validateQuoteRequest } from './services/quoteValidation.js';

const app = express();

app.use(express.json());

app.get('/api', (_request, response) => {
  response.json({
    name: 'Floora AR API',
    status: 'ready',
  });
});

app.get('/api/health', healthCheck);

app.get('/api/stones', async (_request, response) => {
  try {
    response.json(await listStones());
  } catch {
    response.status(503).json({ error: 'The stone catalog is temporarily unavailable.' });
  }
});

app.post('/api/quotes', async (request, response) => {
  const validation = await validateQuoteRequest(request.body);

  if (!validation.valid) {
    response.status(400).json({
      error: 'Please correct the highlighted fields and try again.',
      fields: validation.fields,
    });
    return;
  }

  try {
    const quote = await quoteRepository.createQuote(validation.value);
    await activityRepository.recordQuotationSubmitted(quote);
    response.status(201).json({
      id: quote.id,
      status: 'received',
      message: 'Your quotation request has been received.',
    });
  } catch {
    response.status(503).json({ error: 'Quotation requests are temporarily unavailable. Please try again.' });
  }
});

app.post('/api/activity/selections', async (request, response) => {
  const stoneId = typeof request.body?.stoneId === 'string' ? request.body.stoneId.trim() : '';
  const stone = await getStoneById(stoneId);

  if (!stone) {
    response.status(400).json({ error: 'Choose a stone from the catalog to record this selection.' });
    return;
  }

  try {
    const entry = await activityRepository.recordMaterialSelected(stone);
    response.status(201).json(entry);
  } catch {
    response.status(503).json({ error: 'Activity recording is temporarily unavailable. Please try again.' });
  }
});

app.get('/api/operator/quotes', operatorReviewAccess, async (_request, response) => {
  try {
    const quotes = (await quoteRepository.listQuotes()).reverse().map((quote) => ({
    id: quote.id,
    customerName: quote.customer.name,
    stone: quote.stone,
    projectLocation: quote.customer.projectLocation,
    roomDimensions: quote.roomDimensions ?? null,
    createdAt: quote.createdAt,
    }));

    response.json(quotes);
  } catch {
    response.status(503).json({ error: 'Quotation review is temporarily unavailable.' });
  }
});

app.get('/api/operator/activity', operatorReviewAccess, async (_request, response) => {
  try {
    response.json(await activityRepository.listRecent());
  } catch {
    response.status(503).json({ error: 'Activity review is temporarily unavailable.' });
  }
});

export default app;
