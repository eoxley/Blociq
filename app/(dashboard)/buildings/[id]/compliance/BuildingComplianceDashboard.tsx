'use client';

import { useState, useEffect } from 'react';
import { BuildingComplianceAsset, ComplianceStatus } from '@/types/compliance';
import { 
  getComplianceStatus, 
  getStatusColor, 
  getStatusIcon, 
  getPriorityColor, 
  getPriorityIcon,
  formatDueDate,
  sortAssetsByPriority,
  filterAssetsByStatus,
  filterAssetsByPriority,
  filterAssetsByCategory,
  searchAssets,
  getAssetTitle,
  getAssetCategory,
  getAssetDescription
} from '@/lib/compliance/utils';
import { COMPLIANCE_CATEGORIES } from '@/lib/compliance/masterAssets';

interface BuildingComplianceDashboardProps {
  buildingId: string;
  buildingName: string;
  complianceAssets: BuildingComplianceAsset[];
  totalDocuments: number;
}

export default function BuildingComplianceDashboard({
  buildingId,
  buildingName,
  complianceAssets,
  totalDocuments
}: BuildingComplianceDashboardProps) {
  const [filteredAssets, setFilteredAssets] = useState<BuildingComplianceAsset[]>(complianceAssets);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<BuildingComplianceAsset>>({});

  // Update filtered assets when compliance assets change
  useEffect(() => {
    // Safety check: prevent infinite loops with empty or undefined data
    if (!complianceAssets || complianceAssets.length === 0) {
      setFilteredAssets([]);
      return;
    }

    let filtered = [...complianceAssets];
    
    // Apply search
    if (searchQuery.trim()) {
      filtered = searchAssets(filtered, searchQuery);
    }
    
    // Apply status filter
    if (statusFilter.length > 0) {
      filtered = filterAssetsByStatus(filtered, statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter.length > 0) {
      filtered = filterAssetsByPriority(filtered, priorityFilter);
    }
    
    // Apply category filter
    if (categoryFilter.length > 0) {
      filtered = filterAssetsByCategory(filtered, categoryFilter);
    }
    
    // Sort by priority and status
    filtered = sortAssetsByPriority(filtered);
    
    setFilteredAssets(filtered);
  }, [complianceAssets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const startEditing = (asset: BuildingComplianceAsset) => {
    setIsEditing(asset.id);
    setEditData({
      status: asset.status,
      priority: asset.priority,
      due_date: asset.due_date,
      assigned_to: asset.assigned_to,
      notes: asset.notes
    });
  };

  const cancelEditing = () => {
    setIsEditing(null);
    setEditData({});
  };

  const saveChanges = async (assetId: string) => {
    try {
      const response = await fetch(`/api/compliance/assets/${assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          ...editData
        }),
      });

      if (response.ok) {
        // Refresh the page to get updated data
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to update asset'}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  const markAsCompleted = async (assetId: string) => {
    try {
      const response = await fetch(`/api/compliance/assets/${assetId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          completed_date: new Date().toISOString().split('T')[0]
        }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to mark as completed'}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  const complianceStatus = getComplianceStatus(complianceAssets);

  if (complianceAssets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Industry Knowledge Assets Configured</h3>
        <p className="text-gray-600 mb-6">
          This building doesn't have any industry knowledge assets set up yet.
        </p>
        <a
          href={`/buildings/compliance/setup?buildingId=${buildingId}`}
          className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Setup Industry Knowledge Assets
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{complianceStatus.total_assets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-medium">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Compliant</p>
              <p className="text-2xl font-bold text-green-600">{complianceStatus.compliant}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 text-sm font-medium">⚠️</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Due Soon</p>
              <p className="text-2xl font-bold text-yellow-600">{complianceStatus.due_soon}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-sm font-medium">❌</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{complianceStatus.overdue}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-sm font-medium">📄</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Documents</p>
              <p className="text-2xl font-bold text-purple-600">{totalDocuments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Percentage Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Overall Industry Knowledge Status</h3>
          <span className="text-2xl font-bold text-blue-600">{complianceStatus.compliance_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${complianceStatus.compliance_percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
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

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              multiple
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COMPLIANCE_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assets by Category */}
      <div className="space-y-4">
        {COMPLIANCE_CATEGORIES.map(category => {
          const categoryAssets = filteredAssets.filter(asset => 
            getAssetCategory(asset.asset_id) === category
          );
          
          if (categoryAssets.length === 0) return null;
          
          const isExpanded = expandedCategories.has(category);
          
          return (
            <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{category}</h3>
                    <span className="text-sm text-gray-500">({categoryAssets.length} assets)</span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      {categoryAssets.filter(asset => asset.status === 'compliant').length} compliant
                    </div>
                    <div className="text-sm text-gray-500">
                      {categoryAssets.filter(asset => asset.status === 'overdue').length} overdue
                    </div>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 divide-y divide-gray-200">
                  {categoryAssets.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      isEditing={isEditing === asset.id}
                      editData={editData}
                      onEditChange={setEditData}
                      onStartEdit={() => startEditing(asset)}
                      onCancelEdit={cancelEditing}
                      onSaveEdit={() => saveChanges(asset.id)}
                      onMarkCompleted={() => markAsCompleted(asset.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AssetRowProps {
  asset: BuildingComplianceAsset;
  isEditing: boolean;
  editData: Partial<BuildingComplianceAsset>;
  onEditChange: (data: Partial<BuildingComplianceAsset>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onMarkCompleted: () => void;
}

function AssetRow({
  asset,
  isEditing,
  editData,
  onEditChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onMarkCompleted
}: AssetRowProps) {
  return (
    <div className="px-6 py-4 hover:bg-gray-50">
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              {getAssetTitle(asset.asset_id)}
            </h4>
            <div className="flex space-x-2">
              <button
                onClick={onSaveEdit}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editData.status || asset.status}
                onChange={(e) => onEditChange({ ...editData, status: e.target.value as any })}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md"
              >
                <option value="pending">Pending</option>
                <option value="compliant">Compliant</option>
                <option value="overdue">Overdue</option>
                <option value="due_soon">Due Soon</option>
                <option value="missing">Missing</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={editData.priority || asset.priority}
                onChange={(e) => onEditChange({ ...editData, priority: e.target.value as any })}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={editData.due_date || asset.due_date || ''}
                onChange={(e) => onEditChange({ ...editData, due_date: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
            <input
              type="text"
              placeholder="Enter assignee name"
              value={editData.assigned_to || asset.assigned_to || ''}
              onChange={(e) => onEditChange({ ...editData, assigned_to: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              placeholder="Enter notes"
              value={editData.notes || asset.notes || ''}
              onChange={(e) => onEditChange({ ...editData, notes: e.target.value })}
              rows={2}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h4 className="text-sm font-medium text-gray-900">
                {getAssetTitle(asset.asset_id)}
              </h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(asset.status)}`}>
                {getStatusIcon(asset.status)} {asset.status.replace('_', ' ')}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(asset.priority)}`}>
                {getPriorityIcon(asset.priority)} {asset.priority}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mt-1">
              {getAssetDescription(asset.asset_id)}
            </p>
            
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span>Category: {getAssetCategory(asset.asset_id)}</span>
              <span>Due: {formatDueDate(asset.due_date)}</span>
              {asset.assigned_to && (
                <span>Assigned: {asset.assigned_to}</span>
              )}
            </div>
            
            {asset.notes && (
              <p className="text-xs text-gray-600 mt-2 italic">"{asset.notes}"</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onStartEdit}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Edit
            </button>
            <button
              onClick={onMarkCompleted}
              className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Mark Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
