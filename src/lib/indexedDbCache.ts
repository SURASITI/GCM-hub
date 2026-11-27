/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../types';

const DB_NAME = 'gcmp_hub_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'cache_kv';

const KEY_PROJECTS = 'projects_v3';
const KEY_META = 'cache_meta_v3';

const LEGACY_LS_PROJECTS = 'gcmp_cached_projects_v2';
const LEGACY_LS_LAST_FETCH = 'gcmp_last_fetch_time';
const LEGACY_LS_QUOTA_BLOCKED = 'gcmp_quota_blocked_until';

export interface CacheMeta {
  lastFetchTime: number | null;
  quotaBlockedUntil: number | null;
  rtdbUrl?: string | null;
  dataSource?: 'rtdb' | 'firestore' | 'fallback';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not supported'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore IDB write errors (e.g. restricted private mode)
  }
}

function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem(LEGACY_LS_PROJECTS);
    localStorage.removeItem(LEGACY_LS_LAST_FETCH);
    localStorage.removeItem(LEGACY_LS_QUOTA_BLOCKED);
  } catch {
    // ignore
  }
}

/**
 * Loads cached projects from IndexedDB, automatically migrating legacy localStorage cache if present.
 */
export async function getCachedProjectsFromIDB(): Promise<{
  projects: Project[] | null;
  meta: CacheMeta;
}> {
  let projects = await idbGet<Project[]>(KEY_PROJECTS);
  let meta = (await idbGet<CacheMeta>(KEY_META)) || {
    lastFetchTime: null,
    quotaBlockedUntil: null,
  };

  // One-time migration from legacy localStorage cache
  if (!projects) {
    try {
      const legacyRaw = localStorage.getItem(LEGACY_LS_PROJECTS);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          projects = parsed;
          await idbSet(KEY_PROJECTS, projects);
        }
      }

      const legacyFetch = localStorage.getItem(LEGACY_LS_LAST_FETCH);
      const legacyBlocked = localStorage.getItem(LEGACY_LS_QUOTA_BLOCKED);
      if (legacyFetch || legacyBlocked) {
        meta = {
          lastFetchTime: legacyFetch ? Number(legacyFetch) : meta.lastFetchTime,
          quotaBlockedUntil: legacyBlocked ? Number(legacyBlocked) : meta.quotaBlockedUntil,
        };
        await idbSet(KEY_META, meta);
      }

      if (legacyRaw || legacyFetch || legacyBlocked) {
        clearLegacyLocalStorage();
      }
    } catch {
      clearLegacyLocalStorage();
    }
  } else {
    // Ensure legacy localStorage is cleaned up so browser storage stays lean
    clearLegacyLocalStorage();
  }

  return { projects, meta };
}

export async function setCachedProjectsInIDB(projects: Project[]): Promise<void> {
  await idbSet(KEY_PROJECTS, projects);
  clearLegacyLocalStorage();
}

export async function updateCacheMetaInIDB(partial: Partial<CacheMeta>): Promise<CacheMeta> {
  const current = (await idbGet<CacheMeta>(KEY_META)) || {
    lastFetchTime: null,
    quotaBlockedUntil: null,
  };
  const next: CacheMeta = {
    ...current,
    ...partial,
  };
  await idbSet(KEY_META, next);
  return next;
}
