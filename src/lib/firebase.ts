/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer
} from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = dbInstance;
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

const rtdbInstances = new Map<string, Database>();
export const RTDB_URL_STORAGE_KEY = 'gcmp_rtdb_url';

export function normalizeRtdbUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null;
  let cleaned = rawUrl.trim().replace(/\/+$/, '');
  if (!cleaned) return null;
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  try {
    const parsed = new URL(cleaned);
    if (!parsed.hostname.endsWith('firebaseio.com') && !parsed.hostname.endsWith('firebasedatabase.app')) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getEnvOrLocalRtdbUrl(): string | null {
  const envUrl = (import.meta as any).env?.VITE_FIREBASE_DATABASE_URL as string | undefined;
  const configUrl = (firebaseConfig as { databaseURL?: string }).databaseURL;
  let localUrl: string | null = null;
  try {
    localUrl = localStorage.getItem(RTDB_URL_STORAGE_KEY);
  } catch {
    // ignore
  }
  return normalizeRtdbUrl(envUrl) || normalizeRtdbUrl(configUrl) || normalizeRtdbUrl(localUrl);
}

export function saveLocalRtdbUrl(url: string | null): void {
  try {
    if (url) {
      localStorage.setItem(RTDB_URL_STORAGE_KEY, url);
    } else {
      localStorage.removeItem(RTDB_URL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function getRtdbInstance(customUrl?: string | null): Database | null {
  const targetUrl = normalizeRtdbUrl(customUrl) || getEnvOrLocalRtdbUrl();
  if (!targetUrl) return null;

  const existing = rtdbInstances.get(targetUrl);
  if (existing) return existing;

  const instance = getDatabase(app, targetUrl);
  rtdbInstances.set(targetUrl, instance);
  return instance;
}

export async function fetchRtdbUrlFromConfigDoc(): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'config', 'rtdb'));
    if (snap.exists()) {
      const data = snap.data();
      return normalizeRtdbUrl(data?.databaseURL);
    }
  } catch {
    // Ignore errors when offline or config doc doesn't exist yet
  }
  return null;
}

export async function saveRtdbUrlToConfigDoc(url: string): Promise<void> {
  const normalized = normalizeRtdbUrl(url);
  if (!normalized) {
    throw new Error('URL ของ Firebase Realtime Database ไม่ถูกต้อง (ต้องลงท้ายด้วย .firebasedatabase.app หรือ .firebaseio.com)');
  }
  await setDoc(doc(db, 'config', 'rtdb'), {
    databaseURL: normalized,
    updatedAt: Date.now(),
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
