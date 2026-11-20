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
  testFirestoreConnection
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

const CACHE_TTL_MS = 30 * 60 * 1000;

export function ProjectProvider({ children }: { children: ReactNode }) {
  const UPGRADE_URL = 'https://console.firebase.google.com/project/gen-lang-client-0975890740/firestore/databases/ai-studio-09cb01fe-005d-46bd-a981-67c24e4715da/data?openUpgradeDialog=true';

  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const cacheMetaRef = useRef<CacheMeta>({ lastFetchTime: null, quotaBlockedUntil: null });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOptimizerModalOpen, setIsOptimizerModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [batchOptimizeState, setBatchOptimizeState] = useState<BatchOptimizeState>(INITIAL_OPTIMIZE_STATE);

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
      if (currentUser?.email === 'Mosy_nicky@hotmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProjects = async (force: boolean = false, hydratedMeta?: CacheMeta, hasCachedData: boolean = false) => {
    const meta = hydratedMeta || cacheMetaRef.current;

    if (!force) {
      if (meta.quotaBlockedUntil && Date.now() < meta.quotaBlockedUntil) {
        setIsQuotaExceeded(true);
        return;
      }

      if (meta.lastFetchTime && (hasCachedData || projects.length > 0) && Date.now() - meta.lastFetchTime < CACHE_TTL_MS) {
        return;
      }
    }

    setIsRefreshing(true);

    try {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        const projectsData = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as Project[];

        setProjects(prev => {
          const commentsCache = new Map<string, Project['commentsList']>(
            prev.filter(p => p.commentsList).map(p => [p.id, p.commentsList])
          );
          const merged: Project[] = projectsData.map(p => {
            if (!p.commentsList && commentsCache.has(p.id)) {
              return { ...p, commentsList: commentsCache.get(p.id) };
            }
            return p;
          });
          setCachedProjectsInIDB(merged);
          return merged;
        });

        const now = Date.now();
        cacheMetaRef.current = await updateCacheMetaInIDB({
          lastFetchTime: now,
          quotaBlockedUntil: null,
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
        console.warn("Firestore Quota reached: serving projects from IndexedDB/fallback cache.");
        setIsQuotaExceeded(true);
        const blockedUntil = Date.now() + 2 * 60 * 60 * 1000;
        cacheMetaRef.current = await updateCacheMetaInIDB({ quotaBlockedUntil: blockedUntil });
      } else {
        console.warn("Firestore fetch notice:", errMsg);
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

      const hasCached = !!(cachedProjects && cachedProjects.length > 0);
      if (hasCached && cachedProjects) {
        setProjects(cachedProjects);
      }
      if (meta.lastFetchTime) {
        setLastSyncedAt(new Date(meta.lastFetchTime));
      }
      if (meta.quotaBlockedUntil && Date.now() < meta.quotaBlockedUntil) {
        setIsQuotaExceeded(true);
      }

      await fetchProjects(false, meta, hasCached);
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
      console.warn("Could not fetch project comments on-demand:", error);
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
    let newDbUserIds: string[];
    let newFavoriteCount: number;

    if (isCurrentlyFavorited) {
      newDbUserIds = favoritedUserIds.filter((uid) => uid !== identifier);
      newFavoriteCount = Math.max(0, (project.favoriteCount || 0) - 1);
    } else {
      newDbUserIds = Array.from(new Set([...favoritedUserIds, identifier]));
      newFavoriteCount = (project.favoriteCount || 0) + 1;
    }

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
      const projectRef = doc(db, 'projects', id);
      await updateDoc(projectRef, {
        favoriteCount: newFavoriteCount,
        favoritedUserIds: newDbUserIds,
      });
    } catch (error) {
      console.error("Error updating favorite in Firestore", error);
    }
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  /**
   * Enforces Ultra-Compact WebP sizing on both thumbnail (<=360px, <=35KB)
   * and ownerAvatar (<=96px, <=10KB) prior to any Firestore write.
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
      throw new Error("You must be signed in to add projects.");
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

      const now = Date.now();
      const newCreated: Project = {
        id: docRef.id,
        ...sanitizedProjectData,
        votes: 0,
        comments: 0,
        ownerId: user.uid,
        ownerName: user.displayName || 'Anonymous',
        createdAt: {
          seconds: Math.floor(now / 1000),
          nanoseconds: 0,
        },
        updatedAt: {
          seconds: Math.floor(now / 1000),
          nanoseconds: 0,
        },
      };
      setProjects(prev => {
        const updated = [newCreated, ...prev.filter(p => p.id !== docRef.id)];
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
      if (error?.code === 'permission-denied' || String(error?.message).includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.CREATE, 'projects');
      }
      console.error("Error adding project", error);
      throw error;
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    if (!user) {
      throw new Error("You must be signed in to update projects.");
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

      await updateDoc(doc(db, 'projects', id), {
        ...payload,
        updatedAt: serverTimestamp()
      });

      const now = Date.now();
      setProjects(prev => {
        const updated = prev.map(p => p.id === id ? {
          ...p,
          ...payload,
          updatedAt: { seconds: Math.floor(now / 1000), nanoseconds: 0 }
        } : p);
        setCachedProjectsInIDB(updated);
        return updated;
      });

      showToast(`บันทึกการแก้ไข "${data.title || 'แอปพลิเคชัน'}" เรียบร้อยแล้ว`, 4000);
    } catch (error: any) {
      if (error?.code === 'permission-denied' || String(error?.message).includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
      }
      console.error("Error updating project", error);
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));

      setProjects(prev => {
        const updated = prev.filter(p => p.id !== id);
        setCachedProjectsInIDB(updated);
        return updated;
      });

      showToast('ลบแอปพลิเคชันออกจากระบบเรียบร้อยแล้ว', 4000);
    } catch (error: any) {
      if (error?.code === 'permission-denied' || String(error?.message).includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
      }
      console.error("Error deleting project", error);
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
      await updateDoc(doc(db, 'projects', id), {
        votes: newVotes,
        votedUserIds: newVotedUserIds
      });
    } catch (error) {
      console.warn("Could not sync vote to Firestore:", error);
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
      await updateDoc(doc(db, 'projects', id), {
        comments: newCommentsCount,
        commentsList: updatedCommentsList
      });
    } catch (error) {
      console.warn("Could not sync comment to Firestore:", error);
    }
  };

  const resetBatchOptimizeState = () => {
    setBatchOptimizeState(INITIAL_OPTIMIZE_STATE);
  };

  /**
   * Admin tool: scans all existing Firestore project records, compresses oversized
   * thumbnails (>35KB or non-WebP), avatars (>10KB or non-WebP), and comment avatars,
   * then writes only modified documents back to Firestore and refreshes IndexedDB cache.
   */
  const batchOptimizeFirestoreImages = async (): Promise<{ updatedCount: number; savedBytes: number }> => {
    if (!isAdmin || !user) {
      const msg = 'ต้องเข้าสู่ระบบด้วยบัญชี Admin (Mosy_nicky@hotmail.com) เพื่อแก้ไขข้อมูลทั้งหมดใน Firebase';
      setBatchOptimizeState({
        ...INITIAL_OPTIMIZE_STATE,
        error: msg,
      });
      throw new Error(msg);
    }

    setBatchOptimizeState({
      isRunning: true,
      total: 0,
      processed: 0,
      updatedCount: 0,
      savedBytes: 0,
      currentTitle: 'กำลังดึงรายการแอปทั้งหมดจาก Firestore...',
      completed: false,
      error: null,
    });

    try {
      const snapshot = await getDocs(collection(db, 'projects'));
      const docs = snapshot.docs;
      const total = docs.length;

      setBatchOptimizeState(prev => ({
        ...prev,
        total,
        currentTitle: `พบทั้งหมด ${total} รายการ กำลังตรวจสอบรูปภาพ...`,
      }));

      let updatedCount = 0;
      let totalSavedBytes = 0;
      const updatedMap = new Map<string, Project>();

      for (let i = 0; i < docs.length; i++) {
        const docSnap = docs[i];
        const data = docSnap.data() as Omit<Project, 'id'>;
        const title = data.title || docSnap.id;

        setBatchOptimizeState(prev => ({
          ...prev,
          processed: i,
          currentTitle: title,
        }));

        const patch: Partial<Project> = {};
        let docSavedBytes = 0;

        // 1. Check & compress thumbnail
        if (data.thumbnail && needsImageOptimization(data.thumbnail, THUMBNAIL_COMPRESS_OPTIONS.maxSizeBytes)) {
          try {
            const beforeBytes = getDataUrlByteSize(data.thumbnail);
            const compressedThumb = await compressImage(data.thumbnail, THUMBNAIL_COMPRESS_OPTIONS);
            if (compressedThumb && compressedThumb !== data.thumbnail) {
              const afterBytes = getDataUrlByteSize(compressedThumb);
              // Only update if remote URL normalized OR base64 got smaller / converted to WebP
              if (!data.thumbnail.startsWith('data:') || afterBytes <= beforeBytes || !data.thumbnail.startsWith('data:image/webp')) {
                patch.thumbnail = compressedThumb;
                docSavedBytes += Math.max(0, beforeBytes - afterBytes);
              }
            }
          } catch (err) {
            console.warn(`Skipped thumbnail for ${title}:`, err);
          }
        }

        // 2. Check & compress ownerAvatar
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

        // 3. Check & compress comment avatars if any are Data URLs
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
          id: docSnap.id,
          ...data,
          ...patch,
        };

        if (Object.keys(patch).length > 0) {
          try {
            await updateDoc(doc(db, 'projects', docSnap.id), {
              ...patch,
              updatedAt: serverTimestamp(),
            });
            updatedCount += 1;
            totalSavedBytes += docSavedBytes;
          } catch (err: any) {
            if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
              handleFirestoreError(err, OperationType.UPDATE, `projects/${docSnap.id}`);
            }
            throw err;
          }
        }

        updatedMap.set(docSnap.id, mergedProject);

        setBatchOptimizeState(prev => ({
          ...prev,
          processed: i + 1,
          updatedCount,
          savedBytes: totalSavedBytes,
        }));
      }

      // Sync updated list directly to state & IndexedDB cache (saves an extra Firestore read)
      const allProjects = Array.from(updatedMap.values()).sort((a, b) => {
        const secA = a.createdAt?.seconds ?? (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
        const secB = b.createdAt?.seconds ?? (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
        return secB - secA;
      });

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
          ? `✨ บีบอัดรูปใน Firebase สำเร็จ ${updatedCount} แอป (ประหยัดพื้นที่ ${savedKB} KB)`
          : '✅ รูปภาพทั้งหมดใน Firebase มีขนาดเล็กสุดตามเกณฑ์อยู่แล้ว',
        5500
      );

      return { updatedCount, savedBytes: totalSavedBytes };
    } catch (error: any) {
      const msg = error?.message || 'เกิดข้อผิดพลาดระหว่างบีบอัดข้อมูลใน Firebase';
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
