'use client';

import { useEffect, useState } from 'react';
import {
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface MaintenanceHistoryProps {
  buildingId: string;
  scope: string;
  unitId?: string | null;
}

interface MaintenanceRecord {
  id: string;
  title: string;
  description: string;
  type: 'repair' | 'maintenance' | 'inspection' | 'emergency';
  status: 'completed' | 'in_progress' | 'scheduled' | 'cancelled';
  date: string;
  completed_date?: string;
  contractor?: string;
  cost?: number;
  location: string;
}

export function MaintenanceHistory({ buildingId, scope, unitId }: MaintenanceHistoryProps) {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenanceHistory = async () => {
      try {
        // Mock maintenance data for now
        const mockData: MaintenanceRecord[] = [
          {
            id: '1',
            title: 'Heating System Service',
            description: 'Annual boiler service and heating system maintenance',
            type: 'maintenance',
            status: 'completed',
            date: '2024-09-15T10:00:00Z',
            completed_date: '2024-09-15T14:00:00Z',
            contractor: 'Borough Heating Services',
            cost: 350,
            location: scope === 'unit' ? `Unit ${unitId}` : 'Common Areas'
          },
          {
            id: '2',
            title: 'Window Lock Repair',
            description: 'Replace faulty window lock mechanism in living room',
            type: 'repair',
            status: 'completed',
            date: '2024-08-22T09:00:00Z',
            completed_date: '2024-08-22T11:30:00Z',
            contractor: 'Secure Windows Ltd',
            cost: 125,
            location: scope === 'unit' ? `Unit ${unitId}` : 'Building Entrance'
          },
          {
            id: '3',
            title: 'Fire Alarm Testing',
            description: 'Quarterly fire alarm system testing and inspection',
            type: 'inspection',
            status: 'completed',
            date: '2024-07-10T14:00:00Z',
            completed_date: '2024-07-10T16:00:00Z',
            contractor: 'Fire Safety Systems',
            location: 'Entire Building'
          },
          {
            id: '4',
            title: 'Lift Maintenance',
            description: 'Routine lift inspection and minor adjustments',
            type: 'maintenance',
            status: 'scheduled',
            date: '2024-10-05T09:00:00Z',
            contractor: 'Elevator Solutions Inc',
            location: 'Building Lift'
          }
        ];

        // Filter records based on scope
        const filteredData = scope === 'unit'
          ? mockData.filter(record => record.location.includes('Unit') || record.location === 'Entire Building')
          : mockData;

        setMaintenanceRecords(filteredData);
      } catch (error) {
        console.error('Failed to fetch maintenance history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceHistory();
  }, [buildingId, scope, unitId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'scheduled':
        return <CalendarDaysIcon className="w-5 h-5 text-blue-500" />;
      case 'cancelled':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <WrenchScrewdriverIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-50';
      case 'scheduled':
        return 'text-blue-600 bg-blue-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'repair':
        return '🔧';
      case 'maintenance':
        return '⚙️';
      case 'inspection':
        return '🔍';
      case 'emergency':
        return '🚨';
      default:
        return '🛠️';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance History</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Maintenance History</h3>
          <p className="text-sm text-gray-500">
            {scope === 'unit' ? 'Unit and building maintenance' : 'Building maintenance records'}
          </p>
        </div>
        <WrenchScrewdriverIcon className="w-6 h-6 text-gray-400" />
      </div>

      {maintenanceRecords.length === 0 ? (
        <div className="text-center py-8">
          <WrenchScrewdriverIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No maintenance records found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {maintenanceRecords.map((record) => (
            <div key={record.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <span className="text-lg">{getTypeIcon(record.type)}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{record.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(record.status)}
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(record.status)}`}>
                    {record.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {record.status === 'completed' && record.completed_date
                      ? formatDate(record.completed_date)
                      : formatDate(record.date)
                    }
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {record.contractor || 'Internal Team'}
                  </span>
                </div>

                {record.cost && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">
                      Cost: {formatCurrency(record.cost)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Location: <span className="font-medium text-gray-700">{record.location}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          {scope === 'unit'
            ? 'This shows maintenance affecting your unit and common areas. For maintenance requests, contact building management.'
            : 'All building maintenance is coordinated by the management team. Service charges cover routine maintenance costs.'
          }
        </p>
      </div>
    </div>
  );
}