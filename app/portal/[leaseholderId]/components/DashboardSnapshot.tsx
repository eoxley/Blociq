'use client';

import {
  CalendarIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface DashboardSnapshotProps {
  lease: any; // Full lease object with building and unit data
}

export function DashboardSnapshot({ lease }: DashboardSnapshotProps) {
  const leaseStartDate = lease.start_date ? new Date(lease.start_date) : null;
  const leaseEndDate = lease.end_date ? new Date(lease.end_date) : null;
  const currentDate = new Date();

  // Calculate years remaining
  const yearsRemaining = leaseEndDate
    ? Math.max(0, Math.floor((leaseEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)))
    : null;

  const snapshots = [
    {
      title: 'Lease Term',
      value: leaseStartDate && leaseEndDate
        ? `${leaseStartDate.getFullYear()} - ${leaseEndDate.getFullYear()}`
        : 'Not specified',
      subtitle: yearsRemaining !== null ? `${yearsRemaining} years remaining` : '',
      icon: CalendarIcon,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Ground Rent',
      value: lease.ground_rent || 'Not specified',
      subtitle: 'Annual amount',
      icon: BanknotesIcon,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: 'Service Charge',
      value: lease.service_charge_apportionment
        ? `${lease.service_charge_apportionment}%`
        : 'Not specified',
      subtitle: 'Apportionment percentage',
      icon: DocumentTextIcon,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Property',
      value: lease.scope === 'unit' && lease.units?.unit_number
        ? `Unit ${lease.units.unit_number}`
        : lease.buildings.name,
      subtitle: lease.buildings.address || 'Address not available',
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Lease Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {snapshots.map((snapshot, index) => {
          const Icon = snapshot.icon;
          return (
            <div key={index} className="relative">
              <div className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${snapshot.bgColor}`}>
                    <Icon className={`w-5 h-5 ${snapshot.iconColor}`} />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {snapshot.title}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {snapshot.value}
                    </p>
                    {snapshot.subtitle && (
                      <p className="text-xs text-gray-500 mt-1">
                        {snapshot.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}