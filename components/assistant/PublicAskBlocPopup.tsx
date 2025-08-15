"use client";

import React, { useState, useEffect } from 'react';
import { X, Brain, Sparkles } from 'lucide-react';

interface PublicAskBlocPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PublicAskBlocPopup({ isOpen, onClose }: PublicAskBlocPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay for smooth animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    // Store in sessionStorage so it doesn't show again until page refresh
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('askBlocPopupShown', 'true');
    }
    setTimeout(onClose, 200); // Allow animation to complete
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className={`bg-white p-6 rounded-xl shadow-lg max-w-md mx-auto transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">🚀 Use BlocIQ Today</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600 leading-relaxed">
            Click the <strong>Brain icon</strong> in the bottom right to start your free trial of Ask BlocIQ.
          </p>
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <div className="flex items-center space-x-2 text-sm text-blue-700">
              <Sparkles className="h-4 w-4" />
              <span>Experience AI-powered property management</span>
            </div>
          </div>
        </div>

        {/* Button */}
        <button
          onClick={handleClose}
          className="w-full bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4338ca] hover:to-[#9333ea] text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
