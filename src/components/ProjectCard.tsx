/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MessageCircle, ThumbsUp, Trophy, ArrowRight, Send, Edit3, Heart, Lock, Download } from 'lucide-react';
import React from 'react';
import { Project } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useProjects } from '../context/ProjectContext';
import { useState } from 'react';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { isAdmin, voteProject, commentProject, user, guestId, setIsModalOpen, setEditingProject, favorites, toggleFavorite } = useProjects();
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const handleCreateShortcut = (e: React.MouseEvent) => {
    e.preventDefault();
    let formattedUrl = project.projectUrl?.trim() || '';
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    if (!formattedUrl) {
      alert('ไม่พบ URL ของแอปนี้');
      return;
    }

    // สร้างไฟล์ HTML เพื่อใช้เป็นแอปทางลัด
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=${formattedUrl}">
    <title>${project.title || 'App'}</title>
    <style>
      body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8fafc; }
      .card { text-align: center; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
      .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #06b6d4; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem auto; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="card">
      <div class="spinner"></div>
      <h2>กำลังเปิดแอป ${project.title || 'App'}</h2>
      <p>กรุณารอสักครู่...</p>
    </div>
    <script>window.location.href = "${formattedUrl}";</script>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    const safeTitle = (project.title || 'app').replace(/[^a-zA-Z0-9ก-๙]/g, '_');
    a.download = `เข้าแอป_${safeTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };
  
  const isRanked = !!project.rank;
  const isOwner = user?.uid === project.ownerId;
  const canManage = isOwner || isAdmin;
  const voterId = user ? user.uid : guestId;
  const userHasVoted = !!(voterId && project.votedUserIds?.includes(voterId));
  const isFavorited = favorites?.includes(project.id) || false;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      commentProject(project.id, newComment);
      setNewComment('');
    }
  };

  const handleEdit = () => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  let formattedUrl = project.projectUrl?.trim() || '';
  if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl;
  }

  const rankStyles = {
    gold: {
      bg: 'bg-amber-500',
      text: 'text-amber-500',
      shadow: 'shadow-amber-100',
      border: 'border-amber-200',
      lightBg: 'bg-amber-50'
    },
    silver: {
      bg: 'bg-slate-400',
      text: 'text-slate-500',
      shadow: 'shadow-slate-100',
      border: 'border-slate-200',
      lightBg: 'bg-slate-50'
    },
    bronze: {
      bg: 'bg-orange-400',
      text: 'text-orange-500',
      shadow: 'shadow-orange-100',
      border: 'border-orange-200',
      lightBg: 'bg-orange-50'
    }
  };

  const style = project.rank ? rankStyles[project.rank] : null;

  return (
    <motion.div
      id={`project-${project.id}`}
      whileHover={{ y: -4 }}
      className={`group relative bg-white rounded-[2rem] border overflow-hidden transition-all duration-300 h-full flex flex-col ${
        isRanked ? `${style?.border} shadow-lg ${style?.shadow}` : 'border-slate-100 shadow-sm'
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-transparent">
        {formattedUrl ? (
          <a href={formattedUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full absolute inset-0 z-0">
            <img 
              src={project.thumbnail} 
              alt={project.title} 
              className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
            />
          </a>
        ) : (
          <img 
            src={project.thumbnail} 
            alt={project.title} 
            className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110 relative z-0"
          />
        )}
        
        <AnimatePresence>
          {canManage && (
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleEdit}
                className="p-2.5 bg-white text-slate-800 rounded-xl shadow-lg hover:bg-slate-50 transition-all flex items-center gap-1.5"
                title="Edit Project"
              >
                <Edit3 className="w-4 h-4 text-indigo-600" />
              </motion.button>
            </div>
          )}
        </AnimatePresence>


        {isRanked && (
          <div className={`absolute ${canManage ? 'top-16 animate-in slide-in-from-top-4' : 'top-4'} left-4 ${style?.bg} p-2 rounded-xl shadow-lg flex items-center gap-1.5 pr-3 z-10 transition-all duration-300`}>
            <Trophy className="w-4 h-4 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Top {project.rank}</span>
          </div>
        )}
        
        <div className="absolute top-4 right-4 bg-white/95 px-3 py-1 rounded-full shadow-sm">
          <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wide">{project.category}</span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-2">
          {formattedUrl ? (
            <a 
              href={formattedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-600 transition-colors block text-left"
            >
              <h4 className="text-base font-extrabold text-slate-900 line-clamp-2 leading-snug hover:text-indigo-600" title={project.title}>
                {project.title}
              </h4>
            </a>
          ) : (
            <h4 className="text-base font-extrabold text-slate-900 line-clamp-2 leading-snug" title={project.title}>
              {project.title}
            </h4>
          )}
        </div>

        <div className="mb-3">
          <div className="inline-flex items-center gap-2.5 bg-slate-50/80 hover:bg-slate-100/50 border border-slate-100 px-3 py-1.5 rounded-2xl transition-colors shadow-sm">
            <div className="w-7 h-7 rounded-full border border-white bg-slate-100 overflow-hidden flex-shrink-0 shadow-sm">
              <img 
                src={project.ownerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(project.team || project.ownerName || 'User')}`} 
                alt={project.team || project.ownerName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-left min-w-0 pr-1">
              <span className="text-xs font-black text-slate-900 block truncate max-w-[140px] leading-none mb-1" title={project.team || project.ownerName}>
                {project.team || project.ownerName}
              </span>
              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block leading-none">
                Owner
              </span>
            </div>
          </div>
        </div>

        <p 
          className="text-sm font-medium text-slate-800 mb-4 line-clamp-2 hover:line-clamp-none min-h-[40px] flex-1 transition-all duration-200 cursor-pointer"
        >
          {project.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-4">
            <a 
              href={formattedUrl || '#'}
              onClick={handleCreateShortcut}
              title="Download shortcut"
              className="flex items-center gap-1.5 transition-colors active:scale-90 text-slate-700 hover:text-cyan-600"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
            </a>
            <button 
              onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
              className={`flex items-center gap-1.5 transition-colors active:scale-90 ${
                isCommentsExpanded ? 'text-blue-600' : 'text-slate-700 hover:text-blue-500'
              }`}
            >
              <MessageCircle className="w-4 h-4 stroke-[2.5]" />
              <span className="text-sm font-bold text-slate-800">{project.comments}</span>
            </button>
          </div>
          
          <button
            onClick={() => toggleFavorite(project.id)}
            className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all active:scale-95 ${
              isFavorited
                ? 'bg-rose-50 border-rose-100 text-rose-600 shadow-sm'
                : 'bg-white border-slate-100 text-slate-600 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50/10'
            }`}
            title={isFavorited ? 'ยกเลิกถูกใจ' : 'ถูกใจ'}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {isCommentsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 mt-4 border-t border-slate-100">
                <form onSubmit={handleCommentSubmit} className="relative mb-4">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={user ? "Write a comment..." : "Sign in to comment | เข้าสู่ระบบเพื่อแสดงความเห็น"}
                    disabled={!user}
                    className="w-full pl-4 pr-12 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm disabled:opacity-65 disabled:cursor-not-allowed"
                  />
                  <button 
                    type="submit"
                    disabled={!user || !newComment.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 hover:bg-white/50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {project.commentsList?.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <img src={comment.userAvatar} alt="" className="w-8 h-8 rounded-full border border-slate-100" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{comment.userName}</span>
                          <span className="text-[10px] text-slate-400">{comment.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed bg-slate-50 p-2 rounded-lg rounded-tl-none border border-slate-50">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!project.commentsList || project.commentsList.length === 0) && (
                    <p className="text-center py-4 text-xs text-slate-400 italic">No comments yet. Be the first!</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
