/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CATEGORIES } from '../types';
import ProjectCard from './ProjectCard';
import { motion, AnimatePresence } from 'motion/react';
import { Filter } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';

export default function ProjectGallery() {
  const { projects, searchQuery, user, activeTab, setIsModalOpen } = useProjects();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredProjects = projects.filter(project => {
    // Filter by own project if "My Projects" tab is active
    if (activeTab === 'My Projects') {
      if (!user || project.ownerId !== user.uid) {
        return false;
      }
    }

    const matchesCategory = selectedCategory === 'All' || project.category === selectedCategory;
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          project.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (project.ownerName && project.ownerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const isMyProjects = activeTab === 'My Projects';

  return (
    <div className="mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isMyProjects ? 'My Projects' : 'Internal Showcase'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isMyProjects 
              ? 'Manage, submit and update your published innovation submissions' 
              : 'Discover and vote for the latest innovations at GCMP Hub'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto max-w-full">
          <div className="px-3 py-2 text-slate-400 border-r border-slate-100">
            <Filter className="w-4 h-4" />
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 rounded-[2rem] p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[350px]"
        >
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6">
            <Filter className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Projects Found</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
            {isMyProjects 
              ? "You haven't submitted any projects yet. Share your high-tech ideas with GCMP Hub!" 
              : "We couldn't find any projects matching your categories or search query."}
          </p>
          {isMyProjects && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-indigo-100"
            >
              Create Your First Project
            </button>
          )}
        </motion.div>
      ) : (
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
