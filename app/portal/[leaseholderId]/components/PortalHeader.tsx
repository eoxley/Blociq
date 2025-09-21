'use client';

import { useState } from 'react';
import { UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface PortalHeaderProps {
  leaseholderName: string | null;
  buildingName: string;
  unitNumber?: string | null;
  scope: string;
}

export function PortalHeader({
  leaseholderName,
  buildingName,
  unitNumber,
  scope
}: PortalHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const displayName = leaseholderName || 'Leaseholder';
  const propertyInfo = scope === 'unit' && unitNumber
    ? `${buildingName} - Unit ${unitNumber}`
    : buildingName;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Property Info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">BlocIQ Portal</h1>
                <p className="text-sm text-gray-600">{propertyInfo}</p>
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UserCircleIcon className="w-8 h-8 text-gray-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">Leaseholder</p>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <a
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Admin Dashboard
                  </a>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      // Handle sign out
                      window.location.href = '/auth/signout';
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}