/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { Project } from '../types';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  OperationType,
  handleFirestoreError,
  testFirestoreConnection,
  getEnvOrLocalRtdbUrl,
  saveLocalRtdbUrl,
  normalizeRtdbUrl,
  fetchRtdbUrlFromConfigDoc,
  saveRtdbUrlToConfigDoc,
} from '../lib/firebase';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import {
  fetchAllProjectsFromRtdb,
  fetchProjectCommentsFromRtdb,
  createProjectInRtdb,
  writeProjectWithIdInRtdb,
  updateProjectInRtdb,
  deleteProjectInRtdb,
  normalizeTimestampToMs,
} from '../lib/rtdbProjects';
import {
  compressImage,
  THUMBNAIL_COMPRESS_OPTIONS,
  AVATAR_COMPRESS_OPTIONS,
  getDataUrlByteSize,
  needsImageOptimization,
  optimizeRemoteImageUrl
} from '../lib/imageCompressor';
import {
  getCachedProjectsFromIDB,
  setCachedProjectsInIDB,
  updateCacheMetaInIDB,
  CacheMeta
} from '../lib/indexedDbCache';
import { FALLBACK_PROJECTS } from '../data/fallbackProjects';

export interface BatchOptimizeState {
  isRunning: boolean;
  total: number;
  processed: number;
  updatedCount: number;
  savedBytes: number;
  currentTitle: string;
  completed: boolean;
  error: string | null;
}

export interface MigrationState {
  isRunning: boolean;
  total: number;
  processed: number;
  migratedCount: number;
  compressedCount: number;
  savedBytes: number;
  currentTitle: string;
  completed: boolean;
  error: string | null;
}

export type ActiveDataSource = 'rtdb' | 'firestore' | 'fallback';

