import { NewsArticle } from '../../domain/entities/NewsArticle';

export interface INewsClient {
  fetchClimateNews(query?: string): Promise<NewsArticle[]>;
}
