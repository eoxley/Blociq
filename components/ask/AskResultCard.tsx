'use client';
import React from 'react';
import { FileText } from 'lucide-react';

interface SuggestedAction {
  key: string;
  label: string;
  icon?: string;
  action?: string;
}

interface UploadResult {
  success: boolean;
  summary: string;
  suggestedActions: SuggestedAction[];
  documentType?: string;
  leaseDetails?: {
    propertyAddress?: string;
    landlord?: string;
    tenant?: string;
    leaseStartDate?: string;
    leaseEndDate?: string;
    leaseTerm?: string;
    premium?: string;
    initialRent?: string;
    serviceCharge?: string;
    serviceChargePercentage?: string;
    buildingType?: string;
  };
  complianceChecklist?: {
    item: string;
    status: 'Y' | 'N' | 'Unknown';
    details?: string;
  }[];
  financialObligations?: string[];
  keyRights?: string[];
  restrictions?: string[];
  context: {
    buildingId: string | null;
    buildingStatus: 'matched' | 'not_found' | 'missing';
    filename: string;
    bytes: number;
    mime: string;
  };
}

interface AskResultCardProps {
  data: UploadResult;
}

export function AskResultCard({ data }: AskResultCardProps) {
  const unassigned = !data?.context?.buildingId || data?.context?.buildingStatus !== 'matched';
  

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'not_found':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'missing':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'matched':
        return 'Building Linked';
      case 'not_found':
        return 'Building Not Found';
      case 'missing':
        return 'Unassigned';
      default:
        return 'Unknown';
    }
  };


  if (!data?.success) {
    return null;
  }

  return (
    <div className="mt-6 p-6 rounded-2xl border border-gray-200 shadow-sm bg-white">
      {/* Header with status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Document Analysis</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(data.context.buildingStatus)}`}>
            {getStatusText(data.context.buildingStatus)}
          </span>
          {unassigned && (
            <span className="text-xs px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
              Unassigned
            </span>
          )}
        </div>
      </div>

      {/* File info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="font-medium">{data.context.filename}</span>
          <span>{(data.context.bytes / 1024 / 1024).toFixed(2)} MB</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Type: {data.context.mime}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Summary</h4>
        <div className="p-4 bg-blue-50 rounded-lg">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
            {data.summary}
          </pre>
        </div>
      </div>

      {/* Lease-specific sections */}
      {data.documentType === 'lease' && (
        <>
          {/* Property Details */}
          {data.leaseDetails && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Property Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                {data.leaseDetails.propertyAddress && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Property Address</span>
                    <p className="text-sm text-gray-800">{data.leaseDetails.propertyAddress}</p>
                  </div>
                )}
                {data.leaseDetails.buildingType && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Property Type</span>
                    <p className="text-sm text-gray-800">{data.leaseDetails.buildingType}</p>
                  </div>
                )}
                {data.leaseDetails.landlord && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Landlord</span>
                    <p className="text-sm text-gray-800">{data.leaseDetails.landlord}</p>
                  </div>
                )}
                {data.leaseDetails.tenant && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Tenant</span>
                    <p className="text-sm text-gray-800">{data.leaseDetails.tenant}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lease Terms */}
          {data.leaseDetails && (data.leaseDetails.leaseStartDate || data.leaseDetails.leaseEndDate || data.leaseDetails.leaseTerm) && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Lease Terms</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-purple-50 rounded-lg">
                {data.leaseDetails.leaseStartDate && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Start Date</span>
                    <p className="text-sm text-gray-800">{data.leaseDetails.leaseStartDate}</p>
                  </div>
                )}
                {data.leaseDetails.leaseEndDate && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">End Date</span>
                    <p className="text-sm text-gray-800">{data.leaseDetails.leaseEndDate}</p>
                  </div>
                )}
                {data.leaseDetails.leaseTerm && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Lease Term</span>
                    <p className="text-sm text-gray-800">{data.leaseDetails.leaseTerm}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financial Summary */}
          {data.leaseDetails && (data.leaseDetails.premium || data.leaseDetails.initialRent || data.leaseDetails.serviceCharge) && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Financial Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-yellow-50 rounded-lg">
                {data.leaseDetails.premium && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Premium</span>
                    <p className="text-sm font-semibold text-gray-800">{data.leaseDetails.premium}</p>
                  </div>
                )}
                {data.leaseDetails.initialRent && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Annual Rent</span>
                    <p className="text-sm font-semibold text-gray-800">{data.leaseDetails.initialRent}</p>
                  </div>
                )}
                {data.leaseDetails.serviceCharge && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Service Charge</span>
                    <p className="text-sm font-semibold text-gray-800">{data.leaseDetails.serviceCharge}</p>
                  </div>
                )}
                {data.leaseDetails.serviceChargePercentage && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Service Charge %</span>
                    <p className="text-sm font-semibold text-gray-800">{data.leaseDetails.serviceChargePercentage}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compliance Checklist */}
          {data.complianceChecklist && data.complianceChecklist.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Compliance Checklist</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  {data.complianceChecklist.map((item, index) => (
                    <div key={index} className="flex items-start justify-between py-2 border-b border-gray-200 last:border-b-0">
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 font-medium">{item.item}</p>
                        {item.details && (
                          <p className="text-xs text-gray-600 mt-1">{item.details}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          item.status === 'Y' 
                            ? 'bg-green-100 text-green-700' 
                            : item.status === 'N'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status === 'Y' ? 'Yes' : item.status === 'N' ? 'No' : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Key Rights */}
          {data.keyRights && data.keyRights.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Key Rights</h4>
              <div className="p-4 bg-blue-50 rounded-lg">
                <ul className="text-sm text-gray-800 space-y-1">
                  {data.keyRights.map((right, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>{right}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Restrictions */}
          {data.restrictions && data.restrictions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Restrictions</h4>
              <div className="p-4 bg-red-50 rounded-lg">
                <ul className="text-sm text-gray-800 space-y-1">
                  {data.restrictions.map((restriction, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span>{restriction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}


      {/* Context info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Building ID: {data.context.buildingId || 'None'}</span>
            <span>Status: {data.context.buildingStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
