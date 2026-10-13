import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  setLogLevel,
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc as rawSetDoc, 
  addDoc as rawAddDoc, 
  updateDoc as rawUpdateDoc, 
  deleteDoc as rawDeleteDoc, 
  writeBatch as rawWriteBatch,
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { isFirestoreQuotaExhausted, isQuotaError, markQuotaExhausted } from './utils/quotaManager';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Silence internal Firestore SDK retry and backoff logs during quota limits
try {
  setLogLevel('silent');
} catch {
  // Ignore in environments where setLogLevel is restricted
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

let cachedAccessToken: string | null = null;

export const googleSignIn = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    cachedAccessToken = credential.accessToken;
  }
  return { user: result.user, accessToken: cachedAccessToken };
};

export const getAccessToken = async () => {
  if (cachedAccessToken) return cachedAccessToken;
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return token;
  }
  return null;
};

// Safe Firestore write wrappers that protect against free-tier write exhaustion
export const setDoc = async (...args: any[]) => {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  try {
    return await (rawSetDoc as any)(...args);
  } catch (err: any) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
      return;
    }
    throw err;
  }
};

export const addDoc = async (...args: any[]) => {
  if (isFirestoreQuotaExhausted()) {
    return { id: `local-${Date.now()}` } as any;
  }
  try {
    return await (rawAddDoc as any)(...args);
  } catch (err: any) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
      return { id: `local-${Date.now()}` } as any;
    }
    throw err;
  }
};

export const updateDoc = async (...args: any[]) => {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  try {
    return await (rawUpdateDoc as any)(...args);
  } catch (err: any) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
      return;
    }
    throw err;
  }
};

export const deleteDoc = async (...args: any[]) => {
  if (isFirestoreQuotaExhausted()) {
    return;
  }
  try {
    return await (rawDeleteDoc as any)(...args);
  } catch (err: any) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
      return;
    }
    throw err;
  }
};

export const writeBatch = (firestore: any) => {
  const batch = rawWriteBatch(firestore);
  const rawCommit = batch.commit.bind(batch);
  batch.commit = async () => {
    if (isFirestoreQuotaExhausted()) {
      return;
    }
    try {
      return await rawCommit();
    } catch (err: any) {
      if (isQuotaError(err)) {
        markQuotaExhausted();
        return;
      }
      throw err;
    }
  };
  return batch;
};

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot
};
export type { User };
