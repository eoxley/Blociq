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
  { label: "Communications", icon: "📣", href: "/communications", comingSoon: false, description: "Letter & email templates" },

  { label: "Major Works", icon: "🔧", href: "/major-works", comingSoon: false, description: "Project management" },
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
            className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Content */}
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <BlocIQLogo className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">BlocIQ</h1>
                    <p className="text-white/80 text-sm">Property Intelligence</p>
                  </div>
                </div>
                

              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-2 mb-3">
                    Navigation
                  </h3>
                  
                  {navItems.map(({ label, icon, href, comingSoon, description }) => {
                    const isActive = pathname === href || (pathname && pathname.startsWith(href + '/'));
                    
                    if (comingSoon) {
                      return (
                        <div key={label} className="w-full">
                          <button
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#64748B] hover:bg-[#F0FDFA] transition-all"
                            disabled
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F3F4F6]">
                              <span className="text-lg opacity-60">{icon}</span>
                            </div>
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{label}</span>
                                <BlocIQBadge variant="secondary" size="sm">Soon</BlocIQBadge>
                              </div>
                              <p className="text-xs text-[#94A3B8] mt-0.5">{description}</p>
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
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white font-semibold shadow-lg'
                            : 'hover:bg-[#F0FDFA] text-[#333333]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-white/20' : 'bg-[#F3F4F6]'
                        }`}>
                          <span className="text-lg">{icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{label}</span>
                            {isActive && (
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${
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
              <div className="border-t border-[#E2E8F0] p-4">
                <div className="space-y-2">
                  <Link
                    href="/account"
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F0FDFA] transition-all text-[#333333]"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Settings className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="font-medium">Settings</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-all w-full text-left text-[#EF4444]"
                  >
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <LogOut className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="font-semibold">Logout</span>
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