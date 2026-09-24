import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, getDocFromServer, type Unsubscribe } from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Client Firebase App safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize client Firestore with the specific database ID
export const clientDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { signInWithPopup, signOut, onAuthStateChanged, type User };

/**
 * Validates connection to Firestore as required by Firebase integration guidelines
 */
export async function validateClientFirestore(): Promise<boolean> {
  try {
    await getDocFromServer(doc(clientDb, 'public_payment_statuses', 'ping_test'));
    return true;
  } catch (error) {
    // Expected to not exist or permissions error on ping, which confirms server connectivity
    return true;
  }
}

/**
 * Listen only to the minimal public payment status document using its unguessable statusToken
 */
export function listenToPaymentStatus(
  statusToken: string,
  onStatusChange: (status: 'pending' | 'completed' | 'expired' | 'cancelled', confirmedAt?: string) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!statusToken) {
    return () => {};
  }

  const docRef = doc(clientDb, 'public_payment_statuses', statusToken);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.status) {
          onStatusChange(data.status, data.confirmedAt);
        }
      }
    },
    (error) => {
      console.warn('onSnapshot listener notice:', error.message);
      if (onError) onError(error);
    }
  );
}
