"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Menu, X, Bell, Settings, User, HelpCircle, LogOut } from 'lucide-react';
import BlocIQLogo from './BlocIQLogo';
import { BlocIQButton } from '@/components/ui/blociq-button';
import { BlocIQBadge } from '@/components/ui/blociq-badge';

const navItems = [
  { label: "Home", icon: "🏠", href: "/home", comingSoon: false, description: "Dashboard overview" },
  { label: "Inbox Overview", icon: "📥", href: "/inbox-overview", comingSoon: false, description: "Email triage dashboard" },
      { label: "Buildings", icon: "🏢", href: "/buildings", comingSoon: false, description: "Property portfolio" },
  { label: "Compliance", icon: "🛡️", href: "/compliance", comingSoon: false, description: "Regulatory tracking" },
  { label: "Communications", icon: "📣", href: "/communications", comingSoon: false, description: "Letter & email templates" },
  { label: "Major Works", icon: "🔧", href: "/major-works", comingSoon: false, description: "Project management" },
  { label: "AI History", icon: "🧠", href: "/ai-history", comingSoon: false, description: "Search past AI interactions" },
];

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    setIsOpen(false);
  };

  const closeMenu = () => setIsOpen(false);

  // Add escape key handler and body scroll prevention for mobile
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-[60] w-12 h-12 bg-gradient-to-r from-[#14b8a6] to-[#8b5cf6] rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-[50] bg-black/50 backdrop-blur-sm" onClick={closeMenu}>
          <div 
            className="absolute right-0 top-0 h-full w-80 sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Content */}
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#14b8a6] to-[#8b5cf6] text-white p-6 lg:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <BlocIQLogo className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl lg:text-2xl font-bold text-white">BlocIQ</h1>
                      <p className="text-white/80 text-sm lg:text-base">Property Intelligence Platform</p>
                    </div>
                  </div>
                  <button
                    onClick={closeMenu}
                    className="lg:hidden p-2 rounded-lg hover:bg-white/20 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                <div className="space-y-2 lg:space-y-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider px-2 mb-4">
                    Navigation
                  </h3>
                  
                  {navItems.map(({ label, icon, href, comingSoon, description }) => {
                    const isActive = pathname === href || (pathname && pathname.startsWith(href + '/'));
                    
                    if (comingSoon) {
                      return (
                        <div key={label} className="w-full">
                          <button
                            className="flex w-full items-center gap-3 lg:gap-4 rounded-xl px-4 lg:px-5 py-3 lg:py-4 text-base font-medium text-gray-500 hover:bg-gray-50 transition-all"
                            disabled
                          >
                                                          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center bg-gray-100">
                              <span className="text-lg lg:text-xl opacity-60">{icon}</span>
                            </div>
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2 lg:gap-3">
                                <span className="font-medium text-sm lg:text-base">{label}</span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">Soon</span>
                              </div>
                              <p className="text-xs lg:text-sm text-gray-500 mt-1">{description}</p>
                            </div>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={label}
                        href={href}
                        onClick={closeMenu}
                        className={`flex items-center gap-3 lg:gap-4 rounded-xl px-4 lg:px-5 py-3 lg:py-4 text-base font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-[#14b8a6] to-[#8b5cf6] text-white font-semibold shadow-lg'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-white/20' : 'bg-gray-100'
                        }`}>
                          <span className="text-lg lg:text-xl">{icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 lg:gap-3">
                            <span className="font-medium text-sm lg:text-base">{label}</span>
                            {isActive && (
                              <div className="w-2 h-2 lg:w-3 lg:h-3 bg-white rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <p className={`text-xs lg:text-sm mt-1 ${
                            isActive ? 'text-white/80' : 'text-gray-500'
                          }`}>
                            {description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>


              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-4 lg:p-6">
                <div className="space-y-2 lg:space-y-3">
                  <Link
                    href="/account"
                    onClick={closeMenu}
                    className="flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 rounded-lg text-base font-medium hover:bg-gray-50 transition-all text-gray-700"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="font-medium text-sm lg:text-base">Account</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 rounded-lg text-base font-medium hover:bg-red-50 transition-all w-full text-left text-red-600"
                  >
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <LogOut className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="font-semibold text-sm lg:text-base">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 