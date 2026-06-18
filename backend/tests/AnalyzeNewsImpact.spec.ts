jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return { ...actual, readFileSync: jest.fn((...args: unknown[]) => actual.readFileSync(...args)) };
});

import * as fs from 'fs';
import { AnalyzeNewsImpact } from '../src/application/use-cases/AnalyzeNewsImpact';
import { INewsClient } from '../src/application/interfaces/INewsClient';
import { IGeminiClient, GeminiAnalysisResult } from '../src/application/interfaces/IGeminiClient';
import { IImpactReportRepository } from '../src/application/interfaces/IImpactReportRepository';
import { NewsArticle } from '../src/domain/entities/NewsArticle';
import { ImpactReport } from '../src/domain/entities/ImpactReport';

const fullAnalysis: GeminiAnalysisResult = {
  carbonIntensity: 90,
  co2EquivalentKg: 5000,
  glacierMeltMm: 2.5,
  forestImpactSqM: -1000,
  explanation: 'Forest fire releases CO2 and reduces tree count.',
  category: 'Deforestation',
  simplifiedTitle: 'Forest Fires in Amazon',
  isGlobalEvent: true,
};

describe('AnalyzeNewsImpact Use Case', () => {
  let mockNewsClient: jest.Mocked<INewsClient>;
  let mockGeminiClient: jest.Mocked<IGeminiClient>;
  let mockReportRepository: jest.Mocked<IImpactReportRepository>;
  let useCase: AnalyzeNewsImpact;
  let originalLive: string | undefined;

  beforeAll(() => {
    originalLive = process.env.LIVE;
  });

  afterAll(() => {
    process.env.LIVE = originalLive;
  });

  const mockArticles: NewsArticle[] = [
    {
      id: 'news-1',
      title: 'Coal Plant Shutdown',
      description: 'A massive coal plant is shut down in favor of solar.',
      url: 'https://eco.news/coal-shut',
      publishedAt: '2026-06-12T00:00:00Z',
      sourceName: 'EcoNews',
    },
    {
      id: 'news-2',
      title: 'Forest Fires in Amazon',
      description: 'Uncontrolled fires burning acreage.',
      url: 'https://eco.news/amazon-burn',
      publishedAt: '2026-06-12T01:00:00Z',
      sourceName: 'EcoNews',
    },
  ];

  beforeEach(() => {
    process.env.LIVE = 'true';
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    mockNewsClient = {
      fetchClimateNews: jest.fn().mockResolvedValue(mockArticles),
    };
    mockGeminiClient = {
      analyzeArticle: jest.fn(),
    };
    mockReportRepository = {
      saveReport: jest.fn().mockResolvedValue(undefined),
      getReports: jest.fn(),
      getReportByArticleId: jest.fn(),
    };

    useCase = new AnalyzeNewsImpact(mockNewsClient, mockGeminiClient, mockReportRepository);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns cached reports and newly analyzed reports sorted by recency', async () => {
    const cachedReport: ImpactReport = {
      id: 'report-news-1',
      articleId: 'news-1',
      articleTitle: 'Coal Plant Shutdown',
      articleUrl: 'https://eco.news/coal-shut',
      carbonIntensity: 10,
      co2EquivalentKg: 8000,
      glacierMeltMm: 0.5,
      forestImpactSqM: -500,
      explanation: 'Cached analysis.',
      category: 'Energy',
      analyzedAt: '2026-06-12T02:00:00Z',
    };

    mockReportRepository.getReportByArticleId
      .mockResolvedValueOnce(cachedReport)
      .mockResolvedValueOnce(null);
    mockGeminiClient.analyzeArticle.mockResolvedValueOnce(fullAnalysis);

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(mockReportRepository.getReportByArticleId).toHaveBeenCalledTimes(2);
    expect(mockGeminiClient.analyzeArticle).toHaveBeenCalledTimes(1);
    expect(mockReportRepository.saveReport).toHaveBeenCalledTimes(1);
    expect(result[0].carbonIntensity).toBe(90); // newly analyzed (now) is newer than cached
    expect(result[1].carbonIntensity).toBe(10);
  });

  it('excludes cached reports flagged as non-global events', async () => {
    mockNewsClient.fetchClimateNews.mockResolvedValue([mockArticles[0]]);
    mockReportRepository.getReportByArticleId.mockResolvedValue({
      id: 'report-news-1',
      articleId: 'news-1',
      articleTitle: 'Coal Plant Shutdown',
      articleUrl: 'https://eco.news/coal-shut',
      carbonIntensity: 5,
      co2EquivalentKg: 100,
      glacierMeltMm: 0.1,
      forestImpactSqM: -10,
      explanation: 'Local-only event.',
      category: 'General',
      analyzedAt: '2026-06-12T02:00:00Z',
      isGlobalEvent: false,
    });

    const result = await useCase.execute();

    expect(result).toHaveLength(0);
    expect(mockGeminiClient.analyzeArticle).not.toHaveBeenCalled();
  });

  it('falls back to analysis when the cache lookup throws', async () => {
    mockNewsClient.fetchClimateNews.mockResolvedValue([mockArticles[1]]);
    mockReportRepository.getReportByArticleId.mockRejectedValue(new Error('cache down'));
    mockGeminiClient.analyzeArticle.mockResolvedValue(fullAnalysis);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0].carbonIntensity).toBe(90);
  });

  it('persists a skipped report and excludes it from the feed', async () => {
    mockNewsClient.fetchClimateNews.mockResolvedValue([mockArticles[0]]);
    mockReportRepository.getReportByArticleId.mockResolvedValue(null);
    mockGeminiClient.analyzeArticle.mockResolvedValue({ skip: true });

    const result = await useCase.execute();

    expect(result).toHaveLength(0);
    expect(mockReportRepository.saveReport).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'report-news-1', isGlobalEvent: false, co2EquivalentKg: 0 })
    );
  });

  it('treats a non-positive CO2 estimate as a skipped report', async () => {
    mockNewsClient.fetchClimateNews.mockResolvedValue([mockArticles[0]]);
    mockReportRepository.getReportByArticleId.mockResolvedValue(null);
    mockGeminiClient.analyzeArticle.mockResolvedValue({ ...fullAnalysis, co2EquivalentKg: 0 });

    const result = await useCase.execute();

    expect(result).toHaveLength(0);
    expect(mockReportRepository.saveReport).toHaveBeenCalledWith(
      expect.objectContaining({ explanation: 'Skipped: Not a carbon-emitting negative event.' })
    );
  });

  it('saves but hides a valid report that is not a global event', async () => {
    mockNewsClient.fetchClimateNews.mockResolvedValue([mockArticles[1]]);
    mockReportRepository.getReportByArticleId.mockResolvedValue(null);
    mockGeminiClient.analyzeArticle.mockResolvedValue({ ...fullAnalysis, isGlobalEvent: false });

    const result = await useCase.execute();

    expect(result).toHaveLength(0);
    expect(mockReportRepository.saveReport).toHaveBeenCalledWith(
      expect.objectContaining({ articleId: 'news-2', isGlobalEvent: false })
    );
  });

  it('continues processing other articles when Gemini analysis throws', async () => {
    mockReportRepository.getReportByArticleId.mockResolvedValue(null);
    mockGeminiClient.analyzeArticle
      .mockRejectedValueOnce(new Error('Gemini API Error'))
      .mockResolvedValueOnce(fullAnalysis);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0].carbonIntensity).toBe(90);
  });

  it('limits analysis to the latest 15 uncached articles', async () => {
    const manyArticles: NewsArticle[] = Array.from({ length: 20 }, (_, i) => ({
      id: `news-${i}`,
      title: `Article ${i}`,
      description: 'desc',
      url: `https://eco.news/${i}`,
      publishedAt: '2026-06-12T00:00:00Z',
      sourceName: 'EcoNews',
    }));
    mockNewsClient.fetchClimateNews.mockResolvedValue(manyArticles);
    mockReportRepository.getReportByArticleId.mockResolvedValue(null);
    mockGeminiClient.analyzeArticle.mockResolvedValue(fullAnalysis);

    const result = await useCase.execute();

    expect(mockGeminiClient.analyzeArticle).toHaveBeenCalledTimes(15);
    expect(result).toHaveLength(15);
  });

  describe('offline mode', () => {
    it('returns mock data sorted by recency from test-data.json when LIVE is not true', async () => {
      process.env.LIVE = 'false';
      const result = await useCase.execute();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toContain('report-mock');
      expect(mockNewsClient.fetchClimateNews).not.toHaveBeenCalled();
      expect(mockGeminiClient.analyzeArticle).not.toHaveBeenCalled();
      // Sorted descending by analyzedAt.
      for (let i = 1; i < result.length; i++) {
        expect(new Date(result[i - 1].analyzedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(result[i].analyzedAt).getTime()
        );
      }
    });

    it('returns an empty array when the offline data file cannot be read', async () => {
      process.env.LIVE = 'false';
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('file missing');
      });

      const result = await useCase.execute();

      expect(result).toEqual([]);
    });
  });
});
