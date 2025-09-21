'use client';

import { useEffect, useState } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface ComplianceStatusProps {
  buildingId: string;
}

interface ComplianceItem {
  id: string;
  document_type: string;
  status: 'valid' | 'expiring' | 'expired' | 'missing';
  expiry_date?: string;
  uploaded_date?: string;
}

export function ComplianceStatus({ buildingId }: ComplianceStatusProps) {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        // Mock compliance data for now
        const mockData: ComplianceItem[] = [
          {
            id: '1',
            document_type: 'Fire Risk Assessment',
            status: 'valid',
            expiry_date: '2025-06-15',
            uploaded_date: '2024-06-15'
          },
          {
            id: '2',
            document_type: 'Electrical Safety Certificate',
            status: 'expiring',
            expiry_date: '2024-12-31',
            uploaded_date: '2024-01-15'
          },
          {
            id: '3',
            document_type: 'Gas Safety Certificate',
            status: 'valid',
            expiry_date: '2025-03-20',
            uploaded_date: '2024-03-20'
          },
          {
            id: '4',
            document_type: 'Lift Inspection Certificate',
            status: 'missing'
          }
        ];

        setComplianceItems(mockData);
      } catch (error) {
        console.error('Failed to fetch compliance status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompliance();
  }, [buildingId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'expiring':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'expired':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'missing':
        return <ExclamationTriangleIcon className="w-5 h-5 text-gray-400" />;
      default:
        return <ShieldCheckIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'expiring':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'expired':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'missing':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
        <div className="space-y-3">
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
        <h3 className="text-lg font-semibold text-gray-900">Compliance Status</h3>
        <ShieldCheckIcon className="w-6 h-6 text-gray-400" />
      </div>

      <div className="space-y-4">
        {complianceItems.map((item) => (
          <div key={item.id} className={`p-4 rounded-lg border ${getStatusColor(item.status)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getStatusIcon(item.status)}
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.document_type}</h4>
                  <div className="mt-1 space-y-1">
                    {item.expiry_date && (
                      <p className="text-sm text-gray-600">
                        Expires: {formatDate(item.expiry_date)}
                      </p>
                    )}
                    {item.uploaded_date && (
                      <p className="text-sm text-gray-500">
                        Last updated: {formatDate(item.uploaded_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          All building compliance certificates and assessments are managed by the building management team.
          For questions, please contact your property manager.
        </p>
      </div>
    </div>
  );
}