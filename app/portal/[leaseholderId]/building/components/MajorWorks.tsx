'use client';

import { useEffect, useState } from 'react';
import {
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  CurrencyPoundIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface MajorWorksProps {
  buildingId: string;
}

interface MajorWork {
  id: string;
  project_name: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  start_date?: string;
  end_date?: string;
  estimated_cost?: number;
  actual_cost?: number;
  contractor?: string;
}

export function MajorWorks({ buildingId }: MajorWorksProps) {
  const [majorWorks, setMajorWorks] = useState<MajorWork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMajorWorks = async () => {
      try {
        // Mock major works data for now
        const mockData: MajorWork[] = [
          {
            id: '1',
            project_name: 'Roof Repairs',
            description: 'Complete roof membrane replacement and waterproofing',
            status: 'in_progress',
            start_date: '2024-09-01',
            end_date: '2024-11-30',
            estimated_cost: 45000,
            contractor: 'Premium Roofing Ltd'
          },
          {
            id: '2',
            project_name: 'Lift Modernization',
            description: 'Upgrade main passenger lift with new controls and safety systems',
            status: 'planned',
            start_date: '2025-01-15',
            end_date: '2025-03-15',
            estimated_cost: 32000,
            contractor: 'Elevator Solutions Inc'
          },
          {
            id: '3',
            project_name: 'Exterior Painting',
            description: 'Complete exterior building painting and facade maintenance',
            status: 'completed',
            start_date: '2024-05-01',
            end_date: '2024-07-15',
            estimated_cost: 28000,
            actual_cost: 26500,
            contractor: 'Heritage Decorators'
          }
        ];

        setMajorWorks(mockData);
      } catch (error) {
        console.error('Failed to fetch major works:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMajorWorks();
  }, [buildingId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'on_hold':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'TBD';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Major Works</h3>
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
        <h3 className="text-lg font-semibold text-gray-900">Major Works</h3>
        <WrenchScrewdriverIcon className="w-6 h-6 text-gray-400" />
      </div>

      {majorWorks.length === 0 ? (
        <div className="text-center py-8">
          <WrenchScrewdriverIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No major works scheduled</p>
        </div>
      ) : (
        <div className="space-y-4">
          {majorWorks.map((work) => (
            <div key={work.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{work.project_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{work.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(work.status)}`}>
                  {work.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {formatDate(work.start_date)} - {formatDate(work.end_date)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CurrencyPoundIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {work.actual_cost ? formatCurrency(work.actual_cost) : formatCurrency(work.estimated_cost)}
                    {work.status === 'completed' && work.actual_cost ? ' (final)' : ' (estimated)'}
                  </span>
                </div>
              </div>

              {work.contractor && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Contractor: <span className="font-medium text-gray-700">{work.contractor}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Major works are funded through the service charge and reserves. Leaseholders will be notified
          of any significant works in advance with full cost breakdowns.
        </p>
      </div>
    </div>
  );
}