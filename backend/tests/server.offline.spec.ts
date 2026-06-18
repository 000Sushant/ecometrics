// Stub dotenv so a local .env cannot repopulate the vars we clear below; this keeps the
// default CORS-origin and default-port branches deterministic regardless of the environment.
jest.mock('dotenv', () => ({ config: jest.fn(), default: { config: jest.fn() } }));

// Offline mode must be selected before the server module initializes.
process.env.LIVE = 'false';
delete process.env.ALLOWED_ORIGINS; // exercise the default CORS origin (localhost) branch
delete process.env.PORT; // exercise the default-port branch
delete process.env.NEWS_API_KEY;
delete process.env.GEMINI_API_KEY;

import request from 'supertest';
import { app } from '../src/main/server';

describe('Server API (offline mock mode)', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterAll(() => jest.restoreAllMocks());

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/reports serves test-data.json', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toContain('report-mock');
  });

  it('POST /api/analyze returns mock data for a valid query', async () => {
    const res = await request(app).post('/api/analyze').send({ q: 'climate' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toContain('report-mock');
  });

  it('POST /api/analyze rejects an invalid query with 400', async () => {
    const res = await request(app).post('/api/analyze').send({ q: 'a' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid search query parameters');
  });

  it('GET /api/country-emissions returns the country dataset', async () => {
    const res = await request(app).get('/api/country-emissions');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ code: expect.any(String), name: expect.any(String) });
    expect(Array.isArray(res.body[0].history)).toBe(true);
  });

  it('GET /api/climate-history returns the static fallback series', async () => {
    const res = await request(app).get('/api/climate-history');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('Global Carbon Project & IEA');
    expect(res.body.history).toHaveLength(10);
  });
});
