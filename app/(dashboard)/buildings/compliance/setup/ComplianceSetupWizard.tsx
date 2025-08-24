'use client';

import { useState, useEffect } from 'react';
import { MASTER_COMPLIANCE_ASSETS, COMPLIANCE_CATEGORIES } from '@/lib/compliance/masterAssets';
import { ComplianceAsset } from '@/lib/compliance/masterAssets';

interface ComplianceSetupWizardProps {
  buildingId: string;
  buildingName: string;
  existingAssetIds: string[];
}

export default function ComplianceSetupWizard({ 
  buildingId, 
  buildingName, 
  existingAssetIds 
}: ComplianceSetupWizardProps) {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set(existingAssetIds));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Initialize with existing assets
  useEffect(() => {
    setSelectedAssets(new Set(existingAssetIds));
  }, [existingAssetIds]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const selectCategory = (category: string, select: boolean) => {
    const categoryAssets = MASTER_COMPLIANCE_ASSETS.filter(asset => asset.category === category);
    const newSelected = new Set(selectedAssets);
    
    if (select) {
      categoryAssets.forEach(asset => newSelected.add(asset.id));
    } else {
      categoryAssets.forEach(asset => newSelected.delete(asset.id));
    }
    
    setSelectedAssets(newSelected);
  };

  const selectAll = () => {
    const allAssetIds = MASTER_COMPLIANCE_ASSETS.map(asset => asset.id);
    setSelectedAssets(new Set(allAssetIds));
  };

  const selectNone = () => {
    setSelectedAssets(new Set());
  };

  const selectRequired = () => {
    const requiredAssetIds = MASTER_COMPLIANCE_ASSETS
      .filter(asset => asset.is_required)
      .map(asset => asset.id);
    setSelectedAssets(new Set(requiredAssetIds));
  };

  const handleSubmit = async () => {
    if (selectedAssets.size === 0) {
      setSubmitMessage('Please select at least one compliance asset.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch(`/api/compliance/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          asset_ids: Array.from(selectedAssets),
        }),
      });

      if (response.ok) {
        setSubmitMessage('Compliance assets configured successfully!');
        // Redirect to compliance tracking page after a short delay
        setTimeout(() => {
          window.location.href = `/buildings/${buildingId}/compliance`;
        }, 2000);
      } else {
        const error = await response.json();
        setSubmitMessage(`Error: ${error.message || 'Failed to configure compliance assets'}`);
      }
    } catch (error) {
      setSubmitMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryStats = (category: string) => {
    const categoryAssets = MASTER_COMPLIANCE_ASSETS.filter(asset => asset.category === category);
    const selectedInCategory = categoryAssets.filter(asset => selectedAssets.has(asset.id)).length;
    return `${selectedInCategory}/${categoryAssets.length}`;
  };

  const getTotalStats = () => {
    const total = MASTER_COMPLIANCE_ASSETS.length;
    const selected = selectedAssets.size;
    return `${selected}/${total}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Select Compliance Assets for {buildingName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose which compliance requirements you want to track for this building
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{getTotalStats()}</div>
            <div className="text-sm text-gray-500">Assets Selected</div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={selectAll}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Select None
          </button>
          <button
            onClick={selectRequired}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Select Required Only
          </button>
        </div>
      </div>

      {/* Asset Categories */}
      <div className="divide-y divide-gray-200">
        {COMPLIANCE_CATEGORIES.map((category) => {
          const categoryAssets = MASTER_COMPLIANCE_ASSETS.filter(asset => asset.category === category);
          const selectedInCategory = categoryAssets.filter(asset => selectedAssets.has(asset.id)).length;
          const isExpanded = expandedCategories.has(category);
          
          return (
            <div key={category} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center space-x-3 text-left hover:text-blue-600 focus:outline-none"
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{category}</h3>
                    <p className="text-sm text-gray-500">
                      {categoryAssets.length} compliance requirements
                    </p>
                  </div>
                </button>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {getCategoryStats(category)}
                    </div>
                    <div className="text-xs text-gray-500">Selected</div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => selectCategory(category, true)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => selectCategory(category, false)}
                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-3">
                  {categoryAssets.map((asset) => (
                    <AssetItem
                      key={asset.id}
                      asset={asset}
                      isSelected={selectedAssets.has(asset.id)}
                      onToggle={() => toggleAsset(asset.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Section */}
      <div className="px-6 py-6 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-medium text-gray-900">
              Total Assets Selected: {selectedAssets.size}
            </div>
            {submitMessage && (
              <div className={`mt-2 text-sm ${
                submitMessage.includes('Error') ? 'text-red-600' : 'text-green-600'
              }`}>
                {submitMessage}
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedAssets.size === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Configuring...' : 'Configure Compliance Assets'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AssetItemProps {
  asset: ComplianceAsset;
  isSelected: boolean;
  onToggle: () => void;
}

function AssetItem({ asset, isSelected, onToggle }: AssetItemProps) {
  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-900">{asset.title}</h4>
          {asset.is_required && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
              Required
            </span>
          )}
          {asset.legal_requirement && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
              Legal
            </span>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            asset.priority === 'urgent' ? 'bg-red-100 text-red-800' :
            asset.priority === 'high' ? 'bg-orange-100 text-orange-800' :
            asset.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {asset.priority.charAt(0).toUpperCase() + asset.priority.slice(1)}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mt-1">{asset.description}</p>
        
        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
          <span>Frequency: {asset.frequency_months} months</span>
          {asset.default_notes && (
            <span className="italic">{asset.default_notes}</span>
          )}
        </div>
      </div>
    </div>
  );
}
