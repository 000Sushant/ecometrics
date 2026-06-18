import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ImpactService } from './impact.service';
import { ImpactReport } from '../models/impact-report.model';

const API = '/api';

describe('ImpactService', () => {
  let service: ImpactService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ImpactService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ImpactService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches reports via GET /reports', () => {
    const reports = [{ id: 'r1' }] as ImpactReport[];
    service.getReports().subscribe((res) => expect(res).toEqual(reports));

    const req = httpMock.expectOne(`${API}/reports`);
    expect(req.request.method).toBe('GET');
    req.flush(reports);
  });

  it('analyzes news with a query payload', () => {
    service.analyzeNews('coal').subscribe();
    const req = httpMock.expectOne(`${API}/analyze`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ q: 'coal' });
    req.flush([]);
  });

  it('analyzes news with an empty payload when no query is given', () => {
    service.analyzeNews().subscribe();
    const req = httpMock.expectOne(`${API}/analyze`);
    expect(req.request.body).toEqual({});
    req.flush([]);
  });

  it('fetches climate history via GET /climate-history', () => {
    const payload = { source: 'World Bank', history: [{ year: 2026, emissions: 37.6 }] };
    service.getClimateHistory().subscribe((res) => expect(res).toEqual(payload));

    const req = httpMock.expectOne(`${API}/climate-history`);
    expect(req.request.method).toBe('GET');
    req.flush(payload);
  });

  it('fetches country emissions via GET /country-emissions', () => {
    service.getCountryEmissions().subscribe((res) => expect(res).toEqual([]));
    const req = httpMock.expectOne(`${API}/country-emissions`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
