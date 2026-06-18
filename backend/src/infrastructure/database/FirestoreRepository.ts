import * as admin from 'firebase-admin';
import * as path from 'path';
import { ImpactReport } from '../../domain/entities/ImpactReport';
import { IImpactReportRepository } from '../../application/interfaces/IImpactReportRepository';

export class FirestoreRepository implements IImpactReportRepository {
  private db: admin.firestore.Firestore;
  private collectionName = 'impact_reports';

  constructor() {
    this.initializeFirebase();
    this.db = admin.firestore();
  }

  private initializeFirebase() {
    if (admin.apps.length > 0) {
      return;
    }

    try {
      if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
        // Initialize using environment variables
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
      } else {
        // Fallback to application default credentials (useful for GCP deployment environments like Cloud Run)
        const resolvedProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
        if (!resolvedProjectId) {
          throw new Error(
            'Google Cloud Project ID is not defined. Please set GOOGLE_CLOUD_PROJECT, FIREBASE_PROJECT_ID, or GCLOUD_PROJECT in your environment or .env file.'
          );
        }

        if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
          // Resolve relative path to absolute relative to backend root
          process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
        }
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: resolvedProjectId,
        });
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK. Please ensure env vars or ADC are configured.', error);
      throw new Error(`Firebase Initialization Failed: ${(error as Error).message}`);
    }
  }

  async saveReport(report: ImpactReport): Promise<void> {
    await this.db.collection(this.collectionName).doc(report.id).set(report);
  }

  async getReports(limitCount: number = 20): Promise<ImpactReport[]> {
    const snapshot = await this.db
      .collection(this.collectionName)
      .orderBy('analyzedAt', 'desc')
      .limit(limitCount)
      .get();

    const reports: ImpactReport[] = [];
    snapshot.forEach((doc) => {
      reports.push(doc.data() as ImpactReport);
    });
    return reports;
  }

  async getReportByArticleId(articleId: string): Promise<ImpactReport | null> {
    const snapshot = await this.db
      .collection(this.collectionName)
      .where('articleId', '==', articleId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    let report: ImpactReport | null = null;
    snapshot.forEach((doc) => {
      report = doc.data() as ImpactReport;
    });

    return report;
  }
}
