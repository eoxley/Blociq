'use client';

import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BuildingOfficeIcon,
  UserIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface QuickActionsProps {
  leaseholderId: string;
  scope: string;
}

export function QuickActions({ leaseholderId, scope }: QuickActionsProps) {
  const actions = [
    {
      title: 'View Documents',
      description: 'Access your lease and property documents',
      icon: DocumentTextIcon,
      href: `/portal/${leaseholderId}/building`,
      color: 'text-blue-600 bg-blue-50 hover:bg-blue-100'
    },
    {
      title: 'Ask BlocAI',
      description: 'Get instant answers about your lease and property',
      icon: ChatBubbleLeftRightIcon,
      href: `/portal/${leaseholderId}/chat`,
      color: 'text-purple-600 bg-purple-50 hover:bg-purple-100'
    },
    {
      title: scope === 'unit' ? 'Unit Overview' : 'Building Overview',
      description: `View ${scope} details and maintenance status`,
      icon: BuildingOfficeIcon,
      href: `/portal/${leaseholderId}/building`,
      color: 'text-green-600 bg-green-50 hover:bg-green-100'
    },
    {
      title: 'Account Settings',
      description: 'Update your profile and communication preferences',
      icon: UserIcon,
      href: `/portal/${leaseholderId}/account`,
      color: 'text-orange-600 bg-orange-50 hover:bg-orange-100'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <a
              key={index}
              href={action.href}
              className="group relative p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-3 rounded-lg transition-colors ${action.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 group-hover:text-gray-700">
                    {action.title}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {action.description}
                  </p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}