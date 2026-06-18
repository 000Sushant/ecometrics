import * as fs from 'fs';
import * as path from 'path';
import { INewsClient } from '../interfaces/INewsClient';
import { IGeminiClient, GeminiAnalysisResult } from '../interfaces/IGeminiClient';
import { IImpactReportRepository } from '../interfaces/IImpactReportRepository';
import { ImpactReport } from '../../domain/entities/ImpactReport';
import { NewsArticle } from '../../domain/entities/NewsArticle';

export class AnalyzeNewsImpact {
  constructor(
    private newsClient: INewsClient,
    private geminiClient: IGeminiClient,
    private reportRepository: IImpactReportRepository
  ) {}

  async execute(query?: string): Promise<ImpactReport[]> {
    // Return hardcoded mock data when LIVE is not true
    if (process.env.LIVE !== 'true') {
      try {
        const filePath = path.resolve(__dirname, '../../../test-data.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const reports = JSON.parse(fileContent) as ImpactReport[];
        return reports.sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime());
      } catch (error) {
        console.error('Failed to load offline mock data from test-data.json:', error);
        return [];
      }
    }

    // 1. Fetch climate-related articles
    const articles = await this.newsClient.fetchClimateNews(query);

    // 2. Process articles: resolve cached reports or generate new ones using Gemini
    const reports: ImpactReport[] = [];
    const uncachedArticles: NewsArticle[] = [];

    for (const article of articles) {
      try {
        const existingReport = await this.reportRepository.getReportByArticleId(article.id);
        if (existingReport) {
          if (existingReport.isGlobalEvent !== false) {
            reports.push(existingReport);
          }
        } else {
          uncachedArticles.push(article);
        }
      } catch (err) {
        console.error(`Failed to check cache for article "${article.title}":`, err);
        uncachedArticles.push(article); // fallback to analyzing if cache check failed
      }
    }

    // Limit to latest 15 new (uncached) articles to prevent overloading Gemini API rate limits
    const targetArticles = uncachedArticles.slice(0, 15);

    for (const article of targetArticles) {
      try {
        // Generate report via Gemini
        const analysis = await this.geminiClient.analyzeArticle(article);

        // Filter out articles that are skipped by Gemini or are not carbon-emitting
        if (analysis.skip || analysis.co2EquivalentKg === undefined || analysis.co2EquivalentKg <= 0) {
          // Save a skipped/empty report to cache so we know this article was already analyzed and rejected
          const skippedReport: ImpactReport = {
            id: `report-${article.id}`,
            articleId: article.id,
            articleTitle: article.title,
            articleUrl: article.url,
            carbonIntensity: 0,
            co2EquivalentKg: 0,
            glacierMeltMm: 0,
            forestImpactSqM: 0,
            explanation: 'Skipped: Not a carbon-emitting negative event.',
            category: 'General',
            analyzedAt: new Date().toISOString(),
            isGlobalEvent: false, // will filter out in queries
          };
          await this.reportRepository.saveReport(skippedReport);
          continue;
        }

        const validAnalysis = analysis as Required<GeminiAnalysisResult>;

        const newReport: ImpactReport = {
          id: `report-${article.id}`,
          articleId: article.id,
          articleTitle: validAnalysis.simplifiedTitle,
          articleUrl: article.url,
          carbonIntensity: validAnalysis.carbonIntensity,
          co2EquivalentKg: validAnalysis.co2EquivalentKg,
          glacierMeltMm: validAnalysis.glacierMeltMm,
          forestImpactSqM: validAnalysis.forestImpactSqM,
          explanation: validAnalysis.explanation,
          category: validAnalysis.category,
          analyzedAt: new Date().toISOString(),
          isGlobalEvent: validAnalysis.isGlobalEvent,
        };

        // Save report to Firestore DB
        await this.reportRepository.saveReport(newReport);

        if (newReport.isGlobalEvent !== false) {
          reports.push(newReport);
        }
      } catch (error) {
        console.error(`Skipping article analysis for "${article.title}" due to error:`, error);
        // We continue with other articles so that a single failure doesn't crash the whole feed fetch
      }
    }

    // Sort by analyzed timestamp descending
    return reports.sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime());
  }
}
