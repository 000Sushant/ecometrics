import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  PLATFORM_ID,
  ElementRef,
  viewChild,
  afterRenderEffect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ImpactReport } from '../../core/models/impact-report.model';
import { ImpactService } from '../../core/services/impact.service';
import { ImpactCardComponent } from '../../shared/components/impact-card/impact-card.component';
import { FootprintComponent } from '../footprint/footprint.component';
import {
  TopicFilter,
  DashboardBrief,
  MODELED_BRIEFS,
  LEADERBOARD,
  CURRENT_USER_RANK,
} from './net-impact-feed.data';
import { CountryEmissions } from '../../core/models/country-emissions.model';
import {
  PERSON_OXYGEN_KG_CO2_PER_YEAR,
  GLACIER_MELT_LITRES_PER_KG,
  OLYMPIC_POOL_LITRES,
  CITY_PARK_KG_CO2,
  COMMUTE_YEAR_KG_CO2,
} from '../../core/carbon.constants';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-net-impact-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, ImpactCardComponent, FootprintComponent],
  template: `
    <main class="dashboard-shell" id="main-content">
      <section class="hero" aria-labelledby="dashboard-title">
        <div class="hero-copy">
          <div class="brand-row">
            <div class="brand-lockup">
              <span class="leaf-mark" aria-hidden="true">
                <svg viewBox="0 0 48 48" fill="none">
                  <!-- Green Earth Globe -->
                  <circle cx="24" cy="24" r="21" stroke="currentColor" stroke-width="3" />
                  <!-- Longitude lines -->
                  <path
                    d="M24 3C17 10 17 38 24 45"
                    stroke="currentColor"
                    stroke-width="2"
                    opacity="0.8"
                  />
                  <path
                    d="M24 3C31 10 31 38 24 45"
                    stroke="currentColor"
                    stroke-width="2"
                    opacity="0.8"
                  />
                  <line
                    x1="24"
                    y1="3"
                    x2="24"
                    y2="45"
                    stroke="currentColor"
                    stroke-width="2"
                    opacity="0.8"
                  />
                  <!-- Latitude lines -->
                  <path
                    d="M3 24C10 17 38 17 45 24"
                    stroke="currentColor"
                    stroke-width="2"
                    opacity="0.8"
                  />
                  <path
                    d="M3 24C10 31 38 31 45 24"
                    stroke="currentColor"
                    stroke-width="2"
                    opacity="0.8"
                  />
                  <line
                    x1="3"
                    y1="24"
                    x2="45"
                    y2="24"
                    stroke="currentColor"
                    stroke-width="2"
                    opacity="0.8"
                  />
                </svg>
              </span>
              <span>EcoMetrics</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button
                type="button"
                class="quiet-button insight-toggle-btn"
                [class.active]="showInsightsMap()"
                (click)="showInsightsMap.set(!showInsightsMap())"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  style="margin-right: 4px; display: inline-block; vertical-align: middle;"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                <span style="vertical-align: middle;">{{
                  showInsightsMap() ? 'Hide Map' : 'More Insights'
                }}</span>
              </button>
              <span class="live-badge">Impact intelligence desk</span>
            </div>
          </div>

          <div>
            <p class="eyebrow">Your personal carbon footprint dashboard</p>
            <h1 id="dashboard-title">Understand, track, and shrink your carbon footprint.</h1>
            <p class="hero-lede">
              Estimate your weekly footprint, commit to simple daily actions, and get personalized
              insights — set against real-world climate context so you can see how your choices fit
              the bigger picture.
            </p>
          </div>

          <form class="hero-actions" (ngSubmit)="triggerAnalysis()">
            <input
              class="search-input"
              type="search"
              name="query"
              [(ngModel)]="searchQuery"
              placeholder="Search a carbon-heavy topic, leader move, event, or industry"
              aria-label="Search climate impact news"
            />
            <button class="primary-button" type="submit" [disabled]="loading()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="m21 21-4.35-4.35M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                />
              </svg>
              {{ loading() ? 'Analyzing' : 'Analyze' }}
            </button>
          </form>

          <div class="topic-strip" role="group" aria-label="Major carbon impact topics">
            <button
              *ngFor="let topic of topics"
              type="button"
              class="topic-chip"
              [class.active]="activeTopic() === topic"
              [attr.aria-pressed]="activeTopic() === topic"
              (click)="setTopic(topic)"
            >
              {{ topic }}
            </button>
          </div>

          <!-- Decorative background leaf watermark (moved to avoid hiding card text) -->
          <svg class="leaf-orbit" viewBox="0 0 180 180" fill="none" aria-hidden="true">
            <path d="M139 22C83 26 40 59 29 121c42 9 95-3 110-99Z" fill="#15803d" opacity=".9" />
            <path
              d="M38 121c29-38 61-65 99-92"
              stroke="#f8fff5"
              stroke-width="8"
              stroke-linecap="round"
            />
            <path
              d="M73 90c-2-20 4-37 20-53M94 70c18 12 35 15 56 10"
              stroke="#f8fff5"
              stroke-width="5"
              stroke-linecap="round"
              opacity=".88"
            />
          </svg>
        </div>

        <div class="hero-visual" aria-label="Animated leaf and climate impact illustration">
          <div class="impact-pulse">
            <!-- 1. Total Carbon Output (2017–2026) with Sector Ranking (Interactive Donut Chart) -->
            <div class="pulse-card relative-card document-style-card">
              <span class="pulse-card-eyebrow">Total Carbon Output (2017–2026)</span>

              <div class="donut-layout" style="margin-top: 8px;">
                <!-- Left: Donut Chart -->
                <div class="donut-chart-wrapper">
                  <svg viewBox="0 0 42 42" class="donut-svg">
                    <g transform="rotate(-90 21 21)">
                      <!-- Base Track Circle -->
                      <circle
                        cx="21"
                        cy="21"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke="#f1f5f9"
                        stroke-width="3.2"
                      />

                      <!-- Segment Circles -->
                      <circle
                        *ngFor="let slice of donutSlices()"
                        cx="21"
                        cy="21"
                        r="15.91549430918954"
                        fill="transparent"
                        [attr.stroke]="slice.color"
                        [attr.stroke-width]="hoveredSectorIndex() === slice.index ? 5.2 : 3.8"
                        [attr.stroke-dasharray]="slice.strokeDashArray"
                        [attr.stroke-dashoffset]="slice.strokeDashOffset"
                        class="donut-slice"
                        [class.hovered]="hoveredSectorIndex() === slice.index"
                        (mouseenter)="hoveredSectorIndex.set(slice.index)"
                        (mouseleave)="hoveredSectorIndex.set(null)"
                      />
                    </g>

                    <!-- Center Details -->
                    <g class="donut-center-group">
                      <!-- Title / Label -->
                      <text x="21" y="16" text-anchor="middle" class="donut-center-label">
                        {{ donutCenterTitle() }}
                      </text>

                      <!-- Value -->
                      <text x="21" y="22.5" text-anchor="middle" class="donut-center-val">
                        {{ donutCenterValue() }}
                      </text>

                      <!-- Subtitle -->
                      <text x="21" y="27.5" text-anchor="middle" class="donut-center-sub">
                        {{
                          hoveredSectorIndex() !== null
                            ? sectorsList()[hoveredSectorIndex() ?? 0].percentage + '% share'
                            : '10-Yr Sum'
                        }}
                      </text>
                    </g>
                  </svg>
                </div>

                <!-- Right: Interactive Ranking List -->
                <div class="donut-list">
                  <div
                    *ngFor="let item of sectorsList(); let idx = index"
                    class="donut-list-item"
                    [class.active]="hoveredSectorIndex() === idx"
                    (mouseenter)="hoveredSectorIndex.set(idx)"
                    (mouseleave)="hoveredSectorIndex.set(null)"
                  >
                    <div class="donut-list-item-left">
                      <span class="donut-list-dot" [style.background]="item.color"></span>
                      <span class="donut-list-name">{{ item.name }}</span>
                    </div>
                    <strong class="donut-list-val">
                      {{ item.value }} Gt ({{ item.percentage }}%)
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Document-style Historical Trend Chart (No background blur, no gradient fill) -->
            <div class="pulse-card document-chart-card">
              <div class="chart-header">
                <strong>Global Carbon Footprint</strong>
                <span class="history-years">2017 - 2026</span>
              </div>
              <div class="chart-container document-style" style="position: relative; height: 80px;">
                <canvas
                  #globalChartCanvas
                  role="img"
                  [attr.aria-label]="
                    'Global carbon footprint trend, 2017 to 2026, in gigatons of CO2: ' +
                    globalChartSummary()
                  "
                ></canvas>
              </div>
              <table class="sr-only">
                <caption>
                  Global carbon footprint by year (gigatons CO₂)
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col">Emissions (Gt CO₂)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let point of climateHistory()">
                    <td>{{ point.year }}</td>
                    <td>{{ point.emissions }}</td>
                  </tr>
                </tbody>
              </table>
              <span class="source-caption">Source: {{ historySource() }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Global Insights Map Panel (Collapsible) -->
      <div class="insights-map-panel" *ngIf="showInsightsMap()">
        <div class="panel-header map-header">
          <div>
            <h2 class="panel-title">Global Emissions Lens (Last 10 Years)</h2>
            <p class="panel-subtitle">
              Scrub the timeline to see changes in national carbon footprints. Hover or click
              country bubbles to explore detailed insights.
            </p>
          </div>
          <div class="map-controls">
            <!-- Year Scrubber -->
            <div class="scrubber-control">
              <label class="slider-year-label" for="year-slider"
                >Year: <strong>{{ selectedYear() }}</strong></label
              >
              <input
                id="year-slider"
                type="range"
                min="2017"
                max="2026"
                step="1"
                class="year-slider"
                [value]="selectedYear()"
                (input)="onYearSliderChange($event)"
                aria-label="Select year for emissions data"
                [attr.aria-valuetext]="selectedYear() + ''"
              />
            </div>
            <!-- Keyboard/screen-reader equivalent for the visual map below -->
            <div class="scrubber-control">
              <label class="slider-year-label" for="country-select">Country</label>
              <select
                id="country-select"
                class="country-select"
                [value]="selectedCountryCode()"
                (change)="onCountrySelect($event)"
              >
                <option *ngFor="let c of countryEmissions()" [value]="c.code">{{ c.name }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="map-workspace">
          <!-- Left/Center: SVG World Map (decorative duplicate of the country selector + detail panel) -->
          <div
            class="map-canvas-wrapper"
            style="position: relative; width: 100%; display: flex; flex-direction: column; align-items: center;"
          >
            <div
              #mapContainer
              class="world-map-container"
              style="width: 100%;"
              aria-hidden="true"
              (click)="onMapClick($event)"
              (mouseover)="onMapHover($event)"
              (mouseleave)="onMapLeave()"
            ></div>
          </div>

          <!-- Right side: Detail Panel -->
          <div class="map-sidebar-details" *ngIf="activeCountryDetail() as country">
            <div class="detail-card-header">
              <span class="detail-country-code">{{ country.code }}</span>
              <h3 class="detail-country-name">{{ country.name }}</h3>
            </div>

            <div class="detail-stats-grid">
              <div class="detail-stat-box">
                <span class="detail-stat-label">Emissions ({{ selectedYear() }})</span>
                <strong class="detail-stat-value text-danger"
                  >{{ activeCountryYearEmissions() }} Gt</strong
                >
              </div>
              <div class="detail-stat-box">
                <span class="detail-stat-label">Per Capita Footprint</span>
                <strong class="detail-stat-value text-warning"
                  >{{ country.perCapita }} t / person</strong
                >
              </div>
              <div class="detail-stat-box">
                <span class="detail-stat-label">Global Share</span>
                <strong class="detail-stat-value text-water">{{ country.globalShare }}%</strong>
              </div>
            </div>

            <!-- Mini 10-Year Trend Chart -->
            <div class="detail-trend-section">
              <div class="trend-section-header">
                <span>10-Year Trend (2017-2026)</span>
              </div>
              <div class="mini-trend-chart" style="position: relative; height: 70px; width: 100%;">
                <canvas
                  #countryChartCanvas
                  role="img"
                  [attr.aria-label]="
                    '10-year emissions trend for ' + country.name + ' in gigatons of CO2'
                  "
                ></canvas>
              </div>
              <table class="sr-only">
                <caption>
                  {{
                    country.name
                  }}
                  emissions by year (gigatons CO₂)
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col">Emissions (Gt CO₂)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let point of country.history">
                    <td>{{ point.year }}</td>
                    <td>{{ point.emissions }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Human Scale Context Nudges -->
            <div class="detail-context-section">
              <h4 class="context-title">What does this cost represent?</h4>

              <div class="context-item">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="context-icon text-warning"
                  style="display: inline-block; vertical-align: middle;"
                >
                  <path
                    d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v4c0 .6.4 1 1 1h2"
                  />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
                <span class="context-desc" style="vertical-align: middle; margin-left: 6px;">{{
                  countryCarEquivalent()
                }}</span>
              </div>

              <div class="context-item" style="margin-top: 8px;">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="context-icon text-primary"
                  style="display: inline-block; vertical-align: middle;"
                >
                  <path d="M12 22V12m0 0a5 5 0 0 0 5-5c0-2.8-2.2-5-5-5S7 4.2 7 7a5 5 0 0 0 5 5Z" />
                </svg>
                <span class="context-desc" style="vertical-align: middle; margin-left: 6px;">{{
                  countryTreeEquivalent()
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section class="kpi-grid" aria-label="Dashboard statistics">
        <article class="kpi-card">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            style="color: #38bdf8; width: 18px; height: 18px; display: block;"
          >
            <path
              d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"
            />
          </svg>
          <span class="kpi-label">Air (Oxygen Claimed)</span>
          <strong class="kpi-value">{{ airOxygenClaimed() }}</strong>
        </article>
        <article class="kpi-card">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            style="color: var(--color-water); width: 18px; height: 18px; display: block;"
          >
            <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7Z" />
          </svg>
          <span class="kpi-label">Water (Glacier Melt)</span>
          <strong class="kpi-value">{{ waterGlacierMelt() }}</strong>
        </article>
        <article class="kpi-card">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            style="color: var(--color-primary); width: 18px; height: 18px; display: block;"
          >
            <path d="M12 22V12m0 0a5 5 0 0 0 5-5c0-2.8-2.2-5-5-5S7 4.2 7 7a5 5 0 0 0 5 5Z" />
          </svg>
          <span class="kpi-label">Land (Parks Erased)</span>
          <strong class="kpi-value">{{ landParksErased() }}</strong>
        </article>
        <article class="kpi-card">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
            style="color: var(--color-warning); width: 18px; height: 18px; display: block;"
          >
            <path
              d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v4c0 .6.4 1 1 1h2"
            />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
          <span class="kpi-label">Habit (Commute Years)</span>
          <strong class="kpi-value">{{ habitCommuteYears() }}</strong>
        </article>
      </section>

      <section class="section-grid">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title" style="display: inline-flex; align-items: center; gap: 8px;">
                <span>Negative Climate Impact Briefs</span>
                <span
                  class="badge"
                  [style.--topic-color]="
                    isLiveFeed() ? 'var(--color-danger)' : 'var(--color-primary)'
                  "
                  [style.--topic-bg]="isLiveFeed() ? '#fee2e2' : 'var(--color-primary-soft)'"
                  style="font-size: 0.68rem; padding: 2px 6px; min-height: auto;"
                >
                  {{ isLiveFeed() ? 'Live News Feed' : 'Historical Archive' }}
                </span>
              </h2>
              <p class="panel-subtitle">
                Tracking only high-emission news where political decisions, infrastructure growth,
                or mass events increase carbon burden.
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button
                type="button"
                class="primary-button fetch-news-btn"
                [disabled]="loading()"
                (click)="manualFetchNews()"
                style="padding: 0 10px; min-height: 28px; font-size: 0.8rem;"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  style="display: inline-block; vertical-align: middle;"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span style="vertical-align: middle;">{{
                  loading() ? 'Fetching...' : 'Fetch Latest News'
                }}</span>
              </button>
              <button
                type="button"
                class="quiet-button"
                (click)="restoreModeledBriefs()"
                style="min-height: 28px; padding: 0 10px; font-size: 0.8rem;"
              >
                Reset desk
              </button>
            </div>
          </div>

          <div *ngIf="error()" class="news-error" role="alert">
            {{ error() }} Showing modeled dashboard briefs until the backend responds.
          </div>

          <div class="brief-list">
            <app-impact-card
              *ngFor="let report of visibleReports()"
              [report]="report"
              [hasProtested]="protestedReportIds().has(report.id)"
              (mouseenter)="setActiveReport(report)"
              (focusin)="setActiveReport(report)"
              (vote)="handleVote(report.id, $event)"
            ></app-impact-card>
          </div>
        </div>

        <aside class="sidebar-stack">
          <app-footprint></app-footprint>

          <section class="panel analytics-stack">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Topic Pressure</h2>
                <p class="panel-subtitle">
                  Community interest ranked by cumulative protest alarms.
                </p>
              </div>
            </div>
            <div class="analytics-body">
              <div class="bar-list">
                <div class="bar-row" *ngFor="let item of topicVotes()">
                  <span class="bar-name">{{ item.topic }}</span>
                  <span class="bar-track"
                    ><span class="bar-fill" [style.width.%]="item.percentage"></span
                  ></span>
                  <span class="bar-value">{{ item.votes }}</span>
                </div>
              </div>
            </div>
          </section>

          <section class="panel leaderboard-card">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Green Champions Leaderboard</h2>
                <p class="panel-subtitle">This week's top pledgers, ranked by CO₂ saved.</p>
              </div>
            </div>
            <div class="leaderboard-list">
              <div class="leaderboard-row" *ngFor="let entry of leaderboard">
                <span class="leaderboard-rank" [class.top]="entry.rank <= 3">{{
                  medal(entry.rank)
                }}</span>
                <div class="leaderboard-identity">
                  <span class="leaderboard-name">{{ entry.name }}</span>
                  <span class="leaderboard-meta"
                    >{{ entry.location }} · {{ entry.streak }}-day streak</span
                  >
                </div>
                <strong class="leaderboard-score">{{ entry.co2SavedKg.toFixed(1) }} kg</strong>
              </div>

              <div class="leaderboard-gap" aria-hidden="true">⋯</div>

              <div class="leaderboard-row current-user">
                <span class="leaderboard-rank">{{ medal(currentUserRank.rank) }}</span>
                <div class="leaderboard-identity">
                  <span class="leaderboard-name">{{ currentUserRank.name }}</span>
                  <span class="leaderboard-meta"
                    >{{ currentUserRank.location }} · {{ currentUserRank.streak }}-day streak</span
                  >
                </div>
                <strong class="leaderboard-score"
                  >{{ currentUserRank.co2SavedKg.toFixed(1) }} kg</strong
                >
              </div>
            </div>
          </section>

          <section class="panel contribution-card">
            <h2 class="panel-title">My Daily Green Pledge</h2>
            <p class="panel-subtitle">
              Your daily promise to the planet. Commit to small actions today for a greener
              tomorrow.
            </p>

            <div class="progress-container">
              <div class="progress-labels">
                <span
                  >Pledge Progress: {{ totalSavedCo2().toFixed(1) }} / {{ dailyTarget }} kg
                  CO₂</span
                >
                <span>{{ progressPercent() }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-bar" [style.width.%]="progressPercent()"></div>
              </div>
            </div>

            <div class="contribution-list">
              <label
                *ngFor="let item of contributionActions()"
                class="contribution-item"
                [class.checked]="item.checked"
              >
                <input type="checkbox" [checked]="item.checked" (change)="toggleAction(item.id)" />
                <div class="contribution-item-text">
                  <span class="contribution-item-label">{{ item.label }}</span>
                  <span class="contribution-item-saving">
                    Estimated savings: {{ item.co2SavedKg }} kg CO₂/day
                  </span>
                </div>
              </label>
            </div>

            <div class="contribution-summary">
              <span>Total Pledged Savings:</span>
              <strong>{{ totalSavedCo2().toFixed(1) }} kg CO₂</strong>
            </div>
          </section>
        </aside>
      </section>

      <footer class="dashboard-footer">
        <p>
          Made with 💚 by
          <a href="https://000sushant.github.io/sushant-portfolio/" target="_blank" rel="noopener"
            >Sushant Kumar</a
          >
        </p>
        <div class="footer-links">
          <a href="https://000sushant.github.io/sushant-portfolio/" target="_blank" rel="noopener">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              style="display: inline-block; vertical-align: middle;"
            >
              <path
                d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
              />
            </svg>
            Portfolio
          </a>
          <a href="https://www.linkedin.com/in/sushant--kumar/" target="_blank" rel="noopener">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              style="display: inline-block; vertical-align: middle;"
            >
              <path
                d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"
              />
              <circle cx="4" cy="4" r="2" />
            </svg>
            LinkedIn
          </a>
          <a href="https://github.com/000Sushant" target="_blank" rel="noopener">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              style="display: inline-block; vertical-align: middle;"
            >
              <path
                d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
              />
            </svg>
            GitHub
          </a>
        </div>
      </footer>
    </main>
  `,
})
export class NetImpactFeedComponent implements OnInit {
  private impactService = inject(ImpactService);

