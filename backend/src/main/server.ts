import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
// Load environment variables first using absolute path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { FirestoreRepository } from '../infrastructure/database/FirestoreRepository';
import { GeminiClient } from '../infrastructure/services/GeminiClient';
import { NewsClient } from '../infrastructure/services/NewsClient';
import { AnalyzeNewsImpact } from '../application/use-cases/AnalyzeNewsImpact';
import { COUNTRY_EMISSIONS } from './country-emissions';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Security Middleware
app.use(helmet());
// Restrict CORS to an explicit allow-list (never the wildcard "*"). Configure production
// origins via ALLOWED_ORIGINS; falls back to the local dev origin only.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:4200'];
app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  })
);
// Cap request bodies to mitigate denial-of-service via oversized payloads.
app.use(express.json({ limit: '16kb' }));

// 2. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter as unknown as RequestHandler);

// 3. Dependency Injection Setup
let analyzeNewsImpactUseCase: AnalyzeNewsImpact;
let isUseCaseInitialized = false;
let isPopulating = false;
try {
  if (process.env.LIVE !== 'true') {
    console.log('EcoMetrics starting in OFFLINE mock mode. Serving data from test-data.json');
    analyzeNewsImpactUseCase = new AnalyzeNewsImpact({} as never, {} as never, {} as never);
    isUseCaseInitialized = true;
  } else {
    const repository = new FirestoreRepository();
    const geminiClient = new GeminiClient();
    const newsClient = new NewsClient();
    analyzeNewsImpactUseCase = new AnalyzeNewsImpact(newsClient, geminiClient, repository);
    isUseCaseInitialized = true;
  }
} catch (error) {
  console.warn(
    'Backend services could not be fully initialized due to missing keys or configuration. Some endpoints may fail.'
  );
  console.error(error);
  // Fall back to a dummy use case to allow offline fallback requests (LIVE=false)
  analyzeNewsImpactUseCase = new AnalyzeNewsImpact({} as never, {} as never, {} as never);
  isUseCaseInitialized = false;
}

// 4. API Input Validation Schema
const AnalyzeQuerySchema = z.object({
  q: z.string().min(2).max(100).optional(),
});

const STATIC_CLIMATE_HISTORY = [
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
];

const WORLD_BANK_URL =
  'https://api.worldbank.org/v2/country/WLD/indicator/EN.ATM.CO2E.KT?format=json&per_page=20';

export interface EmissionsPoint {
  year: number;
  emissions: number;
}

/**
 * Transforms a World Bank indicator response into a 2017–2026 emissions series
 * (in Gigatons), projecting estimates for any missing recent years. Returns
 * `null` when the payload is malformed or yields no usable data.
 */
export function parseWorldBankEmissions(json: unknown): EmissionsPoint[] | null {
  if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) {
    return null;
  }

  const records = json[1] as Array<{ date: string; value: string | null }>;
  const formatted: EmissionsPoint[] = records
    .map((rec) => ({
      year: parseInt(rec.date, 10),
      // Convert kilotons to Gigatons (1 Gt = 1,000,000 kt).
      emissions: parseFloat(rec.value as string) / 1_000_000,
    }))
    .filter((item) => item.year >= 2010 && !Number.isNaN(item.emissions))
    .map((item) => ({ year: item.year, emissions: parseFloat(item.emissions.toFixed(1)) }));

  formatted.sort((a, b) => a.year - b.year);

  // Project estimates for missing recent years (stable Global Carbon Project levels).
  const latest = formatted[formatted.length - 1];
  let currentYear = (latest?.year ?? 2020) + 1;
  let currentEmissions = latest?.emissions ?? 35.5;
  while (currentYear <= 2026) {
    currentEmissions = parseFloat((currentEmissions + 0.15).toFixed(1));
    formatted.push({ year: currentYear, emissions: currentEmissions });
    currentYear++;
  }

  const last10 = formatted.filter((item) => item.year >= 2017 && item.year <= 2026);
  return last10.length > 0 ? last10 : null;
}

// 5. Routes
app.get('/api/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.LIVE !== 'true') {
      const filePath = path.resolve(__dirname, '../../test-data.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return res.json(JSON.parse(fileContent));
    }
    const repository = new FirestoreRepository();
    const reports = await repository.getReports(70);
    const filteredReports = reports.filter((r) => r.isGlobalEvent !== false && r.co2EquivalentKg > 0);

    // If Firestore has fewer than 15 negative-impact reports, auto-populate from NewsAPI in the background.
    if (filteredReports.length < 15 && isUseCaseInitialized && !isPopulating) {
      isPopulating = true;
      console.log(
        `Only found ${filteredReports.length} negative reports. Fetching new articles to auto-populate database in background...`
      );
      analyzeNewsImpactUseCase
        .execute()
        .then(() => {
          console.log('Successfully completed background auto-population of negative reports.');
        })
        .catch((err) => {
          console.error('Failed to auto-populate negative reports in background:', err);
        })
        .finally(() => {
          isPopulating = false;
        });
    }

    res.json(filteredReports.slice(0, 20));
  } catch (error) {
    next(error);
  }
});

app.post('/api/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.LIVE === 'true' && !isUseCaseInitialized) {
      return res.status(503).json({ error: 'News analysis services are not fully initialized on the server.' });
    }

    const queryResult = AnalyzeQuerySchema.safeParse(req.body);
    if (!queryResult.success) {
      return res.status(400).json({ error: 'Invalid search query parameters', details: queryResult.error.errors });
    }

    const reports = await analyzeNewsImpactUseCase.execute(queryResult.data.q);
    res.json(reports);
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date() });
});

// Get historical 10-year climate data
app.get('/api/climate-history', async (req: Request, res: Response) => {
  const fallback = { source: 'Global Carbon Project & IEA', history: STATIC_CLIMATE_HISTORY };

  if (process.env.LIVE === 'true') {
    try {
      const apiRes = await fetch(WORLD_BANK_URL);
      if (apiRes.ok) {
        const history = parseWorldBankEmissions(await apiRes.json());
        if (history) {
          return res.json({ source: 'World Bank Open Data (Indicator EN.ATM.CO2E.KT)', history });
        }
      }
    } catch (err) {
      console.warn(
        'Could not fetch live World Bank emissions data, falling back to static history:',
        (err as Error).message
      );
    }
  }

  res.json(fallback);
});

// Get country-specific emissions data for the last 10 years
app.get('/api/country-emissions', (req: Request, res: Response) => {
  res.json(COUNTRY_EMISSIONS);
});

// 6. Global Error Handler
// Log the full error server-side, but never leak internal details (messages, stack
// traces) to the client.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled request error:', err);
  res.status(500).json({ error: 'An internal server error occurred.' });
});

export function startServer(port: number | string = PORT): Server {
  return app.listen(port, () => {
    console.log(`EcoMetrics Backend listening at http://localhost:${port}`);
  });
}

export function bootstrap(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  if (nodeEnv === 'test') {
    return false;
  }
  startServer();
  return true;
}

bootstrap();

export { app };

