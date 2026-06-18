export type EcoImpactCategory =
  | 'Energy'
  | 'Transport'
  | 'Industry'
  | 'Agriculture'
  | 'Deforestation'
  | 'General';

export interface ImpactReport {
  id: string;
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  carbonIntensity: number; // 0 to 100
  co2EquivalentKg: number;
  glacierMeltMm: number;
  forestImpactSqM: number;
  explanation: string;
  category: EcoImpactCategory;
  analyzedAt: string;
}
