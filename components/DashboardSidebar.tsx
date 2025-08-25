"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bell, Settings, User, HelpCircle, ExternalLink, LogOut } from 'lucide-react';
import BlocIQLogo from './BlocIQLogo';
import { BlocIQBadge } from '@/components/ui/blociq-badge';

const navItems = [
  { label: "Home", icon: "🏠", href: "/home", comingSoon: false, description: "Dashboard overview" },
  { label: "Inbox", icon: "📥", href: "/inbox", comingSoon: false, description: "Email management" },
  { label: "Buildings", icon: "🏢", href: "/buildings", comingSoon: false, description: "Property portfolio" },
  { label: "Compliance", icon: "🛡️", href: "/compliance", comingSoon: false, description: "Regulatory tracking" },
  { label: "Communications", icon: "📣", href: "/communications", comingSoon: false, description: "Letter & email templates" },
  { label: "Major Works", icon: "🔧", href: "/major-works", comingSoon: false, description: "Project management" },
  { label: "Finances", icon: "💷", href: "#", comingSoon: true, description: "Financial tracking" },
  { label: "Contractors", icon: "👷", href: "#", comingSoon: true, description: "Vendor management" },
  { label: "Work Orders", icon: "📋", href: "#", comingSoon: true, description: "Maintenance requests" },
  { label: "Client Portal", icon: "🧑‍💻", href: "#", comingSoon: true, description: "Tenant access" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState(3); // Mock notification count

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="w-80 bg-white text-[#333333] h-full flex flex-col py-6 px-6 shadow-xl border-r border-[#E2E8F0] relative overflow-hidden">
      {/* Enhanced Logo Section */}
      <div className="mb-8 px-2">
        <Link href="/home" className="flex items-center gap-4 mb-4 hover:opacity-90 transition-all duration-300 group">
          <div className="w-16 h-16 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <BlocIQLogo className="h-9 w-9 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] bg-clip-text text-transparent tracking-tight">BlocIQ</h1>
            <p className="text-sm text-[#64748B] font-medium">Property Intelligence Platform</p>
          </div>
        </Link>
      </div>

      {/* Enhanced Navigation */}
      <nav className="flex-1 space-y-1 pb-4">
        <div className="px-2 mb-3">
          <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider">Navigation</h3>
        </div>
        
        {navItems.map(({ label, icon, href, comingSoon, description }) => {
          const isActive = !comingSoon && (pathname === href || (pathname && pathname.startsWith(href + '/')));
          
          if (comingSoon) {
            return (
              <div key={label} className="w-full group">
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[#64748B] hover:bg-[#F0FDFA] transition-all relative group"
                  disabled
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 bg-[#F3F4F6] group-hover:bg-[#E2E8F0] relative">
                    <span
                      className="text-base opacity-60"
                      style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
                    >
                      {icon}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#64748B] text-sm">{label}</span>
                      <BlocIQBadge variant="secondary" size="sm" className="text-xs px-2 py-1">Coming Soon</BlocIQBadge>
                    </div>
                    <p className="text-sm text-[#94A3B8] mt-1 leading-tight">{description}</p>
                  </div>
                </button>
              </div>
            );
          }

          return (
            <div key={label} className="w-full group">
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white font-semibold shadow-lg'
                    : 'hover:bg-[#F0FDFA] text-[#333333] hover:text-[#0F5D5D]'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full opacity-80 shadow-sm"></div>
                )}
                
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 relative ${
                  isActive
                    ? 'bg-white/20 shadow-md'
                    : 'bg-[#F3F4F6] group-hover:bg-[#E2E8F0]'
                }`}>
                  <span
                    className={`text-base transition-all duration-300 ${
                      isActive ? 'text-white scale-110' : 'group-hover:scale-110'
                    }`}
                    style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
                  >
                    {icon}
                  </span>
                  <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-white/20 rounded-lg opacity-0 ${
                    isActive ? 'opacity-100' : 'group-hover:opacity-100'
                  } transition-opacity`}></div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{label}</span>
                    {isActive && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <p className={`text-sm mt-1 leading-tight ${
                    isActive ? 'text-white/80' : 'text-[#94A3B8]'
                  }`}>
                    {description}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
      </nav>



      {/* Enhanced Logout Section */}
      <div className="border-t border-[#E2E8F0] pt-4">
        <div className="space-y-2">
          <Link
            href="/account"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-[#F0FDFA] transition-all duration-300 group text-[#333333]"
          >
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-all duration-300">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <span className="font-medium text-sm">Account Settings</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-red-50 transition-all duration-300 group text-red-600"
          >
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-all duration-300">
              <LogOut className="h-4 w-4 text-red-600" />
            </div>
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
} 