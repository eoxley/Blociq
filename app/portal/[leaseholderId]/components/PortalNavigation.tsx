'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface PortalNavigationProps {
  leaseholderId: string;
  scope: string;
}

export function PortalNavigation({ leaseholderId, scope }: PortalNavigationProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: `/portal/${leaseholderId}`,
      icon: HomeIcon,
      current: pathname === `/portal/${leaseholderId}`
    },
    {
      name: 'My Account',
      href: `/portal/${leaseholderId}/account`,
      icon: UserIcon,
      current: pathname === `/portal/${leaseholderId}/account`
    },
    {
      name: scope === 'unit' ? 'My Unit' : 'Building Overview',
      href: `/portal/${leaseholderId}/building`,
      icon: BuildingOfficeIcon,
      current: pathname === `/portal/${leaseholderId}/building`
    },
    {
      name: 'Ask BlocAI',
      href: `/portal/${leaseholderId}/chat`,
      icon: ChatBubbleLeftRightIcon,
      current: pathname === `/portal/${leaseholderId}/chat`
    }
  ];

  return (
    <nav className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${item.current
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon
                  className={`mr-3 h-5 w-5 ${
                    item.current ? 'text-blue-700' : 'text-gray-400'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Portal Info */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
            Portal
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <p className="font-medium">Leaseholder Access</p>
            <p className="text-gray-500 mt-1">
              {scope === 'unit' ? 'Unit-specific lease' : 'Building-wide lease'}
            </p>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
            Support
          </div>
          <div className="mt-2 space-y-2">
            <Link
              href={`/portal/${leaseholderId}/contact`}
              className="block text-sm text-gray-700 hover:text-gray-900"
            >
              Contact Support
            </Link>
            <Link
              href={`/portal/${leaseholderId}/chat`}
              className="block text-sm text-gray-700 hover:text-gray-900"
            >
              Ask BlocAI
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}