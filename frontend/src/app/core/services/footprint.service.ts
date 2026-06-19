import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  COMMUTE_KG_PER_KM,
  DIET_WEEKLY_KG,
  ENERGY_WEEKLY_KG,
} from '../carbon.constants';

export type Diet = 'meat' | 'average' | 'vegetarian' | 'vegan';
export type Energy = 'grid' | 'mixed' | 'renewable';

const STORAGE_KEY = 'ecometrics_footprint';

@Injectable({
  providedIn: 'root',
})
export class FootprintService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly commuteKm = signal(80);
  readonly diet = signal<Diet>('average');
  readonly energy = signal<Energy>('grid');

  constructor() {
    this.restore();
  }

  updateCommute(value: number): void {
    this.commuteKm.set(value);
    this.persist();
  }

  updateDiet(value: Diet): void {
    this.diet.set(value);
    this.persist();
  }

  updateEnergy(value: Energy): void {
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
