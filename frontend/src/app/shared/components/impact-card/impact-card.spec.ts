import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImpactCardComponent } from './impact-card.component';
import { ImpactReport } from '../../../core/models/impact-report.model';

const baseReport: ImpactReport = {
  id: 'report-news-1',
  articleId: 'news-1',
  articleTitle: 'Coal Plant Expansion',
  articleUrl: 'https://eco.news/coal',
  carbonIntensity: 50,
  co2EquivalentKg: 153000,
  glacierMeltMm: 2,
  forestImpactSqM: -1000,
  explanation: 'High-emission event.',
  category: 'Energy',
  analyzedAt: '2026-06-12T00:00:00Z',
};

describe('ImpactCardComponent', () => {
  let component: ImpactCardComponent;
  let fixture: ComponentFixture<ImpactCardComponent>;

  // Assign the input without change detection: the methods under test are pure.
  const setReport = (report: ImpactReport): void => {
    component.report = report;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ImpactCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(ImpactCardComponent);
    component = fixture.componentInstance;
  });

  it('creates and renders the article title', () => {
    component.report = baseReport;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.article-title')?.textContent).toContain('Coal Plant Expansion');
  });

  it('emits a vote event with the given direction', () => {
    setReport(baseReport);
    let emitted: 'up' | 'down' | undefined;
    component.vote.subscribe((dir) => (emitted = dir));
    component.onVote('up');
    expect(emitted).toBe('up');
  });

  it('reads the vote count from the report, defaulting to zero', () => {
    setReport(baseReport);
    expect(component.getVotes()).toBe(0);
    setReport({ ...baseReport, votes: 42 } as ImpactReport & { votes: number });
    expect(component.getVotes()).toBe(42);
  });

  it('computes human-scale equivalences', () => {
    setReport(baseReport);
    expect(component.getAirPeople()).toBe((10000).toLocaleString());
    expect(component.getWaterPools()).toBe(
      ((153000 * 3) / 2500000).toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })
    );
    expect(component.getLandParks()).toBe(
      (153000 / 36800).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    );
    expect(component.getHabitYears()).toBe(Math.round(153000 / 525.7).toLocaleString());
  });

  it('classifies the card border by carbon intensity', () => {
    setReport({ ...baseReport, carbonIntensity: 20 });
    expect(component.getCardClass()).toBe('border-green');
    setReport({ ...baseReport, carbonIntensity: 85 });
    expect(component.getCardClass()).toBe('border-red');
    setReport({ ...baseReport, carbonIntensity: 50 });
    expect(component.getCardClass()).toBe('');
  });

  it('emits "up" when the protest button is clicked and the card is not yet protested', () => {
    component.report = baseReport;
    component.hasProtested = false;
    fixture.detectChanges();
    let emitted: 'up' | 'down' | undefined;
    component.vote.subscribe((dir) => (emitted = dir));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.protest-btn')!.click();
    expect(emitted).toBe('up');
  });

  it('emits "down" when the protest button is clicked and the card is already protested', () => {
    component.report = baseReport;
    component.hasProtested = true;
    fixture.detectChanges();
    let emitted: 'up' | 'down' | undefined;
    component.vote.subscribe((dir) => (emitted = dir));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.protest-btn')!.click();
    expect(emitted).toBe('down');
  });

  it('maps carbon intensity to an indicator color across all thresholds', () => {
    setReport({ ...baseReport, carbonIntensity: 20 });
    expect(component.getIntensityColor()).toBe('var(--color-primary)');
    setReport({ ...baseReport, carbonIntensity: 50 });
    expect(component.getIntensityColor()).toBe('var(--color-water)');
    setReport({ ...baseReport, carbonIntensity: 70 });
    expect(component.getIntensityColor()).toBe('var(--color-warning)');
    setReport({ ...baseReport, carbonIntensity: 90 });
    expect(component.getIntensityColor()).toBe('var(--color-danger)');
  });
});
