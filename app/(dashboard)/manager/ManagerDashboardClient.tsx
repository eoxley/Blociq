'use client';

import { useState, useEffect } from 'react';
import { 
  BanknotesIcon, 
  ExclamationTriangleIcon, 
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

interface ManagerDashboardClientProps {
  buildings: Array<{
    id: string;
    name: string;
    address: string;
    total_units: number;
  }>;
  userRole: string;
}

interface DashboardWidget {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
  data?: any;
}

interface DashboardData {
  arrears: {
    total_outstanding: number;
    overdue_count: number;
    risk_level: string;
  };
  budget_variance: {
    total_variance: number;
    variance_percentage: number;
    over_budget_accounts: number;
  };
  reserve_fund: {
    operational_balance: number;
    reserve_balance: number;
    major_works_balance: number;
  };
  deadlines: Array<{
    id: string;
    title: string;
    due_date: string;
    type: string;
    priority: string;
  }>;
  works_orders: {
    active_count: number;
    overdue_count: number;
    completed_this_month: number;
  };
}

export function ManagerDashboardClient({ buildings, userRole }: ManagerDashboardClientProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Load data for all buildings or selected building
        const buildingIds = selectedBuilding === 'all' 
          ? buildings.map(b => b.id)
          : [selectedBuilding];

        const [arrearsResponse, budgetResponse, fundsResponse, deadlinesResponse, worksOrdersResponse] = await Promise.all([
          fetch('/api/ai/arrears', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ buildingId: buildingIds[0], scope: 'building' })
          }),
          fetch('/api/ai/variances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              buildingId: buildingIds[0], 
              budgetVersionId: 'current' // Would need to get current budget version
            })
          }),
          fetch('/api/accounting/funds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ buildingIds })
          }),
          fetch('/api/accounting/reminders', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }),
          fetch('/api/works-orders', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
        ]);

        const [arrearsData, budgetData, fundsData, deadlinesData, worksOrdersData] = await Promise.all([
          arrearsResponse.ok ? arrearsResponse.json() : null,
          budgetResponse.ok ? budgetResponse.json() : null,
          fundsResponse.ok ? fundsResponse.json() : null,
          deadlinesResponse.ok ? deadlinesResponse.json() : null,
          worksOrdersResponse.ok ? worksOrdersResponse.json() : null
        ]);

        setDashboardData({
          arrears: arrearsData?.analysis?.summary || { total_outstanding: 0, overdue_count: 0, risk_level: 'low' },
          budget_variance: budgetData?.analysis?.summary || { total_variance: 0, variance_percentage: 0, over_budget_accounts: 0 },
          reserve_fund: fundsData?.funds || { operational_balance: 0, reserve_balance: 0, major_works_balance: 0 },
          deadlines: deadlinesData?.deadlines || [],
          works_orders: {
            active_count: worksOrdersData?.works_orders?.filter((wo: any) => wo.status === 'in_progress').length || 0,
            overdue_count: worksOrdersData?.works_orders?.filter((wo: any) => 
              wo.status === 'in_progress' && new Date(wo.target_completion_date) < new Date()
            ).length || 0,
            completed_this_month: worksOrdersData?.works_orders?.filter((wo: any) => 
              wo.status === 'completed' && new Date(wo.actual_completion_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            ).length || 0
          }
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedBuilding, buildings]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getWidgets = (): DashboardWidget[] => {
    if (!dashboardData) return [];

    return [
      {
        id: 'arrears',
        title: 'Total Arrears',
        value: formatCurrency(dashboardData.arrears.total_outstanding),
        subtitle: `${dashboardData.arrears.overdue_count} overdue`,
        trend: dashboardData.arrears.risk_level === 'high' ? 'up' : 'neutral',
        icon: BanknotesIcon,
        color: dashboardData.arrears.risk_level === 'high' ? 'text-red-600' : 'text-orange-600',
        data: dashboardData.arrears
      },
      {
        id: 'budget_variance',
        title: 'Budget Variance',
        value: `${dashboardData.budget_variance.variance_percentage.toFixed(1)}%`,
        subtitle: formatCurrency(dashboardData.budget_variance.total_variance),
        trend: dashboardData.budget_variance.variance_percentage > 0 ? 'up' : 'down',
        icon: ChartBarIcon,
        color: Math.abs(dashboardData.budget_variance.variance_percentage) > 10 ? 'text-red-600' : 'text-green-600'
      },
      {
        id: 'reserve_fund',
        title: 'Reserve Fund',
        value: formatCurrency(dashboardData.reserve_fund.reserve_balance),
        subtitle: `${formatCurrency(dashboardData.reserve_fund.major_works_balance)} major works`,
        trend: 'neutral',
        icon: BanknotesIcon,
        color: 'text-blue-600'
      },
      {
        id: 'works_orders',
        title: 'Active Works Orders',
        value: dashboardData.works_orders.active_count,
        subtitle: `${dashboardData.works_orders.overdue_count} overdue`,
        trend: dashboardData.works_orders.overdue_count > 0 ? 'up' : 'neutral',
        icon: WrenchScrewdriverIcon,
        color: dashboardData.works_orders.overdue_count > 0 ? 'text-red-600' : 'text-green-600'
      },
      {
        id: 'deadlines',
        title: 'Upcoming Deadlines',
        value: dashboardData.deadlines.length,
        subtitle: 'Next 30 days',
        trend: 'neutral',
        icon: ClockIcon,
        color: 'text-purple-600'
      }
    ];
  };

  const handleExplainWithAI = async (widget: DashboardWidget) => {
    try {
      // Call AskBlocIQ to explain the widget data
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Explain the ${widget.title} data and provide insights`,
          context: {
            widget_type: widget.id,
            data: widget.data,
            building_ids: selectedBuilding === 'all' ? buildings.map(b => b.id) : [selectedBuilding]
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Show AI explanation in a modal or expandable section
        alert(data.response); // Simple implementation - would use proper modal
      }
    } catch (error) {
      console.error('Error getting AI explanation:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Building Selector */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Building:</label>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Buildings</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getWidgets().map((widget) => {
          const Icon = widget.icon;
          return (
            <div key={widget.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-gray-50`}>
                  <Icon className={`w-6 h-6 ${widget.color}`} />
                </div>
                <button
                  onClick={() => handleExplainWithAI(widget)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Explain with AI
                </button>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">{widget.title}</h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">{widget.value}</p>
                {widget.subtitle && (
                  <p className="text-sm text-gray-600">{widget.subtitle}</p>
                )}
              </div>

              {/* Trend Indicator */}
              {widget.trend && widget.trend !== 'neutral' && (
                <div className="mt-4 flex items-center">
                  <div className={`text-xs font-medium ${
                    widget.trend === 'up' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {widget.trend === 'up' ? '↑' : '↓'} {widget.trend === 'up' ? 'Increasing' : 'Decreasing'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {dashboardData?.deadlines.slice(0, 5).map((deadline) => (
            <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ClockIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{deadline.title}</p>
                  <p className="text-sm text-gray-600">
                    Due: {new Date(deadline.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                deadline.priority === 'high' ? 'bg-red-100 text-red-800' :
                deadline.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {deadline.priority}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            <span className="font-medium text-gray-900">Raise Demands</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <WrenchScrewdriverIcon className="w-6 h-6 text-green-600" />
            <span className="font-medium text-gray-900">Create Works Order</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ChartBarIcon className="w-6 h-6 text-purple-600" />
            <span className="font-medium text-gray-900">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}
