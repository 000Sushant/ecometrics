import { ImpactReport } from '../src/domain/entities/ImpactReport';

const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ set: mockSet }));
const mockLimit = jest.fn(() => ({ get: mockGet }));
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
const mockCollection = jest.fn(() => ({ doc: mockDoc, orderBy: mockOrderBy, where: mockWhere }));
const mockFirestore = jest.fn((..._args: unknown[]) => ({ collection: mockCollection }));
const mockInitializeApp = jest.fn();
const mockCert = jest.fn((..._args: unknown[]) => 'cert-credential');
const mockApplicationDefault = jest.fn((..._args: unknown[]) => 'adc-credential');
let mockApps: unknown[] = [];

jest.mock('firebase-admin', () => ({
  get apps() {
    return mockApps;
  },
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  credential: {
    cert: (...args: unknown[]) => mockCert(...args),
    applicationDefault: (...args: unknown[]) => mockApplicationDefault(...args),
  },
  firestore: (...args: unknown[]) => mockFirestore(...args),
}));

import { FirestoreRepository } from '../src/infrastructure/database/FirestoreRepository';

const FIREBASE_ENV_KEYS = [
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PROJECT_ID',
  'GOOGLE_CLOUD_PROJECT',
  'GCLOUD_PROJECT',
  'GOOGLE_APPLICATION_CREDENTIALS',
];

const sampleReport: ImpactReport = {
  id: 'report-news-1',
  articleId: 'news-1',
  articleTitle: 'Coal plant expansion',
  articleUrl: 'https://news.example/coal',
  carbonIntensity: 90,
  co2EquivalentKg: 5000,
  glacierMeltMm: 2.5,
  forestImpactSqM: -1000,
  explanation: 'Burning coal releases carbon dioxide.',
  category: 'Energy',
  analyzedAt: '2026-06-12T00:00:00Z',
  isGlobalEvent: true,
};

describe('FirestoreRepository', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    FIREBASE_ENV_KEYS.forEach((key) => {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    });
    jest.clearAllMocks();
    mockApps = [];
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    FIREBASE_ENV_KEYS.forEach((key) => {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    });
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('skips initialization when a Firebase app already exists', () => {
      mockApps = [{}];
      new FirestoreRepository();
      expect(mockInitializeApp).not.toHaveBeenCalled();
    });

    it('initializes with a service-account certificate from env vars', () => {
      process.env.FIREBASE_PRIVATE_KEY = 'line1\\nline2';
      process.env.FIREBASE_CLIENT_EMAIL = 'svc@example.com';
      process.env.FIREBASE_PROJECT_ID = 'demo-project';

      new FirestoreRepository();

      expect(mockCert).toHaveBeenCalledWith({
        projectId: 'demo-project',
        clientEmail: 'svc@example.com',
        privateKey: 'line1\nline2',
      });
      expect(mockInitializeApp).toHaveBeenCalledWith({ credential: 'cert-credential' });
    });

    it('falls back to application default credentials and resolves a relative key path', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'adc-project';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = 'keys/service-account.json';

      new FirestoreRepository();

      expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toMatch(/keys[\\/]service-account\.json$/);
      expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toMatch(/^[A-Za-z]:|^\//);
      expect(mockApplicationDefault).toHaveBeenCalled();
      expect(mockInitializeApp).toHaveBeenCalledWith({
        credential: 'adc-credential',
        projectId: 'adc-project',
      });
    });

    it('keeps an absolute credential path unchanged', () => {
      process.env.FIREBASE_PROJECT_ID = 'adc-project';
      const absolutePath = process.platform === 'win32' ? 'C:\\keys\\sa.json' : '/keys/sa.json';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = absolutePath;

      new FirestoreRepository();

      expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(absolutePath);
    });

    it('throws a wrapped error when no project id can be resolved', () => {
      expect(() => new FirestoreRepository()).toThrow(/Firebase Initialization Failed/);
    });

    it('throws a wrapped error when the SDK initialization fails', () => {
      process.env.FIREBASE_PROJECT_ID = 'adc-project';
      mockInitializeApp.mockImplementation(() => {
        throw new Error('SDK boom');
      });

      expect(() => new FirestoreRepository()).toThrow('Firebase Initialization Failed: SDK boom');
    });
  });

  describe('data access', () => {
    const buildRepository = (): FirestoreRepository => {
      mockApps = [{}]; // skip init for these tests
      return new FirestoreRepository();
    };

    it('saves a report by id', async () => {
      mockSet.mockResolvedValue(undefined);
      await buildRepository().saveReport(sampleReport);

      expect(mockCollection).toHaveBeenCalledWith('impact_reports');
      expect(mockDoc).toHaveBeenCalledWith('report-news-1');
      expect(mockSet).toHaveBeenCalledWith(sampleReport);
    });

    it('returns ordered reports using the default limit', async () => {
      mockGet.mockResolvedValue({
        forEach: (cb: (doc: { data: () => ImpactReport }) => void) => {
          [sampleReport].forEach((report) => cb({ data: () => report }));
        },
      });

      const reports = await buildRepository().getReports();

      expect(mockOrderBy).toHaveBeenCalledWith('analyzedAt', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(20);
      expect(reports).toEqual([sampleReport]);
    });

    it('honours a custom limit', async () => {
      mockGet.mockResolvedValue({ forEach: () => undefined });
      await buildRepository().getReports(70);
      expect(mockLimit).toHaveBeenCalledWith(70);
    });

    it('returns null when no report matches the article id', async () => {
      mockGet.mockResolvedValue({ empty: true, forEach: () => undefined });
      const result = await buildRepository().getReportByArticleId('missing');
      expect(result).toBeNull();
      expect(mockWhere).toHaveBeenCalledWith('articleId', '==', 'missing');
    });

    it('returns the matching report when one exists', async () => {
      mockGet.mockResolvedValue({
        empty: false,
        forEach: (cb: (doc: { data: () => ImpactReport }) => void) => cb({ data: () => sampleReport }),
      });

      const result = await buildRepository().getReportByArticleId('news-1');
      expect(result).toEqual(sampleReport);
    });
  });
});
