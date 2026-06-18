import { NewsArticle } from '../../domain/entities/NewsArticle';
import { EcoImpactCategory } from '../../domain/entities/ImpactReport';

export interface GeminiAnalysisResult {
  skip?: boolean;
  carbonIntensity?: number;
  co2EquivalentKg?: number;
  glacierMeltMm?: number;
  forestImpactSqM?: number;
  explanation?: string;
  category?: EcoImpactCategory;
  simplifiedTitle?: string;
  isGlobalEvent?: boolean;
}

export interface IGeminiClient {
  analyzeArticle(article: NewsArticle): Promise<GeminiAnalysisResult>;
}
