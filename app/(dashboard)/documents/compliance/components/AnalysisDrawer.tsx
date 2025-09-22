'use client';

import { useState, useEffect } from 'react';
import { DocumentJob } from '../ComplianceLabClient';
import { X, Building, Home, Link, Shield, AlertTriangle, CheckCircle, Clock, FileText, Sparkles } from 'lucide-react';
import ComplianceConfirmationModal from './ComplianceConfirmationModal';
import { toast } from 'sonner';

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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [complianceAssetCreated, setComplianceAssetCreated] = useState(false);

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

  const handleCreateComplianceAsset = () => {
    setShowConfirmationModal(true);
  };

  const handleConfirmCompliance = async (buildingId: string) => {
    try {
      const summary = typeof job.summary_json === 'string'
        ? JSON.parse(job.summary_json)
        : job.summary_json;

      // Use unified confirmation endpoint
      const response = await fetch('/api/documents/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: job.id,
          building_id: buildingId,
          analysis_results: summary,
          confirmed: true,
          classification: { category }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setComplianceAssetCreated(true);
        setShowConfirmationModal(false);

        // Category-specific success messages
        let successMessage = '';
        switch (result.category) {
          case 'compliance':
            successMessage = `Compliance asset created successfully! ${result.urgent_findings_count > 0 ?
              `${result.urgent_findings_count} urgent finding alert(s) created.` : ''} ${result.outlook_event_created ?
              'Outlook reminder set.' : ''}`;
            break;
          case 'major_works':
            successMessage = `Major works project created successfully! Stage: ${result.stage || 'Unknown'}`;
            break;
          case 'general':
            successMessage = 'Document filed successfully!';
            break;
          default:
            successMessage = 'Document processed successfully!';
        }

        toast.success(successMessage);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to process ${category} document`);
      }
    } catch (error) {
      console.error(`Error processing ${category} document:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to process ${category} document`);
    }
  };

  const handleCancelCompliance = async () => {
    try {
      const summary = typeof job.summary_json === 'string'
        ? JSON.parse(job.summary_json)
        : job.summary_json;

      // Log the declined action using unified endpoint
      await fetch('/api/documents/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: job.id,
          building_id: null,
          analysis_results: summary,
          confirmed: false,
          classification: { category }
        })
      });

      setShowConfirmationModal(false);

      // Category-specific decline messages
      const declineMessage = category === 'compliance' ? 'Compliance asset creation declined' :
                           category === 'major_works' ? 'Major works project creation declined' :
                           'Document processing declined';

      toast.info(declineMessage);
    } catch (error) {
      console.error('Error logging declined action:', error);
      setShowConfirmationModal(false);
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

  const getClassificationColor = (classification: string) => {
    switch (classification?.toUpperCase()) {
      case 'C1': return 'text-red-600 bg-red-50 border-red-200';
      case 'C2': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'C3': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'FI': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Major Works specific renderer
  const renderMajorWorksContent = () => {
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
        {/* Document Type & Stage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.document_type && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Document Type</h4>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {summary.document_type}
              </span>
            </div>
          )}

          {summary.stage && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Stage</h4>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                {summary.stage}
              </span>
            </div>
          )}
        </div>

        {/* Project Description */}
        {summary.project_description && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Project Description</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.project_description.scope_of_works && (
                <p className="text-sm"><strong>Scope of Works:</strong> {summary.project_description.scope_of_works}</p>
              )}
              {summary.project_description.reason_for_works && (
                <p className="text-sm"><strong>Reason:</strong> {summary.project_description.reason_for_works}</p>
              )}
              {summary.project_description.urgency_level && (
                <p className="text-sm"><strong>Urgency:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    summary.project_description.urgency_level === 'urgent' ? 'bg-red-100 text-red-800' :
                    summary.project_description.urgency_level === 'standard' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {summary.project_description.urgency_level}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Consultation Details */}
        {summary.consultation_details && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Consultation Details</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.consultation_details.consultation_period_start && (
                <p className="text-sm"><strong>Consultation Start:</strong> {new Date(summary.consultation_details.consultation_period_start).toLocaleDateString('en-GB')}</p>
              )}
              {summary.consultation_details.consultation_period_end && (
                <p className="text-sm"><strong>Consultation End:</strong> {new Date(summary.consultation_details.consultation_period_end).toLocaleDateString('en-GB')}</p>
              )}
              {summary.consultation_details.consultation_type && (
                <p className="text-sm"><strong>Type:</strong> {summary.consultation_details.consultation_type}</p>
              )}
              {summary.consultation_details.leaseholder_count && (
                <p className="text-sm"><strong>Leaseholders:</strong> {summary.consultation_details.leaseholder_count}</p>
              )}
            </div>
          </div>
        )}

        {/* Financial Details */}
        {summary.financial_details && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Financial Details</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.financial_details.estimated_cost && (
                <p className="text-sm"><strong>Estimated Cost:</strong> £{summary.financial_details.estimated_cost.toLocaleString()}</p>
              )}
              {summary.financial_details.cost_per_unit && (
                <p className="text-sm"><strong>Cost per Unit:</strong> £{summary.financial_details.cost_per_unit.toLocaleString()}</p>
              )}
              {summary.financial_details.service_charge_implications && (
                <p className="text-sm"><strong>Service Charge Impact:</strong> {summary.financial_details.service_charge_implications}</p>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        {summary.timeline && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.timeline.works_start_date && (
                <p className="text-sm"><strong>Works Start:</strong> {new Date(summary.timeline.works_start_date).toLocaleDateString('en-GB')}</p>
              )}
              {summary.timeline.estimated_completion && (
                <p className="text-sm"><strong>Estimated Completion:</strong> {new Date(summary.timeline.estimated_completion).toLocaleDateString('en-GB')}</p>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        {summary.summary && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900 whitespace-pre-wrap">{summary.summary}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // General Documents specific renderer
  const renderGeneralContent = () => {
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
        {/* Document Type & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.document_type && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Document Type</h4>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {summary.document_type}
              </span>
            </div>
          )}

          {summary.document_category && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Category</h4>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {summary.document_category}
              </span>
            </div>
          )}
        </div>

        {/* Correspondence Details */}
        {summary.correspondence_details && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Correspondence Details</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.correspondence_details.subject_matter && (
                <p className="text-sm"><strong>Subject Matter:</strong> {summary.correspondence_details.subject_matter}</p>
              )}
              {summary.correspondence_details.urgency_level && (
                <p className="text-sm"><strong>Urgency:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    summary.correspondence_details.urgency_level === 'urgent' ? 'bg-red-100 text-red-800' :
                    summary.correspondence_details.urgency_level === 'standard' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {summary.correspondence_details.urgency_level}
                  </span>
                </p>
              )}
              {summary.correspondence_details.response_required && (
                <p className="text-sm"><strong>Response Required:</strong> Yes</p>
              )}
            </div>
          </div>
        )}

        {/* Meeting Information */}
        {summary.meeting_information && summary.meeting_information.meeting_type && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Meeting Information</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-sm"><strong>Meeting Type:</strong> {summary.meeting_information.meeting_type}</p>
              {summary.meeting_information.meeting_date && (
                <p className="text-sm"><strong>Date:</strong> {new Date(summary.meeting_information.meeting_date).toLocaleDateString('en-GB')}</p>
              )}
              {summary.meeting_information.key_decisions && summary.meeting_information.key_decisions.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Key Decisions:</p>
                  <ul className="list-disc list-inside text-xs text-gray-600 ml-2">
                    {summary.meeting_information.key_decisions.map((decision: string, index: number) => (
                      <li key={index}>{decision}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Information */}
        {summary.financial_information && summary.financial_information.amounts_mentioned && summary.financial_information.amounts_mentioned.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Financial Information</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.financial_information.amounts_mentioned.map((amount: any, index: number) => (
                <p key={index} className="text-sm">
                  <strong>{amount.description}:</strong> {amount.currency === 'GBP' ? '£' : ''}{amount.amount?.toLocaleString() || 'N/A'}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Key Issues */}
        {summary.key_issues && summary.key_issues.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Key Issues</h4>
            <div className="space-y-2">
              {summary.key_issues.map((issue: string, index: number) => (
                <div key={index} className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                  <p className="text-sm text-yellow-900">{issue}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {summary.recommended_actions && summary.recommended_actions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Recommended Actions</h4>
            <div className="space-y-2">
              {summary.recommended_actions.map((action: string, index: number) => (
                <div key={index} className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                  <p className="text-sm text-blue-900">{action}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {summary.summary && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900 whitespace-pre-wrap">{summary.summary}</p>
            </div>
          </div>
        )}
      </div>
    );
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
        {/* Document Type & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.document_type && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Document Type</h4>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {summary.document_type}
              </span>
            </div>
          )}

          {summary.compliance_status && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Compliance Status</h4>
              <div className="flex items-center space-x-2">
                {summary.compliance_status === 'satisfactory' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : summary.compliance_status === 'unsatisfactory' ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-500" />
                )}
                <span className="capitalize text-gray-700 font-medium">{summary.compliance_status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Property Details */}
        {summary.property_details && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Property Details</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.property_details.address && (
                <p className="text-sm"><strong>Address:</strong> {summary.property_details.address}</p>
              )}
              {summary.property_details.description && (
                <p className="text-sm"><strong>Description:</strong> {summary.property_details.description}</p>
              )}
              {summary.property_details.client_details && (
                <p className="text-sm"><strong>Client:</strong> {summary.property_details.client_details}</p>
              )}
            </div>
          </div>
        )}

        {/* Inspection Details */}
        {summary.inspection_details && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Inspection Details</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.inspection_details.inspection_date && (
                <p className="text-sm"><strong>Inspection Date:</strong> {new Date(summary.inspection_details.inspection_date).toLocaleDateString('en-GB')}</p>
              )}
              {summary.inspection_details.next_inspection_due && (
                <p className="text-sm"><strong>Next Inspection Due:</strong> {new Date(summary.inspection_details.next_inspection_due).toLocaleDateString('en-GB')}</p>
              )}
              {summary.inspection_details.inspector_name && (
                <p className="text-sm"><strong>Inspector:</strong> {summary.inspection_details.inspector_name}</p>
              )}
              {summary.inspection_details.inspector_company && (
                <p className="text-sm"><strong>Company:</strong> {summary.inspection_details.inspector_company}</p>
              )}
              {summary.inspection_details.certificate_number && (
                <p className="text-sm"><strong>Certificate Number:</strong> {summary.inspection_details.certificate_number}</p>
              )}
            </div>
          </div>
        )}

        {/* Key Findings */}
        {summary.key_findings && summary.key_findings.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Key Findings</h4>
            <div className="space-y-3">
              {summary.key_findings.map((finding: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  {typeof finding === 'object' ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getClassificationColor(finding.classification)}`}>
                          {finding.classification}
                        </span>
                        {finding.priority && (
                          <span className="text-xs text-gray-500 uppercase font-medium">{finding.priority}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">{finding.observation}</p>
                      {finding.location && <p className="text-xs text-gray-600 mb-1">Location: {finding.location}</p>}
                      {finding.action_required && <p className="text-xs text-gray-700">Action: {finding.action_required}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">{finding}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Results (for EICR) */}
        {summary.test_results && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Test Results</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.test_results.overall_condition && (
                <p className="text-sm"><strong>Overall Condition:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    summary.test_results.overall_condition === 'satisfactory'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {summary.test_results.overall_condition}
                  </span>
                </p>
              )}
              {summary.test_results.insulation_resistance && (
                <p className="text-sm"><strong>Insulation Resistance:</strong> {summary.test_results.insulation_resistance}</p>
              )}
              {summary.test_results.earth_fault_readings && (
                <p className="text-sm"><strong>Earth Fault Readings:</strong> {summary.test_results.earth_fault_readings}</p>
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {summary.recommendations && summary.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
            <div className="space-y-3">
              {summary.recommendations.map((rec: any, index: number) => (
                <div key={index} className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                  {typeof rec === 'object' ? (
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">{rec.action}</p>
                      {rec.reason && <p className="text-xs text-blue-700 mb-1">Reason: {rec.reason}</p>}
                      {rec.timeframe && <p className="text-xs text-blue-600">Timeframe: {rec.timeframe}</p>}
                      {rec.regulation_reference && (
                        <p className="text-xs text-blue-600 mt-1">Reference: {rec.regulation_reference}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-blue-900">{rec}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Assessment */}
        {summary.risk_assessment && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Risk Assessment</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.risk_assessment.overall_risk && (
                <p className="text-sm"><strong>Overall Risk:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getClassificationColor(summary.risk_assessment.overall_risk)}`}>
                    {summary.risk_assessment.overall_risk.toUpperCase()}
                  </span>
                </p>
              )}
              {summary.risk_assessment.immediate_hazards && summary.risk_assessment.immediate_hazards.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-700 mb-1">Immediate Hazards:</p>
                  <ul className="list-disc list-inside text-xs text-red-600 ml-2">
                    {summary.risk_assessment.immediate_hazards.map((hazard: string, index: number) => (
                      <li key={index}>{hazard}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regulatory Compliance */}
        {summary.regulatory_compliance && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Regulatory Compliance</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {summary.regulatory_compliance.meets_current_standards !== undefined && (
                <p className="text-sm"><strong>Meets Current Standards:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    summary.regulatory_compliance.meets_current_standards
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {summary.regulatory_compliance.meets_current_standards ? 'Yes' : 'No'}
                  </span>
                </p>
              )}
              {summary.regulatory_compliance.relevant_regulations && (
                <p className="text-sm"><strong>Relevant Regulations:</strong> {summary.regulatory_compliance.relevant_regulations.join(', ')}</p>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        {summary.summary && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 whitespace-pre-wrap">{summary.summary}</p>
            </div>
          </div>
        )}

        {/* Legacy format support */}
        {summary.key_findings && typeof summary.key_findings[0] === 'string' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Key Findings (Legacy)</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {summary.key_findings.map((finding: string, index: number) => (
                <li key={index}>{finding}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.expiry_date && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Expiry Date</h4>
            <p className="text-gray-700">{new Date(summary.expiry_date).toLocaleDateString('en-GB')}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl h-full bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                  {category === 'compliance' ? 'Compliance Analysis' :
                   category === 'major_works' ? 'Major Works Analysis' :
                   'Document Analysis'}
                </h2>
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
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {/* Document Info */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Document Information</h3>
              <div className="bg-white rounded-lg p-4 space-y-3 shadow-sm border border-gray-200">
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Analysis Results</h3>
                {job.status === 'READY' && !complianceAssetCreated && (
                  <button
                    onClick={handleCreateComplianceAsset}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {category === 'compliance' ? 'Create Asset' :
                     category === 'major_works' ? 'Create Project' :
                     'File Document'}
                  </button>
                )}
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                {category === 'compliance' ? renderSummaryContent() :
                 category === 'major_works' ? renderMajorWorksContent() :
                 renderGeneralContent()}
              </div>

              {complianceAssetCreated && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-green-800 font-medium">
                      {category === 'compliance' ? 'Compliance asset created successfully' :
                       category === 'major_works' ? 'Major works project created successfully' :
                       'Document filed successfully'}
                    </span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    {category === 'compliance' ? 'Building compliance tracking and Outlook reminders have been set up.' :
                     category === 'major_works' ? 'Project tracking and consultation management have been set up.' :
                     'Document has been processed and filed for reference.'}
                  </p>
                </div>
              )}
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

      {/* Compliance Confirmation Modal */}
      <ComplianceConfirmationModal
        analysisData={job.summary_json ? (typeof job.summary_json === 'string' ? JSON.parse(job.summary_json) : job.summary_json) : null}
        buildingId={job.linked_building_id}
        buildingName={job.linked_building_id ? buildings.find(b => b.id === job.linked_building_id)?.name : undefined}
        onConfirm={handleConfirmCompliance}
        onCancel={handleCancelCompliance}
        isVisible={showConfirmationModal}
      />
    </div>
  );
}