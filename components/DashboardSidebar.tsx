"use client";

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Bell, Settings, User, HelpCircle, ExternalLink, LogOut, Lock, Home, Brain, Microscope, Building2, Shield, Megaphone, Wrench, PoundSterling, HardHat, ClipboardList, Monitor } from 'lucide-react';
import BlocIQLogo from './BlocIQLogo';
import { BlocIQBadge } from '@/components/ui/blociq-badge';
import AgencySwitcher from './AgencySwitcher';
import LeaseNotificationBadge from './LeaseNotificationBadge';
import ClientOnly from './ClientOnly';
import { useLeaseSystemReadiness } from '@/hooks/useLeaseSystemReadiness';

const navItems = [
  { label: "Home", icon: Home, href: "/home", comingSoon: false, description: "Dashboard overview", aiPowered: false },
  { label: "Inbox Overview", icon: Brain, href: "/inbox-overview", comingSoon: false, description: "Email triage dashboard", aiPowered: true },
  { label: "Lease Lab", icon: Microscope, href: "/lease-lab", comingSoon: false, description: "Deep document analysis", aiPowered: true },
  { label: "Buildings", icon: Building2, href: "/buildings", comingSoon: false, description: "Property portfolio", aiPowered: false },
  { label: "Compliance", icon: Shield, href: "/compliance", comingSoon: false, description: "Regulatory tracking", aiPowered: true },
  { label: "Communications", icon: Megaphone, href: "/communications", comingSoon: false, description: "Letter & email templates", aiPowered: false },
  { label: "Major Works", icon: Wrench, href: "/major-works", comingSoon: false, description: "Project management", aiPowered: false },
  { label: "Finances", icon: PoundSterling, href: "#", comingSoon: true, description: "Financial tracking", aiPowered: false },
  { label: "Contractors", icon: HardHat, href: "#", comingSoon: true, description: "Vendor management", aiPowered: false },
  { label: "Work Orders", icon: ClipboardList, href: "#", comingSoon: true, description: "Maintenance requests", aiPowered: false },
  { label: "Client Portal", icon: Monitor, href: "#", comingSoon: true, description: "Tenant access", aiPowered: false },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState(3); // Mock notification count
  const { isReady: leaseSystemReady, isLoading: leaseSystemLoading } = useLeaseSystemReadiness();

  useEffect(() => {
    const getUser = async () => {
      // Safe destructuring to prevent "Right side of assignment cannot be destructured" error
      const authResult = await supabase.auth.getUser();
      const authData = authResult?.data || {}
      const user = authData.user || null
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
        
        {/* Agency Switcher */}
        <div className="mt-4 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
            Current Agency
          </div>
          <AgencySwitcher className="w-full" showLabel={true} />
        </div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="flex-1 space-y-1 pb-4">
        <div className="px-2 mb-4">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Main Menu</h3>
        </div>
        
        {navItems.map(({ label, icon, href, comingSoon, description, aiPowered }) => {
          const isActive = !comingSoon && (pathname === href || (pathname && pathname.startsWith(href + '/')));
          const isLeaseProcessing = label === "Lease Processing";
          const isDisabled = isLeaseProcessing && !leaseSystemReady && !leaseSystemLoading;
          
          if (comingSoon) {
            return (
              <div key={label} className="w-full group">
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-text-secondary hover:bg-[#f8fafc] transition-all relative group"
                  disabled
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 bg-[#f1f5f9] group-hover:bg-[#e2e8f0] relative">
                    {React.createElement(icon, { className: "h-5 w-5 text-gray-500 opacity-60" })}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-secondary text-sm">{label}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">Coming Soon</span>
                    </div>
                    <p className="text-sm text-text-muted mt-1 leading-tight">{description}</p>
                  </div>
                </button>
              </div>
            );
          }

          if (isDisabled) {
            return (
              <div key={label} className="w-full group">
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-text-secondary cursor-not-allowed opacity-60 transition-all relative group"
                  disabled
                  title="Lease processing system is being set up. Please contact your administrator."
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 bg-[#f1f5f9] relative">
                    {React.createElement(icon, { className: "h-5 w-5 text-gray-500 opacity-60" })}
                    <Lock className="h-3 w-3 absolute -top-1 -right-1 text-gray-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-secondary text-sm">{label}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-600 border border-yellow-200">
                        {leaseSystemLoading ? 'Checking...' : 'Setup Required'}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted mt-1 leading-tight">
                      {leaseSystemLoading ? 'Checking system status...' : 'System setup in progress'}
                    </p>
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
                    ? 'bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white font-semibold shadow-lg'
                    : 'hover:bg-[#f8fafc] text-text-primary hover:text-[#8b5cf6]'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full opacity-80 shadow-sm"></div>
                )}
                
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 relative ${
                  isActive
                    ? 'bg-white/20 shadow-md'
                    : 'bg-gray-50 group-hover:bg-gray-100'
                }`}>
                  {React.createElement(icon, { 
                    className: `h-5 w-5 transition-all duration-300 ${
                      isActive 
                        ? 'text-white scale-110' 
                        : 'text-gray-600 group-hover:scale-110 group-hover:text-[#8b5cf6]'
                    }`
                  })}
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



      {/* Lease Processing Notifications - Only show in dashboard context */}
      <div className="border-t border-border pt-4 mb-4">
        <ClientOnly>
          <LeaseNotificationBadge />
        </ClientOnly>
      </div>

      {/* Enhanced Logout Section */}
      <div className="border-t border-border pt-4">
        <div className="space-y-2">
          <Link
            href="/account"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#f8fafc] hover:text-[#4f46e5] transition-all duration-300 group text-text-primary hover-lift"
          >
            <div className="w-9 h-9 bg-[#f8fafc] rounded-xl flex items-center justify-center group-hover:bg-[#e2e8f0] transition-all duration-300">
              <User className="h-4 w-4 text-[#4f46e5]" />
            </div>
            <span className="font-medium text-sm">Account Settings</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-red-50 hover:shadow-sm transition-all duration-300 group text-red-600 hover-lift focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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