// Live mode with a failing dependency exercises the initialization fallback.
process.env.LIVE = 'true';
process.env.ALLOWED_ORIGINS = 'http://a.example,http://b.example';

jest.mock('../src/infrastructure/database/FirestoreRepository', () => ({
  FirestoreRepository: jest.fn().mockImplementation(() => {
    throw new Error('Firestore unavailable');
  }),
}));
jest.mock('../src/infrastructure/services/GeminiClient', () => ({
  GeminiClient: jest.fn(),
}));
jest.mock('../src/infrastructure/services/NewsClient', () => ({
  NewsClient: jest.fn(),
}));

import request from 'supertest';
import { app } from '../src/main/server';

describe('Server API (initialization failure)', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => jest.restoreAllMocks());

  it('POST /api/analyze returns 503 when the use case is not initialized', async () => {
    const res = await request(app).post('/api/analyze').send({ q: 'climate' });
    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /api/reports surfaces a 500 through the global error handler', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'An internal server error occurred.');
    expect(res.body).toHaveProperty('message', 'Firestore unavailable');
  });
});
