import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ImpactReport } from '../models/impact-report.model';
import { CountryEmissions } from '../models/country-emissions.model';

@Injectable({
  providedIn: 'root',
})
export class ImpactService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';

  getReports(): Observable<ImpactReport[]> {
    return this.http.get<ImpactReport[]>(`${this.apiUrl}/reports`);
  }

  analyzeNews(query?: string): Observable<ImpactReport[]> {
    const payload = query ? { q: query } : {};
    return this.http.post<ImpactReport[]>(`${this.apiUrl}/analyze`, payload);
  }

  getClimateHistory(): Observable<{ source: string; history: { year: number; emissions: number }[] }> {
    return this.http.get<{ source: string; history: { year: number; emissions: number }[] }>(`${this.apiUrl}/climate-history`);
  }

  getCountryEmissions(): Observable<CountryEmissions[]> {
    return this.http.get<CountryEmissions[]>(`${this.apiUrl}/country-emissions`);
  }
}
