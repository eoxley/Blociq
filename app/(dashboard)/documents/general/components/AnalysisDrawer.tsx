'use client';

import { useState, useEffect } from 'react';
import { DocumentJob } from '../GeneralLabClient';
import { X, Building, Home, Link, FileText, CheckCircle, Clock } from 'lucide-react';

interface AnalysisDrawerProps {
  job: DocumentJob;
  onClose: () => void;
  onAttachToBuilding: (jobId: string, buildingId: string, unitId?: string) => void;
  category: string;
}

interface Building {
  id: string;
  name: string;
  address: string;
}

interface Unit {
  id: string;
  unit_number: string;
  building_id: string;
}

export default function AnalysisDrawer({ job, onClose, onAttachToBuilding, category }: AnalysisDrawerProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [isAttaching, setIsAttaching] = useState(false);
  const [showAttachForm, setShowAttachForm] = useState(false);

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuilding) {
      fetchUnits(selectedBuilding);
    } else {
      setUnits([]);
      setSelectedUnit('');
    }
  }, [selectedBuilding]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      if (response.ok) {
        const data = await response.json();
        setBuildings(data.buildings || []);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchUnits = async (buildingId: string) => {
    try {
      const response = await fetch(`/api/buildings/${buildingId}/units`);
      if (response.ok) {
        const data = await response.json();
        setUnits(data.units || []);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const handleAttach = async () => {
    if (!selectedBuilding) return;

    setIsAttaching(true);
    try {
      await onAttachToBuilding(job.id, selectedBuilding, selectedUnit || undefined);
    } finally {
      setIsAttaching(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderSummaryContent = () => {
    if (!job.summary_json) {
      return (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">No analysis available</p>
        </div>
      );
    }

    const summary = typeof job.summary_json === 'string'
      ? JSON.parse(job.summary_json)
      : job.summary_json;

    return (
      <div className="space-y-6">
        {summary.document_type && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Document Type</h4>
            <p className="text-gray-700">{summary.document_type}</p>
          </div>
        )}

        {summary.key_topics && summary.key_topics.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Key Topics</h4>
            <div className="flex flex-wrap gap-2">
              {summary.key_topics.map((topic: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {summary.key_points && summary.key_points.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Key Points</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {summary.key_points.map((point: string, index: number) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.action_items && summary.action_items.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Action Items</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {summary.action_items.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.date_mentioned && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Date Mentioned</h4>
            <p className="text-gray-700">{new Date(summary.date_mentioned).toLocaleDateString('en-GB')}</p>
          </div>
        )}

        {summary.participants && summary.participants.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Participants</h4>
            <div className="flex flex-wrap gap-2">
              {summary.participants.map((participant: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {participant}
                </span>
              ))}
            </div>
          </div>
        )}

        {summary.summary && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{summary.summary}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Document Analysis</h2>
                  <p className="text-sm text-gray-500 truncate max-w-md">{job.filename}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Document Info */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Document Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">File Size</span>
                  <span className="text-sm text-gray-900">{formatFileSize(job.size_bytes)}</span>
                </div>
                {job.page_count && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Pages</span>
                    <span className="text-sm text-gray-900">{job.page_count}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Uploaded</span>
                  <span className="text-sm text-gray-900">{formatDate(job.created_at)}</span>
                </div>
                {job.doc_type_guess && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Document Type</span>
                    <span className="text-sm text-gray-900">{job.doc_type_guess}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Results */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Results</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {renderSummaryContent()}
              </div>
            </div>

            {/* Attach to Building */}
            {!job.linked_building_id && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Attach to Building</h3>
                  <button
                    onClick={() => setShowAttachForm(!showAttachForm)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Link className="h-4 w-4 mr-1" />
                    {showAttachForm ? 'Cancel' : 'Attach'}
                  </button>
                </div>

                {showAttachForm && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Building
                      </label>
                      <select
                        value={selectedBuilding}
                        onChange={(e) => setSelectedBuilding(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a building</option>
                        {buildings.map((building) => (
                          <option key={building.id} value={building.id}>
                            {building.name} - {building.address}
                          </option>
                        ))}
                      </select>
                    </div>

                    {units.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit (Optional)
                        </label>
                        <select
                          value={selectedUnit}
                          onChange={(e) => setSelectedUnit(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a unit (optional)</option>
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              Unit {unit.unit_number}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      onClick={handleAttach}
                      disabled={!selectedBuilding || isAttaching}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isAttaching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Attaching...
                        </>
                      ) : (
                        <>
                          <Building className="h-4 w-4 mr-2" />
                          Attach to Building
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {job.linked_building_id && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-800">Attached to building</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}