interface ProjectContextType {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'votes' | 'comments' | 'ownerId' | 'ownerName' | 'ownerAvatar' | 'createdAt' | 'updatedAt'> & { ownerAvatar?: string }) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  voteProject: (id: string) => Promise<void>;
  commentProject: (id: string, text: string) => Promise<void>;
  fetchProjectComments: (projectId: string) => Promise<void>;
  commentsLoading: Record<string, boolean>;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isOptimizerModalOpen: boolean;
  setIsOptimizerModalOpen: (open: boolean) => void;
  isMigrationModalOpen: boolean;
  setIsMigrationModalOpen: (open: boolean) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  user: User | null;
  guestId: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  editingProject: Project | null;
  setEditingProject: (project: Project | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isQuotaExceeded: boolean;
  upgradeUrl: string;
  refreshProjects: (force?: boolean) => Promise<void>;
  isRefreshing: boolean;
  lastSyncedAt: Date | null;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
  batchOptimizeState: BatchOptimizeState;
  batchOptimizeFirestoreImages: () => Promise<{ updatedCount: number; savedBytes: number }>;
  resetBatchOptimizeState: () => void;
  rtdbUrl: string | null;
  activeDataSource: ActiveDataSource;
  migrationState: MigrationState;
  migrateFirestoreToRtdb: (targetUrl: string, compressDuringMigration?: boolean) => Promise<{ migratedCount: number; savedBytes: number }>;
  resetMigrationState: () => void;
  inspectDatabaseCounts: (targetUrl?: string) => Promise<{ firestoreCount: number; rtdbCount: number | null; rtdbError?: string }>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const INITIAL_OPTIMIZE_STATE: BatchOptimizeState = {
  isRunning: false,
  total: 0,
  processed: 0,
  updatedCount: 0,
  savedBytes: 0,
  currentTitle: '',
  completed: false,
  error: null,
};

const INITIAL_MIGRATION_STATE: MigrationState = {
  isRunning: false,
  total: 0,
  processed: 0,
  migratedCount: 0,
  compressedCount: 0,
  savedBytes: 0,
  currentTitle: '',
  completed: false,
  error: null,
};

const CACHE_TTL_MS = 30 * 60 * 1000;

export function ProjectProvider({ children }: { children: ReactNode }) {
  const UPGRADE_URL = 'https://console.firebase.google.com/project/gen-lang-client-0975890740/firestore/databases/ai-studio-09cb01fe-005d-46bd-a981-67c24e4715da/data?openUpgradeDialog=true';

  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [rtdbUrl, setRtdbUrl] = useState<string | null>(() => getEnvOrLocalRtdbUrl());
  const [activeDataSource, setActiveDataSource] = useState<ActiveDataSource>('fallback');

  const cacheMetaRef = useRef<CacheMeta>({ lastFetchTime: null, quotaBlockedUntil: null });
  const rtdbUrlRef = useRef<string | null>(rtdbUrl);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOptimizerModalOpen, setIsOptimizerModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [batchOptimizeState, setBatchOptimizeState] = useState<BatchOptimizeState>(INITIAL_OPTIMIZE_STATE);
  const [migrationState, setMigrationState] = useState<MigrationState>(INITIAL_MIGRATION_STATE);

  const showToast = (msg: string, duration = 4500) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const [guestId] = useState<string>(() => {
    let gid = localStorage.getItem('gcmp_guest_id');
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('gcmp_guest_id', gid);
    }
    return gid;
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const gid = localStorage.getItem('gcmp_guest_id') || '';
    if (!gid) return [];
    const stored = localStorage.getItem(`gcmp_favorites_${gid}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email?.toLowerCase() === 'mosy_nicky@hotmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const mergeCommentsAndCache = (incomingProjects: Project[], source: ActiveDataSource) => {
    setProjects(prev => {
      const commentsCache = new Map<string, Project['commentsList']>(
        prev.filter(p => p.commentsList).map(p => [p.id, p.commentsList])
      );
      const merged: Project[] = incomingProjects.map(p => {
        if (!p.commentsList && commentsCache.has(p.id)) {
          return { ...p, commentsList: commentsCache.get(p.id) };
        }
        return p;
      });
      setCachedProjectsInIDB(merged);
      return merged;
    });
    setActiveDataSource(source);
  };

  const fetchProjects = async (
    force: boolean = false,
    hydratedMeta?: CacheMeta,
    hasCachedData: boolean = false,
    resolvedRtdbUrl?: string | null
  ) => {
    const meta = hydratedMeta || cacheMetaRef.current;
    const activeRtdb = resolvedRtdbUrl !== undefined ? resolvedRtdbUrl : rtdbUrlRef.current;

    if (!force) {
      if (!activeRtdb && meta.quotaBlockedUntil && Date.now() < meta.quotaBlockedUntil) {
        setIsQuotaExceeded(true);
        return;
      }

      if (meta.lastFetchTime && (hasCachedData || projects.length > 0) && Date.now() - meta.lastFetchTime < CACHE_TTL_MS) {
        return;
      }
    }

    setIsRefreshing(true);

    try {
      // 1. Primary source: Firebase Realtime Database (if configured)
      if (activeRtdb) {
        try {
          const rtdbProjects = await fetchAllProjectsFromRtdb(activeRtdb);
          if (rtdbProjects.length > 0) {
            mergeCommentsAndCache(rtdbProjects, 'rtdb');
            const now = Date.now();
            cacheMetaRef.current = await updateCacheMetaInIDB({
              lastFetchTime: now,
              quotaBlockedUntil: null,
              rtdbUrl: activeRtdb,
              dataSource: 'rtdb',
            });
            setLastSyncedAt(new Date(now));
            setIsQuotaExceeded(false);
            return;
          }
        } catch (rtdbErr) {
          console.warn('RTDB fetch notice (falling back to Firestore/cache):', rtdbErr);
        }
      }

      // 2. Safe Fallback: Cloud Firestore (only when RTDB is not configured or still empty)
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        const projectsData = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as Project[];

        mergeCommentsAndCache(projectsData, 'firestore');

        const now = Date.now();
        cacheMetaRef.current = await updateCacheMetaInIDB({
          lastFetchTime: now,
          quotaBlockedUntil: null,
          dataSource: 'firestore',
        });
        setLastSyncedAt(new Date(now));
        setIsQuotaExceeded(false);
      }
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      const isQuota = errMsg.toLowerCase().includes('quota') ||
                      errMsg.includes('Free daily read units') ||
                      error?.code === 'resource-exhausted';

      if (isQuota) {
        console.warn('Firestore Quota reached: serving projects from IndexedDB/fallback cache.');
        setIsQuotaExceeded(true);
        const blockedUntil = Date.now() + 2 * 60 * 60 * 1000;
        cacheMetaRef.current = await updateCacheMetaInIDB({ quotaBlockedUntil: blockedUntil });
      } else {
        console.warn('Database fetch notice:', errMsg);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      testFirestoreConnection();

      const { projects: cachedProjects, meta } = await getCachedProjectsFromIDB();
      if (!isMounted) return;

      cacheMetaRef.current = meta;

      // Resolve RTDB URL from env -> config -> localStorage -> IDB -> Firestore config doc
      let resolvedUrl = getEnvOrLocalRtdbUrl() || normalizeRtdbUrl(meta.rtdbUrl);
      if (!resolvedUrl) {
        resolvedUrl = await fetchRtdbUrlFromConfigDoc();
        if (resolvedUrl) {
          saveLocalRtdbUrl(resolvedUrl);
          cacheMetaRef.current = await updateCacheMetaInIDB({ rtdbUrl: resolvedUrl });
        }
      }

      if (!isMounted) return;
      if (resolvedUrl) {
        rtdbUrlRef.current = resolvedUrl;
        setRtdbUrl(resolvedUrl);
      }

      if (meta.dataSource) {
        setActiveDataSource(meta.dataSource);
      }

      const hasCached = !!(cachedProjects && cachedProjects.length > 0);
      if (hasCached && cachedProjects) {
        setProjects(cachedProjects);
      }
      if (meta.lastFetchTime) {
        setLastSyncedAt(new Date(meta.lastFetchTime));
      }
      if (!resolvedUrl && meta.quotaBlockedUntil && Date.now() < meta.quotaBlockedUntil) {
        setIsQuotaExceeded(true);
      }

      await fetchProjects(false, meta, hasCached, resolvedUrl);
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchProjectComments = async (projectId: string) => {
    if (commentsLoading[projectId]) return;

    setCommentsLoading(prev => ({ ...prev, [projectId]: true }));
    try {
      const currentRtdb = rtdbUrlRef.current;
      if (currentRtdb && activeDataSource === 'rtdb') {
        const res = await fetchProjectCommentsFromRtdb(currentRtdb, projectId);
        if (res) {
          setProjects(prev => {
            const updated = prev.map(p =>
              p.id === projectId
                ? { ...p, comments: res.commentsCount, commentsList: res.commentsList }
                : p
            );
            setCachedProjectsInIDB(updated);
            return updated;
          });
          return;
        }
      }

      const projectRef = doc(db, 'projects', projectId);
      const snap = await getDoc(projectRef);
      if (snap.exists()) {
        const data = snap.data();
        const commentsList = (data.commentsList || []) as Project['commentsList'];
        const commentsCount = typeof data.comments === 'number' ? data.comments : (commentsList ? commentsList.length : 0);

        setProjects(prev => {
          const updated = prev.map(p => {
            if (p.id === projectId) {
              return {
                ...p,
                comments: commentsCount,
                commentsList: commentsList
              };
            }
            return p;
          });
          setCachedProjectsInIDB(updated);
          return updated;
        });
      }
    } catch (error) {
      console.warn('Could not fetch project comments on-demand:', error);
    } finally {
      setCommentsLoading(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const refreshProjects = async (force: boolean = true) => {
    await fetchProjects(force);
  };

  useEffect(() => {
    const identifier = user ? user.uid : guestId;
    if (!identifier || projects.length === 0) return;

    const dbFavorites = projects
      .filter((p) => p.favoritedUserIds?.includes(identifier))
      .map((p) => p.id);

    localStorage.setItem(`gcmp_favorites_${identifier}`, JSON.stringify(dbFavorites));

    setFavorites((prev) => {
      const prevSorted = [...prev].sort().join(',');
      const dbSorted = [...dbFavorites].sort().join(',');
      if (prevSorted !== dbSorted) {
        return dbFavorites;
      }
      return prev;
    });
  }, [projects, user, guestId]);

  const useRtdbForWrites = Boolean(rtdbUrlRef.current && activeDataSource === 'rtdb');

  const toggleFavorite = async (id: string) => {
    const identifier = user ? user.uid : guestId;
    if (!identifier) return;

    const project = projects.find((p) => p.id === id);
    if (!project) return;

    const isCurrentlyFavorited = favorites.includes(id);

    const newFavoritesList = isCurrentlyFavorited
      ? favorites.filter((favId) => favId !== id)
      : [...favorites, id];

    setFavorites(newFavoritesList);
    localStorage.setItem(`gcmp_favorites_${identifier}`, JSON.stringify(newFavoritesList));

    const favoritedUserIds = project.favoritedUserIds || [];
    const newDbUserIds = isCurrentlyFavorited
      ? favoritedUserIds.filter((uid) => uid !== identifier)
      : Array.from(new Set([...favoritedUserIds, identifier]));
    const newFavoriteCount = isCurrentlyFavorited
      ? Math.max(0, (project.favoriteCount || 0) - 1)
      : (project.favoriteCount || 0) + 1;

    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? {
        ...p,
        favoriteCount: newFavoriteCount,
        favoritedUserIds: newDbUserIds,
      } : p);
      setCachedProjectsInIDB(updated);
      return updated;
    });

    try {
      if (useRtdbForWrites && rtdbUrlRef.current) {
        await updateProjectInRtdb(rtdbUrlRef.current, id, {
          favoriteCount: newFavoriteCount,
          favoritedUserIds: newDbUserIds,
        });
      } else {
        const projectRef = doc(db, 'projects', id);
        await updateDoc(projectRef, {
          favoriteCount: newFavoriteCount,
          favoritedUserIds: newDbUserIds,
        });
      }
    } catch (error) {
      console.error('Error updating favorite in database', error);
    }
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  /**
   * Enforces Ultra-Compact WebP sizing on both thumbnail (<=360px, <=35KB)
   * and ownerAvatar (<=96px, <=10KB) prior to any database write.
   */
  const enforceImageLimits = async (data: { thumbnail?: string; ownerAvatar?: string }) => {
    const out: { thumbnail?: string; ownerAvatar?: string } = {};

    if (data.thumbnail !== undefined) {
      if (data.thumbnail.startsWith('data:image/')) {
        out.thumbnail = await compressImage(data.thumbnail, THUMBNAIL_COMPRESS_OPTIONS);
      } else {
        out.thumbnail = optimizeRemoteImageUrl(data.thumbnail);
      }
    }

    if (data.ownerAvatar !== undefined) {
      if (data.ownerAvatar.startsWith('data:image/')) {
        out.ownerAvatar = await compressImage(data.ownerAvatar, AVATAR_COMPRESS_OPTIONS);
      } else {
        out.ownerAvatar = optimizeRemoteImageUrl(data.ownerAvatar);
      }
    }

    return out;
  };

  const addProject = async (newProjectData: any) => {
    if (!user) {
      throw new Error('You must be signed in to add projects.');
    }

    try {
      const compressedImages = await enforceImageLimits({
        thumbnail: newProjectData.thumbnail,
        ownerAvatar: newProjectData.ownerAvatar || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Anonymous')}`,
      });

      const sanitizedProjectData = {
        ...newProjectData,
        thumbnail: compressedImages.thumbnail ?? newProjectData.thumbnail,
        ownerAvatar: compressedImages.ownerAvatar ?? newProjectData.ownerAvatar,
      };

      const now = Date.now();
      let newId: string;

      if (useRtdbForWrites && rtdbUrlRef.current) {
        newId = await createProjectInRtdb(rtdbUrlRef.current, {
          ...sanitizedProjectData,
          votes: 0,
          comments: 0,
          ownerId: user.uid,
          ownerName: user.displayName || 'Anonymous',
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const docData = {
          ...sanitizedProjectData,
          votes: 0,
          comments: 0,
          ownerId: user.uid,
          ownerName: user.displayName || 'Anonymous',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'projects'), docData);
        newId = docRef.id;
      }

      const newCreated: Project = {
        id: newId,
        ...sanitizedProjectData,
        votes: 0,
        comments: 0,
        ownerId: user.uid,
        ownerName: user.displayName || 'Anonymous',
        createdAt: useRtdbForWrites ? now : { seconds: Math.floor(now / 1000), nanoseconds: 0 },
        updatedAt: useRtdbForWrites ? now : { seconds: Math.floor(now / 1000), nanoseconds: 0 },
      };

      setProjects(prev => {
        const updated = [newCreated, ...prev.filter(p => p.id !== newId)];
        setCachedProjectsInIDB(updated);
        return updated;
      });

      setSearchQuery('');
      if (activeTab === 'Favorites' || activeTab === 'User Guide') {
        setActiveTab('Overview');
      }

      showToast(`🎉 เพิ่มแอปพลิเคชัน "${newCreated.title}" สำเร็จเรียบร้อยแล้ว!`, 5000);
      setIsModalOpen(false);
    } catch (error: any) {
      if (!useRtdbForWrites && (error?.code === 'permission-denied' || String(error?.message).includes('Missing or insufficient permissions'))) {
        handleFirestoreError(error, OperationType.CREATE, 'projects');
      }
      console.error('Error adding project', error);
      throw error;
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    if (!user) {
      throw new Error('You must be signed in to update projects.');
    }
    try {
      const compressedImages = await enforceImageLimits({
        thumbnail: data.thumbnail,
        ownerAvatar: data.ownerAvatar,
      });

      const payload: Partial<Project> = {
        ...data,
        ...(compressedImages.thumbnail !== undefined ? { thumbnail: compressedImages.thumbnail } : {}),
        ...(compressedImages.ownerAvatar !== undefined ? { ownerAvatar: compressedImages.ownerAvatar } : {}),
      };

      const now = Date.now();
      if (useRtdbForWrites && rtdbUrlRef.current) {
        await updateProjectInRtdb(rtdbUrlRef.current, id, {
          ...payload,
          updatedAt: now,
        });
      } else {
        await updateDoc(doc(db, 'projects', id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
      }

      setProjects(prev => {
        const updated = prev.map(p => p.id === id ? {
          ...p,
          ...payload,
          updatedAt: useRtdbForWrites ? now : { seconds: Math.floor(now / 1000), nanoseconds: 0 }
        } : p);
        setCachedProjectsInIDB(updated);
        return updated;
      });

      showToast(`บันทึกการแก้ไข "${data.title || 'แอปพลิเคชัน'}" เรียบร้อยแล้ว`, 4000);
    } catch (error: any) {
      if (!useRtdbForWrites && (error?.code === 'permission-denied' || String(error?.message).includes('Missing or insufficient permissions'))) {
        handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
      }
      console.error('Error updating project', error);
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      if (useRtdbForWrites && rtdbUrlRef.current) {
        await deleteProjectInRtdb(rtdbUrlRef.current, id);
      } else {
        await deleteDoc(doc(db, 'projects', id));
      }

      setProjects(prev => {
        const updated = prev.filter(p => p.id !== id);
        setCachedProjectsInIDB(updated);
        return updated;
      });

      showToast('ลบแอปพลิเคชันออกจากระบบเรียบร้อยแล้ว', 4000);
    } catch (error: any) {
      if (!useRtdbForWrites && (error?.code === 'permission-denied' || String(error?.message).includes('Missing or insufficient permissions'))) {
        handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
      }
      console.error('Error deleting project', error);
    }
  };

  const voteProject = async (id: string) => {
    const voterId = user ? user.uid : guestId;
    if (!voterId) return;

    const project = projects.find(p => p.id === id);
    if (!project) return;

    const votedUserIds = project.votedUserIds || [];
    const hasVoted = votedUserIds.includes(voterId);

    const newVotedUserIds = hasVoted
      ? votedUserIds.filter(uid => uid !== voterId)
      : [...votedUserIds, voterId];
    const newVotes = hasVoted
      ? Math.max(0, (project.votes || 0) - 1)
      : (project.votes || 0) + 1;

    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? {
        ...p,
        votes: newVotes,
        votedUserIds: newVotedUserIds
      } : p);
      setCachedProjectsInIDB(updated);
      return updated;
    });

    try {
      if (useRtdbForWrites && rtdbUrlRef.current) {
        await updateProjectInRtdb(rtdbUrlRef.current, id, {
          votes: newVotes,
          votedUserIds: newVotedUserIds
        });
      } else {
        await updateDoc(doc(db, 'projects', id), {
          votes: newVotes,
          votedUserIds: newVotedUserIds
        });
      }
    } catch (error) {
      console.warn('Could not sync vote to database:', error);
    }
  };

  const commentProject = async (id: string, text: string) => {
    if (!user) return;
    const project = projects.find(p => p.id === id);
    if (!project) return;

    let safeAvatar = user.photoURL || '';
    if (safeAvatar.startsWith('data:image/')) {
      try {
        safeAvatar = await compressImage(safeAvatar, AVATAR_COMPRESS_OPTIONS);
      } catch {
        // fallback to original
      }
    }

    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      userName: user.displayName || 'Anonymous',
      userAvatar: safeAvatar,
      text,
      time: new Date().toISOString(),
      ownerId: user.uid
    };

    const updatedCommentsList = project.commentsList ? [newComment, ...project.commentsList] : [newComment];
    const newCommentsCount = (project.comments || 0) + 1;

    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? {
        ...p,
        comments: newCommentsCount,
        commentsList: updatedCommentsList
      } : p);
      setCachedProjectsInIDB(updated);
      return updated;
    });

    try {
      if (useRtdbForWrites && rtdbUrlRef.current) {
        await updateProjectInRtdb(rtdbUrlRef.current, id, {
          comments: newCommentsCount,
          commentsList: updatedCommentsList
        });
      } else {
        await updateDoc(doc(db, 'projects', id), {
          comments: newCommentsCount,
          commentsList: updatedCommentsList
        });
      }
    } catch (error) {
      console.warn('Could not sync comment to database:', error);
    }
  };

  const resetBatchOptimizeState = () => {
    setBatchOptimizeState(INITIAL_OPTIMIZE_STATE);
  };

  const resetMigrationState = () => {
    setMigrationState(INITIAL_MIGRATION_STATE);
  };

  const inspectDatabaseCounts = async (targetUrl?: string): Promise<{
    firestoreCount: number;
    rtdbCount: number | null;
    rtdbError?: string;
  }> => {
    let firestoreCount = projects.length;
    try {
      const fsSnap = await getDocs(collection(db, 'projects'));
      firestoreCount = fsSnap.size;
    } catch {
      // Fallback to local count if Firestore quota exceeded
    }

    const normalized = normalizeRtdbUrl(targetUrl || rtdbUrlRef.current);
    if (!normalized) {
      return { firestoreCount, rtdbCount: null };
    }

    try {
      const rtdbList = await fetchAllProjectsFromRtdb(normalized);
      return { firestoreCount, rtdbCount: rtdbList.length };
    } catch (err: any) {
      return {
        firestoreCount,
        rtdbCount: null,
        rtdbError: err?.message || String(err),
      };
    }
  };

  /**
   * Admin One-Click Migration: copies every project from Firestore (or fallback/cache if Firestore quota reached)
   * into Firebase Realtime Database under /projects/{originalId} without deleting anything from Firestore.
   */
  const migrateFirestoreToRtdb = async (
    targetUrl: string,
    compressDuringMigration: boolean = true
  ): Promise<{ migratedCount: number; savedBytes: number }> => {
    if (!isAdmin || !user) {
      const msg = 'ต้องเข้าสู่ระบบด้วยบัญชี Admin (Mosy_nicky@hotmail.com) เพื่อย้ายฐานข้อมูล';
      setMigrationState({ ...INITIAL_MIGRATION_STATE, error: msg });
      throw new Error(msg);
    }

    const normalizedUrl = normalizeRtdbUrl(targetUrl);
    if (!normalizedUrl) {
      const msg = 'URL ของ Realtime Database ไม่ถูกต้อง (ตัวอย่าง: https://gen-lang-client-0975890740-default-rtdb.asia-southeast1.firebasedatabase.app)';
      setMigrationState({ ...INITIAL_MIGRATION_STATE, error: msg });
      throw new Error(msg);
    }

    setMigrationState({
      isRunning: true,
      total: 0,
      processed: 0,
      migratedCount: 0,
      compressedCount: 0,
      savedBytes: 0,
      currentTitle: 'กำลังอ่านข้อมูลทั้งหมดจาก Firestore...',
      completed: false,
      error: null,
    });

    try {
      let sourceRecords: Project[] = [];
      try {
        const snapshot = await getDocs(collection(db, 'projects'));
        sourceRecords = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
        })) as Project[];
      } catch (fsErr) {
        console.warn('Could not read directly from Firestore, using local IndexedDB cache as source:', fsErr);
        sourceRecords = projects;
      }

      if (sourceRecords.length === 0) {
        sourceRecords = projects;
      }

      const total = sourceRecords.length;
      setMigrationState(prev => ({
        ...prev,
        total,
        currentTitle: `พบทั้งหมด ${total} แอป กำลังเตรียมย้ายไป Realtime Database...`,
      }));

      let migratedCount = 0;
      let compressedCount = 0;
      let totalSavedBytes = 0;
      const migratedList: Project[] = [];

      for (let i = 0; i < sourceRecords.length; i++) {
        const item = sourceRecords[i];
        const title = item.title || item.id;

        setMigrationState(prev => ({
          ...prev,
          processed: i,
          currentTitle: title,
        }));

        let nextThumb = item.thumbnail || '';
        let nextAvatar = item.ownerAvatar || '';
        let nextComments = item.commentsList;
        let itemCompressed = false;

        if (compressDuringMigration) {
          if (nextThumb && needsImageOptimization(nextThumb, THUMBNAIL_COMPRESS_OPTIONS.maxSizeBytes)) {
            try {
              const before = getDataUrlByteSize(nextThumb);
              const compressed = await compressImage(nextThumb, THUMBNAIL_COMPRESS_OPTIONS);
              const after = getDataUrlByteSize(compressed);
              if (compressed !== nextThumb && (!nextThumb.startsWith('data:') || after <= before)) {
                totalSavedBytes += Math.max(0, before - after);
                nextThumb = compressed;
                itemCompressed = true;
              }
            } catch {
              // keep original
            }
          }

          if (nextAvatar && needsImageOptimization(nextAvatar, AVATAR_COMPRESS_OPTIONS.maxSizeBytes)) {
            try {
              const before = getDataUrlByteSize(nextAvatar);
              const compressed = await compressImage(nextAvatar, AVATAR_COMPRESS_OPTIONS);
              const after = getDataUrlByteSize(compressed);
              if (compressed !== nextAvatar && (!nextAvatar.startsWith('data:') || after <= before)) {
                totalSavedBytes += Math.max(0, before - after);
                nextAvatar = compressed;
                itemCompressed = true;
              }
            } catch {
              // keep original
            }
          }

          if (Array.isArray(nextComments) && nextComments.length > 0) {
            nextComments = await Promise.all(
              nextComments.map(async c => {
                if (c.userAvatar && c.userAvatar.startsWith('data:image/') && needsImageOptimization(c.userAvatar, AVATAR_COMPRESS_OPTIONS.maxSizeBytes)) {
                  try {
                    const before = getDataUrlByteSize(c.userAvatar);
                    const compressed = await compressImage(c.userAvatar, AVATAR_COMPRESS_OPTIONS);
                    const after = getDataUrlByteSize(compressed);
                    if (compressed !== c.userAvatar && after <= before) {
                      totalSavedBytes += Math.max(0, before - after);
                      itemCompressed = true;
                      return { ...c, userAvatar: compressed };
                    }
                  } catch {
                    // keep original
                  }
                }
                return c;
              })
            );
          }
        }

        if (itemCompressed) {
          compressedCount += 1;
        }

        const createdMs = normalizeTimestampToMs(item.createdAt);
        const updatedMs = normalizeTimestampToMs(item.updatedAt ?? createdMs);

        const rtdbPayload: Project = {
          ...item,
          thumbnail: nextThumb,
          ownerAvatar: nextAvatar,
          ...(nextComments !== undefined ? { commentsList: nextComments } : {}),
          votes: typeof item.votes === 'number' ? item.votes : 0,
          comments: typeof item.comments === 'number' ? item.comments : (nextComments?.length ?? 0),
          favoriteCount: typeof item.favoriteCount === 'number' ? item.favoriteCount : 0,
          votedUserIds: Array.isArray(item.votedUserIds) ? item.votedUserIds : [],
          favoritedUserIds: Array.isArray(item.favoritedUserIds) ? item.favoritedUserIds : [],
          createdAt: createdMs,
          updatedAt: updatedMs,
        };

        await writeProjectWithIdInRtdb(normalizedUrl, item.id, rtdbPayload);
        migratedCount += 1;
        migratedList.push(rtdbPayload);

        setMigrationState(prev => ({
          ...prev,
          processed: i + 1,
          migratedCount,
          compressedCount,
          savedBytes: totalSavedBytes,
        }));
      }

      // Persist RTDB URL across localStorage, IndexedDB, and shared Firestore config doc
      saveLocalRtdbUrl(normalizedUrl);
      rtdbUrlRef.current = normalizedUrl;
      setRtdbUrl(normalizedUrl);
      setActiveDataSource('rtdb');

      try {
        await saveRtdbUrlToConfigDoc(normalizedUrl);
      } catch (cfgErr) {
        console.warn('Saved RTDB URL locally; shared config/rtdb write notice:', cfgErr);
      }

      migratedList.sort((a, b) => normalizeTimestampToMs(b.createdAt) - normalizeTimestampToMs(a.createdAt));
      setProjects(migratedList);
      await setCachedProjectsInIDB(migratedList);

      const now = Date.now();
      cacheMetaRef.current = await updateCacheMetaInIDB({
        lastFetchTime: now,
        quotaBlockedUntil: null,
        rtdbUrl: normalizedUrl,
        dataSource: 'rtdb',
      });
      setLastSyncedAt(new Date(now));
      setIsQuotaExceeded(false);

      setMigrationState({
        isRunning: false,
        total,
        processed: total,
        migratedCount,
        compressedCount,
        savedBytes: totalSavedBytes,
        currentTitle: 'ย้ายข้อมูลเข้า Realtime Database สำเร็จสมบูรณ์!',
        completed: true,
        error: null,
      });

      showToast(`🚀 ย้าย ${migratedCount} แอปไปยัง Realtime Database สำเร็จแล้ว (ข้อมูลเดิมใน Firestore ยังอยู่ครบ)`, 6000);
      return { migratedCount, savedBytes: totalSavedBytes };
    } catch (error: any) {
      const rawMsg = error?.message || String(error);
      const friendlyMsg = rawMsg.toLowerCase().includes('permission')
        ? 'สิทธิ์การเขียน Realtime Database ถูกปฏิเสธ — กรุณาวาง database.rules.json ใน Firebase Console > Realtime Database > Rules แล้วกด Publish ก่อนนะครับ'
        : rawMsg;

      setMigrationState(prev => ({
        ...prev,
        isRunning: false,
        completed: false,
        error: friendlyMsg,
      }));
      throw error;
    }
  };

  /**
   * Admin tool: optimizes oversized images in the active database (RTDB if active, otherwise Firestore).
   */
  const batchOptimizeFirestoreImages = async (): Promise<{ updatedCount: number; savedBytes: number }> => {
    if (!isAdmin || !user) {
      const msg = 'ต้องเข้าสู่ระบบด้วยบัญชี Admin (Mosy_nicky@hotmail.com) เพื่อแก้ไขข้อมูลทั้งหมดในฐานข้อมูล';
      setBatchOptimizeState({
        ...INITIAL_OPTIMIZE_STATE,
        error: msg,
      });
      throw new Error(msg);
    }

    const isRtdb = Boolean(rtdbUrlRef.current && activeDataSource === 'rtdb');

    setBatchOptimizeState({
      isRunning: true,
      total: 0,
      processed: 0,
      updatedCount: 0,
      savedBytes: 0,
      currentTitle: isRtdb ? 'กำลังดึงรายการแอปทั้งหมดจาก Realtime Database...' : 'กำลังดึงรายการแอปทั้งหมดจาก Firestore...',
      completed: false,
      error: null,
    });

    try {
      let sourceProjects: Project[] = [];
      if (isRtdb && rtdbUrlRef.current) {
        sourceProjects = await fetchAllProjectsFromRtdb(rtdbUrlRef.current);
      } else {
        const snapshot = await getDocs(collection(db, 'projects'));
        sourceProjects = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as Project[];
      }

      const total = sourceProjects.length;
      setBatchOptimizeState(prev => ({
        ...prev,
        total,
        currentTitle: `พบทั้งหมด ${total} รายการ กำลังตรวจสอบรูปภาพ...`,
      }));

      let updatedCount = 0;
      let totalSavedBytes = 0;
      const updatedMap = new Map<string, Project>();

      for (let i = 0; i < sourceProjects.length; i++) {
        const data = sourceProjects[i];
        const title = data.title || data.id;

        setBatchOptimizeState(prev => ({
          ...prev,
          processed: i,
          currentTitle: title,
        }));

        const patch: Partial<Project> = {};
        let docSavedBytes = 0;

        if (data.thumbnail && needsImageOptimization(data.thumbnail, THUMBNAIL_COMPRESS_OPTIONS.maxSizeBytes)) {
          try {
            const beforeBytes = getDataUrlByteSize(data.thumbnail);
            const compressedThumb = await compressImage(data.thumbnail, THUMBNAIL_COMPRESS_OPTIONS);
            if (compressedThumb && compressedThumb !== data.thumbnail) {
              const afterBytes = getDataUrlByteSize(compressedThumb);
              if (!data.thumbnail.startsWith('data:') || afterBytes <= beforeBytes || !data.thumbnail.startsWith('data:image/webp')) {
                patch.thumbnail = compressedThumb;
                docSavedBytes += Math.max(0, beforeBytes - afterBytes);
              }
            }
          } catch (err) {
            console.warn(`Skipped thumbnail for ${title}:`, err);
          }
        }

        if (data.ownerAvatar && needsImageOptimization(data.ownerAvatar, AVATAR_COMPRESS_OPTIONS.maxSizeBytes)) {
          try {
            const beforeBytes = getDataUrlByteSize(data.ownerAvatar);
            const compressedAvatar = await compressImage(data.ownerAvatar, AVATAR_COMPRESS_OPTIONS);
            if (compressedAvatar && compressedAvatar !== data.ownerAvatar) {
              const afterBytes = getDataUrlByteSize(compressedAvatar);
              if (!data.ownerAvatar.startsWith('data:') || afterBytes <= beforeBytes || !data.ownerAvatar.startsWith('data:image/webp')) {
                patch.ownerAvatar = compressedAvatar;
                docSavedBytes += Math.max(0, beforeBytes - afterBytes);
              }
            }
          } catch (err) {
            console.warn(`Skipped avatar for ${title}:`, err);
          }
        }

        if (Array.isArray(data.commentsList) && data.commentsList.length > 0) {
          let commentsChanged = false;
          const nextComments = await Promise.all(
            data.commentsList.map(async (c) => {
              if (c.userAvatar && c.userAvatar.startsWith('data:image/') && needsImageOptimization(c.userAvatar, AVATAR_COMPRESS_OPTIONS.maxSizeBytes)) {
                try {
                  const before = getDataUrlByteSize(c.userAvatar);
                  const compressed = await compressImage(c.userAvatar, AVATAR_COMPRESS_OPTIONS);
                  const after = getDataUrlByteSize(compressed);
                  if (compressed !== c.userAvatar && after <= before) {
                    commentsChanged = true;
                    docSavedBytes += Math.max(0, before - after);
                    return { ...c, userAvatar: compressed };
                  }
                } catch {
                  // keep original
                }
              }
              return c;
            })
          );
          if (commentsChanged) {
            patch.commentsList = nextComments;
          }
        }

        const mergedProject: Project = {
          ...data,
          ...patch,
        };

        if (Object.keys(patch).length > 0) {
          if (isRtdb && rtdbUrlRef.current) {
            await updateProjectInRtdb(rtdbUrlRef.current, data.id, {
              ...patch,
              updatedAt: Date.now(),
            });
          } else {
            try {
              await updateDoc(doc(db, 'projects', data.id), {
                ...patch,
                updatedAt: serverTimestamp(),
              });
            } catch (err: any) {
              if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
                handleFirestoreError(err, OperationType.UPDATE, `projects/${data.id}`);
              }
              throw err;
            }
          }
          updatedCount += 1;
          totalSavedBytes += docSavedBytes;
        }

        updatedMap.set(data.id, mergedProject);

        setBatchOptimizeState(prev => ({
          ...prev,
          processed: i + 1,
          updatedCount,
          savedBytes: totalSavedBytes,
        }));
      }

      const allProjects = Array.from(updatedMap.values()).sort(
        (a, b) => normalizeTimestampToMs(b.createdAt) - normalizeTimestampToMs(a.createdAt)
      );

      if (allProjects.length > 0) {
        setProjects(allProjects);
        await setCachedProjectsInIDB(allProjects);
        const now = Date.now();
        cacheMetaRef.current = await updateCacheMetaInIDB({
          lastFetchTime: now,
          quotaBlockedUntil: null,
        });
        setLastSyncedAt(new Date(now));
      }

      setBatchOptimizeState({
        isRunning: false,
        total,
        processed: total,
        updatedCount,
        savedBytes: totalSavedBytes,
        currentTitle: 'เสร็จสิ้นเรียบร้อย',
        completed: true,
        error: null,
      });

      const savedKB = (totalSavedBytes / 1024).toFixed(1);
      showToast(
        updatedCount > 0
          ? `✨ บีบอัดรูปสำเร็จ ${updatedCount} แอป (ประหยัดพื้นที่ ${savedKB} KB)`
          : '✅ รูปภาพทั้งหมดมีขนาดเล็กสุดตามเกณฑ์อยู่แล้ว',
        5500
      );

      return { updatedCount, savedBytes: totalSavedBytes };
    } catch (error: any) {
      const msg = error?.message || 'เกิดข้อผิดพลาดระหว่างบีบอัดข้อมูล';
      setBatchOptimizeState(prev => ({
        ...prev,
        isRunning: false,
        completed: false,
        error: msg,
      }));
      throw error;
    }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      addProject,
      updateProject,
      deleteProject,
      voteProject,
      commentProject,
      fetchProjectComments,
      commentsLoading,
      isModalOpen,
      setIsModalOpen,
      isOptimizerModalOpen,
      setIsOptimizerModalOpen,
      isMigrationModalOpen,
      setIsMigrationModalOpen,
      isAdmin,
      setIsAdmin,
      searchQuery,
      setSearchQuery,
      user,
      guestId,
      login,
      logout,
      loading,
      editingProject,
      setEditingProject,
      activeTab,
      setActiveTab,
      favorites,
      toggleFavorite,
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      isQuotaExceeded,
      upgradeUrl: UPGRADE_URL,
      refreshProjects,
      isRefreshing,
      lastSyncedAt,
      toastMessage,
      setToastMessage,
      batchOptimizeState,
      batchOptimizeFirestoreImages,
      resetBatchOptimizeState,
      rtdbUrl,
      activeDataSource,
      migrationState,
      migrateFirestoreToRtdb,
      resetMigrationState,
      inspectDatabaseCounts,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
