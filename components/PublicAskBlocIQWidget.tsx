"use client";

import React, { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';
import PublicAskBlocIQ from './PublicAskBlocIQ';

interface PublicAskBlocIQWidgetProps {
  autoShow?: boolean;
  autoShowDelay?: number;
}

export default function PublicAskBlocIQWidget({ 
  autoShow = true, 
  autoShowDelay = 3000 
}: PublicAskBlocIQWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasAutoShown, setHasAutoShown] = useState(false);

  // Auto-show modal after delay on page load
  useEffect(() => {
    if (autoShow && !hasAutoShown) {
      const timer = setTimeout(() => {
        setIsModalOpen(true);
        setHasAutoShown(true);
      }, autoShowDelay);

      return () => clearTimeout(timer);
    }
  }, [autoShow, autoShowDelay, hasAutoShown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  return (
    <>
      {/* Floating Widget */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* Pulsating Gradient Background */}
        <div className="relative">
          {/* Pulsating Rings */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 opacity-75 animate-ping"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 opacity-50 animate-pulse"></div>
          
          {/* Main Widget Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="relative w-16 h-16 bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          >
            <Brain className="h-8 w-8 text-white group-hover:scale-110 transition-transform duration-300" />
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-black text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap">
                Ask BlocIQ AI Assistant
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Modal */}
      <PublicAskBlocIQ 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes pulse-gradient {
          0%, 100% {
            background: linear-gradient(45deg, #ec4899, #14b8a6, #a855f7, #3b82f6);
          }
          25% {
            background: linear-gradient(45deg, #14b8a6, #a855f7, #3b82f6, #ec4899);
          }
          50% {
            background: linear-gradient(45deg, #a855f7, #3b82f6, #ec4899, #14b8a6);
          }
          75% {
            background: linear-gradient(45deg, #3b82f6, #ec4899, #14b8a6, #a855f7);
          }
        }
        
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.9;
          }
        }
        
        .animate-breathe {
          animation: breathe 3s ease-in-out infinite;
        }
        
        .animate-pulse-gradient {
          animation: pulse-gradient 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}