'use client';

import { useState } from 'react';
import { X, FileText, Building2, DollarSign, Calendar, User, CheckCircle, AlertTriangle } from 'lucide-react';
import { DocumentJob } from '../MajorWorksLabClient';

interface AnalysisDrawerProps {
  job: DocumentJob;
  onClose: () => void;
  onAttachToBuilding: (jobId: string, buildingId: string, unitId?: string) => void;
  category: string;
}

export default function AnalysisDrawer({ job, onClose, onAttachToBuilding, category }: AnalysisDrawerProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState('');

  const analysis = job.summary_json || {};

  const handleAttach = () => {
    if (selectedBuildingId) {
      onAttachToBuilding(job.id, selectedBuildingId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
      <div className="bg-white h-full w-full max-w-2xl shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Document Analysis</h2>
              <p className="text-sm text-gray-500">{job.filename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Document Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Document Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">File Size:</span>
                <span className="ml-2 font-medium">{(job.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div>
                <span className="text-gray-500">Pages:</span>
                <span className="ml-2 font-medium">{job.page_count || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-gray-500">Type:</span>
                <span className="ml-2 font-medium">{job.doc_type_guess || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-gray-500">Uploaded:</span>
                <span className="ml-2 font-medium">{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          {analysis && Object.keys(analysis).length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Analysis Results</h3>

              {/* Project Details */}
              {analysis.project && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-600" />
                    Project Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    {analysis.project.name && (
                      <div>
                        <span className="text-gray-500">Project Name:</span>
                        <span className="ml-2 font-medium">{analysis.project.name}</span>
                      </div>
                    )}
                    {analysis.project.description && (
                      <div>
                        <span className="text-gray-500">Description:</span>
                        <span className="ml-2">{analysis.project.description}</span>
                      </div>
                    )}
                    {analysis.project.value && (
                      <div>
                        <span className="text-gray-500">Value:</span>
                        <span className="ml-2 font-medium text-green-600">{analysis.project.value}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contract Details */}
              {analysis.contract && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600" />
                    Contract Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    {analysis.contract.contractor && (
                      <div>
                        <span className="text-gray-500">Contractor:</span>
                        <span className="ml-2 font-medium">{analysis.contract.contractor}</span>
                      </div>
                    )}
                    {analysis.contract.start_date && (
                      <div>
                        <span className="text-gray-500">Start Date:</span>
                        <span className="ml-2">{analysis.contract.start_date}</span>
                      </div>
                    )}
                    {analysis.contract.completion_date && (
                      <div>
                        <span className="text-gray-500">Completion Date:</span>
                        <span className="ml-2">{analysis.contract.completion_date}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Key Points */}
              {analysis.key_points && analysis.key_points.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Key Points
                  </h4>
                  <ul className="space-y-2">
                    {analysis.key_points.map((point: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-orange-600 mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-amber-600 mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Pending</h3>
              <p className="text-gray-500">Detailed analysis will appear here once processing is complete.</p>
            </div>
          )}

          {/* Attach to Building */}
          {!job.linked_building_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Attach to Building</h4>
              <p className="text-sm text-blue-800 mb-3">
                Link this document to a specific building for better organization.
              </p>
              <div className="flex items-center gap-3">
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a building...</option>
                  {/* Buildings would be populated from API */}
                </select>
                <button
                  onClick={handleAttach}
                  disabled={!selectedBuildingId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Attach
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}