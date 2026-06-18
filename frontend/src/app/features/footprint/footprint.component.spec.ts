import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { FootprintComponent } from './footprint.component';

const STORAGE_KEY = 'ecometrics_footprint';

describe('FootprintComponent', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const create = (): any => {
    const fixture = TestBed.createComponent(FootprintComponent);
    return fixture.componentInstance;
  };

  describe('in the browser', () => {
    beforeEach(() => {
      localStorage.clear();
      TestBed.configureTestingModule({ imports: [FootprintComponent] });
    });

    afterEach(() => localStorage.clear());

    it('computes the weekly/annual totals and breakdown from defaults', () => {
      const c = create();
      // commute 80*0.21=16.8, diet average 35, energy grid 40 => 91.8
      expect(c.weeklyTotal()).toBeCloseTo(91.8, 1);
      expect(c.annualTotal()).toBe(Math.round(91.8 * 52));
      expect(c.breakdown().map((b: { kg: number }) => b.kg)).toEqual([16.8, 35, 40]);
      expect(c.sharePercent(40)).toBe(Math.round((40 / 91.8) * 100));
    });

    it('renders the breakdown list and the comparison badge in both states', () => {
      // Default state is below average -> "under" badge, no "+" prefix.
      const under = TestBed.createComponent(FootprintComponent);
      under.detectChanges();
      const underEl = under.nativeElement as HTMLElement;
      expect(underEl.querySelectorAll('.footprint-breakdown li').length).toBe(3);
      expect(underEl.querySelector('.footprint-compare.under')).not.toBeNull();
      expect(underEl.querySelector('.footprint-compare')!.textContent).not.toContain('+');

      // High commute pushes above average -> "over" badge with a "+" prefix.
      const over = TestBed.createComponent(FootprintComponent);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (over.componentInstance as any).updateCommute('600');
      over.detectChanges();
      const overEl = over.nativeElement as HTMLElement;
      expect(overEl.querySelector('.footprint-compare.over')).not.toBeNull();
      expect(overEl.querySelector('.footprint-compare')!.textContent).toContain('+');
    });

    it('wires the form controls to the estimator via DOM events', () => {
      const fixture = TestBed.createComponent(FootprintComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      const commute = el.querySelector('#fp-commute') as HTMLInputElement;
      commute.value = '250';
      commute.dispatchEvent(new Event('input'));

      const diet = el.querySelector('#fp-diet') as HTMLSelectElement;
      diet.value = 'vegan';
      diet.dispatchEvent(new Event('change'));

      const energy = el.querySelector('#fp-energy') as HTMLSelectElement;
      energy.value = 'renewable';
      energy.dispatchEvent(new Event('change'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = fixture.componentInstance as any;
      expect(c.commuteKm()).toBe(250);
      expect(c.diet()).toBe('vegan');
      expect(c.energy()).toBe('renewable');
    });

    it('reports below-average and above-average comparisons', () => {
      const c = create();
      expect(c.comparedToAverage()).toBeLessThan(0); // defaults are below average
      c.updateCommute('600'); // 126 commute -> well above average
      expect(c.comparedToAverage()).toBeGreaterThan(0);
    });

    it('gives a commute insight when commuting dominates', () => {
      const c = create();
      c.updateCommute('400'); // 84 kg, the largest source
      expect(c.topSource().key).toBe('commute');
      expect(c.insight()).toContain('commute is your biggest source');
    });

    it('gives a diet insight with a saving when diet dominates', () => {
      const c = create();
      c.updateCommute('0');
      c.updateEnergy('renewable');
      c.updateDiet('meat'); // 50 kg, dominates
      expect(c.topSource().key).toBe('diet');
      expect(c.insight()).toContain('plant-based');
    });

    it('acknowledges an already low-carbon diet', () => {
      const c = create();
      c.updateCommute('0'); // 0
      c.updateEnergy('renewable'); // 8
      c.updateDiet('vegan'); // 18 -> dominates, but below vegetarian baseline
      expect(c.topSource().key).toBe('diet');
      expect(c.insight()).toContain('already low-carbon');
    });

    it('gives a home-energy insight when energy dominates', () => {
      const c = create();
      c.updateCommute('0');
      c.updateDiet('vegan'); // 18
      c.updateEnergy('grid'); // 40 dominates
      expect(c.topSource().key).toBe('energy');
      expect(c.insight()).toContain('mostly-renewable');
    });

    it('clamps and sanitizes commute input', () => {
      const c = create();
      c.updateCommute('-50');
      expect(c.commuteKm()).toBe(0);
      c.updateCommute('99999');
      expect(c.commuteKm()).toBe(2000);
      c.updateCommute('not-a-number');
      expect(c.commuteKm()).toBe(0);
    });

    it('persists changes to localStorage', () => {
      const c = create();
      c.updateDiet('vegan');
      c.updateEnergy('renewable');
      c.updateCommute('120');
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
        commuteKm: 120,
        diet: 'vegan',
        energy: 'renewable',
      });
    });

    it('restores persisted state on construction', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ commuteKm: 200, diet: 'vegetarian', energy: 'mixed' }),
      );
      const c = create();
      expect(c.commuteKm()).toBe(200);
      expect(c.diet()).toBe('vegetarian');
      expect(c.energy()).toBe('mixed');
    });

    it('ignores partial and malformed persisted state', () => {
      // Only `diet` present: commuteKm and energy keep their defaults.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ diet: 'vegan' }));
      let c = create();
      expect(c.diet()).toBe('vegan');
      expect(c.commuteKm()).toBe(80);
      expect(c.energy()).toBe('grid');

      // Only `commuteKm` present: diet and energy keep their defaults.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ commuteKm: 150 }));
      c = create();
      expect(c.commuteKm()).toBe(150);
      expect(c.diet()).toBe('average');
      expect(c.energy()).toBe('grid');

      // Malformed JSON falls back to defaults.
      localStorage.setItem(STORAGE_KEY, '{ broken json');
      c = create();
      expect(c.commuteKm()).toBe(80);
    });
  });

  describe('on the server', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [FootprintComponent],
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
    });

    it('neither reads nor writes storage when not in a browser', () => {
      const setItem = spyOn(Storage.prototype, 'setItem');
      const c = create(); // restore() is a no-op on the server
      c.updateCommute('500'); // persist() is a no-op on the server
      expect(c.commuteKm()).toBe(500);
      expect(setItem).not.toHaveBeenCalled();
    });
  });
});
