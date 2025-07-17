"use client";

import { usePathname } from 'next/navigation';
import FloatingBlocIQ from './FloatingBlocIQ';

export default function ConditionalFloatingButtons() {
  const pathname = usePathname();

  // Show floating chat on all pages except login/logout
  // Temporarily show on all pages for demonstration
  if (pathname === '/login' || pathname === '/logout') {
    return null;
  }

  return (
    <>
      <FloatingBlocIQ />
    </>
  );
} 