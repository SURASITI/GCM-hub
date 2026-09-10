/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

export default function UserGuideView() {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Guide Image Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <img 
          src="/guide.png" 
          alt="GCMP Hub User Guide" 
          className="w-full h-auto rounded-[1.5rem] object-contain shadow-lg border border-slate-200"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://placehold.co/1200x800/f8fafc/94a3b8?text=Please+upload+your+image+as+'guide.png'+in+the+'public'+folder";
          }}
        />
      </motion.div>
    </div>
  );
}
