/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { CATEGORIES } from '../types';
import ProjectCard from './ProjectCard';
import { motion } from 'motion/react';
import { Filter, ArrowUpDown, ChevronLeft, ChevronRight, Layers, LayoutGrid } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';

type SortOption = 'newest' | 'votes' | 'title';

export default function ProjectGallery() {
  const { projects, searchQuery, user, activeTab, setIsModalOpen } = useProjects();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(24);
  const galleryTopRef = useRef<HTMLDivElement>(null);

  const isMyProjects = activeTab === 'My Projects';

  // Base list depending on active tab
  const baseProjects = useMemo(() => {
    if (isMyProjects) {
      if (!user) return [];
      return projects.filter((p) => p.ownerId === user.uid);
    }
    return projects;
  }, [projects, isMyProjects, user]);

  // Category counts badge calculation
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: baseProjects.length };
    CATEGORIES.forEach((cat) => {
      if (cat !== 'All') {
        counts[cat] = baseProjects.filter((p) => p.category === cat).length;
      }
    });
    return counts;
  }, [baseProjects]);

  // Filter by category and search query
  const filteredProjects = useMemo(() => {
    return baseProjects.filter((project) => {
      const matchesCategory = selectedCategory === 'All' || project.category === selectedCategory;
      const searchLower = searchQuery.toLowerCase().trim();
      if (!searchLower) return matchesCategory;

      const matchesSearch =
        project.title.toLowerCase().includes(searchLower) ||
        project.team.toLowerCase().includes(searchLower) ||
        (project.ownerName && project.ownerName.toLowerCase().includes(searchLower)) ||
        project.description.toLowerCase().includes(searchLower);

      return matchesCategory && matchesSearch;
    });
  }, [baseProjects, selectedCategory, searchQuery]);

  // Sort projects
  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    if (sortBy === 'votes') {
      return list.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    }
    if (sortBy === 'title') {
      return list.sort((a, b) => a.title.localeCompare(b.title, 'th'));
    }
    // 'newest' default (createdAt desc)
    return list.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  }, [filteredProjects, sortBy]);

  // Reset to page 1 when category, search, or itemsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, sortBy, itemsPerPage]);

  // Pagination calculation
  const totalItems = sortedProjects.length;
  const isAll = itemsPerPage === -1;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProjects = useMemo(() => {
    if (isAll) return sortedProjects;
    const startIndex = (validCurrentPage - 1) * itemsPerPage;
    return sortedProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProjects, validCurrentPage, itemsPerPage, isAll]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (galleryTopRef.current) {
      galleryTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const startIndex = isAll ? 0 : (validCurrentPage - 1) * itemsPerPage;
  const endIndex = isAll ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);

  return (
    <div className="mt-8" ref={galleryTopRef}>
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <span>{isMyProjects ? 'My Apps' : 'Internal Showcase'}</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              {totalItems} {totalItems === 1 ? 'App' : 'Apps'}
            </span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isMyProjects
              ? 'จัดการ อัปเดต และติดตามผลงานแอปพลิเคชันที่คุณเผยแพร่'
              : 'สำรวจ ค้นหา และเข้าใช้งาน Web Apps ที่พัฒนาขึ้นในองค์กร'}
          </p>
        </div>

        {/* Right Controls: Sort & Items Per Page */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sorting */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500">เรียงตาม:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="newest">ล่าสุด (Newest)</option>
              <option value="votes">โหวตสูงสุด (Most Voted)</option>
              <option value="title">ชื่อแอป (A-Z)</option>
            </select>
          </div>

          {/* Items Per Page */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
            <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500">แสดงหน้าละ:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value={12}>12 รายการ</option>
              <option value={24}>24 รายการ</option>
              <option value={48}>48 รายการ</option>
              <option value={-1}>ทั้งหมด (All)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Pills with Count Badges */}
      <div className="mb-6 flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto max-w-full scrollbar-none">
        <div className="px-2 text-slate-400 border-r border-slate-100 flex items-center gap-1.5 flex-shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">หมวด:</span>
        </div>
        <div className="flex items-center gap-2 flex-nowrap">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isSelected ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {sortedProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 rounded-[2rem] p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[350px]"
        >
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6">
            <Filter className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">ไม่พบแอปพลิเคชัน</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
            {isMyProjects
              ? 'คุณยังไม่มีแอปพลิเคชันที่สร้างไว้ สามารถกดปุ่มด้านล่างเพื่อเริ่มสร้างแอปได้เลย'
              : 'ไม่พบแอปพลิเคชันในหมวดหมู่นี้ หรือคำค้นหาที่ระบุ'}
          </p>
          {isMyProjects ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-indigo-100"
            >
              สร้างแอปใหม่ (Create App)
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedCategory('All');
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              แสดงแอปทั้งหมด (Reset Filter)
            </button>
          )}
        </motion.div>
      ) : (
        <>
          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {paginatedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          {/* Pagination Navigation Bar */}
          <div className="mt-10 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-medium">
              แสดง <span className="font-bold text-slate-800">{totalItems === 0 ? 0 : startIndex + 1}</span> -{' '}
              <span className="font-bold text-slate-800">{endIndex}</span> จากทั้งหมด{' '}
              <span className="font-bold text-indigo-600">{totalItems}</span> แอป
            </div>

            {!isAll && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(Math.max(1, validCurrentPage - 1))}
                  disabled={validCurrentPage === 1}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Only show current, first, last, and immediate neighbors if many pages
                  const isCurrent = page === validCurrentPage;
                  const isEdge = page === 1 || page === totalPages;
                  const isNearby = Math.abs(page - validCurrentPage) <= 1;

                  if (!isEdge && !isNearby) {
                    if (page === 2 || page === totalPages - 1) {
                      return (
                        <span key={page} className="px-1 text-slate-400 text-xs font-bold">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`min-w-[36px] h-9 px-3 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, validCurrentPage + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title="หน้าถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

