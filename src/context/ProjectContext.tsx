/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Project } from '../types';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from '../lib/firebase';
import { 
  collection, 
  getDocs,
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';

import { FALLBACK_PROJECTS } from '../data/fallbackProjects';

interface ProjectContextType {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'votes' | 'comments' | 'ownerId' | 'ownerName' | 'ownerAvatar' | 'createdAt' | 'updatedAt'> & { ownerAvatar?: string }) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  voteProject: (id: string) => Promise<void>;
  commentProject: (id: string, text: string) => Promise<void>;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
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
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const UPGRADE_URL = 'https://console.firebase.google.com/project/gen-lang-client-0975890740/firestore/databases/ai-studio-09cb01fe-005d-46bd-a981-67c24e4715da/data?openUpgradeDialog=true';

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const cached = localStorage.getItem('gcmp_cached_projects_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return FALLBACK_PROJECTS;
  });

  const [isQuotaExceeded, setIsQuotaExceeded] = useState(() => {
    try {
      const blockedUntil = localStorage.getItem('gcmp_quota_blocked_until');
      return !!(blockedUntil && Date.now() < Number(blockedUntil));
    } catch {
      return false;
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    try {
      const last = localStorage.getItem('gcmp_last_fetch_time');
      return last ? new Date(Number(last)) : null;
    } catch {
      return null;
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [guestId, setGuestId] = useState<string>(() => {
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
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // Auto-set admin based on email
      if (currentUser?.email === 'Mosy_nicky@hotmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProjects = async (force: boolean = false) => {
    // 1. If currently known to be blocked by quota today, don't hammer the server unless forced
    if (!force) {
      try {
        const blockedUntil = localStorage.getItem('gcmp_quota_blocked_until');
        if (blockedUntil && Date.now() < Number(blockedUntil)) {
          setIsQuotaExceeded(true);
          return;
        }
      } catch (e) {
        // ignore
      }

      // 2. Check Cache TTL: if cached within last 30 minutes, skip network read (0 reads)
      try {
        const lastFetch = localStorage.getItem('gcmp_last_fetch_time');
        if (lastFetch && projects.length > 0 && Date.now() - Number(lastFetch) < 30 * 60 * 1000) {
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    setIsRefreshing(true);

    try {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Project[];
        
        setProjects(projectsData);
        try {
          localStorage.setItem('gcmp_cached_projects_v2', JSON.stringify(projectsData));
          localStorage.setItem('gcmp_last_fetch_time', String(Date.now()));
          localStorage.removeItem('gcmp_quota_blocked_until');
        } catch (e) {
          // ignore localStorage full
        }
        setLastSyncedAt(new Date());
        setIsQuotaExceeded(false);
      }
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      const isQuota = errMsg.toLowerCase().includes('quota') || 
                      errMsg.includes('Free daily read units') ||
                      error?.code === 'resource-exhausted';

      if (isQuota) {
        console.warn("Firestore Quota reached: serving projects from local/fallback cache.");
        setIsQuotaExceeded(true);
        // Backoff for 2 hours to avoid hammering the server
        try {
          localStorage.setItem('gcmp_quota_blocked_until', String(Date.now() + 2 * 60 * 60 * 1000));
        } catch (e) {
          // ignore
        }
      } else {
        console.warn("Firestore fetch notice:", errMsg);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects(false);
  }, []);

  const refreshProjects = async (force: boolean = true) => {
    await fetchProjects(force);
  };


  useEffect(() => {
    const identifier = user ? user.uid : guestId;
    if (!identifier) return;

    if (projects.length === 0) return;

    // Projects that have identifier in favoritedUserIds in Firestore
    const dbFavorites = projects
      .filter((p) => p.favoritedUserIds?.includes(identifier))
      .map((p) => p.id);

    // Save dbFavorites to localStorage for offline/initial load cache
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

    // Update state & local storage immediately for responsive UI
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

  const addProject = async (newProjectData: any) => {
    if (!user) {
      throw new Error("You must be signed in to add projects.");
    }

    try {
      const docData = {
        ...newProjectData,
        votes: 0,
        comments: 0,
        ownerId: user.uid,
        ownerName: user.displayName || 'Anonymous',
        ownerAvatar: newProjectData.ownerAvatar || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'projects'), docData);

      // Optimistically update local state & cache
      const newCreated: Project = {
        id: docRef.id,
        ...newProjectData,
        votes: 0,
        comments: 0,
        ownerId: user.uid,
        ownerName: user.displayName || 'Anonymous',
        ownerAvatar: newProjectData.ownerAvatar || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProjects(prev => {
        const updated = [newCreated, ...prev];
        try {
          localStorage.setItem('gcmp_cached_projects_v2', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding project", error);
      throw error;
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    if (!user) {
      throw new Error("You must be signed in to update projects.");
    }
    try {
      await updateDoc(doc(db, 'projects', id), {
        ...data,
        updatedAt: serverTimestamp()
      });

      // Optimistically update local state & cache
      setProjects(prev => {
        const updated = prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p);
        try {
          localStorage.setItem('gcmp_cached_projects_v2', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    } catch (error) {
      console.error("Error updating project", error);
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));

      // Optimistically update local state & cache
      setProjects(prev => {
        const updated = prev.filter(p => p.id !== id);
        try {
          localStorage.setItem('gcmp_cached_projects_v2', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    } catch (error) {
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
    
    let newVotedUserIds: string[];
    let newVotes: number;
    
    if (hasVoted) {
      newVotedUserIds = votedUserIds.filter(uid => uid !== voterId);
      newVotes = Math.max(0, (project.votes || 0) - 1);
    } else {
      newVotedUserIds = [...votedUserIds, voterId];
      newVotes = (project.votes || 0) + 1;
    }
    
    // Optimistically update projects state
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          votes: newVotes,
          votedUserIds: newVotedUserIds
        };
      }
      return p;
    }));
    
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

    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      userName: user.displayName || 'Anonymous',
      userAvatar: user.photoURL || '',
      text,
      time: new Date().toISOString(),
      ownerId: user.uid
    };

    const updatedCommentsList = project.commentsList ? [newComment, ...project.commentsList] : [newComment];
    const newCommentsCount = (project.comments || 0) + 1;

    // Optimistically update projects state
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          comments: newCommentsCount,
          commentsList: updatedCommentsList
        };
      }
      return p;
    }));

    try {
      await updateDoc(doc(db, 'projects', id), {
        comments: newCommentsCount,
        commentsList: updatedCommentsList
      });
    } catch (error) {
      console.warn("Could not sync comment to Firestore:", error);
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
      isModalOpen, 
      setIsModalOpen, 
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
      lastSyncedAt
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
