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
    <aside className="w-64 bg-white text-[#333333] h-full flex flex-col py-6 px-4 shadow-xl border-r border-[#E2E8F0] relative">
      {/* Logo Section */}
      <div className="mb-8 px-4">
        <Link href="/home" className="flex items-center gap-3 mb-2 hover:opacity-90 transition-all duration-300 group">
          <div className="w-12 h-12 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
            <BlocIQLogo className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#333333]">BlocIQ</h1>
            <p className="text-xs text-[#64748B] font-medium">Property Intelligence</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 pb-4">
        {navItems.map(({ label, icon, href, comingSoon }) => {
          const isActive = !comingSoon && (pathname === href || (pathname && pathname.startsWith(href + '/')));
          
          if (comingSoon) {
            return (
              <div key={label} className="w-full">
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#64748B] hover:bg-[#F0FDFA] transition-all group relative"
                  disabled
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 bg-[#F3F4F6] group-hover:bg-[#E2E8F0]">
                    <span
                      className="text-lg"
                      style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
                    >
                      {icon}
                    </span>
                  </div>
                  <span className="flex-1 text-left font-medium text-[#64748B]">{label}</span>
                  <span className="text-xs bg-[#F3F4F6] text-[#64748B] px-2 py-0.5 rounded-full">Coming Soon</span>
                </button>
              </div>
            );
          }

          return (
            <div key={label} className="w-full">
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 group relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#2BBEB4]/10 to-[#0F5D5D]/10 text-[#0F5D5D] font-semibold shadow-sm border border-[#2BBEB4]/20' 
                    : 'hover:bg-[#F0FDFA] text-[#333333] hover:text-[#0F5D5D]'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#2BBEB4] to-[#0F5D5D] rounded-r-full"></div>
                )}
                
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] shadow-md' 
                    : 'bg-[#F3F4F6] group-hover:bg-[#E2E8F0]'
                }`}>
                  <span
                    className={`text-lg transition-all duration-300 ${
                      isActive ? 'text-white scale-110' : 'group-hover:scale-110'
                    }`}
                    style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
                  >
                    {icon}
                  </span>
                </div>
                <span className="font-medium">{label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Logout Section */}
      <div className="border-t border-[#E2E8F0] pt-4 mt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-red-50 transition-all duration-300 w-full text-left group text-[#EF4444]"
        >
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-all duration-300">
            <span
              className="text-lg group-hover:scale-110 transition-transform"
              style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
            >
              🔓
            </span>
          </div>
          <span className="font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  );
} 