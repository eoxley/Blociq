'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface BrandingContextType {
  primaryColour: string;
  logoUrl: string | null;
  setPrimaryColour: (color: string) => void;
  setLogoUrl: (url: string | null) => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const supabase = createClientComponentClient();
  const [primaryColour, setPrimaryColour] = useState<string>('#6366f1'); // Default BlocIQ purple
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrandingSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // In a real app, you'd get the agency_id from the user's profile or context
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.agency_id) {
        console.error('Error fetching user profile or agency_id for branding:', profileError);
        setLoading(false);
        return;
      }

      const agencyId = profile.agency_id;

      const { data, error } = await supabase
        .from('agency_settings')
        .select('*')
        .eq('agency_id', agencyId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching agency branding settings:', error);
      } else if (data) {
        setPrimaryColour(data.primary_colour || '#6366f1');
        setLogoUrl(data.logo_url);
      }
      setLoading(false);
    };

    fetchBrandingSettings();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchBrandingSettings();
      }
    });

    return () => {
      authListener?.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', primaryColour);
  }, [primaryColour]);

  if (loading) {
    // Optionally render a loading spinner or placeholder
    return null;
  }

  return (
    <BrandingContext.Provider value={{ primaryColour, logoUrl, setPrimaryColour, setLogoUrl }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
