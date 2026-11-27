/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ref, get, set, update, remove, push } from 'firebase/database';
import { getRtdbInstance } from './firebase';
import { Project, ProjectComment } from '../types';

/**
 * Converts Firestore Timestamp, { seconds, nanoseconds }, ISO string, or number into Unix ms.
 */
export function normalizeTimestampToMs(val: any): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  if (val && typeof val === 'object') {
    if (typeof val.toMillis === 'function') {
      return val.toMillis();
    }
    if (typeof val.seconds === 'number') {
      return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
    }
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

/**
 * Normalizes RTDB list/object-map values into proper JavaScript arrays.
 */
function toStringArray(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string');
  }
  if (typeof raw === 'object') {
    return Object.values(raw).filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function toCommentsArray(raw: any): ProjectComment[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : typeof raw === 'object' ? Object.values(raw) : [];
  return items.filter((item): item is ProjectComment => Boolean(item && typeof item === 'object' && 'text' in item));
}

/**
 * Strips `undefined` keys deeply because Firebase Realtime Database throws on undefined values.
 */
export function sanitizeForRtdb<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      clean[key] = value.map(item =>
        item && typeof item === 'object' && !Array.isArray(item) ? sanitizeForRtdb(item) : item
      );
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      clean[key] = sanitizeForRtdb(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export function normalizeProjectFromRtdb(id: string, raw: any): Project {
  const createdMs = normalizeTimestampToMs(raw?.createdAt);
  const updatedMs = normalizeTimestampToMs(raw?.updatedAt ?? createdMs);
  const commentsList = raw?.commentsList !== undefined ? toCommentsArray(raw.commentsList) : undefined;

  return {
    id,
    title: String(raw?.title || ''),
    team: String(raw?.team || ''),
    category: String(raw?.category || 'IT'),
    thumbnail: String(raw?.thumbnail || ''),
    votes: typeof raw?.votes === 'number' ? raw.votes : 0,
    comments: typeof raw?.comments === 'number' ? raw.comments : (commentsList?.length ?? 0),
    ...(raw?.rank ? { rank: raw.rank } : {}),
    description: String(raw?.description || ''),
    ...(raw?.projectUrl ? { projectUrl: String(raw.projectUrl) } : {}),
    ...(commentsList !== undefined ? { commentsList } : {}),
    ownerId: String(raw?.ownerId || ''),
    ownerName: String(raw?.ownerName || 'Anonymous'),
    ownerAvatar: String(raw?.ownerAvatar || ''),
    createdAt: createdMs,
    updatedAt: updatedMs,
    votedUserIds: toStringArray(raw?.votedUserIds),
    favoriteCount: typeof raw?.favoriteCount === 'number' ? raw.favoriteCount : 0,
    favoritedUserIds: toStringArray(raw?.favoritedUserIds),
  };
}

/**
 * Fetches all projects from RTDB in a single one-shot `get()` call (no persistent WebSocket).
 */
export async function fetchAllProjectsFromRtdb(rtdbUrl: string): Promise<Project[]> {
  const db = getRtdbInstance(rtdbUrl);
  if (!db) throw new Error('RTDB URL is not configured');

  const snap = await get(ref(db, 'projects'));
  if (!snap.exists()) return [];

  const rawMap = snap.val() as Record<string, any>;
  const list: Project[] = Object.entries(rawMap)
    .filter(([, val]) => Boolean(val && typeof val === 'object'))
    .map(([id, val]) => normalizeProjectFromRtdb(id, val));

  list.sort((a, b) => normalizeTimestampToMs(b.createdAt) - normalizeTimestampToMs(a.createdAt));
  return list;
}

export async function fetchProjectCommentsFromRtdb(
  rtdbUrl: string,
  projectId: string
): Promise<{ commentsList: ProjectComment[]; commentsCount: number } | null> {
  const db = getRtdbInstance(rtdbUrl);
  if (!db) return null;

  const snap = await get(ref(db, `projects/${projectId}`));
  if (!snap.exists()) return null;

  const data = snap.val();
  const commentsList = toCommentsArray(data?.commentsList);
  const commentsCount = typeof data?.comments === 'number' ? data.comments : commentsList.length;
  return { commentsList, commentsCount };
}

export async function createProjectInRtdb(
  rtdbUrl: string,
  projectData: Omit<Project, 'id'>
): Promise<string> {
  const db = getRtdbInstance(rtdbUrl);
  if (!db) throw new Error('RTDB URL is not configured');

  const newRef = push(ref(db, 'projects'));
  if (!newRef.key) throw new Error('Failed to generate project key in RTDB');

  const clean = sanitizeForRtdb({
    ...projectData,
    id: newRef.key,
    createdAt: normalizeTimestampToMs(projectData.createdAt),
    updatedAt: normalizeTimestampToMs(projectData.updatedAt),
  });

  await set(newRef, clean);
  return newRef.key;
}

export async function writeProjectWithIdInRtdb(
  rtdbUrl: string,
  projectId: string,
  projectData: Record<string, any>
): Promise<void> {
  const db = getRtdbInstance(rtdbUrl);
  if (!db) throw new Error('RTDB URL is not configured');

  const clean = sanitizeForRtdb({
    ...projectData,
    id: projectId,
    createdAt: normalizeTimestampToMs(projectData.createdAt),
    updatedAt: normalizeTimestampToMs(projectData.updatedAt),
  });

  await set(ref(db, `projects/${projectId}`), clean);
}

export async function updateProjectInRtdb(
  rtdbUrl: string,
  projectId: string,
  patch: Record<string, any>
): Promise<void> {
  const db = getRtdbInstance(rtdbUrl);
  if (!db) throw new Error('RTDB URL is not configured');

  const clean = sanitizeForRtdb(patch);
  await update(ref(db, `projects/${projectId}`), clean);
}

export async function deleteProjectInRtdb(rtdbUrl: string, projectId: string): Promise<void> {
  const db = getRtdbInstance(rtdbUrl);
  if (!db) throw new Error('RTDB URL is not configured');

  await remove(ref(db, `projects/${projectId}`));
}
