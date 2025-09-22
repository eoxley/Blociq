'use client';

import { useState } from 'react';
import { X, Calendar, AlertTriangle, CheckCircle, Shield, Building, Clock, User } from 'lucide-react';

interface ComplianceConfirmationModalProps {
  analysisData: any;
  buildingId?: string;
  buildingName?: string;
  onConfirm: (buildingId: string) => void;
  onCancel: () => void;
  isVisible: boolean;
}

interface Building {
  id: string;
  name: string;
  address: string;
}

export default function ComplianceConfirmationModal({
  analysisData,
  buildingId,
  buildingName,
  onConfirm,
  onCancel,
  isVisible
}: ComplianceConfirmationModalProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingId || '');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Load buildings if not pre-selected
  const loadBuildings = async () => {
    if (buildings.length > 0) return;

    setLoadingBuildings(true);
    try {
      const response = await fetch('/api/buildings');
      if (response.ok) {
        const data = await response.json();
        setBuildings(data.buildings || []);
      }
    } catch (error) {
      console.error('Error loading buildings:', error);
    } finally {
      setLoadingBuildings(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedBuildingId) return;

    setIsConfirming(true);
    try {
      await onConfirm(selectedBuildingId);
    } finally {
      setIsConfirming(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status?.toLowerCase().includes('satisfactory')) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status?.toLowerCase().includes('unsatisfactory') || status?.toLowerCase().includes('attention')) {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    } else {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification?.toUpperCase()) {
      case 'C1': return 'bg-red-100 text-red-800 border-red-200';
      case 'C2': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'C3': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FI': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const urgentFindings = analysisData?.key_findings?.filter((finding: any) =>
    finding.classification === 'C1' || finding.classification === 'C2'
  ) || [];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel}></div>

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Create Compliance Asset</h2>
                  <p className="text-sm text-gray-500">Review analysis and confirm asset creation</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Analysis Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3">Analysis Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-blue-700">Document Type:</span>
                  <p className="text-blue-900">{analysisData?.document_type || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-blue-700">Status:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(analysisData?.compliance_status)}
                    <span className="text-blue-900">{analysisData?.compliance_status || 'Unknown'}</span>
                  </div>
                </div>
                {analysisData?.inspection_details?.inspection_date && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">Inspection Date:</span>
                    <p className="text-blue-900">
                      {new Date(analysisData.inspection_details.inspection_date).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                )}
                {analysisData?.inspection_details?.next_inspection_due && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">Next Due:</span>
                    <p className="text-blue-900">
                      {new Date(analysisData.inspection_details.next_inspection_due).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                )}
              </div>

              {analysisData?.inspection_details?.inspector_name && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <span className="text-sm font-medium text-blue-700">Inspector:</span>
                  <p className="text-blue-900 flex items-center mt-1">
                    <User className="h-4 w-4 mr-2" />
                    {analysisData.inspection_details.inspector_name}
                    {analysisData.inspection_details.inspector_company &&
                      ` (${analysisData.inspection_details.inspector_company})`
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Urgent Findings Alert */}
            {urgentFindings.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <h3 className="font-medium text-red-900">Urgent Findings Detected</h3>
                </div>
                <div className="space-y-2">
                  {urgentFindings.slice(0, 3).map((finding: any, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getClassificationColor(finding.classification)}`}>
                        {finding.classification}
                      </span>
                      <p className="text-sm text-red-800">{finding.observation || finding}</p>
                    </div>
                  ))}
                  {urgentFindings.length > 3 && (
                    <p className="text-sm text-red-600 mt-2">
                      And {urgentFindings.length - 3} more urgent finding(s)...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Building Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Building for Compliance Asset
              </label>

              {buildingName ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-900 font-medium">{buildingName}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    onFocus={loadBuildings}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingBuildings}
                  >
                    <option value="">Select a building...</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name} - {building.address}
                      </option>
                    ))}
                  </select>
                  {loadingBuildings && (
                    <p className="text-sm text-gray-500 mt-1">Loading buildings...</p>
                  )}
                </div>
              )}
            </div>

            {/* What Will Be Created */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-3">What will be created:</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Compliance asset record in building database</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Outlook calendar reminder for next inspection</span>
                </li>
                {urgentFindings.length > 0 && (
                  <li className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{urgentFindings.length} urgent finding alert(s)</span>
                  </li>
                )}
                <li className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Audit log entry for compliance tracking</span>
                </li>
              </ul>
            </div>

            {/* Confirmation Question */}
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Create compliance asset and calendar reminder?
              </h3>
              <p className="text-gray-600 mb-6">
                This will integrate the analysis into your building compliance system and set up automatic reminders.
              </p>

              <div className="flex space-x-4 justify-center">
                <button
                  onClick={onCancel}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedBuildingId || isConfirming}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isConfirming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm & Create
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}