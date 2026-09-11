/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Search, 
  LayoutGrid, 
  Heart, 
  Upload, 
  Lock, 
  Mail, 
  User, 
  Edit3, 
  X, 
  ArrowRight, 
  Sparkles,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

const CursorClick = ({ className = "w-6 h-6" }: { className?: string }) => (
  <div className={`relative inline-block ${className} pointer-events-none select-none drop-shadow-md`}>
    <svg viewBox="0 0 24 24" fill="white" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M4 3l7.07 16.97 2.51-7.39 7.39-2.51L4 3z" />
    </svg>
    <span className="absolute -top-1 -right-1 text-indigo-500 font-black text-[11px] animate-pulse">✦</span>
    <span className="absolute -top-2 right-2 text-purple-400 font-bold text-[9px]">✧</span>
  </div>
);

export default function UserGuideView() {
  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Outer Card replicating the Infographic Poster */}
      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 md:p-12 border border-slate-200/90 shadow-2xl relative overflow-hidden">
        
        {/* Subtle background ambient glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

        {/* Header Section Removed to save space */}

        {/* SECTION 1: เข้าใช้งาน Web App */}
        <div className="mb-10 rounded-[2rem] border-2 border-cyan-400/80 overflow-hidden shadow-md bg-white">
          {/* Section Header */}
          <div className="bg-[#00c5e0] px-6 py-3.5 flex items-center gap-3 text-white">
            <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-wide">
              เข้าใช้งาน Web App
            </h2>
          </div>

          {/* Steps Grid */}
          <div className="p-6 md:p-8 bg-gradient-to-b from-cyan-50/20 to-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              
              {/* Step 1 */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    1
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    เข้า GCMP Hub
                  </h3>
                </div>

                <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm relative flex flex-col justify-center">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2.5">
                    {/* Browser Dots */}
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    {/* URL Bar */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 relative">
                      <Globe className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                      <span className="text-[10px] text-slate-600 truncate font-semibold">
                        https://gcm-webhub...
                      </span>
                      {/* Click Cursor */}
                      <div className="absolute -bottom-4 right-1 translate-y-2">
                        <CursorClick className="w-7 h-7" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col relative">
                <div className="hidden lg:block absolute -left-4 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-indigo-600 stroke-[3]" />
                </div>

                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    2
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    ค้นหา หรือเลือกหมวด
                  </h3>
                </div>

                <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-center space-y-3">
                  {/* Search Bar */}
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm text-slate-400 text-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] truncate">Search projects, categories...</span>
                  </div>
                  {/* Category Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                      All
                    </span>
                    <div className="relative">
                      <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black shadow-md flex items-center gap-1">
                        MN
                      </span>
                      <div className="absolute -bottom-3 -right-2 translate-y-1">
                        <CursorClick className="w-6 h-6" />
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                      PD
                    </span>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                      HR&GA
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col relative">
                <div className="hidden lg:block absolute -left-4 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-indigo-600 stroke-[3]" />
                </div>

                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    3
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    เลือก Web App
                  </h3>
                </div>

                <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex flex-col justify-center">
                  <div className="bg-white border-2 border-cyan-400 rounded-xl p-2.5 shadow-md relative group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        MN
                      </span>
                      <Heart className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                    {/* Visual Card Image */}
                    <div className="h-16 w-full rounded-lg bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 p-2 flex flex-col justify-end text-white overflow-hidden relative shadow-inner">
                      <div className="absolute top-1 left-1 text-[8px] font-black opacity-60">
                        ⚙ AXON
                      </div>
                      <span className="text-[11px] font-black leading-tight text-emerald-300">
                        Machine
                      </span>
                      <span className="text-[8px] font-medium text-slate-300">
                        Monitoring System
                      </span>
                    </div>
                    {/* Click Cursor */}
                    <div className="absolute -bottom-2 right-2 translate-y-1">
                      <CursorClick className="w-7 h-7" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col relative">
                <div className="hidden lg:block absolute -left-4 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-indigo-600 stroke-[3]" />
                </div>

                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    4
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    กดใช้งาน • บันทึก Favorite
                  </h3>
                </div>

                <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-center">
                  <div className="relative p-5 bg-white border border-rose-100 rounded-2xl shadow-md flex items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shadow-inner">
                      <Heart className="w-7 h-7 text-rose-500 fill-rose-500 animate-pulse" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 translate-y-1">
                      <CursorClick className="w-7 h-7" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Register Web App */}
        <div className="rounded-[2rem] border-2 border-indigo-500 overflow-hidden shadow-md bg-white">
          {/* Section Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 flex items-center gap-3 text-white">
            <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-wide">
              Register Web App
            </h2>
          </div>

          {/* Steps Grid */}
          <div className="p-6 md:p-8 bg-gradient-to-b from-indigo-50/20 to-white">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Step 1: Login */}
              <div className="lg:col-span-3 flex flex-col">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    1
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Login
                  </h3>
                </div>

                <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-center items-center space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>Email</span>
                  </div>
                  <div className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Password</span>
                  </div>
                  <div className="w-full bg-indigo-600 text-white rounded-lg py-1 text-center text-xs font-bold shadow-md shadow-indigo-100">
                    Sign In
                  </div>
                </div>
              </div>

              {/* Arrow Divider */}
              <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
                <ArrowRight className="w-6 h-6 text-indigo-600 stroke-[3]" />
              </div>

              {/* Step 2: กด + New App */}
              <div className="lg:col-span-3 flex flex-col">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    2
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    กด + New App
                  </h3>
                </div>

                <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-center">
                  <div className="relative">
                    <div className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                      <span className="text-base">+</span>
                      <span>New App</span>
                    </div>
                    <div className="absolute -bottom-3 -right-3 translate-y-1">
                      <CursorClick className="w-8 h-8" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow Divider */}
              <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
                <ArrowRight className="w-6 h-6 text-indigo-600 stroke-[3]" />
              </div>

              {/* Step 3: กรอกข้อมูลให้ครบ */}
              <div className="lg:col-span-4 flex flex-col">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    3
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    กรอกข้อมูลให้ครบ
                  </h3>
                </div>

                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xl space-y-2 text-left text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="font-extrabold text-slate-900 text-[11px]">
                      Launch New App
                    </span>
                    <X className="w-3 h-3 text-slate-400" />
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    {/* Left Column: Form Fields */}
                    <div className="col-span-8 space-y-1.5">
                      <div>
                        <div className="text-[9px] font-bold text-slate-600">App Title</div>
                        <div className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] text-slate-700 font-medium truncate">
                          Machine Monitoring System
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <div className="text-[9px] font-bold text-slate-600">Category</div>
                          <div className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] text-slate-700 font-medium">
                            MN
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-600 truncate">App URL</div>
                          <div className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[8px] text-slate-500 font-medium truncate">
                            https://demo.com
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-bold text-slate-600">Description</div>
                        <div className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] text-slate-600 truncate">
                          Web application for machine monitoring
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Picture Preview */}
                    <div className="col-span-4 flex flex-col justify-between">
                      <div>
                        <div className="text-[9px] font-bold text-slate-600 mb-0.5">App Picture</div>
                        <div className="h-12 w-full rounded bg-emerald-900/90 border border-slate-200 flex items-center justify-center text-[7px] text-emerald-200 font-bold p-1 text-center leading-none shadow-inner">
                          AXON System
                        </div>
                      </div>
                      <button 
                        type="button"
                        className="w-full bg-slate-100 hover:bg-slate-200 text-indigo-600 font-bold text-[8px] py-1 rounded border border-slate-200 flex items-center justify-center gap-0.5"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>UPLOAD FILE</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100 relative">
                    <span className="text-[9px] font-semibold text-slate-400 px-2 py-0.5">
                      Cancel
                    </span>
                    <div className="relative">
                      <div className="bg-indigo-600 text-white rounded-lg px-2.5 py-1 text-[9px] font-black flex items-center gap-1 shadow-md shadow-indigo-100">
                        <Upload className="w-2.5 h-2.5" />
                        <span>Publish App</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 translate-y-1">
                        <CursorClick className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

