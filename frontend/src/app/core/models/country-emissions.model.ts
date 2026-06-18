export interface CountryYearEmissions {
  year: number;
  emissions: number;
}

export interface CountryEmissions {
  code: string;
  name: string;
  history: CountryYearEmissions[];
  perCapita: number;
  globalShare: number;
}
