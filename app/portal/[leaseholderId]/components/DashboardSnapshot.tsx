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
  // Handle missing lease data
  if (!lease) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lease Overview</h2>
        <div className="text-center py-8 text-gray-500">
          Lease information not available
        </div>
      </div>
    );
  }

  const leaseStartDate = lease.start_date ? new Date(lease.start_date) : null;
  const leaseEndDate = lease.end_date ? new Date(lease.end_date) : null;
  const currentDate = new Date();

  // Calculate years remaining with error handling
  let yearsRemaining = null;
  try {
    if (leaseEndDate && leaseEndDate > currentDate) {
      yearsRemaining = Math.max(0, Math.floor((leaseEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
    }
  } catch (error) {
    console.error('Error calculating years remaining:', error);
  }

  // Get financial status from lease data if available
  const isInArrears = lease.financial_status === 'in_arrears' || lease.current_balance > 0;
  const currentBalance = lease.current_balance || 0;

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
      value: lease.service_charge_percentage
        ? `${lease.service_charge_percentage}%`
        : 'Not specified',
      subtitle: 'Apportionment percentage',
      icon: DocumentTextIcon,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Payment Status',
      value: isInArrears ? 'In Arrears' : 'Up to Date',
      subtitle: isInArrears ? `Balance: £${currentBalance.toFixed(2)}` : 'All payments current',
      icon: ExclamationTriangleIcon,
      bgColor: isInArrears ? 'bg-red-50' : 'bg-green-50',
      iconColor: isInArrears ? 'text-red-600' : 'text-green-600'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Lease Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.isArray(snapshots) ? snapshots
          .filter(snapshot => snapshot && snapshot.title)
          .map((snapshot, index) => {
          const Icon = snapshot.icon;
          return (
            <div key={`snapshot-${index}-${snapshot.title}`} className="relative">
              <div className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${snapshot.bgColor || 'bg-gray-50'}`}>
                    <Icon className={`w-5 h-5 ${snapshot.iconColor || 'text-gray-600'}`} />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {snapshot.title || 'Unknown'}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {snapshot.value || 'Not available'}
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
        }) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            Unable to load lease information
          </div>
        )}
      </div>
    </div>
  );
}