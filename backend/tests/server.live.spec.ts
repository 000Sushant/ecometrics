// Live mode with working (mocked) dependencies.
process.env.LIVE = 'true';

const mockGetReports = jest.fn();
const mockGetReportByArticleId = jest.fn();
const mockSaveReport = jest.fn();
const mockFetchClimateNews = jest.fn();
const mockAnalyzeArticle = jest.fn();

jest.mock('../src/infrastructure/database/FirestoreRepository', () => ({
  FirestoreRepository: jest.fn().mockImplementation(() => ({
    getReports: mockGetReports,
    getReportByArticleId: mockGetReportByArticleId,
    saveReport: mockSaveReport,
  })),
}));
jest.mock('../src/infrastructure/services/GeminiClient', () => ({
  GeminiClient: jest.fn().mockImplementation(() => ({ analyzeArticle: mockAnalyzeArticle })),
}));
jest.mock('../src/infrastructure/services/NewsClient', () => ({
  NewsClient: jest.fn().mockImplementation(() => ({ fetchClimateNews: mockFetchClimateNews })),
}));

import request from 'supertest';
import { app } from '../src/main/server';
import { ImpactReport } from '../src/domain/entities/ImpactReport';

const flush = () => new Promise((resolve) => setImmediate(resolve));

const buildReport = (id: string): ImpactReport => ({
  id,
  articleId: id,
  articleTitle: `Report ${id}`,
  articleUrl: 'https://eco.news/' + id,
  carbonIntensity: 80,
  co2EquivalentKg: 1000,
  glacierMeltMm: 1,
  forestImpactSqM: -100,
  explanation: 'High emissions event.',
  category: 'Energy',
  analyzedAt: '2026-06-12T00:00:00Z',
  isGlobalEvent: true,
});

describe('Server API (live mode)', () => {
  let fetchMock: jest.Mock;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => jest.restoreAllMocks());

  beforeEach(() => {
    mockGetReports.mockReset();
    mockGetReportByArticleId.mockReset().mockResolvedValue(null);
    mockSaveReport.mockReset().mockResolvedValue(undefined);
    mockFetchClimateNews.mockReset().mockResolvedValue([]);
    mockAnalyzeArticle.mockReset();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('GET /api/reports', () => {
    it('returns stored reports without auto-populating when 15+ exist', async () => {
      mockGetReports.mockResolvedValue(Array.from({ length: 15 }, (_, i) => buildReport(`r${i}`)));

      const res = await request(app).get('/api/reports');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(15);
      expect(mockFetchClimateNews).not.toHaveBeenCalled();
    });

    it('auto-populates in the background when fewer than 15 exist', async () => {
      mockGetReports.mockResolvedValue([buildReport('r1')]);

      const res = await request(app).get('/api/reports');
      await flush();

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(mockFetchClimateNews).toHaveBeenCalled();
    });

    it('logs but recovers when background auto-population fails', async () => {
      mockGetReports.mockResolvedValue([buildReport('r1')]);
      mockFetchClimateNews.mockRejectedValueOnce(new Error('news down'));

      const res = await request(app).get('/api/reports');
      await flush();

      expect(res.status).toBe(200);
      expect(mockFetchClimateNews).toHaveBeenCalled();
    });

    it('does not start a second population while one is already running', async () => {
      mockGetReports.mockResolvedValue([buildReport('r1')]);
      mockFetchClimateNews.mockReturnValue(new Promise(() => undefined)); // never resolves

      const first = await request(app).get('/api/reports');
      const second = await request(app).get('/api/reports');

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(mockFetchClimateNews).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/analyze', () => {
    it('returns analyzed reports on success', async () => {
      mockFetchClimateNews.mockResolvedValue([]);

      const res = await request(app).post('/api/analyze').send({ q: 'climate' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('forwards use-case errors to the error handler', async () => {
      mockFetchClimateNews.mockRejectedValue(new Error('news fetch failed'));

      const res = await request(app).post('/api/analyze').send({ q: 'climate' });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'An internal server error occurred.' });
    });
  });

  describe('GET /api/climate-history', () => {
    const worldBankJson = [{ page: 1 }, [{ date: '2017', value: '35800000' }]];

    it('returns live World Bank data when the fetch succeeds', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => worldBankJson });

      const res = await request(app).get('/api/climate-history');

      expect(res.status).toBe(200);
      expect(res.body.source).toContain('World Bank');
      expect(res.body.history.length).toBeGreaterThan(0);
    });

    it('falls back to static data when the response cannot be parsed', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ unexpected: true }) });

      const res = await request(app).get('/api/climate-history');

      expect(res.status).toBe(200);
      expect(res.body.source).toBe('Global Carbon Project & IEA');
    });

    it('falls back to static data when the response is not ok', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      const res = await request(app).get('/api/climate-history');

      expect(res.status).toBe(200);
      expect(res.body.source).toBe('Global Carbon Project & IEA');
    });

    it('falls back to static data when the fetch throws', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const res = await request(app).get('/api/climate-history');

      expect(res.status).toBe(200);
      expect(res.body.source).toBe('Global Carbon Project & IEA');
    });
  });
});
