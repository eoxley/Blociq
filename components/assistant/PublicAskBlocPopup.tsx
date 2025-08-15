"use client";

import React from 'react';
import { Brain, X } from 'lucide-react';

interface PublicAskBlocPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PublicAskBlocPopup({ isOpen, onClose }: PublicAskBlocPopupProps) {
  const handleClose = () => {
    // Store in sessionStorage so it doesn't reappear until page refresh
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('askBlocPopupShown', 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-auto md:w-[400px] rounded-2xl bg-white shadow-2xl z-[10000] border border-gray-100">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">🚀 Use BlocIQ Today</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="text-center">
            <p className="text-gray-600 mb-6 leading-relaxed">
              Click the Brain icon in the bottom-right corner to test Ask BlocIQ.
            </p>
            
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4338ca] hover:to-[#9333ea] text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