  private modeledBriefs: DashboardBrief[] = [...MODELED_BRIEFS];

  protected readonly topics: TopicFilter[] = [
    'All',
    'Tech/AI',
    'Aviation & Energy',
    'Ecosystems & Tourism',
    'Climate & Policy',
  ];
  protected readonly activeTopic = signal<TopicFilter>('All');
  protected readonly isLiveFeed = signal<boolean>(false);
  protected readonly reports = signal<DashboardBrief[]>(
    this.modeledBriefs.filter((r) => r.co2EquivalentKg > 0),
  );
  protected readonly activeReport = signal<DashboardBrief | null>(
    this.modeledBriefs.find((r) => r.co2EquivalentKg > 0) ?? null,
  );
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected searchQuery = '';
  protected readonly climateHistory = signal<{ year: number; emissions: number }[]>([
    { year: 2017, emissions: 35.8 },
    { year: 2018, emissions: 36.4 },
    { year: 2019, emissions: 36.7 },
    { year: 2020, emissions: 34.8 },
    { year: 2021, emissions: 36.8 },
    { year: 2022, emissions: 37.2 },
    { year: 2023, emissions: 37.4 },
    { year: 2024, emissions: 37.4 },
    { year: 2025, emissions: 37.5 },
    { year: 2026, emissions: 37.6 },
  ]);
  protected readonly historySource = signal<string>('Global Carbon Project & IEA');

