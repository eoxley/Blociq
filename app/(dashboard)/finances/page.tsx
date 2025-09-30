'use client';

import { useState, useEffect } from 'react';
import { useAgency } from '@/hooks/useAgency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  BarChart3,
  PiggyBank,
  Calendar,
  Download,
  Building2,
  Receipt,
  CreditCard,
  FileText
} from 'lucide-react';

interface BuildingFinance {
  building_id: string;
  building_name: string;
  arrears: number;
  reserve_fund: number;
  monthly_service_charge: number;
  overdue_invoices: number;
}

export default function FinancesPage() {
  const { currentAgency } = useAgency();
  const [buildings, setBuildings] = useState<BuildingFinance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalArrears: 0,
    totalReserves: 0,
    overdueInvoices: 0,
    buildingsCount: 0
  });

  useEffect(() => {
    loadFinanceData();
  }, [currentAgency]);

  const loadFinanceData = async () => {
    try {
      setIsLoading(true);

      // Load buildings first
      const buildingsResponse = await fetch('/api/buildings');
      const buildingsData = await buildingsResponse.json();

      if (buildingsData.success && buildingsData.buildings) {
        const buildingsWithFinance = await Promise.all(
          buildingsData.buildings.map(async (building: any) => {
            try {
              const financeResponse = await fetch(`/api/finance/summary?building_id=${building.id}`);
              const financeData = await financeResponse.json();

              return {
                building_id: building.id,
                building_name: building.name,
                arrears: financeData.success ? financeData.summary?.arrears?.total || 0 : 0,
                reserve_fund: financeData.success ? financeData.summary?.reserve_fund?.balance || 0 : 0,
                monthly_service_charge: 0, // TODO: Get from building data
                overdue_invoices: 0 // TODO: Calculate from finance data
              };
            } catch (error) {
              console.error(`Error loading finance for building ${building.id}:`, error);
              return {
                building_id: building.id,
                building_name: building.name,
                arrears: 0,
                reserve_fund: 0,
                monthly_service_charge: 0,
                overdue_invoices: 0
              };
            }
          })
        );

        setBuildings(buildingsWithFinance);

        // Calculate totals
        const totals = buildingsWithFinance.reduce((acc, building) => ({
          totalArrears: acc.totalArrears + building.arrears,
          totalReserves: acc.totalReserves + building.reserve_fund,
          overdueInvoices: acc.overdueInvoices + building.overdue_invoices,
          buildingsCount: acc.buildingsCount + 1
        }), {
          totalArrears: 0,
          totalReserves: 0,
          overdueInvoices: 0,
          buildingsCount: 0
        });

        setStats(totals);
      }
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finances</h1>
          <p className="text-gray-600 mt-1">Portfolio financial overview and management</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Arrears</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalArrears)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Across {stats.buildingsCount} buildings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserve Funds</CardTitle>
            <PiggyBank className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalReserves)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Total in reserves
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.overdueInvoices}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buildings</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.buildingsCount}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Under management
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Buildings Finance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Building Finances</CardTitle>
          <CardDescription>
            Financial overview for each building in your portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : buildings.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No buildings found</p>
              <p className="text-sm text-gray-500 mt-2">
                Add buildings to start tracking finances
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Building</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Arrears</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Reserve Fund</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Overdue Invoices</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {buildings.map((building) => (
                    <tr key={building.building_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{building.building_name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`font-semibold ${building.arrears > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(building.arrears)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="text-green-600 font-semibold">
                          {formatCurrency(building.reserve_fund)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        {building.overdue_invoices > 0 ? (
                          <Badge variant="destructive">{building.overdue_invoices}</Badge>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/buildings/${building.building_id}/finance`}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common financial management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start h-auto py-4">
              <Receipt className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Process Invoices</div>
                <div className="text-xs text-gray-600">Upload and approve invoices</div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto py-4">
              <CreditCard className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Bank Reconciliation</div>
                <div className="text-xs text-gray-600">Match transactions</div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto py-4">
              <FileText className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Generate Reports</div>
                <div className="text-xs text-gray-600">Financial statements</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}