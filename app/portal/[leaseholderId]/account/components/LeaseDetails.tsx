'use client';

import {
  CalendarIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface LeaseDetailsProps {
  lease: any;
}

export function LeaseDetails({ lease }: LeaseDetailsProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const calculateYearsRemaining = () => {
    if (!lease.end_date) return null;
    const endDate = new Date(lease.end_date);
    const now = new Date();
    const yearsRemaining = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
    return yearsRemaining;
  };

  const yearsRemaining = calculateYearsRemaining();

  const details = [
    {
      label: 'Property',
      value: lease.scope === 'unit' && lease.units?.unit_number
        ? `Unit ${lease.units.unit_number}`
        : lease.buildings.name,
      icon: BuildingOfficeIcon,
      subtitle: lease.buildings.address || 'Address not available'
    },
    {
      label: 'Lease Start',
      value: formatDate(lease.start_date),
      icon: CalendarIcon,
      subtitle: null
    },
    {
      label: 'Lease End',
      value: formatDate(lease.end_date),
      icon: CalendarIcon,
      subtitle: yearsRemaining !== null ? `${yearsRemaining} years remaining` : null
    },
    {
      label: 'Ground Rent',
      value: lease.ground_rent || 'Not specified',
      icon: BanknotesIcon,
      subtitle: 'Annual amount'
    },
    {
      label: 'Service Charge',
      value: lease.service_charge_apportionment
        ? `${lease.service_charge_apportionment}%`
        : 'Not specified',
      icon: DocumentTextIcon,
      subtitle: 'Apportionment percentage'
    },
    {
      label: 'Leaseholder',
      value: lease.leaseholder_name || 'Not specified',
      icon: DocumentTextIcon,
      subtitle: null
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Lease Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {details.map((detail, index) => {
          const Icon = detail.icon;
          return (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">
                  {detail.label}
                </p>
                <p className="text-base font-semibold text-gray-900 mt-1">
                  {detail.value}
                </p>
                {detail.subtitle && (
                  <p className="text-sm text-gray-500 mt-1">
                    {detail.subtitle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Lease Information */}
      {(lease.responsibilities?.length > 0 || lease.restrictions?.length > 0 || lease.rights?.length > 0) && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">Additional Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lease.responsibilities?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Responsibilities</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {lease.responsibilities.slice(0, 3).map((item: string, idx: number) => (
                    <li key={idx} className="line-clamp-2">• {item}</li>
                  ))}
                  {lease.responsibilities.length > 3 && (
                    <li className="text-blue-600">• And {lease.responsibilities.length - 3} more...</li>
                  )}
                </ul>
              </div>
            )}

            {lease.restrictions?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Restrictions</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {lease.restrictions.slice(0, 3).map((item: string, idx: number) => (
                    <li key={idx} className="line-clamp-2">• {item}</li>
                  ))}
                  {lease.restrictions.length > 3 && (
                    <li className="text-blue-600">• And {lease.restrictions.length - 3} more...</li>
                  )}
                </ul>
              </div>
            )}

            {lease.rights?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Rights</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {lease.rights.slice(0, 3).map((item: string, idx: number) => (
                    <li key={idx} className="line-clamp-2">• {item}</li>
                  ))}
                  {lease.rights.length > 3 && (
                    <li className="text-blue-600">• And {lease.rights.length - 3} more...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}