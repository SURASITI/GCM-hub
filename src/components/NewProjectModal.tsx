/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import React from 'react';
import { X, Upload, Loader2, Edit3, Trash2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjects } from '../context/ProjectContext';
import { CATEGORIES } from '../types';
import { compressImage } from '../lib/imageCompressor';

export default function NewProjectModal() {
  const { isModalOpen, setIsModalOpen, addProject, editingProject, setEditingProject, updateProject, deleteProject, user } = useProjects();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    team: '',
    category: CATEGORIES[1],
    description: '',
    thumbnail: '',
    projectUrl: '',
    ownerAvatar: '',
  });

  useEffect(() => {
    setSubmitError(null);
    if (editingProject) {
      setFormData({
        title: editingProject.title,
        team: editingProject.team,
        category: editingProject.category,
        description: editingProject.description,
        thumbnail: editingProject.thumbnail || '',
        projectUrl: editingProject.projectUrl || '',
        ownerAvatar: editingProject.ownerAvatar || '',
      });
    } else {
      setFormData({ 
        title: '', 
        team: user?.displayName || '', 
        category: CATEGORIES[1], 
        description: '', 
        thumbnail: '', 
        projectUrl: '',
        ownerAvatar: user?.photoURL || '',
      });
    }
  }, [editingProject, isModalOpen, user]);

  if (!isModalOpen) return null;

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setSubmitError(null);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.team.trim()) newErrors.team = 'Owner name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      setSubmitError(null);
      try {
        const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.82 });
        setFormData((prev) => ({ ...prev, thumbnail: compressed }));
      } catch (error) {
        console.error("Error compressing thumbnail:", error);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  const handleOwnerAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      setSubmitError(null);
      try {
        const compressed = await compressImage(file, { maxWidth: 200, maxHeight: 200, quality: 0.85 });
        setFormData((prev) => ({ ...prev, ownerAvatar: compressed }));
      } catch (error) {
        console.error("Error compressing owner avatar:", error);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Auto-compress base64 images to guarantee Firestore document size <= 1MB
      let finalThumbnail = formData.thumbnail;
      let finalOwnerAvatar = formData.ownerAvatar;

      if (finalThumbnail && finalThumbnail.startsWith('data:image/')) {
        try {
          finalThumbnail = await compressImage(finalThumbnail, { maxWidth: 600, maxHeight: 600, quality: 0.82 });
        } catch (err) {
          console.warn("Failed to re-compress thumbnail, using original:", err);
        }
      }

      if (finalOwnerAvatar && finalOwnerAvatar.startsWith('data:image/')) {
        try {
          finalOwnerAvatar = await compressImage(finalOwnerAvatar, { maxWidth: 200, maxHeight: 200, quality: 0.85 });
        } catch (err) {
          console.warn("Failed to re-compress avatar, using original:", err);
        }
      }

      if (editingProject) {
        await updateProject(editingProject.id, {
          title: formData.title,
          team: formData.team,
          category: formData.category,
          description: formData.description,
          thumbnail: finalThumbnail || 'https://images.unsplash.com/photo-1664575602554-2087b04935a5?auto=format&fit=crop&q=80&w=400&h=250',
          projectUrl: formData.projectUrl,
          ownerAvatar: finalOwnerAvatar || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.team || 'User')}`,
        });
        setEditingProject(null);
        setIsModalOpen(false);
      } else {
        await addProject({
          title: formData.title,
          team: formData.team,
          category: formData.category,
          description: formData.description,
          thumbnail: finalThumbnail || 'https://images.unsplash.com/photo-1664575602554-2087b04935a5?auto=format&fit=crop&q=80&w=400&h=250',
          projectUrl: formData.projectUrl,
          ownerAvatar: finalOwnerAvatar || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.team || 'User')}`,
        });
      }
    } catch (err: any) {
      console.error("Failed to submit project: ", err);
      // Simplify Firestore's raw error messages to be user-friendly
      let readableError = err?.message || String(err);
      if (readableError.includes("permission-denied") || readableError.includes("Missing or insufficient permissions")) {
        readableError = "Permission denied. Please ensure you are logged in with the correct email.";
      }
      setSubmitError(readableError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingProject) return;
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแอป "${editingProject.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await deleteProject(editingProject.id);
        handleClose();
      } catch (err: any) {
        console.error("Failed to delete project: ", err);
        let readableError = err?.message || String(err);
        if (readableError.includes("permission-denied") || readableError.includes("Missing or insufficient permissions")) {
          readableError = "Permission denied. You do not have permission to delete this project.";
        }
        setSubmitError(readableError);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
        >
          <div className="p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {editingProject ? 'Edit Project' : 'Launch New Project'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {editingProject ? 'Make changes to your innovation' : 'Share your innovation with the company'}
                </p>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold leading-relaxed"
                >
                  {submitError}
                </motion.div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Project Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter project name"
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none ${
                        errors.title ? 'border-red-300 bg-red-50' : 'border-slate-100'
                    }`}
                  />
                  {errors.title && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Owner Name</label>
                  <input
                    type="text"
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    placeholder="Enter owner name"
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none ${
                        errors.team ? 'border-red-300 bg-red-50' : 'border-slate-100'
                    }`}
                  />
                  {errors.team && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{errors.team}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none"
                  >
                    {CATEGORIES.slice(1).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Project URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.projectUrl}
                    onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                    placeholder="https://project-demo.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Project Picture</label>
                <div className="flex gap-4 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.thumbnail}
                      onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                      placeholder="Paste image URL..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                    />
                    <div className="mt-2 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] text-slate-400 font-bold uppercase">or</span>
                         <label className="cursor-pointer text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                           {isProcessingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                           {isProcessingImage ? 'Optimizing...' : 'Upload File'}
                           <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isProcessingImage} />
                         </label>
                       </div>
                       <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                         <Sparkles className="w-3 h-3" /> Auto-resized
                       </span>
                    </div>
                  </div>
                  {formData.thumbnail && (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                      <img src={formData.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Owner Picture (Profile Picture)</label>
                <div className="flex gap-4 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.ownerAvatar}
                      onChange={(e) => setFormData({ ...formData, ownerAvatar: e.target.value })}
                      placeholder="Paste image URL (or leave blank to use default)..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                    />
                    <div className="mt-2 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] text-slate-400 font-bold uppercase">or</span>
                         <label className="cursor-pointer text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                           {isProcessingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                           {isProcessingImage ? 'Optimizing...' : 'Upload Avatar'}
                           <input type="file" className="hidden" accept="image/*" onChange={handleOwnerAvatarFileChange} disabled={isProcessingImage} />
                         </label>
                       </div>
                       <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                         <Sparkles className="w-3 h-3" /> Auto-resized
                       </span>
                    </div>
                  </div>
                  {formData.ownerAvatar && (
                    <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0 shadow-sm animate-fade-in">
                      <img src={formData.ownerAvatar} alt="Owner Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the problem, solution, and potential impact..."
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none ${
                    errors.description ? 'border-red-300 bg-red-50' : 'border-slate-100'
                  }`}
                />
                {errors.description && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-wider">{errors.description}</p>}
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {editingProject ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-rose-200 text-sm disabled:opacity-50"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ลบแอป (Delete)</span>
                  </button>
                ) : (
                  <div className="hidden sm:block"></div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-70 text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {editingProject ? <Edit3 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                        {editingProject ? 'Save Changes' : 'Publish Project'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
