/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  X,
  Database,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjects } from '../context/ProjectContext';
import { normalizeRtdbUrl } from '../lib/firebase';

const RTDB_RULES_JSON = `{
  "rules": {
    ".read": false,
    ".write": false,
    "projects": {
      ".read": true,
      ".indexOn": ["createdAt", "ownerId", "category"],
      "$projectId": {
        ".write": "auth != null && (auth.token.email == 'Mosy_nicky@hotmail.com' || auth.token.email == 'mosy_nicky@hotmail.com' || (!data.exists() && newData.child('ownerId').val() == auth.uid) || (data.exists() && data.child('ownerId').val() == auth.uid))",
        ".validate": "!newData.exists() || (newData.hasChildren(['title', 'team', 'category', 'description', 'ownerId']) && newData.child('title').isString() && newData.child('title').val().length <= 200 && newData.child('team').isString() && newData.child('team').val().length <= 100 && newData.child('category').isString() && newData.child('category').val().length <= 20 && newData.child('description').isString() && newData.child('description').val().length <= 5000)",
        "votes": { ".write": true, ".validate": "newData.isNumber() && newData.val() >= 0" },
        "votedUserIds": { ".write": true },
        "favoriteCount": { ".write": true, ".validate": "newData.isNumber() && newData.val() >= 0" },
        "favoritedUserIds": { ".write": true },
        "comments": { ".write": "auth != null", ".validate": "newData.isNumber() && newData.val() >= 0" },
        "commentsList": { ".write": "auth != null" }
      }
    }
  }
}`;

