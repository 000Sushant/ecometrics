import { NewsArticle } from '../../domain/entities/NewsArticle';
import { INewsClient } from '../../application/interfaces/INewsClient';
import { z } from 'zod';

const NewsApiArticleSchema = z.object({
  title: z.string().nullable().transform((val) => val ?? 'No Title'),
  description: z.string().nullable().transform((val) => val ?? ''),
  content: z.string().nullable().optional(),
  url: z.string(),
  publishedAt: z.string(),
  source: z.object({
    name: z.string(),
  }),
});

const NewsApiResponseSchema = z.object({
  status: z.string(),
  articles: z.array(NewsApiArticleSchema),
});

export class NewsClient implements INewsClient {
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';

  constructor() {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      throw new Error('NEWS_API_KEY environment variable is not defined.');
    }
    this.apiKey = apiKey;
  }

  async fetchClimateNews(query: string = 'climate change OR carbon emissions OR renewable energy'): Promise<NewsArticle[]> {
    const url = `${this.baseUrl}/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=35&apiKey=${this.apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NewsAPI returned HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const parsed = NewsApiResponseSchema.parse(json);

      if (parsed.status !== 'ok') {
        throw new Error(`NewsAPI status is not ok: ${parsed.status}`);
      }

      // Map NewsAPI articles to NewsArticle domain entities
      return parsed.articles.map((art, idx) => ({
        id: `news-${Buffer.from(art.url).toString('base64').substring(0, 16)}-${idx}`,
        title: art.title,
        description: art.description,
        content: art.content || undefined,
        url: art.url,
        publishedAt: art.publishedAt,
        sourceName: art.source.name,
      }));
    } catch (error) {
      console.error('Failed to fetch articles from NewsAPI:', error);
      throw new Error(`News Fetching Error: ${(error as Error).message}`);
    }
  }
}
