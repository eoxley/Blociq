"use client";

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { usePathname } from 'next/navigation';
import GlobalAskBlocIQ from './GlobalAskBlocIQ';

export default function ConditionalFloatingButtons() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Don't show floating buttons if:
  // 1. Still loading auth status
  // 2. User is not authenticated
  // 3. User is on the landing page (root path)
  if (isLoading || !isAuthenticated || pathname === '/') {
    return null;
  }

  return (
    <>
      <GlobalAskBlocIQ />
    </>
  );
} 