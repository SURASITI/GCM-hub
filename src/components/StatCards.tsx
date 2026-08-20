/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FolderKanban, Tag, Heart, Activity } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { motion } from 'motion/react';

export default function StatCards() {
  const { projects, totalVisits } = useProjects();

  // 1. Total Projects
  const totalProjectsCount = projects.length;

  // 2. Category with most projects
  const categoryCounts: Record<string, number> = {};
  projects.forEach((p) => {
    const cat = p.category;
    if (cat && cat.toLowerCase() !== 'all') {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  });

  let topCategory = '-';
  let maxCategoryCount = 0;
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (count > maxCategoryCount) {
      maxCategoryCount = count;
      topCategory = cat;
    }
  });

  // 3. Project with most favorites
  let topProjectTitle = 'ยังไม่มีข้อมูล';
  let topProjectFavorites = 0;

  projects.forEach((p) => {
    const favCount = Math.max(p.favoriteCount || 0, p.favoritedUserIds?.length || 0);
    if (favCount > topProjectFavorites) {
      topProjectFavorites = favCount;
      topProjectTitle = p.title;
    }
  });

  const cards = [
    {
      label: 'Total Projects',
      labelTh: 'โครงการทั้งหมด',
      value: totalProjectsCount.toString(),
      subtext: 'Submitted & Active',
      icon: FolderKanban,
      iconColor: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Top Category',
      labelTh: 'หมวดหมู่ที่มีโครงการเยอะสุด',
      value: topCategory,
      subtext: maxCategoryCount > 0 ? `${maxCategoryCount} Projects` : 'No projects yet',
      icon: Tag,
      iconColor: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Most Favorited',
      labelTh: 'แอปที่ถูกกดหัวใจมากที่สุด',
      value: topProjectTitle,
      subtext: topProjectFavorites > 0 
        ? `${topProjectFavorites} หัวใจ (Favorites)`
        : 'ยังไม่มีการกดหัวใจ',
      icon: Heart,
      iconColor: 'text-rose-500 bg-rose-50',
      isLong: true,
    },
    {
      label: 'Hub Visits',
      labelTh: 'จำนวนการเข้าชม GCMP Hub',
      value: totalVisits.toLocaleString(),
      subtext: 'Total Page Views',
      icon: Activity,
      iconColor: 'text-rose-600 bg-rose-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex justify-between items-start"
          >
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                {card.label}
              </span>
              <p className="text-xs font-bold text-slate-700 mb-2 truncate" title={card.labelTh}>
                {card.labelTh}
              </p>
              <h4 className={`font-black text-slate-900 leading-tight ${
                card.isLong ? 'text-lg line-clamp-2 md:line-clamp-1 pb-1' : 'text-3xl font-mono'
              }`} title={card.value}>
                {card.value}
              </h4>
              <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1">
                {card.subtext}
              </p>
            </div>
            <div className={`p-4 rounded-2xl ${card.iconColor} flex-shrink-0 flex items-center justify-center shadow-inner`}>
              <Icon className="w-6 h-6 fill-current" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
