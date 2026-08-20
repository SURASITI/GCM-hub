/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bell, Search, Shield, ShieldAlert, LogIn, LogOut, Loader2, Menu, Share2 } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import ShareQRModal from './ShareQRModal';
import { useState } from 'react';

export default function TopBar() {
  const { 
    isAdmin, 
    setIsAdmin, 
    searchQuery, 
    setSearchQuery, 
    user, 
    login, 
    logout, 
    loading,
    isMobileMenuOpen,
    setIsMobileMenuOpen
  } = useProjects();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <header className="h-20 bg-white/95 border-b border-slate-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 lg:ml-64 ml-0 transition-all duration-300">
      <div className="flex items-center flex-1 max-w-2xl gap-3">
        {/* Hamburger Menu Button for mobile */}
        <button 
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors flex-shrink-0 flex items-center justify-center border border-slate-100 bg-white shadow-sm"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search projects, categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-100/80 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5 ml-3 md:ml-8 flex-shrink-0">
        
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center justify-center p-2 rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-transparent hover:border-indigo-100"
          title="Share GCMP Hub"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {isAdmin && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
            <ShieldAlert className="w-3.5 h-3.5" />
            Admin
          </div>
        )}

        <div className="flex items-center gap-4">
          {loading ? (
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-2 md:gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-none">{user.displayName}</p>
                <button 
                  onClick={logout}
                  className="text-[9px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1 ml-auto mt-1"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  Sign Out
                </button>
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            <button 
              onClick={login}
              className="flex items-center gap-1.5 px-4 md:px-6 py-2 bg-slate-900 text-white rounded-2xl font-bold text-xs md:text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sign In</span>
              <span className="xs:hidden">In</span>
            </button>
          )}
        </div>
      </div>
      
      <ShareQRModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </header>
  );
}
