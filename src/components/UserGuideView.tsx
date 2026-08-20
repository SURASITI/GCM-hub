/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  ExternalLink, 
  Download, 
  Heart, 
  MessageCircle, 
  Plus, 
  Sparkles, 
  Smartphone, 
  Laptop, 
  MousePointerClick,
  CheckCircle2
} from 'lucide-react';

export default function UserGuideView() {
  const steps = [
    {
      step: '01',
      title: 'ค้นหา & เลือกดูแอป',
      titleEn: 'Explore & Search',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50/60 border-blue-100',
      badgeColor: 'bg-blue-600 text-white',
      desc: 'ค้นหาแอปที่ต้องการตามชื่อ หมวดหมู่ หรือแท็กการใช้งานได้ทันที',
      visual: (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-2 rounded-xl border border-slate-200/60">
            <Search className="w-4 h-4 text-slate-500" />
            <div className="h-2.5 w-24 bg-slate-300 rounded-full animate-pulse"></div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg shadow-sm">ทั้งหมด</span>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg">วิศวกรรม</span>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg">บำรุงรักษา</span>
          </div>
        </div>
      )
    },
    {
      step: '02',
      title: 'เปิดใช้งาน & สร้าง Shortcut',
      titleEn: 'Open & Shortcut',
      color: 'from-cyan-500 to-blue-600',
      bgColor: 'bg-cyan-50/60 border-cyan-100',
      badgeColor: 'bg-cyan-600 text-white',
      desc: 'คลิกการ์ดเพื่อเข้าใช้งานแอปทันที หรือกดปุ่ม Shortcut เพื่อนำไปไว้หน้าจอ',
      visual: (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-1.5">
              <ExternalLink className="w-5 h-5" />
              <span className="text-xs font-black">เปิดใช้งาน</span>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl border border-cyan-100 shadow-sm flex items-center gap-1.5">
              <Download className="w-5 h-5" />
              <span className="text-xs font-black">Shortcut</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
            <span>รองรับทั้ง มือถือ & คอมพิวเตอร์</span>
            <Laptop className="w-3.5 h-3.5 text-indigo-500" />
          </div>
        </div>
      )
    },
    {
      step: '03',
      title: 'บันทึกโปรด & แสดงความเห็น',
      titleEn: 'Favorite & Comment',
      color: 'from-rose-500 to-pink-600',
      bgColor: 'bg-rose-50/60 border-rose-100',
      badgeColor: 'bg-rose-600 text-white',
      desc: 'กดปุ่มหัวใจเพื่อเก็บบันทึกแอปโปรด และเขียนคำแนะนำแลกเปลี่ยนกัน',
      visual: (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-around">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100/80 text-rose-600 flex items-center justify-center shadow-sm">
              <Heart className="w-5 h-5 fill-rose-600" />
            </div>
            <span className="text-[11px] font-extrabold text-slate-700">Favorites</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center shadow-sm">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-extrabold text-slate-700">Comments</span>
          </div>
        </div>
      )
    },
    {
      step: '04',
      title: 'เพิ่มแอปพลิเคชันใหม่',
      titleEn: 'Add New Project',
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50/60 border-purple-100',
      badgeColor: 'bg-purple-600 text-white',
      desc: 'เข้าสู่ระบบแล้วกดปุ่ม "New Project" เพื่อแบ่งปันแอปของคุณแก่ทีมงาน',
      visual: (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-center">
          <div className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 flex items-center gap-2">
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Project</span>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-800">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-extrabold uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>User Guide / คู่มือการใช้งาน</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug mb-2">
            วิธีการใช้งาน GCMP Hub ง่ายๆ ใน 4 ขั้นตอน
          </h2>
          <p className="text-slate-300 text-sm font-medium leading-relaxed">
            ศูนย์รวมแอปพลิเคชันและเครื่องมือการทำงาน สะดวก รวดเร็ว พร้อมภาพประกอบที่เข้าใจได้ทันที
          </p>
        </div>
      </div>

      {/* 4 Steps Infographic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((item, idx) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-6 rounded-[2rem] border ${item.bgColor} shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-xl text-xs font-black ${item.badgeColor}`}>
                  STEP {item.step}
                </span>
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  {item.titleEn}
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-900 mb-1">
                {item.title}
              </h3>
              <p className="text-xs font-semibold text-slate-600 mb-5 leading-relaxed">
                {item.desc}
              </p>
            </div>

            {/* Visual Graphic Box */}
            <div className="mt-auto">
              {item.visual}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Tips Box */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-2xl flex-shrink-0 border border-emerald-100 shadow-sm">
          💡
        </div>
        <div className="flex-1 space-y-1 text-center md:text-left">
          <h4 className="text-base font-black text-slate-900">
            คำแนะนำเพิ่มเติมสำหรับผู้ใช้งาน
          </h4>
          <p className="text-xs font-semibold text-slate-600 leading-relaxed">
            - คุณสามารถใช้งานแอปต่างๆ และกดหัวใจ (Favorites) ได้โดยไม่ต้องเข้าสู่ระบบ
            <br />
            - หากต้องการสร้างแอปพลิเคชันใหม่ หรือพิมพ์คอมเมนต์ กรุณาเข้าสู่ระบบด้วย Google Sign-In
          </p>
        </div>
      </div>
    </div>
  );
}
