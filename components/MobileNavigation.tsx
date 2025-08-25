"use client";

import { useState } from 'react';
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
  { label: "Inbox", icon: "📥", href: "/inbox", comingSoon: false, description: "Email management" },
  { label: "Buildings", icon: "🏢", href: "/buildings", comingSoon: false, description: "Property portfolio" },
  { label: "Compliance", icon: "🛡️", href: "/compliance", comingSoon: false, description: "Regulatory tracking" },
  { label: "Industry Knowledge", icon: "📚", href: "/industry-knowledge", comingSoon: false, description: "Industry standards & guidance" },
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

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 w-12 h-12 bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center shadow-lg"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={closeMenu}>
          <div 
            className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Content */}
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <BlocIQLogo className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">BlocIQ</h1>
                    <p className="text-white/80 text-base">Property Intelligence Platform</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider px-2 mb-4">
                    Navigation
                  </h3>
                  
                  {navItems.map(({ label, icon, href, comingSoon, description }) => {
                    const isActive = pathname === href || (pathname && pathname.startsWith(href + '/'));
                    
                    if (comingSoon) {
                      return (
                        <div key={label} className="w-full">
                          <button
                            className="flex w-full items-center gap-4 rounded-xl px-5 py-4 text-base font-medium text-[#64748B] hover:bg-[#F0FDFA] transition-all"
                            disabled
                          >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#F3F4F6]">
                              <span className="text-xl opacity-60">{icon}</span>
                            </div>
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-base">{label}</span>
                                <BlocIQBadge variant="secondary" size="sm">Soon</BlocIQBadge>
                              </div>
                              <p className="text-sm text-[#94A3B8] mt-1">{description}</p>
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
                        className={`flex items-center gap-4 rounded-xl px-5 py-4 text-base font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white font-semibold shadow-lg'
                            : 'hover:bg-[#F0FDFA] text-[#333333]'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-white/20' : 'bg-[#F3F4F6]'
                        }`}>
                          <span className="text-xl">{icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-base">{label}</span>
                            {isActive && (
                              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${
                            isActive ? 'text-white/80' : 'text-[#94A3B8]'
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
              <div className="border-t border-[#E2E8F0] p-6">
                <div className="space-y-3">
                  <Link
                    href="/account"
                    onClick={closeMenu}
                    className="flex items-center gap-4 px-5 py-3 rounded-lg text-base font-medium hover:bg-[#F0FDFA] transition-all text-[#333333]"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Settings className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="font-medium text-base">Settings</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-5 py-3 rounded-lg text-base font-medium hover:bg-red-50 transition-all w-full text-left text-[#EF4444]"
                  >
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <LogOut className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="font-semibold text-base">Logout</span>
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