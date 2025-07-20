"use client";

import { usePathname } from 'next/navigation';
import FloatingBlocIQ from './FloatingBlocIQ';

export default function ConditionalFloatingButtons() {
  const pathname = usePathname();

  // Hide floating chat on login/logout and homepage
  if (pathname === '/login' || pathname === '/logout' || pathname === '/home') {
    return null;
  }

  return (
    <>
      <FloatingBlocIQ />
    </>
  );
} 