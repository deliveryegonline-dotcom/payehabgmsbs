import { initializeApp, cert, getApps, getApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import firebaseConfig from '../../firebase-applet-config.json';

// Ensure singleton instance
let firestoreInstance: Firestore | null = null;
let isRealFirestore = false;

/**
 * Initializes and returns the Firebase Admin Firestore instance.
 * Reads credentials strictly from environment variables according to specification:
 * - FIREBASE_SERVICE_ACCOUNT_KEY (full JSON string)
 * - Or individual variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * - Falling back to application default credentials or local transactional mock if env vars are unset.
 */
export function getAdminFirestore(): Firestore | null {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT ||
    firebaseConfig.projectId;

  const databaseId =
    process.env.FIRESTORE_DATABASE_ID ||
    firebaseConfig.firestoreDatabaseId ||
    '(default)';

  let credentialObj: any = null;

  // 1. Check for FIREBASE_SERVICE_ACCOUNT_KEY JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credentialObj = cert(parsed);
    } catch (err) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', err);
    }
  }

  // 2. Check for individual variables
  if (!credentialObj && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      credentialObj = cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      });
    } catch (err) {
      console.warn('Failed to initialize credential from individual env vars:', err);
    }
  }

  // 3. Check for GOOGLE_APPLICATION_CREDENTIALS file
  if (!credentialObj && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        const fileContent = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
        credentialObj = cert(fileContent);
      }
    } catch (err) {
      console.warn('Google application credentials check failed:', err);
    }
  }

  // Initialize Firebase Admin App
  try {
    let app: App;
    const existingApps = getApps();
    if (existingApps.length === 0) {
      if (credentialObj) {
        app = initializeApp({
          credential: credentialObj,
          projectId,
        });
      } else {
        // Unauthenticated server init (or local fallback)
        app = initializeApp({
          projectId,
        });
      }
    } else {
      app = existingApps[0]!;
    }

    if (databaseId && databaseId !== '(default)') {
      firestoreInstance = getFirestore(app, databaseId);
    } else {
      firestoreInstance = getFirestore(app);
    }

    isRealFirestore = true;
    console.log(`[Firebase Admin] Initialized Firestore for project: ${projectId}, database: ${databaseId}`);
  } catch (error) {
    console.warn('[Firebase Admin] Live Firestore connection not active, using transactional fallback engine:', error);
    isRealFirestore = false;
    firestoreInstance = null;
  }

  return firestoreInstance;
}

export function isUsingLiveFirestore(): boolean {
  return isRealFirestore;
}
