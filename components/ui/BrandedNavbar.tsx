'use client';

import { useState, useEffect } from 'react';
import { BrandedButton } from './BrandedButton';

interface BrandedNavbarProps {
  agencyId?: string;
}

export function BrandedNavbar({ agencyId }: BrandedNavbarProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agencyId) {
      fetch(`/api/settings/agency?agency_id=${agencyId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.settings.logo_url) {
            setLogoUrl(data.settings.logo_url);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [agencyId]);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
            ) : logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Agency Logo" 
                className="w-8 h-8 object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
            )}
            <span className="text-xl font-bold text-gray-900">BlocIQ</span>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-4">
            <BrandedButton variant="secondary">
              Dashboard
            </BrandedButton>
            <BrandedButton>
              Settings
            </BrandedButton>
          </div>
        </div>
      </div>
    </nav>
  );
}
