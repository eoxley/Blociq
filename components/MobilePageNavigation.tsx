"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Home, Menu, X } from 'lucide-react';
import { BlocIQButton } from '@/components/ui/blociq-button';

interface MobilePageNavigationProps {
  title?: string;
  backTo?: string;
  backLabel?: string;
}

export default function MobilePageNavigation({ 
  title, 
  backTo = "/home", 
  backLabel = "Home" 
}: MobilePageNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const quickNavItems = [
    { label: "Home", href: "/home", icon: "🏠" },
    { label: "Inbox Overview", href: "/inbox-overview", icon: "📥" },
    { label: "Buildings", href: "/dashboard/buildings", icon: "🏢" },
    { label: "Compliance", href: "/compliance", icon: "🛡️" },
    { label: "Communications", href: "/communications", icon: "📣" },
    { label: "Major Works", href: "/major-works", icon: "🔧" },
  ];

  return (
    <>
      {/* Mobile Navigation Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[40] bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <Link 
            href={backTo}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">{backLabel}</span>
          </Link>

          {/* Page Title */}
          {title && (
            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]">
              {title}
            </h1>
          )}

          {/* Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open quick navigation"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Quick Navigation Menu */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Quick Navigation</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <p className="text-white/80 text-sm">Navigate to any section quickly</p>
            </div>

            {/* Navigation Items */}
            <div className="p-4">
              <div className="space-y-2">
                {quickNavItems.map(({ label, href, icon }) => {
                  const isActive = pathname === href || (pathname && pathname.startsWith(href + '/'));
                  
                  return (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white font-semibold shadow-lg'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        <span className="text-lg">{icon}</span>
                      </div>
                      <span className="font-medium">{label}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Emergency Home Button */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Link
                  href="/home"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  <Home className="h-5 w-5" />
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed navigation */}
      <div className="lg:hidden h-16"></div>
    </>
  );
}
