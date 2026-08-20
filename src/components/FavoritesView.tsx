/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useProjects } from '../context/ProjectContext';
import ProjectCard from './ProjectCard';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function FavoritesView() {
  const { projects, favorites } = useProjects();
  const [favoriteSearch, setFavoriteSearch] = useState('');

  const favoriteProjects = projects.filter(
    (project) => favorites.includes(project.id)
  );

  const filteredFavorites = favoriteProjects.filter(
    (project) =>
      project.title.toLowerCase().includes(favoriteSearch.toLowerCase()) ||
      project.team.toLowerCase().includes(favoriteSearch.toLowerCase()) ||
      (project.ownerName && project.ownerName.toLowerCase().includes(favoriteSearch.toLowerCase())) ||
      project.description.toLowerCase().includes(favoriteSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            <h2 className="text-2xl font-bold text-slate-800">Favorites / รายการที่ชื่นชอบ</h2>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            รวมโครงการนวัตกรรมที่คุณกดชื่นชอบไว้ เพื่อให้เข้าถึงและติดตามความคืบหน้าได้ง่ายขึ้น
          </p>
        </div>

        {favoriteProjects.length > 0 && (
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาในรายการที่ชอบ..."
              value={favoriteSearch}
              onChange={(e) => setFavoriteSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
            />
          </div>
        )}
      </div>

      {favoriteProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 rounded-[2.5rem] p-16 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]"
        >
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center shadow-md shadow-rose-100/50">
              <Heart className="w-10 h-10 fill-rose-500 animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-1 rounded-lg shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">ยังไม่มีรายการชื่นชอบ</h3>
          <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
            คุณสามารถกดสัญลักษณ์ระฆังหัวใจ <span className="font-bold text-rose-500 hover:scale-110 cursor-default">“ชื่นชอบ”</span> ในหน้ารวมโครงการ เพื่อเก็บรวบรวมโครงการนวัตกรรมที่คุณสนใจมาแสดงในหน้านี้ได้อย่างสะดวก
          </p>
        </motion.div>
      ) : filteredFavorites.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-12 text-center min-h-[300px] flex flex-col items-center justify-center text-slate-500">
          <Search className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-800">ไม่พบข้อมูลที่ค้นหา</p>
          <p className="text-xs text-slate-400 mt-1">ลองใช้คำค้นหาอื่นในการค้นหาจากรายการที่ชื่นชอบ</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          <AnimatePresence mode="popLayout">
            {filteredFavorites.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
