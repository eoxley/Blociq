'use client';

import {
  BuildingOfficeIcon,
  HomeIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface BuildingInfoProps {
  building: any;
  unit?: any;
  scope: string;
}

export function BuildingInfo({ building, unit, scope }: BuildingInfoProps) {
  const buildingDetails = [
    {
      label: 'Building Name',
      value: building.name,
      icon: BuildingOfficeIcon
    },
    {
      label: 'Address',
      value: building.address || 'Not specified',
      icon: HomeIcon
    },
    {
      label: 'Year Built',
      value: building.year_built || 'Not specified',
      icon: CalendarIcon
    },
    {
      label: 'Building Type',
      value: building.building_type || 'Not specified',
      icon: BuildingOfficeIcon
    },
    {
      label: 'Total Units',
      value: building.total_units || 'Not specified',
      icon: HomeIcon
    },
    {
      label: 'Managed By',
      value: building.managed_by || 'Not specified',
      icon: UserIcon
    }
  ];

  const unitDetails = unit ? [
    {
      label: 'Unit Number',
      value: unit.unit_number,
      icon: HomeIcon
    },
    {
      label: 'Floor',
      value: unit.floor || 'Not specified',
      icon: BuildingOfficeIcon
    },
    {
      label: 'Bedrooms',
      value: unit.bedrooms || 'Not specified',
      icon: HomeIcon
    },
    {
      label: 'Bathrooms',
      value: unit.bathrooms || 'Not specified',
      icon: HomeIcon
    },
    {
      label: 'Square Footage',
      value: unit.square_footage ? `${unit.square_footage} sq ft` : 'Not specified',
      icon: HomeIcon
    }
  ] : [];

  const contactDetails = [
    {
      label: 'Freeholder',
      value: building.freeholder_name || 'Not specified',
      icon: UserIcon
    },
    {
      label: 'Freeholder Contact',
      value: building.freeholder_contact || 'Not specified',
      icon: PhoneIcon
    },
    {
      label: 'Insurance',
      value: building.insurance_details || 'Contact management for details',
      icon: ShieldCheckIcon
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {scope === 'unit' ? 'Property Information' : 'Building Information'}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Building Details */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Building Details</h3>
          <div className="space-y-4">
            {buildingDetails.map((detail, index) => {
              const Icon = detail.icon;
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Icon className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">
                      {detail.label}
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      {detail.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unit Details (if applicable) */}
        {scope === 'unit' && unit && (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Unit Details</h3>
            <div className="space-y-4">
              {unitDetails.map((detail, index) => {
                const Icon = detail.icon;
                return (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500">
                        {detail.label}
                      </p>
                      <p className="text-sm text-gray-900 mt-1">
                        {detail.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact & Management */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Contact & Management</h3>
          <div className="space-y-4">
            {contactDetails.map((detail, index) => {
              const Icon = detail.icon;
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Icon className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">
                      {detail.label}
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      {detail.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-md font-medium text-gray-900 mb-4">Emergency Contacts</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-red-800">Emergency Repairs</p>
              <p className="text-red-700">Call: 0800 123 4567</p>
            </div>
            <div>
              <p className="font-medium text-red-800">Gas Emergency</p>
              <p className="text-red-700">Call: 0800 111 999</p>
            </div>
            <div>
              <p className="font-medium text-red-800">Building Management</p>
              <p className="text-red-700">Call: {building.freeholder_contact || '0800 123 4567'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}