'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function DashboardNavbar() {
  return (
    <nav className="w-full px-6 py-3 border-b bg-white flex justify-between items-center shadow-sm">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-2">
        <Image
          src="/logo.svg"
          alt="BlocIQ Logo"
          width={28}
          height={28}
          className="rounded-sm"
        />
        <span className="text-lg font-semibold text-gray-800 tracking-tight">
          BlocIQ Inbox
        </span>
      </div>

      {/* Right: Back to homepage */}
      <Link
        href="/"
        className="text-sm text-blue-600 hover:text-blue-800 transition font-medium"
      >
        ← Back to Homepage
      </Link>
    </nav>
  );
}
