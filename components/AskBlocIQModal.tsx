"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface AskBlocIQModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function AskBlocIQModal({ open, onClose, children }: AskBlocIQModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <>
        {/* Background overlay */}
        <motion.div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Popout container */}
        <motion.div 
          className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-[880px] h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/90 backdrop-blur shadow-2xl border border-black/5 overflow-hidden flex flex-col"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 bg-white/70 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-gray-900">Ask BlocIQ</h3>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-md hover:bg-black/5 transition-colors"
              title="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
