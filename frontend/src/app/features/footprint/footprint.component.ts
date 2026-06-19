import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type Diet = 'meat' | 'average' | 'vegetarian' | 'vegan';
export type Energy = 'grid' | 'mixed' | 'renewable';

/** Illustrative weekly CO₂ emission factors (kg) used by the estimator. */
const COMMUTE_KG_PER_KM = 0.21; // average petrol car, per km
const DIET_WEEKLY_KG: Record<Diet, number> = { meat: 50, average: 35, vegetarian: 24, vegan: 18 };
const ENERGY_WEEKLY_KG: Record<Energy, number> = { grid: 40, mixed: 25, renewable: 8 };
const AVERAGE_WEEKLY_KG = 130; // reference for a typical individual footprint
const STORAGE_KEY = 'ecometrics_footprint';

interface BreakdownItem {
  key: 'commute' | 'diet' | 'energy';
  label: string;
  kg: number;
}

@Component({
  selector: 'app-footprint',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel footprint-card" aria-labelledby="footprint-title">
      <div class="panel-header">
        <div>
          <h2 class="panel-title" id="footprint-title">Know Your Weekly Footprint</h2>
          <p class="panel-subtitle">Estimate where your carbon comes from, then track it down.</p>
        </div>
      </div>

      <div class="footprint-headline">
        <div>
          <span class="footprint-total">{{ weeklyTotal() }}</span>
          <span class="footprint-unit">kg CO₂ / week</span>
        </div>
        <span
          class="footprint-compare"
          [class.over]="comparedToAverage() > 0"
          [class.under]="comparedToAverage() <= 0"
        >
          {{ comparedToAverage() > 0 ? '+' : '' }}{{ comparedToAverage() }}% vs average
        </span>
      </div>
      <p class="footprint-annual">≈ {{ annualTotal().toLocaleString() }} kg CO₂ a year</p>

      <ul class="footprint-breakdown" aria-label="Footprint breakdown by source">
        <li *ngFor="let item of breakdown()">
          <span class="footprint-breakdown-label">{{ item.label }}</span>
          <span class="footprint-breakdown-track">
            <span class="footprint-breakdown-fill" [style.width.%]="sharePercent(item.kg)"></span>
          </span>
          <span class="footprint-breakdown-kg">{{ item.kg }} kg</span>
        </li>
      </ul>

      <div class="footprint-controls">
        <div class="footprint-field">
          <label for="fp-commute">Car commute (km / week)</label>
          <input
            id="fp-commute"
            type="number"
            min="0"
            max="2000"
            step="10"
            [value]="commuteKm()"
            (input)="updateCommute($any($event.target).value)"
          />
        </div>

        <div class="footprint-field">
          <label for="fp-diet">Diet</label>
          <select id="fp-diet" [value]="diet()" (change)="updateDiet($any($event.target).value)">
            <option value="meat">Meat with most meals</option>
            <option value="average">Average / mixed</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
          </select>
        </div>

        <div class="footprint-field">
          <label for="fp-energy">Home energy</label>
          <select
            id="fp-energy"
            [value]="energy()"
            (change)="updateEnergy($any($event.target).value)"
          >
            <option value="grid">Standard grid</option>
            <option value="mixed">Partly renewable</option>
            <option value="renewable">Mostly renewable</option>
          </select>
        </div>
      </div>

      <p class="footprint-insight" role="status">
        <strong>Personalized insight:</strong>
        {{ insight() }}
      </p>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 18px;
      }
      .footprint-card {
        padding: 18px;
      }
      .footprint-headline {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        margin-top: 12px;
      }
      .footprint-total {
        font-size: 1.9rem;
        font-weight: 800;
        color: var(--color-primary-dark);
      }
      .footprint-unit {
        margin-left: 6px;
        font-size: 0.8rem;
        color: var(--color-muted);
      }
      .footprint-compare {
        font-size: 0.72rem;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 999px;
      }
      .footprint-compare.over {
        color: var(--color-danger);
        background: #fee2e2;
      }
      .footprint-compare.under {
        color: var(--color-primary-dark);
        background: var(--color-primary-soft);
      }
      .footprint-annual {
        margin: 2px 0 12px;
        font-size: 0.75rem;
        color: var(--color-muted);
      }
      .footprint-breakdown {
        list-style: none;
        margin: 0 0 14px;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .footprint-breakdown li {
        display: grid;
        grid-template-columns: 84px 1fr 56px;
        align-items: center;
        gap: 8px;
        font-size: 0.76rem;
      }
      .footprint-breakdown-track {
        height: 8px;
        background: var(--color-surface-soft);
        border-radius: 999px;
        overflow: hidden;
      }
      .footprint-breakdown-fill {
        display: block;
        height: 100%;
        background: var(--color-primary);
        border-radius: 999px;
      }
      .footprint-breakdown-kg {
        text-align: right;
        font-weight: 700;
        color: var(--color-ink);
      }
      .footprint-controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 14px;
      }
      .footprint-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .footprint-field label {
        font-size: 0.74rem;
        font-weight: 600;
        color: var(--color-muted);
      }
      .footprint-field input,
      .footprint-field select {
        font-family: inherit;
        font-size: 0.85rem;
        padding: 7px 10px;
        border: 1px solid var(--color-line);
        border-radius: var(--radius);
        background: #fff;
        color: var(--color-ink);
      }
      .footprint-insight {
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.5;
        color: var(--color-ink);
        background: var(--color-surface-soft);
        border-radius: var(--radius);
        padding: 10px 12px;
      }
      .footprint-insight strong {
        color: var(--color-primary-dark);
      }
    `,
  ],
})
export class FootprintComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly commuteKm = signal(80);
  protected readonly diet = signal<Diet>('average');
  protected readonly energy = signal<Energy>('grid');

  constructor() {
    this.restore();
  }

  protected readonly breakdown = computed<BreakdownItem[]>(() => [
    {
      key: 'commute',
      label: 'Commute',
      kg: Math.round(this.commuteKm() * COMMUTE_KG_PER_KM * 10) / 10,
    },
    { key: 'diet', label: 'Diet', kg: DIET_WEEKLY_KG[this.diet()] },
    { key: 'energy', label: 'Home energy', kg: ENERGY_WEEKLY_KG[this.energy()] },
  ]);

  protected readonly weeklyTotal = computed(
    () => Math.round(this.breakdown().reduce((sum, item) => sum + item.kg, 0) * 10) / 10,
  );

  protected readonly annualTotal = computed(() => Math.round(this.weeklyTotal() * 52));

  protected readonly comparedToAverage = computed(() =>
    Math.round((this.weeklyTotal() / AVERAGE_WEEKLY_KG - 1) * 100),
  );

  protected readonly topSource = computed(() =>
    this.breakdown().reduce((max, item) => (item.kg > max.kg ? item : max)),
  );

  protected readonly insight = computed(() => {
    const top = this.topSource();
    if (top.key === 'commute') {
      const saved = Math.round(this.commuteKm() * 0.4 * COMMUTE_KG_PER_KM * 10) / 10;
      return `Your commute is your biggest source. Shifting about 40% of your car kilometres to transit, cycling, or remote work would save roughly ${saved} kg CO₂ a week.`;
    }
    if (top.key === 'diet') {
      const saved = DIET_WEEKLY_KG[this.diet()] - DIET_WEEKLY_KG.vegetarian;
      if (saved > 0) {
        return `Diet is your biggest source. A few more plant-based days — moving toward vegetarian — would cut about ${saved} kg CO₂ a week.`;
      }
      return `Diet is your biggest source, but it is already low-carbon. Keep it up and look at trimming travel or home energy next.`;
    }
    // Energy can only be the top source when it is grid/mixed (both above the renewable
    // baseline), so there is always a positive saving to recommend here.
    const saved = ENERGY_WEEKLY_KG[this.energy()] - ENERGY_WEEKLY_KG.renewable;
    return `Home energy is your biggest source. Switching to a mostly-renewable tariff would save about ${saved} kg CO₂ a week.`;
  });

  protected sharePercent(kg: number): number {
    // weeklyTotal is always positive (diet + energy are never zero).
    return Math.round((kg / this.weeklyTotal()) * 100);
  }

  protected updateCommute(value: string): void {
    const parsed = parseInt(value, 10);
    const km = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(2000, parsed));
    this.commuteKm.set(km);
    this.persist();
  }

  protected updateDiet(value: Diet): void {
    this.diet.set(value);
    this.persist();
  }

  protected updateEnergy(value: Energy): void {
    this.energy.set(value);
    this.persist();
  }

  private persist(): void {
    if (!this.isBrowser) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ commuteKm: this.commuteKm(), diet: this.diet(), energy: this.energy() }),
    );
  }

  private restore(): void {
    if (!this.isBrowser) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Partial<{ commuteKm: number; diet: Diet; energy: Energy }>;
      if (typeof saved.commuteKm === 'number') this.commuteKm.set(saved.commuteKm);
      if (saved.diet) this.diet.set(saved.diet);
      if (saved.energy) this.energy.set(saved.energy);
    } catch {
      // Ignore malformed persisted state and fall back to defaults.
    }
  }
}
