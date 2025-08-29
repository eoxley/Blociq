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
  { label: "Home", icon: "🏠", href: "/home", comingSoon: false, description: "Dashboard overview", aiPowered: false },
  { label: "Inbox Overview", icon: "🧠", href: "/inbox-overview", comingSoon: false, description: "Email triage dashboard", aiPowered: true },
  { label: "Buildings", icon: "🏢", href: "/buildings", comingSoon: false, description: "Property portfolio", aiPowered: false },
  { label: "Compliance", icon: "🛡️", href: "/compliance", comingSoon: false, description: "Regulatory tracking", aiPowered: true },
  { label: "Communications", icon: "📣", href: "/communications", comingSoon: false, description: "Letter & email templates", aiPowered: false },
  { label: "Major Works", icon: "🔧", href: "/major-works", comingSoon: false, description: "Project management", aiPowered: false },
  { label: "Finances", icon: "💷", href: "#", comingSoon: true, description: "Financial tracking", aiPowered: false },
  { label: "Contractors", icon: "👷", href: "#", comingSoon: true, description: "Vendor management", aiPowered: false },
  { label: "Work Orders", icon: "📋", href: "#", comingSoon: true, description: "Maintenance requests", aiPowered: false },
  { label: "Client Portal", icon: "🧑‍💻", href: "#", comingSoon: true, description: "Tenant access", aiPowered: false },
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
    <aside className="w-80 bg-white text-text-primary h-full flex flex-col py-6 px-6 shadow-xl border-r border-border relative overflow-hidden">
      {/* Enhanced Logo Section */}
      <div className="mb-8 px-2">
        <Link href="/home" className="flex items-center gap-4 mb-4 hover:opacity-90 transition-all duration-300 group">
          <div className="w-16 h-16 nav-gradient rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <BlocIQLogo className="h-9 w-9 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gradient tracking-tight">BlocIQ</h1>
            <p className="text-sm text-text-secondary font-medium">Property Intelligence Platform</p>
          </div>
        </Link>
      </div>

      {/* Enhanced Navigation */}
      <nav className="flex-1 space-y-1 pb-4">
        <div className="px-2 mb-3">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Navigation</h3>
        </div>
        
        {navItems.map(({ label, icon, href, comingSoon, description, aiPowered }) => {
          const isActive = !comingSoon && (pathname === href || (pathname && pathname.startsWith(href + '/')));
          
          if (comingSoon) {
            return (
              <div key={label} className="w-full group">
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-text-secondary hover:bg-accent transition-all relative group"
                  disabled
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 bg-tertiary-bg group-hover:bg-secondary-bg relative">
                    <span
                      className="text-base opacity-60"
                      style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
                    >
                      {icon}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-secondary text-sm">{label}</span>
                      <span className="badge-coming-soon">Coming Soon</span>
                    </div>
                    <p className="text-sm text-text-muted mt-1 leading-tight">{description}</p>
                  </div>
                </button>
              </div>
            );
          }

          return (
            <div key={label} className="w-full group">
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 relative group hover-lift ${
                  isActive
                    ? aiPowered ? 'ai-header text-white font-semibold shadow-lg' : 'nav-active'
                    : 'hover:bg-accent text-text-primary hover:text-brand-teal'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full opacity-80 shadow-sm"></div>
                )}
                
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 relative ${
                  isActive
                    ? 'bg-white/20 shadow-md'
                    : aiPowered 
                      ? 'icon-brain opacity-80 group-hover:opacity-100' 
                      : 'icon-house opacity-80 group-hover:opacity-100'
                }`}>
                  {!isActive && aiPowered && (
                    <span
                      className="text-base transition-all duration-300 group-hover:scale-110"
                      style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
                    >
                      {icon}
                    </span>
                  )}
                  {!isActive && !aiPowered && (
                    <span
                      className="text-base transition-all duration-300 group-hover:scale-110"
                      style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
                    >
                      {icon}
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="text-base text-white scale-110 transition-all duration-300"
                      style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
                    >
                      {icon}
                    </span>
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-white/20 rounded-xl opacity-0 ${
                    isActive ? 'opacity-100' : 'group-hover:opacity-100'
                  } transition-opacity`}></div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{label}</span>
                    {isActive && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                    {aiPowered && !isActive && (
                      <span className="ai-status text-xs">AI</span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 leading-tight ${
                    isActive ? 'text-white/80' : 'text-text-muted'
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
      <div className="border-t border-border pt-4">
        <div className="space-y-2">
          <Link
            href="/account"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-accent transition-all duration-300 group text-text-primary hover-lift"
          >
            <div className="w-9 h-9 bg-tertiary-bg rounded-xl flex items-center justify-center group-hover:bg-secondary-bg transition-all duration-300">
              <User className="h-4 w-4 text-text-secondary" />
            </div>
            <span className="font-medium text-sm">Account Settings</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-red-50 transition-all duration-300 group text-red-600 hover-lift"
          >
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition-all duration-300">
              <LogOut className="h-4 w-4 text-red-600" />
            </div>
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
} 