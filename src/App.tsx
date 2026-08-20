/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import StatCards from './components/StatCards';
import ProjectGallery from './components/ProjectGallery';
import FavoritesView from './components/FavoritesView';
import UserGuideView from './components/UserGuideView';
import NewProjectModal from './components/NewProjectModal';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import { LogIn, Rocket, ShieldCheck, Zap } from 'lucide-react';

function AppContent() {
  const { user, login, loading, activeTab, searchQuery } = useProjects();

  useEffect(() => {
    if (searchQuery && searchQuery.trim() !== '') {
      // Smoothly scroll the window to the top on mobile so search results are instantly visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Initializing...</p>
        </div>
      </div>
    );
  }

  const hasSearchQuery = searchQuery && searchQuery.trim() !== '';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <TopBar />
      
      <main className="lg:ml-64 ml-0 p-4 sm:p-6 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          {activeTab === 'Favorites' ? (
            <FavoritesView />
          ) : activeTab === 'User Guide' ? (
            <UserGuideView />
          ) : (
            <>
              {!user && !hasSearchQuery && (
                <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50/20 border border-indigo-100/50 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-xl flex-shrink-0 font-bold">
                      🎉
                    </div>
                    <div className="text-left">
                      <h4 className="text-md font-bold text-slate-800">Browsing as Guest | กำลังเข้าชมในฐานะผู้เยี่ยมชม</h4>
                      <p className="text-sm text-slate-500 mt-1">Anyone can browse projects, view analytics, and cast votes! Create your company account to submit projects and leave comments.</p>
                    </div>
                  </div>
                  <button 
                    onClick={login}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 flex-shrink-0"
                  >
                    Sign In with Google
                  </button>
                </div>
              )}

              {!hasSearchQuery && <StatCards />}

              <div className="w-full">
                <ProjectGallery />
              </div>
            </>
          )}
        </div>
      </main>
      
      <NewProjectModal />
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}
