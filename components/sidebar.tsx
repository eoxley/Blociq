'use client';

import Link from 'next/link';

export function Sidebar() {
  return (
    <div className="w-16 md:w-20 h-full bg-[#0F5D5D] text-white flex flex-col items-center py-6 space-y-6">
      <Link href="/" className="hover:opacity-80">🏠</Link>
      <Link href="/dashboard/inbox" className="hover:opacity-80">📬</Link>
      <Link href="/buildings" className="hover:opacity-80">🏢</Link>
      <Link href="/dashboard" className="hover:opacity-80">📊</Link>
      <Link href="/account" className="hover:opacity-80">⚙️</Link>
    </div>
  );
}
