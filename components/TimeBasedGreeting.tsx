"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getTimeBasedGreeting } from '@/utils/greeting';

interface TimeBasedGreetingProps {
  className?: string;
  showSubtitle?: boolean;
}

export default function TimeBasedGreeting({ 
  className = "", 
  showSubtitle = true 
}: TimeBasedGreetingProps) {
  const [greeting, setGreeting] = useState<string>("Hello!");
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Try to get user profile data from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();
          
          setUserName(profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, [supabase]);

  useEffect(() => {
    // Update greeting whenever userName changes
    setGreeting(getTimeBasedGreeting(userName || undefined));
  }, [userName]);

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-6 text-white shadow-md ${className}`}>
        <h1 className="text-3xl font-semibold">Hello!</h1>
        {showSubtitle && <p className="text-white/90 text-lg">How can I help you today?</p>}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-6 text-white shadow-md ${className}`}>
      <h1 className="text-3xl font-semibold">{greeting}</h1>
      {showSubtitle && <p className="text-white/90 text-lg">How can I help you today?</p>}
    </div>
  );
} 