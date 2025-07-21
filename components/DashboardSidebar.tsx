"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import BlocIQLogo from './BlocIQLogo';

const navItems = [
  { label: "Home", icon: "🏠", href: "/home", comingSoon: false },
  { label: "Inbox", icon: "📥", href: "/inbox", comingSoon: false },
  { label: "Buildings", icon: "🏢", href: "/buildings", comingSoon: false },
  { label: "Compliance", icon: "🛡️", href: "/compliance", comingSoon: false },
  { label: "Communications", icon: "📣", href: "/communications", comingSoon: false },
  { label: "AI Documents", icon: "🤖", href: "/ai-documents", comingSoon: false },
  { label: "Major Works", icon: "🔧", href: "/major-works", comingSoon: false },
  { label: "Finances", icon: "💷", href: "#", comingSoon: true },
  { label: "Contractors", icon: "👷", href: "#", comingSoon: true },
  { label: "Work Orders", icon: "📋", href: "#", comingSoon: true },
  { label: "Client Portal", icon: "🧑‍💻", href: "#", comingSoon: true },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white h-full flex flex-col py-6 px-4 shadow-2xl relative border-r border-slate-700/50">
      {/* Extended gradient connection to welcome block */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 opacity-20 blur-xl"></div>
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-blue-500/5 to-purple-500/5"></div>
      <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-teal-500/10 to-blue-500/10 rounded-full blur-sm"></div>
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-teal-500/10 rounded-full blur-sm"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Logo Section */}
        <div className="mb-6 px-4">
          <Link href="/home" className="flex items-center gap-3 mb-2 hover:opacity-90 transition-all duration-300 group">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg group-hover:scale-105 transition-transform duration-300 border border-teal-400/30">
              <BlocIQLogo className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white drop-shadow-lg">BlocIQ</h1>
              <p className="text-xs text-slate-300 font-medium">Property Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 pb-2">
          {navItems.map(({ label, icon, href, comingSoon }) => {
            const isActive = !comingSoon && (pathname === href || (pathname && pathname.startsWith(href + '/')));
            
            if (comingSoon) {
              return (
                <li key={label} className="w-full">
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-gray-300 hover:bg-teal-700/50 transition-all group relative overflow-hidden"
                    disabled
                  >
                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 bg-slate-700/50 group-hover:bg-slate-600/50 group-hover:shadow-md">
                      <span className="text-lg">{icon}</span>
                    </div>
                    <span className="flex-1 text-left font-medium">{label}</span>
                    <span className="text-xs bg-gray-700 text-white px-2 py-0.5 rounded-full">Coming Soon</span>
                  </button>
                </li>
              );
            }

            return (
              <li key={label} className="w-full">
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 group relative overflow-hidden ${
                    isActive 
                      ? 'bg-gradient-to-r from-teal-500/20 to-blue-500/20 text-white font-semibold shadow-lg backdrop-blur-sm border border-teal-500/30' 
                      : 'hover:bg-slate-700/50 text-slate-200 hover:text-white hover:shadow-md backdrop-blur-sm'
                  }`}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-400 to-blue-400 rounded-r-full"></div>
                  )}
                  
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-br from-teal-500/30 to-blue-500/30 shadow-lg' 
                      : 'bg-slate-700/50 group-hover:bg-slate-600/50 group-hover:shadow-md'
                  }`}>
                    <span className={`text-lg transition-all duration-300 ${
                      isActive ? 'scale-110' : 'group-hover:scale-110'
                    }`}>{icon}</span>
                  </div>
                  <span className="font-medium">{label}</span>
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              </li>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="border-t border-white/20 pt-3 mt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-500/50 transition-all duration-300 w-full text-left group backdrop-blur-sm bg-red-500/20 border border-red-400/30 hover:border-red-400/50"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-red-500/50 to-red-600/50 rounded-lg flex items-center justify-center group-hover:from-red-500/60 group-hover:to-red-600/60 transition-all duration-300 shadow-lg border border-red-400/30 group-hover:border-red-400/50">
              <span className="text-lg group-hover:scale-110 transition-transform">🔓</span>
            </div>
            <span className="text-white font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
} 