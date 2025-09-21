'use client';

import { useEffect, useState } from 'react';
import {
  BanknotesIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface FinancialOverviewProps {
  leaseholderId: string;
}

interface FinancialData {
  financial_summary: {
    ground_rent: {
      annual_amount: number;
      next_payment_date: string;
      status: string;
    };
    service_charge: {
      annual_estimate: number;
      apportionment_percentage: number;
      next_payment_date: string;
      status: string;
    };
    total_annual_cost: number;
  };
  upcoming_payments: Array<{
    id: string;
    type: string;
    amount: number;
    due_date: string;
    description: string;
    status: string;
  }>;
}

export function FinancialOverview({ leaseholderId }: FinancialOverviewProps) {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const response = await fetch(`/api/portal/${leaseholderId}/finances`);
        if (response.ok) {
          const data = await response.json();
          setFinancialData(data);
        }
      } catch (error) {
        console.error('Failed to fetch financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [leaseholderId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up_to_date':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'due':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
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

  if (!financialData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
        <p className="text-gray-500">Unable to load financial information.</p>
      </div>
    );
  }

  const { financial_summary, upcoming_payments } = financialData;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
        <a
          href={`/portal/${leaseholderId}/account/finances`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View all transactions
        </a>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <BanknotesIcon className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-500">Ground Rent</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(financial_summary.ground_rent.annual_amount)}
              </p>
              <p className="text-xs text-gray-500">per year</p>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-500">Service Charge</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(financial_summary.service_charge.annual_estimate)}
              </p>
              <p className="text-xs text-gray-500">
                {financial_summary.service_charge.apportionment_percentage}% apportionment
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Total Annual Cost */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Annual Cost</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(financial_summary.total_annual_cost)}
            </p>
          </div>
          <CalendarDaysIcon className="w-6 h-6 text-gray-400" />
        </div>
      </div>

      {/* Upcoming Payments */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Upcoming Payments</h4>
        <div className="space-y-3">
          {upcoming_payments.slice(0, 3).map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {payment.status === 'due' ? (
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                  ) : (
                    <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {payment.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    Due: {formatDate(payment.due_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(payment.amount)}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(payment.status)}`}>
                  {payment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}