export default function RtdbMigrationModal() {
  const {
    isAdmin,
    isMigrationModalOpen,
    setIsMigrationModalOpen,
    rtdbUrl,
    activeDataSource,
    migrationState,
    migrateFirestoreToRtdb,
    resetMigrationState,
    inspectDatabaseCounts,
  } = useProjects();

  const [inputUrl, setInputUrl] = useState(rtdbUrl || '');
  const [compressDuringMigration, setCompressDuringMigration] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);
  const [counts, setCounts] = useState<{
    firestoreCount: number | null;
    rtdbCount: number | null;
    rtdbError?: string;
    checking: boolean;
  }>({
    firestoreCount: null,
    rtdbCount: null,
    checking: false,
  });

  useEffect(() => {
    if (isMigrationModalOpen) {
      if (rtdbUrl && !inputUrl) {
        setInputUrl(rtdbUrl);
      }
      handleCheckCounts(rtdbUrl || inputUrl);
    }
  }, [isMigrationModalOpen, rtdbUrl]);

  if (!isAdmin) return null;

  const handleCheckCounts = async (urlToCheck?: string) => {
    setCounts(prev => ({ ...prev, checking: true, rtdbError: undefined }));
    const res = await inspectDatabaseCounts(urlToCheck);
    setCounts({
      firestoreCount: res.firestoreCount,
      rtdbCount: res.rtdbCount,
      rtdbError: res.rtdbError,
      checking: false,
    });
  };

  const handleClose = () => {
    if (migrationState.isRunning) return;
    resetMigrationState();
    setIsMigrationModalOpen(false);
  };

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(RTDB_RULES_JSON);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleStartMigration = async () => {
    try {
      await migrateFirestoreToRtdb(inputUrl, compressDuringMigration);
      await handleCheckCounts(inputUrl);
    } catch {
      // error captured inside migrationState.error
    }
  };

  const isValidUrl = Boolean(normalizeRtdbUrl(inputUrl));
  const progressPercent = migrationState.total > 0
    ? Math.min(100, Math.round((migrationState.processed / migrationState.total) * 100))
    : 0;

  return (
    <AnimatePresence>
      {isMigrationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="w-full max-w-xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden my-auto"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-100">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    ย้ายฐานข้อมูลไป Realtime Database
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    สถานะปัจจุบัน: <strong className={activeDataSource === 'rtdb' ? 'text-emerald-600' : 'text-indigo-600'}>
                      {activeDataSource === 'rtdb' ? 'Realtime Database (ใช้งานอยู่)' : 'Cloud Firestore'}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                disabled={migrationState.isRunning}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Database URL Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Firebase Realtime Database URL (`databaseURL`)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    disabled={migrationState.isRunning}
                    placeholder="https://gen-lang-client-0975890740-default-rtdb.asia-southeast1.firebasedatabase.app"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCheckCounts(inputUrl)}
                    disabled={counts.checking || !isValidUrl || migrationState.isRunning}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    title="ทดสอบเชื่อมต่อและนับข้อมูล"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${counts.checking ? 'animate-spin' : ''}`} />
                    <span>ตรวจสอบ</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>ตัวอย่างด่วน:</span>
                  <button
                    type="button"
                    onClick={() => setInputUrl('https://gen-lang-client-0975890740-default-rtdb.asia-southeast1.firebasedatabase.app')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 font-mono transition-colors"
                  >
                    asia-southeast1 (Singapore)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputUrl('https://gen-lang-client-0975890740-default-rtdb.firebaseio.com')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 font-mono transition-colors"
                  >
                    us-central1 (firebaseio.com)
                  </button>
                </div>
              </div>

              {/* Comparison Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-indigo-700">Firestore (ต้นทาง / สำรอง)</div>
                    <div className="text-lg font-black text-indigo-950">
                      {counts.firestoreCount !== null ? `${counts.firestoreCount} แอป` : '...'}
                    </div>
                  </div>
                  <Database className="w-6 h-6 text-indigo-400" />
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-cyan-700">Realtime Database (ปลายทาง)</div>
                    <div className="text-lg font-black text-cyan-950">
                      {counts.rtdbCount !== null ? `${counts.rtdbCount} แอป` : (isValidUrl ? 'ยังไม่พบข้อมูล' : 'รอใส่ URL')}
                    </div>
                  </div>
                  <ArrowRightLeft className="w-6 h-6 text-cyan-500" />
                </div>
              </div>

              {counts.rtdbError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                  หมายเหตุการเชื่อมต่อ RTDB: {counts.rtdbError}
                </div>
              )}

              {/* Rules Helper */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRules(!showRules)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>คัดลอก Rules สำหรับ Realtime Database (วางใน Firebase Console &gt; Rules)</span>
                  </span>
                  {showRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showRules && (
                  <div className="p-3.5 bg-slate-900 text-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">database.rules.json</span>
                      <button
                        type="button"
                        onClick={handleCopyRules}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-300 transition-colors"
                      >
                        {copiedRules ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedRules ? 'คัดลอกแล้ว' : 'คัดลอก Rules'}</span>
                      </button>
                    </div>
                    <pre className="text-[10px] leading-relaxed overflow-x-auto max-h-44 font-mono text-slate-200">
                      {RTDB_RULES_JSON}
                    </pre>
                  </div>
                )}
              </div>

              {/* Options */}
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compressDuringMigration}
                  onChange={(e) => setCompressDuringMigration(e.target.checked)}
                  disabled={migrationState.isRunning}
                  className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-emerald-900">
                    บีบอัดรูปภาพให้เป็น WebP ขนาดเล็กสุด (ปก ≤35KB / โปรไฟล์ ≤10KB) ระหว่างย้ายอัตโนมัติ
                  </div>
                  <div className="text-emerald-700 mt-0.5">
                    ช่วยประหยัด Bandwidth ของ Realtime Database และทำให้โหลดผ่าน IndexedDB เร็วขึ้น — ข้อมูลเดิมใน Firestore จะไม่ถูกลบหรือแก้ไข
                  </div>
                </div>
              </label>

              {/* Progress */}
              {(migrationState.isRunning || migrationState.completed) && (
                <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-cyan-950 flex items-center gap-2 truncate pr-2">
                      {migrationState.isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-600 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                      <span className="truncate">{migrationState.currentTitle}</span>
                    </span>
                    <span className="text-cyan-700 font-mono flex-shrink-0">
                      {migrationState.processed} / {migrationState.total}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-cyan-100">
                    <div
                      className={`h-full transition-all duration-300 ${
                        migrationState.completed ? 'bg-emerald-500' : 'bg-cyan-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
                    <span>ย้ายแล้ว: <strong className="text-slate-900">{migrationState.migratedCount}</strong> แอป</span>
                    <span>บีบอัดเพิ่ม: <strong className="text-indigo-700">{migrationState.compressedCount}</strong> แอป</span>
                    <span>ประหยัดพื้นที่: <strong className="text-emerald-600">{(migrationState.savedBytes / 1024).toFixed(1)} KB</strong></span>
                  </div>
                </div>
              )}

              {migrationState.error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{migrationState.error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={migrationState.isRunning}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                >
                  {migrationState.completed ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
                </button>

                <button
                  type="button"
                  onClick={handleStartMigration}
                  disabled={migrationState.isRunning || !isValidUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-lg shadow-cyan-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {migrationState.isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังย้ายข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>ย้ายข้อมูลจาก Firestore ไป RTDB</span>
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
