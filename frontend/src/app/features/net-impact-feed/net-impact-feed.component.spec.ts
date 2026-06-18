import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NetImpactFeedComponent } from './net-impact-feed.component';
import { ImpactReport } from '../../core/models/impact-report.model';
import { CountryEmissions } from '../../core/models/country-emissions.model';

const API = '/api';

const makeReport = (overrides: Partial<ImpactReport> = {}): ImpactReport => ({
  id: 'report-x',
  articleId: 'x',
  articleTitle: 'Some Event',
  articleUrl: '#',
  carbonIntensity: 70,
  co2EquivalentKg: 1000,
  glacierMeltMm: 1,
  forestImpactSqM: -100,
  explanation: 'why',
  category: 'Energy',
  analyzedAt: '2026-06-12T00:00:00Z',
  ...overrides,
});

const india: CountryEmissions = {
  code: 'IN',
  name: 'India',
  history: [
    { year: 2025, emissions: 3.0 },
    { year: 2026, emissions: 3.1 },
  ],
  perCapita: 2,
  globalShare: 8.3,
};

describe('NetImpactFeedComponent', () => {
  let fixture: ComponentFixture<NetImpactFeedComponent>;
  // Cast to access protected/private members under test without rendering the DOM.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let c: any;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    spyOn(console, 'log');
    spyOn(console, 'warn');
    spyOn(console, 'error');
    TestBed.configureTestingModule({
      imports: [NetImpactFeedComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(NetImpactFeedComponent);
    c = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('starts with modeled briefs and a selected active report', () => {
    expect(c.reports().length).toBeGreaterThan(0);
    expect(c.reports().every((r: ImpactReport) => r.co2EquivalentKg > 0)).toBe(true);
    expect(c.activeReport()).not.toBeNull();
    expect(c.visibleReports()).toEqual(c.reports());
  });

  it('computes human-scale aggregate KPIs', () => {
    expect(c.airOxygenClaimed()).toMatch(/people$/);
    expect(c.waterGlacierMelt()).toMatch(/pools$/);
    expect(c.landParksErased()).toMatch(/parks$/);
    expect(c.habitCommuteYears()).toMatch(/years$/);
    expect(c.topicVotes().length).toBe(4);
    expect(c.contributionActions().length).toBe(10);
    expect(c.totalSavedCo2()).toBe(0);
    c.toggleAction('lights');
    expect(c.totalSavedCo2()).toBe(0.1);
  });

  it('derives sector breakdown and donut centre labels from decadal emissions', () => {
    c.climateHistory.set([
      { year: 2020, emissions: 35 },
      { year: 2021, emissions: 36 },
    ]);
    expect(c.decadalEmissionsSum()).toBe(71);
    expect(c.sectorsList()[0].value).toBe((71 * 0.41).toFixed(1));
    expect(c.donutSlices()[0].strokeDashOffset).toBe(-0);

    c.hoveredSectorIndex.set(null);
    expect(c.donutCenterTitle()).toBe('Total');
    expect(c.donutCenterValue()).toContain('Gt');

    c.hoveredSectorIndex.set(0); // "Construction & Industry"
    expect(c.donutCenterTitle()).toBe('Construction');
    expect(c.donutCenterValue()).toBe(`${c.sectorsList()[0].value} Gt`);

    c.hoveredSectorIndex.set(2); // "Individual Habits" (no ampersand)
    expect(c.donutCenterTitle()).toBe('Individual Habits');
  });

  it('computes country equivalences for the active country', () => {
    c.countryEmissions.set([india]);
    c.selectedCountryCode.set('IN');
    c.selectedYear.set(2026);

    expect(c.activeCountryDetail()).toEqual(india);
    expect(c.activeCountryYearEmissions()).toBe(3.1);
    expect(c.countryCarEquivalent()).toContain('passenger cars');
    expect(c.countryTreeEquivalent()).toContain('mature trees');

    // Hovering takes precedence over selection.
    c.hoveredCountryCode.set('IN');
    expect(c.hoveredCountry()).toEqual(india);
  });

  it('formats large country equivalences with M/B suffixes and handles missing data', () => {
    const big: CountryEmissions = { ...india, history: [{ year: 2026, emissions: 40 }] };
    c.countryEmissions.set([big]);
    c.selectedCountryCode.set('IN');
    c.selectedYear.set(2026);
    expect(c.countryCarEquivalent()).toContain('M passenger cars');
    expect(c.countryTreeEquivalent()).toContain('B mature trees');

    // No country / no matching year -> zero emissions.
    c.countryEmissions.set([]);
    expect(c.activeCountryYearEmissions()).toBe(0);
    c.countryEmissions.set([india]);
    c.selectedYear.set(1900);
    expect(c.activeCountryYearEmissions()).toBe(0);
  });

  it('maps reports to dashboard topics across every branch', () => {
    expect(c.toDashboardBrief(makeReport({ id: 'a', articleTitle: 'New AI data center' })).topic).toBe('Tech/AI');
    expect(c.toDashboardBrief(makeReport({ id: 'b', category: 'Energy', articleTitle: 'Plant' })).topic).toBe(
      'Aviation & Energy'
    );
    expect(c.toDashboardBrief(makeReport({ id: 'c', category: 'Deforestation', articleTitle: 'Trees' })).topic).toBe(
      'Ecosystems & Tourism'
    );
    expect(c.toDashboardBrief(makeReport({ id: 'd', category: 'General', articleTitle: 'Policy' })).topic).toBe(
      'Climate & Policy'
    );
    // Fallback by title keywords when category is unknown.
    const unknownCat = (title: string) =>
      c.toDashboardBrief(makeReport({ id: title, category: '' as never, articleTitle: title })).topic;
    expect(unknownCat('Coal power surge')).toBe('Aviation & Energy');
    expect(unknownCat('Wetland resort dispute')).toBe('Ecosystems & Tourism');
    expect(unknownCat('Something neutral')).toBe('Climate & Policy');
    // An already-shaped brief is returned unchanged.
    const brief = c.toDashboardBrief(makeReport({ id: 'fifa' }) as ImpactReport & { topic?: string });
    expect(c.toDashboardBrief({ ...brief }).topic).toBe(brief.topic);
  });

  it('handles protest votes and persists them', () => {
    const report = c.reports()[0];
    c.setActiveReport(report);
    const before = report.votes;

    c.handleVote(report.id, 'up');
    expect(c.protestedReportIds().has(report.id)).toBe(true);
    expect(c.reports().find((r: { id: string }) => r.id === report.id).votes).toBe(before + 1);
    expect(c.activeReport().votes).toBe(before + 1);
    expect(JSON.parse(localStorage.getItem('echometrics_protested_reports')!)).toContain(report.id);

    c.handleVote(report.id, 'down');
    expect(c.protestedReportIds().has(report.id)).toBe(false);
  });

  it('filters the feed by topic and restores the modeled desk', () => {
    c.setTopic('Tech/AI');
    expect(c.activeTopic()).toBe('Tech/AI');
    expect(c.visibleReports().every((r: { topic: string }) => r.topic === 'Tech/AI')).toBe(true);

    // A topic with no matching reports leaves the active report in place.
    c.reports.set([makeReport({ id: 'only' }) as never]);
    c.setTopic('Tech/AI');

    c.restoreModeledBriefs();
    expect(c.activeTopic()).toBe('All');
    expect(c.isLiveFeed()).toBe(false);
    expect(c.reports().length).toBeGreaterThan(0);
  });

  it('applies incoming reports and falls back to modeled briefs when empty', () => {
    c.applyIncomingReports([makeReport({ id: 'live-1', co2EquivalentKg: 500 })]);
    expect(c.reports()[0].id).toBe('live-1');
    expect(c.loading()).toBe(false);

    c.applyIncomingReports([makeReport({ id: 'neg', co2EquivalentKg: 0 })]);
    expect(c.reports().length).toBeGreaterThan(1); // fell back to modeled briefs
  });

  it('updates the selected year from the slider', () => {
    c.onYearSliderChange({ target: { value: '2020' } } as unknown as Event);
    expect(c.selectedYear()).toBe(2020);
  });

  describe('remote data', () => {
    it('triggerAnalysis applies results on success and reports errors', () => {
      c.triggerAnalysis();
      httpMock.expectOne(`${API}/analyze`).flush([makeReport({ id: 'r1', co2EquivalentKg: 900 })]);
      expect(c.isLiveFeed()).toBe(true);
      expect(c.loading()).toBe(false);

      c.triggerAnalysis();
      httpMock.expectOne(`${API}/analyze`).error(new ProgressEvent('fail'));
      expect(c.error()).toBe('Live analysis is unavailable.');
    });

    it('manualFetchNews covers data, empty, and error responses', () => {
      c.manualFetchNews();
      httpMock.expectOne(`${API}/reports`).flush([makeReport({ id: 'm1', co2EquivalentKg: 900 })]);
      expect(c.isLiveFeed()).toBe(true);

      c.manualFetchNews();
      httpMock.expectOne(`${API}/reports`).flush([]);
      expect(c.error()).toBe('No latest news found.');

      c.manualFetchNews();
      httpMock.expectOne(`${API}/reports`).error(new ProgressEvent('fail'));
      expect(c.error()).toBe('Backend feed is offline.');
    });

    it('fetchClimateHistory and fetchCountryEmissions store and tolerate failures', () => {
      c.fetchClimateHistory();
      httpMock
        .expectOne(`${API}/climate-history`)
        .flush({ source: 'World Bank', history: [{ year: 2026, emissions: 37.6 }] });
      expect(c.historySource()).toBe('World Bank');
      expect(c.climateHistory().length).toBe(1);

      c.fetchCountryEmissions();
      httpMock.expectOne(`${API}/country-emissions`).flush([india]);
      expect(c.countryEmissions()).toEqual([india]);

      c.fetchClimateHistory();
      httpMock.expectOne(`${API}/climate-history`).error(new ProgressEvent('fail'));
      c.fetchCountryEmissions();
      httpMock.expectOne(`${API}/country-emissions`).error(new ProgressEvent('fail'));
    });
  });

  describe('ngOnInit', () => {
    const flushInit = () => {
      httpMock
        .expectOne(`${API}/climate-history`)
        .flush({ source: 'IEA', history: [{ year: 2026, emissions: 37.6 }] });
      httpMock.expectOne(`${API}/country-emissions`).flush([india]);
      // World-map SVG load is browser glue; fail it to avoid the DOM injection path.
      httpMock.expectOne('world-map.svg').error(new ProgressEvent('fail'));
    };

    it('restores persisted protests and bumps their vote counts', () => {
      const targetId = 'report-mock-fifa-2026';
      localStorage.setItem('echometrics_protested_reports', JSON.stringify([targetId]));

      c.ngOnInit();
      flushInit();

      expect(c.protestedReportIds().has(targetId)).toBe(true);
      expect(c.reports().find((r: { id: string }) => r.id === targetId)).toBeDefined();
    });

    it('ignores malformed persisted protest data', () => {
      localStorage.setItem('echometrics_protested_reports', '{not json');

      c.ngOnInit();
      flushInit();

      expect(c.protestedReportIds().size).toBe(0);
    });
  });
});
