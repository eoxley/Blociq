'use client';

import { useState, useEffect } from 'react';
import { BuildingComplianceAsset } from '@/types/compliance';
import { 
  getComplianceStatus, 
  getStatusColor, 
  getStatusIcon, 
  getPriorityColor, 
  getPriorityIcon,
  formatDueDate,
  sortAssetsByPriority
} from '@/lib/compliance/utils';

interface Building {
  id: string;
  name: string;
  address: string;
  created_at: string;
  compliance_assets: BuildingComplianceAsset[];
  document_count: number;
}

interface PortfolioComplianceOverviewProps {
  buildings: Building[];
  userId: string;
}

export default function PortfolioComplianceOverview({
  buildings,
  userId
}: PortfolioComplianceOverviewProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'compliance' | 'overdue' | 'documents'>('compliance');

  // Calculate portfolio-wide statistics
  const portfolioStats = useMemo(() => {
    const allAssets = buildings.flatMap(b => b.compliance_assets);
    const totalAssets = allAssets.length;
    const compliantAssets = allAssets.filter(asset => asset.status === 'compliant').length;
    const overdueAssets = allAssets.filter(asset => asset.status === 'overdue').length;
    const dueSoonAssets = allAssets.filter(asset => asset.status === 'due_soon').length;
    const totalDocuments = buildings.reduce((sum, b) => sum + b.document_count, 0);
    
    return {
      total_buildings: buildings.length,
      total_assets: totalAssets,
      compliant_assets: compliantAssets,
      overdue_assets: overdueAssets,
      due_soon_assets: dueSoonAssets,
      total_documents: totalDocuments,
      overall_compliance: totalAssets > 0 ? Math.round((compliantAssets / totalAssets) * 100) : 0
    };
  }, [buildings]);

  // Filter and sort buildings
  const filteredBuildings = useMemo(() => {
    let filtered = [...buildings];
    
    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(building => 
        building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        building.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter(building => {
        const buildingAssets = building.compliance_assets;
        return buildingAssets.some(asset => statusFilter.includes(asset.status));
      });
    }
    
    // Apply priority filter
    if (priorityFilter.length > 0) {
      filtered = filtered.filter(building => {
        const buildingAssets = building.compliance_assets;
        return buildingAssets.some(asset => priorityFilter.includes(asset.priority));
      });
    }
    
    // Sort buildings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'compliance':
          const aCompliance = getComplianceStatus(a.compliance_assets).compliance_percentage;
          const bCompliance = getComplianceStatus(b.compliance_assets).compliance_percentage;
          return bCompliance - aCompliance;
        case 'overdue':
          const aOverdue = a.compliance_assets.filter(asset => asset.status === 'overdue').length;
          const bOverdue = b.compliance_assets.filter(asset => asset.status === 'overdue').length;
          return bOverdue - aOverdue;
        case 'documents':
          return b.document_count - a.document_count;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [buildings, searchQuery, statusFilter, priorityFilter, sortBy]);

  // Get critical alerts (overdue assets)
  const criticalAlerts = useMemo(() => {
    const alerts: Array<{
      building_id: string;
      building_name: string;
      asset_id: string;
      asset_title: string;
      priority: string;
      days_overdue: number;
    }> = [];
    
    buildings.forEach(building => {
      building.compliance_assets.forEach(asset => {
        if (asset.status === 'overdue' && asset.due_date) {
          const dueDate = new Date(asset.due_date);
          const today = new Date();
          const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          alerts.push({
            building_id: building.id,
            building_name: building.name,
            asset_id: asset.asset_id,
            asset_title: asset.asset_id, // This should be resolved to actual title
            priority: asset.priority,
            days_overdue: daysOverdue
          });
        }
      });
    });
    
    return alerts.sort((a, b) => b.days_overdue - a.days_overdue).slice(0, 10);
  }, [buildings]);

  if (buildings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">🏢</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Buildings Found</h3>
        <p className="text-gray-600 mb-6">
          You don't have access to any buildings yet.
        </p>
        <a
          href="/buildings"
          className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          View Buildings
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">🏢</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Buildings</p>
              <p className="text-2xl font-bold text-gray-900">{portfolioStats.total_buildings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-medium">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{portfolioStats.total_assets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-sm font-medium">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overall Compliance</p>
              <p className="text-2xl font-bold text-purple-600">{portfolioStats.overall_compliance}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-sm font-medium">🚨</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Critical Issues</p>
              <p className="text-2xl font-bold text-red-600">{portfolioStats.overdue_assets}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-red-200">
          <div className="px-6 py-4 border-b border-red-200">
            <h3 className="text-lg font-medium text-red-900 flex items-center">
              <span className="mr-2">🚨</span>
              Critical Compliance Alerts
            </h3>
            <p className="text-sm text-red-600 mt-1">
              {criticalAlerts.length} overdue compliance items require immediate attention
            </p>
          </div>
          <div className="divide-y divide-red-100">
            {criticalAlerts.map((alert, index) => (
              <div key={index} className="px-6 py-3 hover:bg-red-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                        {getPriorityIcon(alert.priority)} {alert.priority}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {alert.building_name}
                      </span>
                      <span className="text-sm text-gray-600">
                        - {alert.asset_title}
                      </span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      {alert.days_overdue} days overdue
                    </p>
                  </div>
                  <a
                    href={`/buildings/${alert.building_id}/compliance`}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                  >
                    View Details
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Buildings</label>
            <input
              type="text"
              placeholder="Search by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
            <select
              multiple
              value={statusFilter}
              onChange={(e) => setStatusFilter(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="compliant">Compliant</option>
              <option value="due_soon">Due Soon</option>
              <option value="overdue">Overdue</option>
              <option value="missing">Missing</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority Filter</label>
            <select
              multiple
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="compliance">Compliance %</option>
              <option value="overdue">Overdue Items</option>
              <option value="name">Building Name</option>
              <option value="documents">Document Count</option>
            </select>
          </div>
        </div>
      </div>

      {/* Buildings List */}
      <div className="space-y-4">
        {filteredBuildings.map((building) => {
          const complianceStatus = getComplianceStatus(building.compliance_assets);
          const overdueAssets = building.compliance_assets.filter(asset => asset.status === 'overdue');
          const dueSoonAssets = building.compliance_assets.filter(asset => asset.status === 'due_soon');
          
          return (
            <div key={building.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {building.name}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {building.address}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Compliance:</span>
                        <span className={`text-sm font-medium ${
                          complianceStatus.compliance_percentage >= 80 ? 'text-green-600' :
                          complianceStatus.compliance_percentage >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {complianceStatus.compliance_percentage}%
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Assets:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {complianceStatus.total_assets}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Documents:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {building.document_count}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Status Indicators */}
                    {overdueAssets.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <span className="text-red-600 text-sm">❌</span>
                        <span className="text-sm text-red-600 font-medium">
                          {overdueAssets.length} overdue
                        </span>
                      </div>
                    )}
                    
                    {dueSoonAssets.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-600 text-sm">⚠️</span>
                        <span className="text-sm text-yellow-600 font-medium">
                          {dueSoonAssets.length} due soon
                        </span>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <a
                        href={`/buildings/${building.id}/compliance`}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        View Details
                      </a>
                      
                      <a
                        href={`/buildings/compliance/setup?buildingId=${building.id}`}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Setup
                      </a>
                    </div>
                  </div>
                </div>
                
                {/* Quick Status Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>Compliance Progress</span>
                    <span>{complianceStatus.compliant}/{complianceStatus.total_assets} compliant</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        complianceStatus.compliance_percentage >= 80 ? 'bg-green-500' :
                        complianceStatus.compliance_percentage >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${complianceStatus.compliance_percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredBuildings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Buildings Found</h3>
          <p className="text-gray-600 mb-6">
            No buildings match your current search and filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter([]);
              setPriorityFilter([]);
            }}
            className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

// Helper hook for memoization
function useMemo<T>(factory: () => T, deps: any[]): T {
  const [value, setValue] = useState<T>(factory);
  
  useEffect(() => {
    setValue(factory());
  }, deps);
  
  return value;
}
