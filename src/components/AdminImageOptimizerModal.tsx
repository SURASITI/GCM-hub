/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { X, ImageDown, CheckCircle2, AlertCircle, Loader2, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjects } from '../context/ProjectContext';
import {
  THUMBNAIL_COMPRESS_OPTIONS,
  AVATAR_COMPRESS_OPTIONS,
  getDataUrlByteSize,
  needsImageOptimization
} from '../lib/imageCompressor';

export default function AdminImageOptimizerModal() {
  const {
    isAdmin,
    projects,
    isOptimizerModalOpen,
    setIsOptimizerModalOpen,
    batchOptimizeState,
    batchOptimizeFirestoreImages,
    resetBatchOptimizeState,
  } = useProjects();

  const stats = useMemo(() => {
    let needsOptimizationCount = 0;
    let totalBase64Bytes = 0;

    for (const p of projects) {
      if (p.thumbnail?.startsWith('data:image/')) {
        totalBase64Bytes += getDataUrlByteSize(p.thumbnail);
      }
      if (p.ownerAvatar?.startsWith('data:image/')) {
        totalBase64Bytes += getDataUrlByteSize(p.ownerAvatar);
      }
      const thumbNeeds = needsImageOptimization(p.thumbnail, THUMBNAIL_COMPRESS_OPTIONS.maxSizeBytes);
      const avatarNeeds = needsImageOptimization(p.ownerAvatar, AVATAR_COMPRESS_OPTIONS.maxSizeBytes);
      if (thumbNeeds || avatarNeeds) {
        needsOptimizationCount += 1;
      }
    }

    return {
      totalProjects: projects.length,
      needsOptimizationCount,
      totalBase64MB: (totalBase64Bytes / (1024 * 1024)).toFixed(2),
      totalBase64KB: (totalBase64Bytes / 1024).toFixed(0),
    };
  }, [projects]);

  if (!isAdmin) return null;

  const handleClose = () => {
    if (batchOptimizeState.isRunning) return;
    resetBatchOptimizeState();
    setIsOptimizerModalOpen(false);
  };

  const handleStart = async () => {
    try {
      await batchOptimizeFirestoreImages();
    } catch {
      // error captured inside batchOptimizeState.error
    }
  };

  const progressPercent = batchOptimizeState.total > 0
    ? Math.min(100, Math.round((batchOptimizeState.processed / batchOptimizeState.total) * 100))
    : 0;

  return (
    <AnimatePresence>
      {isOptimizerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                  <ImageDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    บีบอัดรูปภาพทั้งหมดใน Firebase
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Ultra-Compact WebP (ปก ≤35KB / โปรไฟล์ ≤10KB)
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                disabled={batchOptimizeState.isRunning}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <div className="text-lg font-black text-slate-900">{stats.totalProjects}</div>
                  <div className="text-[11px] font-bold text-slate-500">แอปทั้งหมด</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 text-center">
                  <div className="text-lg font-black text-amber-700">{stats.needsOptimizationCount}</div>
                  <div className="text-[11px] font-bold text-amber-700">แอปที่ลดขนาดได้</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center">
                  <div className="text-lg font-black text-indigo-700">
                    {Number(stats.totalBase64MB) >= 1 ? `${stats.totalBase64MB} MB` : `${stats.totalBase64KB} KB`}
                  </div>
                  <div className="text-[11px] font-bold text-indigo-700">ขนาดรูป Base64 รวม</div>
                </div>
              </div>

              {/* Specification Info */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>การทำงานของระบบบีบอัด (Admin Batch Optimizer)</span>
                </div>
                <p>
                  ระบบจะสแกนข้อมูลทุกแอปใน Firestore, แปลงรูปภาพหน้าปกเป็น WebP ≤360px (ไม่เกิน 35 KB), รูปโปรไฟล์เป็น WebP ≤96px (ไม่เกิน 10 KB) และอัปเดตเฉพาะเอกสารที่มีการลดขนาดลงจริง พร้อมบันทึกลง IndexedDB Cache ทันที
                </p>
              </div>

              {/* Progress / Status */}
              {(batchOptimizeState.isRunning || batchOptimizeState.completed) && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-indigo-900 flex items-center gap-2 truncate pr-2">
                      {batchOptimizeState.isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                      <span className="truncate">{batchOptimizeState.currentTitle}</span>
                    </span>
                    <span className="text-indigo-700 font-mono flex-shrink-0">
                      {batchOptimizeState.processed} / {batchOptimizeState.total}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-indigo-100">
                    <div
                      className={`h-full transition-all duration-300 ${
                        batchOptimizeState.completed ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>อัปเดตแล้ว: <strong className="text-slate-900">{batchOptimizeState.updatedCount}</strong> แอป</span>
                    <span>
                      ประหยัดได้: <strong className="text-emerald-600">{(batchOptimizeState.savedBytes / 1024).toFixed(1)} KB</strong>
                    </span>
                  </div>
                </div>
              )}

              {batchOptimizeState.error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{batchOptimizeState.error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={batchOptimizeState.isRunning}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                >
                  {batchOptimizeState.completed ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
                </button>

                <button
                  type="button"
                  onClick={handleStart}
                  disabled={batchOptimizeState.isRunning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {batchOptimizeState.isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบีบอัด...</span>
                    </>
                  ) : (
                    <>
                      <ImageDown className="w-4 h-4" />
                      <span>เริ่มบีบอัดรูปทั้งหมดใน Firebase</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
