import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImpactReport } from '../../../core/models/impact-report.model';

@Component({
  selector: 'app-impact-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="impact-card glass-panel" [ngClass]="getCardClass()" [attr.aria-label]="'Impact analysis for ' + report.articleTitle">
      <header class="card-header">
        <span class="category-badge" [ngClass]="report.category.toLowerCase()">
          {{ report.category }}
        </span>
        <span class="intensity-indicator" [style.color]="getIntensityColor()">
          Intensity: {{ report.carbonIntensity }}
        </span>
      </header>

      <h3 class="article-title">
        <a [href]="report.articleUrl" target="_blank" rel="noopener noreferrer">
          {{ report.articleTitle }}
        </a>
      </h3>

      <p class="explanation">{{ report.explanation }}</p>

      <div class="metrics-list-new">
        <!-- 1. Air -->
        <div class="metric-row-new">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="metric-icon" style="color: #38bdf8;">
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
          </svg>
          <div class="metric-text-new">
            <strong>Air:</strong> Claims the yearly oxygen of {{ getAirPeople() }} people.
          </div>
        </div>

        <!-- 2. Water -->
        <div class="metric-row-new">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="metric-icon" style="color: var(--color-water);">
            <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7Z" />
          </svg>
          <div class="metric-text-new">
            <strong>Water:</strong> Melts enough ice to fill {{ getWaterPools() }} Olympic swimming pools.
          </div>
        </div>

        <!-- 3. Land -->
        <div class="metric-row-new">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="metric-icon" style="color: var(--color-primary);">
            <path d="M12 22V12m0 0a5 5 0 0 0 5-5c0-2.8-2.2-5-5-5S7 4.2 7 7a5 5 0 0 0 5 5Z" />
          </svg>
          <div class="metric-text-new">
            <strong>Land:</strong> Effectively erases the cooling power of {{ getLandParks() }} local city parks.
          </div>
        </div>

        <!-- 4. Habit -->
        <div class="metric-row-new">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="metric-icon" style="color: var(--color-warning);">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
          <div class="metric-text-new">
            <strong>Habit:</strong> Pollution of driving a car to work for {{ getHabitYears() }} years.
          </div>
        </div>
      </div>

      <footer class="card-footer">
        <span class="time-stamp">Analyzed: {{ report.analyzedAt | date:'shortDate' }}</span>
        
        <div class="protest-container" (click)="$event.stopPropagation()">
          <button class="protest-btn" [class.active]="hasProtested" (click)="onVote(hasProtested ? 'down' : 'up')" aria-label="Protest this carbon impact" title="Raise Alarm / Protest this action">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="protest-icon">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            <span class="protest-label">Protest Impact</span>
            <span class="protest-count">{{ getVotes() }}</span>
          </button>
        </div>
      </footer>
    </article>
  `,
  styles: [`
    .impact-card {
      display: flex;
      flex-direction: column;
      padding: 0.75rem 1rem;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      gap: 0.35rem;
    }

    .impact-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.4), 0 0 1px 1px var(--border-glass) inset;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .category-badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .category-badge.energy { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .category-badge.transport { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .category-badge.industry { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .category-badge.agriculture { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
    .category-badge.deforestation { background: rgba(244, 63, 94, 0.15); color: #fb7185; }
    .category-badge.general { background: rgba(100, 116, 139, 0.15); color: #cbd5e1; }

    .intensity-indicator {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      font-family: var(--font-headings);
    }

    .article-title {
      font-size: 1.05rem;
      margin: 0;
      line-height: 1.3;
    }

    .article-title a {
      color: var(--text-primary);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .article-title a:hover {
      color: var(--color-cyan);
    }

    .explanation {
      font-size: 0.8rem;
      color: var(--color-muted);
      line-height: 1.4;
      margin: 0;
    }

    .metrics-list-new {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      border-top: 1px solid var(--color-line);
      border-bottom: 1px solid var(--color-line);
      padding: 0.4rem 0;
      margin: 0.2rem 0;
    }

    .metric-row-new {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .metric-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .metric-text-new {
      font-size: 0.76rem;
      color: var(--color-ink);
      line-height: 1.3;
    }

    .metric-text-new strong {
      color: var(--color-primary-dark);
      font-weight: 700;
      margin-right: 0.15rem;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.65rem;
      color: var(--color-muted);
      border-top: 1px solid rgba(0,0,0,0.03);
      padding-top: 0.2rem;
    }

    .protest-container {
      margin-left: auto;
    }

    .protest-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--color-surface-soft);
      border: 1px solid var(--color-line);
      border-radius: 9999px;
      padding: 0.2rem 0.6rem;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--color-muted);
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      cursor: pointer;
      line-height: 1;
    }

    .protest-btn:hover {
      background: #fef2f2;
      border-color: #fca5a5;
      color: var(--color-danger);
    }

    .protest-btn.active {
      background: #fef2f2;
      border-color: #ef4444;
      color: var(--color-danger);
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
    }

    .protest-btn.active .protest-count {
      background: rgba(185, 28, 28, 0.1);
      color: var(--color-danger);
    }

    .protest-icon {
      width: 12px;
      height: 12px;
      stroke-width: 2.2;
    }

    .protest-label {
      font-size: 0.68rem;
    }

    .protest-count {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 9999px;
      padding: 0.05rem 0.35rem;
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--color-muted);
      transition: background 0.15s ease, color 0.15s ease;
    }

    .protest-btn:hover .protest-count {
      background: rgba(185, 28, 28, 0.1);
      color: var(--color-danger);
    }
  `]
})
export class ImpactCardComponent {
  @Input({ required: true }) report!: ImpactReport;
  @Input() hasProtested = false;
  @Output() vote = new EventEmitter<'up' | 'down'>();

  onVote(direction: 'up' | 'down') {
    this.vote.emit(direction);
  }

  getVotes(): number {
    return (this.report as any).votes ?? 0;
  }

  getAirPeople(): string {
    const people = Math.round(this.report.co2EquivalentKg / 15.3);
    return people.toLocaleString();
  }

  getWaterPools(): string {
    const pools = (this.report.co2EquivalentKg * 3) / 2500000;
    return pools.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  }

  getLandParks(): string {
    const parks = (this.report.co2EquivalentKg / 36800);
    return parks.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  getHabitYears(): string {
    const years = Math.round(this.report.co2EquivalentKg / 525.7);
    return years.toLocaleString();
  }

  getCardClass(): string {
    if (this.report.carbonIntensity < 35) return 'border-green';
    if (this.report.carbonIntensity > 70) return 'border-red';
    return '';
  }

  getIntensityColor(): string {
    const intensity = this.report.carbonIntensity;
    if (intensity < 35) return 'var(--color-primary)';
    if (intensity < 65) return 'var(--color-water)';
    if (intensity < 80) return 'var(--color-warning)';
    return 'var(--color-danger)';
  }
}
