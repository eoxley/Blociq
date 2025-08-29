"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Brain } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import PublicAskBlocIQ from './PublicAskBlocIQ';

export default function PublicAskBlocIQWidget() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Define authenticated routes that should never show the widget
  const authenticatedRoutes = [
    '/home',
    '/buildings',
    '/compliance',
    '/communications', 
    '/major-works',
    '/inbox',
    '/inbox-overview',
    '/login',
    '/account',
    '/templates',
    '/documents',
    '/assistant'
  ];

  // Check if current path is an authenticated route
  const isAuthenticatedRoute = authenticatedRoutes.some(route => 
    pathname.startsWith(route) || pathname.includes('/(dashboard)')
  );

  // Only show widget on exact landing page AND user is not authenticated AND not on authenticated routes
  const shouldShowWidget = pathname === '/' && !isAuthenticated && !isAuthenticatedRoute;

  // Auto-appears 1 second after page load (only on landing page for unauthenticated users)
  useEffect(() => {
    if (!shouldShowWidget) {
      setShowButton(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowButton(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [shouldShowWidget, isAuthenticated, pathname]);

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

  // Don't render widget if not on landing page or button shouldn't show
  if (!shouldShowWidget || !showButton) return null;

  return (
    <>
      {/* Floating Button - Fixed bottom-6 right-6, 64x64px circular */}
      <div className="fixed bottom-6 right-6 z-[60]">
        <div className="relative">
          {/* Pulsating animation */}
          <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 opacity-75 animate-ping"></div>
          <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 opacity-50 animate-pulse"></div>
          
          {/* Main Button - 64x64px */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="relative w-16 h-16 bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center group"
            aria-label="Ask BlocIQ AI Assistant"
          >
            {/* Brain icon - h-10 w-10 text-white */}
            <Brain className="h-10 w-10 text-white group-hover:scale-110 transition-transform duration-300" />
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg">
                Ask BlocIQ AI Assistant
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
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

      {/* Custom pulsating gradient animation */}
      <style jsx>{`
        @keyframes pulse-gradient {
          0%, 100% {
            background: linear-gradient(45deg, #ec4899, #06b6d4, #8b5cf6, #3b82f6);
          }
          25% {
            background: linear-gradient(45deg, #06b6d4, #8b5cf6, #3b82f6, #ec4899);
          }
          50% {
            background: linear-gradient(45deg, #8b5cf6, #3b82f6, #ec4899, #06b6d4);
          }
          75% {
            background: linear-gradient(45deg, #3b82f6, #ec4899, #06b6d4, #8b5cf6);
          }
        }
      `}</style>
    </>
  );
}