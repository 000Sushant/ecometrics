import { NewsArticle } from '../src/domain/entities/NewsArticle';

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({ generateContent: mockGenerateContent }));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

// Imported after the mock so the client picks up the mocked SDK.
import { GeminiClient } from '../src/infrastructure/services/GeminiClient';

const baseArticle: NewsArticle = {
  id: 'news-1',
  title: 'Coal plant expansion',
  description: 'A new coal plant comes online.',
  content: 'Detailed article body.',
  url: 'https://news.example/coal',
  publishedAt: '2026-06-12T00:00:00Z',
  sourceName: 'Example News',
};

const respondWith = (text: string) =>
  mockGenerateContent.mockResolvedValue({ response: { text: () => text } });

describe('GeminiClient', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it('throws when GEMINI_API_KEY is missing', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => new GeminiClient()).toThrow('GEMINI_API_KEY environment variable is not defined.');
  });

  it('returns a parsed full analysis result', async () => {
    respondWith(
      JSON.stringify({
        carbonIntensity: 90,
        co2EquivalentKg: 5000,
        glacierMeltMm: 2.5,
        forestImpactSqM: -1000,
        explanation: 'Burning coal releases carbon dioxide.',
        category: 'Energy',
        simplifiedTitle: 'New coal plant raises emissions',
        isGlobalEvent: true,
      })
    );

    const result = await new GeminiClient().analyzeArticle(baseArticle);

    expect(result.carbonIntensity).toBe(90);
    expect(result.category).toBe('Energy');
    expect(mockGetGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.5-flash' })
    );
  });

  it('returns a skip result for positive environmental news', async () => {
    respondWith(JSON.stringify({ skip: true }));

    const result = await new GeminiClient().analyzeArticle({ ...baseArticle, content: undefined });

    expect(result.skip).toBe(true);
  });

  it('throws a wrapped error when the response fails schema validation', async () => {
    // Missing required fields and not skipped -> Zod refine fails.
    respondWith(JSON.stringify({ carbonIntensity: 50 }));

    await expect(new GeminiClient().analyzeArticle(baseArticle)).rejects.toThrow(/Gemini Analysis Error/);
  });

  it('throws a wrapped error when the response is not valid JSON', async () => {
    respondWith('not-json');

    await expect(new GeminiClient().analyzeArticle(baseArticle)).rejects.toThrow(/Gemini Analysis Error/);
  });
});
