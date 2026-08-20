import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

interface ShareQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareQRModal({ isOpen, onClose }: ShareQRModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = 'https://gcm-webhub.mosy-nicky.workers.dev/';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          ></div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <QrCode className="w-5 h-5" />
                <h3 className="font-bold text-slate-800">Share GCMP Hub</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex-shrink-0">
                <QRCodeSVG 
                  value={shareUrl} 
                  size={200}
                  level="H"
                  includeMargin={false}
                  bgColor={"#ffffff"}
                  fgColor={"#0f172a"}
                />
              </div>
              
              <div className="w-full">
                <p className="text-sm font-semibold text-slate-700 mb-2">Or copy link</p>
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex-1 overflow-hidden px-3">
                    <p className="text-xs text-slate-500 truncate">{shareUrl}</p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
