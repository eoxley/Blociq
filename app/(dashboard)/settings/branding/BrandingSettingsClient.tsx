'use client';

import { useState, useEffect } from 'react';
import { PhotoIcon, CheckIcon } from '@heroicons/react/24/outline';

interface BrandingSettingsClientProps {
  agencyId: string;
}

export function BrandingSettingsClient({ agencyId }: BrandingSettingsClientProps) {
  const [primaryColour, setPrimaryColour] = useState('#6366f1');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`/api/settings/agency?agency_id=${agencyId}`);
        if (res.ok) {
          const data = await res.json();
          setPrimaryColour(data.settings.primary_colour || '#6366f1');
          setLogoUrl(data.settings.logo_url);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [agencyId]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/settings/agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_colour: primaryColour, logo_url: logoUrl }),
      });
      if (res.ok) {
        setSaved(true);
        // Apply the new colour globally
        document.documentElement.style.setProperty('--brand-primary', primaryColour);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('agency_id', agencyId);

    try {
      const res = await fetch('/api/settings/agency/logo', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logo_url);
      } else {
        alert('Failed to upload logo');
      }
    } catch (error) {
      console.error('Failed to upload logo:', error);
      alert('Failed to upload logo');
    }
  };

  if (isLoading) {
    return <div className="bg-white rounded-lg shadow-sm p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Colour</h2>
        <div className="flex items-center space-x-4">
          <input
            type="color"
            value={primaryColour}
            onChange={(e) => setPrimaryColour(e.target.value)}
            className="w-16 h-16 rounded-lg border border-gray-300 cursor-pointer"
          />
          <div className="flex-1">
            <label htmlFor="primary-colour" className="block text-sm font-medium text-gray-700 mb-2">
              Hex Value
            </label>
            <input
              id="primary-colour"
              type="text"
              value={primaryColour}
              onChange={(e) => setPrimaryColour(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo</h2>
        <div className="flex items-center space-x-4">
          {logoUrl && (
            <img src={logoUrl} alt="Agency Logo" className="w-16 h-16 object-contain border border-gray-200 rounded-lg" />
          )}
          <label className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
            <PhotoIcon className="w-5 h-5" />
            <span>Upload Logo</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: primaryColour }}>
              Button
            </button>
            <div className="p-4 rounded-lg border" style={{ borderColor: primaryColour }}>
              Tile
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{ backgroundColor: primaryColour + '20' }}>
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: primaryColour }}></div>
              <span className="font-medium">Navbar</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saved && <CheckIcon className="w-5 h-5" />}
          <span>{isSubmitting ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
}
