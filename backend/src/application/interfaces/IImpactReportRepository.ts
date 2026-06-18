import { ImpactReport } from '../../domain/entities/ImpactReport';

export interface IImpactReportRepository {
  saveReport(report: ImpactReport): Promise<void>;
  getReports(limit?: number): Promise<ImpactReport[]>;
  getReportByArticleId(articleId: string): Promise<ImpactReport | null>;
}
