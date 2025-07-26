"use client";

import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabaseClient';
import { getTimeBasedGreeting } from '@/utils/greeting';

interface AISummaryProps {
  user?: {
    name?: string;
    id?: string;
  };
  className?: string;
  showSubtitle?: boolean;
}

const getGreeting = (hour: number) => {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function AISummary({ user, className = "", showSubtitle = true }: AISummaryProps) {
  const [greeting, setGreeting] = useState("Hello");
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localHour = new Date().getHours(); // This is client-side
    setGreeting(getGreeting(localHour));
  }, []);

  useEffect(() => {
    const getUserData = async () => {
      try {
        // If user prop is provided, use it
        if (user?.name) {
          setUserName(user.name);
          setLoading(false);
          return;
        }

        // Otherwise, fetch user data from Supabase
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          // Try to get user profile data from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', authUser.id)
            .single();
          
          setUserName(profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, [user]);

  // Use our existing utility function for consistent greeting logic
  const fullGreeting = getTimeBasedGreeting(userName || undefined);

  if (loading) {
    return (
      <div className={className}>
        <h1 className="text-3xl font-bold">
          {greeting}, there!
        </h1>
        {showSubtitle && <p className="text-muted-foreground">How can I help you today?</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <h1 className="text-3xl font-bold">
        {fullGreeting}
      </h1>
      {showSubtitle && <p className="text-muted-foreground">How can I help you today?</p>}
    </div>
  );
} 