  private readonly platformId = inject(PLATFORM_ID);
  protected readonly isBrowser = isPlatformBrowser(this.platformId);
  private http = inject(HttpClient);
  private readonly STORAGE_KEY = 'ecometrics_protested_reports';
  protected readonly protestedReportIds = signal<Set<string>>(new Set());

  protected readonly dailyTarget = 10.0;

  // Static "Green Champions" leaderboard (illustrative data, ranked by weekly CO₂ saved).
  protected readonly leaderboard = LEADERBOARD;

  protected readonly currentUserRank = CURRENT_USER_RANK;

  protected medal(rank: number): string {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank.toLocaleString()}`;
  }

  protected readonly contributionActions = signal([
    {
      id: 'unplug',
      label: 'Unplug chargers and screens when not in use',
      co2SavedKg: 0.2,
      checked: false,
    },
    { id: 'lights', label: 'Turn off lights in empty rooms', co2SavedKg: 0.1, checked: false },
    {
      id: 'shower',
      label: 'Take a 5-minute shower instead of a long hot bath',
      co2SavedKg: 1.5,
      checked: false,
    },
    {
      id: 'transit',
      label: 'Commute by public train or bus instead of driving',
      co2SavedKg: 4.8,
      checked: false,
    },
    {
      id: 'bike',
      label: 'Walk or ride a bike for trips under 2 km',
      co2SavedKg: 1.2,
      checked: false,
    },
    {
      id: 'coldwash',
      label: 'Wash laundry at 30°C instead of 60°C',
      co2SavedKg: 0.6,
      checked: false,
    },
    {
      id: 'dryer',
      label: 'Air-dry clothes on a rack instead of running the dryer',
      co2SavedKg: 1.8,
      checked: false,
    },
    {
      id: 'kettle',
      label: 'Boil only the exact amount of water needed',
      co2SavedKg: 0.1,
      checked: false,
    },
    { id: 'cup', label: 'Use a reusable bag and coffee cup', co2SavedKg: 0.1, checked: false },
    { id: 'lunch', label: 'Choose a vegetarian option for lunch', co2SavedKg: 1.4, checked: false },
  ]);

  protected readonly totalSavedCo2 = computed(() => {
    return this.contributionActions().reduce(
      (sum, item) => sum + (item.checked ? item.co2SavedKg : 0),
      0,
    );
  });

  protected readonly progressPercent = computed(() => {
    return Math.min(100, Math.round((this.totalSavedCo2() / this.dailyTarget) * 100));
  });

  private getStableVotes(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (Math.abs(hash) % 150) + 10;
  }
  // View queries: these signals update reactively once the elements are actually
  // rendered, so chart/map setup never races against a not-yet-painted DOM.
  private readonly globalCanvas = viewChild<ElementRef<HTMLCanvasElement>>('globalChartCanvas');
  private readonly countryCanvas = viewChild<ElementRef<HTMLCanvasElement>>('countryChartCanvas');
  private readonly mapContainer = viewChild<ElementRef<HTMLElement>>('mapContainer');

  // Cleaned world-map SVG markup; injected into the DOM via DOMParser (no sanitizer bypass).
  protected readonly svgMarkup = signal<string>('');

  // Global map states
  protected readonly showInsightsMap = signal(true);
  protected readonly countryEmissions = signal<CountryEmissions[]>([]);
  protected readonly selectedYear = signal<number>(2026);
  protected readonly selectedCountryCode = signal<string>('IN');
  protected readonly hoveredCountryCode = signal<string | null>(null);
  constructor() {
    // afterRenderEffect runs only in the browser and only *after* the DOM has been
    // painted, re-running when any signal it reads changes. This replaces the previous
    // setTimeout + document.getElementById guesswork that caused the map/charts to
    // intermittently fail to initialize.

    // Global 10-year trend chart (its canvas is always rendered in the hero).
    afterRenderEffect(() => {
      const canvas = this.globalCanvas()?.nativeElement;
      const history = this.climateHistory();
      if (canvas && history.length > 0) {
        this.renderGlobalChart(canvas, history);
      }
    });

    // Per-country trend chart (its canvas only exists while a country is selected).
    afterRenderEffect(() => {
      const canvas = this.countryCanvas()?.nativeElement;
      const country = this.activeCountryDetail();
      const year = this.selectedYear();
      if (canvas && country) {
        this.renderCountryChart(canvas, country, year);
      }
    });

    // Inject the world map (once) and recolor it. Re-runs after the SVG markup loads,
    // the map panel renders, the data loads, or the year/selection/hover state changes.
    afterRenderEffect(() => {
      const container = this.mapContainer()?.nativeElement;
      const markup = this.svgMarkup();
      const emissions = this.countryEmissions();
      const year = this.selectedYear();
      const selected = this.selectedCountryCode();
      const hovered = this.hoveredCountryCode();
      if (!container || !markup) return;

      if (!container.querySelector('svg')) {
        // Parse as a document and adopt the node — avoids innerHTML and any sanitizer bypass.
        const parsed = new DOMParser()
          .parseFromString(markup, 'image/svg+xml')
          .querySelector('svg');
        if (parsed) {
          container.appendChild(document.importNode(parsed, true));
        }
      }

      if (emissions.length > 0) {
        this.styleMap(container, emissions, year, selected, hovered);
      }
    });
  }

  protected readonly selectedCountry = computed(() => {
    return this.countryEmissions().find((c) => c.code === this.selectedCountryCode()) || null;
  });

  protected readonly hoveredCountry = computed(() => {
    return this.countryEmissions().find((c) => c.code === this.hoveredCountryCode()) || null;
  });

  protected readonly activeCountryDetail = computed(() => {
    return this.hoveredCountry() || this.selectedCountry();
  });

  protected readonly activeCountryYearEmissions = computed(() => {
    const country = this.activeCountryDetail();
    if (!country) return 0;
    const yr = country.history.find((h) => h.year === this.selectedYear());
    return yr ? yr.emissions : 0;
  });

  protected readonly countryCarEquivalent = computed(() => {
    const emissions = this.activeCountryYearEmissions();
    const cars = (emissions * 1e9) / 4600; // 4.6 tonnes (4600 kg) per car per year
    if (cars >= 1e6) {
      return `${(cars / 1e6).toFixed(1)}M passenger cars driven for 1 year`;
    }
    return `${Math.round(cars).toLocaleString()} passenger cars driven for 1 year`;
  });

  protected readonly countryTreeEquivalent = computed(() => {
    const emissions = this.activeCountryYearEmissions();
    const trees = (emissions * 1e9) / 22; // 22 kg per tree per year
    if (trees >= 1e9) {
      return `${(trees / 1e9).toFixed(1)}B mature trees required to offset for 1 year`;
    }
    return `${(trees / 1e6).toFixed(1)}M mature trees required to offset for 1 year`;
  });

  protected readonly visibleReports = computed(() => {
    const topic = this.activeTopic();
    return topic === 'All'
      ? this.reports()
      : this.reports().filter((report) => report.topic === topic);
  });

  protected readonly decadalEmissionsSum = computed(() => {
    const history = this.climateHistory();
    if (history.length === 0) return 0;
    return history.reduce((acc, h) => acc + h.emissions, 0);
  });

  // Plain-language summary of the global trend, used as the chart's accessible label.
  protected readonly globalChartSummary = computed(() => {
    const history = this.climateHistory();
    if (history.length === 0) return 'no data available';
    const first = history[0];
    const last = history[history.length - 1];
    const direction =
      last.emissions > first.emissions
        ? 'rising'
        : last.emissions < first.emissions
          ? 'falling'
          : 'flat';
    return `${direction} from ${first.emissions} in ${first.year} to ${last.emissions} in ${last.year}`;
  });

  protected readonly hoveredSectorIndex = signal<number | null>(null);

  protected readonly sectorsList = computed(() => {
    const sum = this.decadalEmissionsSum();
    return [
      {
        name: 'Construction & Industry',
        percentage: 41,
        color: '#f59e0b',
        value: (sum * 0.41).toFixed(1),
      },
      {
        name: 'Transport & Logistics',
        percentage: 25,
        color: '#3b82f6',
        value: (sum * 0.25).toFixed(1),
      },
      {
        name: 'Individual Habits',
        percentage: 18,
        color: '#10b981',
        value: (sum * 0.18).toFixed(1),
      },
      { name: 'Other Sectors', percentage: 10, color: '#6b7280', value: (sum * 0.1).toFixed(1) },
      {
        name: 'Wars, Disputes & Military',
        percentage: 6,
        color: '#ef4444',
        value: (sum * 0.06).toFixed(1),
      },
    ];
  });

  protected readonly donutSlices = computed(() => {
    const list = this.sectorsList();
    let cumulativePercent = 0;
    return list.map((sector, index) => {
      const strokeDashArray = `${sector.percentage} ${100 - sector.percentage}`;
      const strokeDashOffset = -cumulativePercent;
      cumulativePercent += sector.percentage;
      return {
        ...sector,
        index,
        strokeDashArray,
        strokeDashOffset,
      };
    });
  });

  protected readonly donutCenterTitle = computed(() => {
    const index = this.hoveredSectorIndex();
    if (index === null) {
      return 'Total';
    }
    const s = this.sectorsList()[index];
    return s.name.includes('&') ? s.name.split('&')[0].trim() : s.name;
  });

  protected readonly donutCenterValue = computed(() => {
    const index = this.hoveredSectorIndex();
    const sum = this.decadalEmissionsSum();
    if (index === null) {
      return `${sum.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Gt`;
    }
    const s = this.sectorsList()[index];
    return `${s.value} Gt`;
  });

  protected readonly airOxygenClaimed = computed(() => {
    const totalKg = this.visibleReports().reduce(
      (sum, report) => sum + Math.max(report.co2EquivalentKg, 0),
      0,
    );
    const people = Math.round(totalKg / PERSON_OXYGEN_KG_CO2_PER_YEAR);
    return `${people.toLocaleString()} people`;
  });

  protected readonly waterGlacierMelt = computed(() => {
    const totalKg = this.visibleReports().reduce(
      (sum, report) => sum + Math.max(report.co2EquivalentKg, 0),
      0,
    );
    const pools = (totalKg * GLACIER_MELT_LITRES_PER_KG) / OLYMPIC_POOL_LITRES;
    return `${pools.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} pools`;
  });

  protected readonly landParksErased = computed(() => {
    const totalKg = this.visibleReports().reduce(
      (sum, report) => sum + Math.max(report.co2EquivalentKg, 0),
      0,
    );
    const parks = totalKg / CITY_PARK_KG_CO2;
    return `${parks.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} parks`;
  });

  protected readonly habitCommuteYears = computed(() => {
    const totalKg = this.visibleReports().reduce(
      (sum, report) => sum + Math.max(report.co2EquivalentKg, 0),
      0,
    );
    const years = Math.round(totalKg / COMMUTE_YEAR_KG_CO2);
    return `${years.toLocaleString()} years`;
  });

  protected readonly topicVotes = computed(() => {
    const reports = this.reports();
    const topicSums = this.topics
      .filter((topic): topic is Exclude<TopicFilter, 'All'> => topic !== 'All')
      .map((topic) => {
        const topicReports = reports.filter((r) => r.topic === topic);
        const sum = topicReports.reduce((total, r) => total + (r.votes ?? 0), 0);
        return { topic, votes: sum };
      });

    topicSums.sort((a, b) => b.votes - a.votes);
    const maxVotes = Math.max(...topicSums.map((t) => t.votes), 1);

    return topicSums.map((t) => ({
      topic: t.topic,
      votes: t.votes,
      percentage: Math.max(5, Math.round((t.votes / maxVotes) * 100)),
    }));
  });

  ngOnInit(): void {
    if (this.isBrowser) {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        try {
          const ids = JSON.parse(stored) as string[];
          this.protestedReportIds.set(new Set(ids));
        } catch (e) {
          console.warn('Failed to parse protested reports from localStorage', e);
        }
      }

      const storedActions = localStorage.getItem('ecometrics_contribution_actions');
      if (storedActions) {
        try {
          const checkedIds = JSON.parse(storedActions) as string[];
          this.contributionActions.update((actions) =>
            actions.map((a) => ({ ...a, checked: checkedIds.includes(a.id) })),
          );
        } catch (e) {
          console.warn('Failed to parse contribution actions from localStorage', e);
        }
      }
    }

    // Adjust votes of modeledBriefs based on whether they are protested
    const adjustedModeled = this.modeledBriefs.map((brief) => {
      const hasProtested = this.protestedReportIds().has(brief.id);
      const baseVotes = brief.votes || this.getStableVotes(brief.id);

      return {
        ...brief,
        votes: baseVotes + (hasProtested ? 1 : 0),
      };
    });
    this.modeledBriefs = adjustedModeled;
    this.reports.set(adjustedModeled.filter((r) => r.co2EquivalentKg > 0));

    const initialActive = this.reports()[0];
    if (initialActive) {
      this.activeReport.set(initialActive);
    }
    this.fetchClimateHistory();
    this.fetchCountryEmissions();
    if (this.isBrowser) {
      this.loadWorldMapSvg();
    }
  }

  private fetchClimateHistory(): void {
    this.impactService.getClimateHistory().subscribe({
      next: (data) => {
        this.climateHistory.set(data.history);
        this.historySource.set(data.source);
      },
      error: () => {
        console.warn('Could not fetch historical climate data from backend');
      },
    });
  }

  protected setTopic(topic: TopicFilter): void {
    this.activeTopic.set(topic);
    const first = this.visibleReports()[0];
    if (first) {
      this.activeReport.set(first);
    }
  }

  protected setActiveReport(report: ImpactReport): void {
    this.activeReport.set(this.toDashboardBrief(report));
  }

  protected restoreModeledBriefs(): void {
    this.error.set(null);
    const filtered = this.modeledBriefs.filter((r) => r.co2EquivalentKg > 0);
    this.reports.set(filtered);
    this.activeTopic.set('All');
    this.activeReport.set(filtered[0] ?? null);
    this.isLiveFeed.set(false);
  }

  protected toggleAction(id: string): void {
    this.contributionActions.update((actions) =>
      actions.map((a) => (a.id === id ? { ...a, checked: !a.checked } : a)),
    );
    if (this.isBrowser) {
      const checkedIds = this.contributionActions()
        .filter((a) => a.checked)
        .map((a) => a.id);
      localStorage.setItem('ecometrics_contribution_actions', JSON.stringify(checkedIds));
    }
  }

  protected triggerAnalysis(): void {
    this.loading.set(true);
    this.error.set(null);

    this.impactService.analyzeNews(this.searchQuery || undefined).subscribe({
      next: (data) => {
        this.applyIncomingReports(data);
        this.isLiveFeed.set(true);
      },
      error: () => {
        this.error.set('Live analysis is unavailable.');
        this.loading.set(false);
      },
    });
  }

  protected manualFetchNews(): void {
    this.loading.set(true);
    this.error.set(null);
    this.impactService.getReports().subscribe({
      next: (data) => {
        if (data.length > 0) {
          this.applyIncomingReports(data);
          this.isLiveFeed.set(true);
        } else {
          this.error.set('No latest news found.');
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('Backend feed is offline.');
        this.loading.set(false);
      },
    });
  }

  private applyIncomingReports(data: ImpactReport[]): void {
    const incoming = data
      .filter((report) => report.co2EquivalentKg > 0)
      .map((report) => this.toDashboardBrief(report));
    this.reports.set(
      incoming.length > 0 ? incoming : this.modeledBriefs.filter((r) => r.co2EquivalentKg > 0),
    );
    this.activeReport.set(this.reports()[0] ?? null);
    this.activeTopic.set('All');
    this.loading.set(false);
  }

  private toDashboardBrief(report: ImpactReport): DashboardBrief {
    if ('topic' in report && 'votes' in report) {
      return report as DashboardBrief;
    }

    const title = report.articleTitle.toLowerCase();
    const category = (report.category || '').toLowerCase();
    let topic: DashboardBrief['topic'];

    // 1. Specific keywords in title take precedence for Tech/AI
    if (
      title.includes('data') ||
      title.includes('ai') ||
      title.includes('compute') ||
      title.includes('intelligence') ||
      title.includes('gpu') ||
      title.includes('semiconductor')
    ) {
      topic = 'Tech/AI';
    }
    // 2. Map based on the backend category-badge
    else if (category === 'energy' || category === 'transport' || category === 'industry') {
      topic = 'Aviation & Energy';
    } else if (category === 'deforestation' || category === 'agriculture') {
      topic = 'Ecosystems & Tourism';
    } else if (category === 'general') {
      topic = 'Climate & Policy';
    }
    // 3. Fallback to title keywords if category is not specified or general
    else {
      topic =
        title.includes('airline') ||
        title.includes('aviation') ||
        title.includes('travel') ||
        title.includes('fifa') ||
        title.includes('f1') ||
        title.includes('flight') ||
        title.includes('fuel') ||
        title.includes('oil') ||
        title.includes('gas') ||
        title.includes('coal')
          ? 'Aviation & Energy'
          : title.includes('resort') ||
              title.includes('wetland') ||
              title.includes('ecosystem') ||
              title.includes('tourism') ||
              title.includes('moorings') ||
              title.includes('amoc') ||
              title.includes('alban') ||
              title.includes('forest') ||
              title.includes('glacier') ||
              title.includes('reef') ||
              title.includes('wildlife')
            ? 'Ecosystems & Tourism'
            : 'Climate & Policy';
    }

    const baseVotes = this.getStableVotes(report.id);
    const hasProtested = this.protestedReportIds().has(report.id);
    const votes = baseVotes + (hasProtested ? 1 : 0);

    return {
      ...report,
      topic,
      leaderMove:
        'Policy, capital allocation, and public messaging can either accelerate cleaner alternatives or normalize higher-carbon defaults.',
      actionNudge:
        'Compare the story with your own energy, travel, and consumption choices before sharing or supporting it.',
      votes,
    };
  }

  protected handleVote(reportId: string, direction: 'up' | 'down'): void {
    this.protestedReportIds.update((prev) => {
      const next = new Set(prev);
      if (direction === 'up') {
        next.add(reportId);
      } else {
        next.delete(reportId);
      }
      if (this.isBrowser) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(next)));
      }
      return next;
    });

    this.reports.update((prev) =>
      prev.map((report) => {
        if (report.id === reportId) {
          const change = direction === 'up' ? 1 : -1;
          return { ...report, votes: (report.votes ?? 0) + change };
        }
        return report;
      }),
    );

    const active = this.activeReport();
    if (active && active.id === reportId) {
      const change = direction === 'up' ? 1 : -1;
      this.activeReport.set({ ...active, votes: (active.votes ?? 0) + change });
    }
  }

  private fetchCountryEmissions(): void {
    this.impactService.getCountryEmissions().subscribe({
      next: (data) => {
        this.countryEmissions.set(data);
      },
      error: (err) => {
        console.warn('Could not fetch country emissions from backend:', err);
      },
    });
  }

  protected onYearSliderChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.selectedYear.set(parseInt(value, 10));
  }

  protected onCountrySelect(event: Event): void {
    this.selectedCountryCode.set((event.target as HTMLSelectElement).value);
  }

  private loadWorldMapSvg(): void {
    this.http.get('world-map.svg', { responseType: 'text' }).subscribe({
      next: (svg) => {
        const cleanedSvg = svg
          .replace(/<\?xml[^>]*\?>/g, '')
          .replace(/<!DOCTYPE[^>]*>/g, '')
          // Defense-in-depth: strip any active content before injecting the (app-owned) asset.
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
          .replace(/javascript:/gi, '')
          .replace('<svg ', '<svg class="world-map-svg" ')
          .replace(/<title>[^<]*<\/title>/g, '')
          .replace(/<desc>[\s\S]*?<\/desc>/g, '');
        // Publish the markup; the afterRenderEffect injects and recolors it in the DOM.
        this.svgMarkup.set(cleanedSvg);
      },
      error: (err) => {
        console.error('Failed to load world map SVG:', err);
      },
    });
  }

  /** Resolves the ISO country code for a delegated map event, or null if not a tracked country. */
  private countryCodeFromEvent(event: Event): string | null {
    const target = event.target as Element | null;
    const el = target?.closest('[id]');
    if (!el) return null;
    const code = el.id.toUpperCase();
    return this.countryEmissions().some((c) => c.code === code) ? code : null;
  }

  protected onMapClick(event: Event): void {
    const code = this.countryCodeFromEvent(event);
    if (code) {
      this.selectedCountryCode.set(code);
    }
  }

  protected onMapHover(event: Event): void {
    this.hoveredCountryCode.set(this.countryCodeFromEvent(event));
  }

  protected onMapLeave(): void {
    this.hoveredCountryCode.set(null);
  }

  private styleMap(
    container: HTMLElement,
    countries: CountryEmissions[],
    year: number,
    selected: string,
    hovered: string | null,
  ): void {
    const paths = container.querySelectorAll('path');
    paths.forEach((path) => {
      try {
        let code = '';
        const pathId = path.getAttribute('id');
        if (pathId) {
          code = pathId.toUpperCase();
        } else {
          const parent = path.parentElement;
          if (parent && parent.tagName.toLowerCase() === 'g') {
            const parentId = parent.getAttribute('id');
            if (parentId) {
              code = parentId.toUpperCase();
            }
          }
        }

        if (!code) {
          path.setAttribute('fill', '#e2ebd6');
          path.setAttribute('stroke', '#ffffff');
          path.setAttribute('stroke-width', '0.6');
          path.classList.remove('interactive-country');
          return;
        }

        const cData = countries.find((c) => c.code === code);
        if (cData) {
          const yrData = cData.history.find((h) => h.year === year);
          const emissions = yrData ? yrData.emissions : 0;

          let fill = '#a7f3d0'; // Green (< 1 Gt)
          if (emissions > 4.0) {
            fill = '#fca5a5'; // Red (> 4 Gt)
          } else if (emissions >= 1.0) {
            fill = '#fde68a'; // Orange (1-4 Gt)
          }

          const isHovered = hovered === code;
          const isSelected = selected === code;
          if (isHovered || isSelected) {
            if (emissions > 4.0) {
              fill = '#ef4444';
            } else if (emissions >= 1.0) {
              fill = '#f59e0b';
            } else {
              fill = '#10b981';
            }
          }

          path.setAttribute('fill', fill);
          path.setAttribute('stroke', isSelected ? '#111827' : '#ffffff');
          path.setAttribute('stroke-width', isSelected ? '2.2' : '1.0');
          path.classList.add('interactive-country');
          if (isSelected) {
            path.classList.add('active');
          } else {
            path.classList.remove('active');
          }
        } else {
          path.setAttribute('fill', '#e2ebd6');
          path.setAttribute('stroke', '#ffffff');
          path.setAttribute('stroke-width', '0.6');
          path.classList.remove('interactive-country');
        }
      } catch (err) {
        console.error('Failed to style world map path:', err);
      }
    });
  }
  private renderGlobalChart(
    canvas: HTMLCanvasElement,
    history: { year: number; emissions: number }[],
  ): void {
    Chart.getChart(canvas)?.destroy();

    const labels = history.map((h) => h.year.toString());
    const data = history.map((h) => h.emissions);

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Emissions (Gt CO₂)',
            data,
            borderColor: '#b91c1c',
            borderWidth: 2,
            pointBackgroundColor: '#b91c1c',
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false,
            tension: 0.2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 10, weight: 'bold' },
            bodyFont: { size: 10 },
            callbacks: {
              label: (ctx) => `${ctx.raw} Gt CO₂`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 8 }, color: '#657064' },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 8 }, color: '#657064' },
          },
        },
      },
    });
  }
  private renderCountryChart(
    canvas: HTMLCanvasElement,
    country: CountryEmissions,
    selectedYr: number,
  ): void {
    Chart.getChart(canvas)?.destroy();

    const labels = country.history.map((h) => h.year.toString());
    const data = country.history.map((h) => h.emissions);

    const pointRadiuses = country.history.map((h) => (h.year === selectedYr ? 5 : 2.5));
    const pointBackgroundColors = country.history.map((h) =>
      h.year === selectedYr ? '#ef4444' : '#0284c7',
    );
    const pointBorderColors = country.history.map((h) =>
      h.year === selectedYr ? '#ffffff' : '#0284c7',
    );
    const pointBorderWidths = country.history.map((h) => (h.year === selectedYr ? 2 : 1));

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: '#0284c7',
            borderWidth: 2,
            pointBackgroundColor: pointBackgroundColors,
            pointBorderColor: pointBorderColors,
            pointBorderWidth: pointBorderWidths,
            pointRadius: pointRadiuses,
            pointHoverRadius: 6,
            fill: false,
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 9, weight: 'bold' },
            bodyFont: { size: 9 },
            callbacks: {
              label: (ctx) => `${ctx.raw} Gt CO₂`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 7.5 }, color: '#657064' },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 7.5 }, color: '#657064' },
          },
        },
      },
    });
  }
}
