/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Heart, 
  FolderKanban, 
  LayoutDashboard, 
  Plus, 
  LogOut,
  X,
  Globe,
  Download,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { useProjects } from '../context/ProjectContext';
import { usePWAInstall } from '../hooks/usePWAInstall';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', text: 'Overview' },
  { icon: FolderKanban, label: 'My Projects', text: 'My Projects' },
  { icon: Heart, label: 'Favorites', text: 'Favorites' },
  { icon: BookOpen, label: 'User Guide', text: 'คู่มือการใช้งาน' },
];

export default function Sidebar() {
  const { 
    setIsModalOpen, 
    user, 
    logout, 
    activeTab, 
    setActiveTab, 
    isMobileMenuOpen, 
    setIsMobileMenuOpen 
  } = useProjects();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 lg:hidden transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`w-64 h-screen bg-white/90 backdrop-blur-xl border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 flex items-center justify-between gap-2">
          <div className="flex-1">
            <div className="relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl group-hover:bg-cyan-500/30 transition-all duration-500"></div>
              <div className="relative flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-800/50 shadow-lg group-hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-2 select-none">
                  <div className="flex items-center justify-center">
                    <Globe className="w-6 h-6 text-cyan-400 animate-[spin_8s_linear_infinite]" />
                  </div>
                  <div className="flex items-center text-lg font-black tracking-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">GCMP</span>
                    <span className="ml-1.5 px-2 py-0.5 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                      Hub
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Close Menu Button on Mobile */}
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = activeTab === item.label;
            return (
              <motion.button
                key={item.label}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveTab(item.label);
                  setIsMobileMenuOpen(false);
                }}
                disabled={!user && item.label === 'My Projects'}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-600 font-medium shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive && item.label === 'Favorites' ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{item.text}</span>
              </motion.button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
          <button 
            onClick={() => {
              setIsModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            disabled={!user}
            className="w-full mb-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>New Project</span>
          </button>

          {user && (
            <button 
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all mt-1"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
