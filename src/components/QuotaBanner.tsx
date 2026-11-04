/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AlertTriangle, ExternalLink, X, Database, ShieldAlert } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';

export default function QuotaBanner() {
  const { isQuotaExceeded, upgradeUrl, isAdmin } = useProjects();
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('gcmp_quota_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('gcmp_quota_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  if (!isQuotaExceeded || isDismissed) {
    return null;
  }

  return (
    <div className="mb-6 p-4 md:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm animate-fade-in relative">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/70 text-amber-800 uppercase tracking-wider">
                Firestore Free Tier Notice
              </span>
              <span className="text-xs font-semibold text-amber-700">
                Offline Cache Mode Active
              </span>
            </div>
            <h4 className="text-sm md:text-base font-bold text-amber-950">
              ฐานข้อมูลถึงขีดจำกัดการอ่านฟรีประจำวัน (Free Daily Read Quota Reached)
            </h4>
            <p className="text-xs md:text-sm text-amber-800 leading-relaxed max-w-4xl">
              แอปพลิเคชันกำลังทำงานใน <strong>โหมดออฟไลน์แคช (Offline Cache)</strong> โดยแสดงผลข้อมูลแอปพลิเคชันทั้งหมด 59 รายการอย่างสมบูรณ์แบบ โควตาอ่านฟรีของ Firestore จะรีเซ็ตอัตโนมัติในวันถัดไป หรือผู้ดูแลสามารถเปิดใช้งาน Billing เพื่อใช้งานได้ไม่จำกัด
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {isAdmin && (
                <a
                  href={upgradeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm shadow-amber-200 hover:scale-105 active:scale-95"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>เปิด Firebase Console เพื่ออัปเกรดฐานข้อมูล</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={handleDismiss}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition-colors"
              >
                <span>ซ่อนการแจ้งเตือนนี้</span>
              </button>
              <span className="text-xs text-amber-700">
                (โควตาจะรีเซ็ตอัตโนมัติทุก 24 ชม. ในช่วงบ่าย)
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-amber-500 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-100/50 transition-colors"
          title="ซ่อนการแจ้งเตือน"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
