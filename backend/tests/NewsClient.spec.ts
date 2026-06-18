import { NewsClient } from '../src/infrastructure/services/NewsClient';

describe('NewsClient', () => {
  const originalKey = process.env.NEWS_API_KEY;
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env.NEWS_API_KEY = 'test-news-key';
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.NEWS_API_KEY = originalKey;
  });

  it('throws when NEWS_API_KEY is missing', () => {
    delete process.env.NEWS_API_KEY;
    expect(() => new NewsClient()).toThrow('NEWS_API_KEY environment variable is not defined.');
  });

  it('maps NewsAPI articles to domain entities and applies null fallbacks', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        articles: [
          {
            title: 'Coal expansion',
            description: 'A new coal plant opens.',
            content: 'Full content here',
            url: 'https://news.example/coal',
            publishedAt: '2026-06-12T00:00:00Z',
            source: { name: 'Example News' },
          },
          {
            title: null,
            description: null,
            content: null,
            url: 'https://news.example/other',
            publishedAt: '2026-06-12T01:00:00Z',
            source: { name: 'Example News' },
          },
        ],
      }),
    });

    const client = new NewsClient();
    const articles = await client.fetchClimateNews('coal');

    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      title: 'Coal expansion',
      description: 'A new coal plant opens.',
      content: 'Full content here',
      url: 'https://news.example/coal',
      sourceName: 'Example News',
    });
    // Null title/description/content fall back to defaults
    expect(articles[1].title).toBe('No Title');
    expect(articles[1].description).toBe('');
    expect(articles[1].content).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('q=coal'));
  });

  it('uses the default climate query when none is provided', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', articles: [] }),
    });

    await new NewsClient().fetchClimateNews();

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('climate%20change'));
  });

  it('throws when the HTTP response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests' });

    await expect(new NewsClient().fetchClimateNews()).rejects.toThrow(
      'News Fetching Error: NewsAPI returned HTTP 429: Too Many Requests'
    );
  });

  it('throws when the NewsAPI status is not ok', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'error', articles: [] }),
    });

    await expect(new NewsClient().fetchClimateNews()).rejects.toThrow(
      'News Fetching Error: NewsAPI status is not ok: error'
    );
  });
});
