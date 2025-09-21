/**
 * Golden Thread - Building Safety Act Compliance Logging
 * Ensures full audit trail for HRB (Higher Risk Buildings) compliance
 */

import { BSAAnalysisResult, BSAComplianceStatus } from './bsa-analyzers';

export interface GoldenThreadEntry {
  id?: string;
  building_id: string;
  document_id?: string;
  compliance_asset_id?: string;

  // BSA Classification
  document_type: string;
  compliance_status: BSAComplianceStatus;
  risk_level: 'intolerable' | 'tolerable' | 'broadly_acceptable' | 'unknown';

  // Audit Trail
  action_type: 'document_upload' | 'status_change' | 'manual_override' | 'expiry_alert' | 'remedial_action';
  original_filename: string;
  file_path?: string;

  // AI Processing
  ai_extraction_raw: any; // Full AI response
  ai_summary: string;
  ai_confidence: number;
  ocr_source: string;

  // Human Review
  user_confirmed: boolean;
  user_override?: {
    original_status: BSAComplianceStatus;
    override_status: BSAComplianceStatus;
    override_reason: string;
    override_by: string;
  };

  // Dates
  inspection_date?: string;
  next_due_date?: string;
  date_uploaded: string;
  created_at?: string;
  created_by: string;

  // BSA Metadata
  is_golden_thread: boolean;
  safety_case_linked: boolean;
  regulator_notified?: boolean;

  // Findings
  findings: string[];
  actions_required?: string[];
  contractor_details?: string;

  // Compliance History
  previous_status?: BSAComplianceStatus;
  status_change_reason?: string;
}

export interface ComplianceLogCreate {
  building_id: string;
  document_id?: string;
  building_compliance_asset_id?: string;

  // Document Info
  document_type: string;
  original_filename: string;
  file_path?: string;

  // Analysis Results
  bsa_analysis: BSAAnalysisResult;
  ai_summary: any;
  extracted_text: string;
  ocr_source: string;

  // User Context
  user_id: string;
  user_confirmed?: boolean;
  user_override?: any;

  // Building Context
  is_hrb: boolean;
  building_name?: string;
}

/**
 * Create Golden Thread compliance log entry
 */
export function createGoldenThreadEntry(data: ComplianceLogCreate): GoldenThreadEntry {
  const now = new Date().toISOString();

  return {
    building_id: data.building_id,
    document_id: data.document_id,
    compliance_asset_id: data.building_compliance_asset_id,

    // BSA Classification
    document_type: data.document_type,
    compliance_status: data.bsa_analysis.status,
    risk_level: data.bsa_analysis.riskLevel,

    // Audit Trail
    action_type: 'document_upload',
    original_filename: data.original_filename,
    file_path: data.file_path,

    // AI Processing
    ai_extraction_raw: {
      bsa_analysis: data.bsa_analysis,
      ai_summary: data.ai_summary,
      extracted_text_preview: data.extracted_text.substring(0, 1000),
      full_text_length: data.extracted_text.length
    },
    ai_summary: data.ai_summary.summary || 'AI analysis completed',
    ai_confidence: data.ai_summary.confidence || 0,
    ocr_source: data.ocr_source,

    // Human Review
    user_confirmed: data.user_confirmed || false,
    user_override: data.user_override,

    // Dates
    inspection_date: data.ai_summary.inspection_date,
    next_due_date: data.ai_summary.next_due_date,
    date_uploaded: now,
    created_at: now,
    created_by: data.user_id,

    // BSA Metadata
    is_golden_thread: data.is_hrb, // HRB buildings require Golden Thread
    safety_case_linked: data.is_hrb && ['fra', 'fraew', 'fire risk assessment'].includes(data.document_type.toLowerCase()),
    regulator_notified: data.bsa_analysis.riskLevel === 'intolerable',

    // Findings
    findings: data.bsa_analysis.findings,
    actions_required: data.bsa_analysis.complianceDetails.urgentActions || [],
    contractor_details: data.ai_summary.contractor_name,

    // Status tracking
    previous_status: undefined, // First entry
    status_change_reason: 'Initial document upload and analysis'
  };
}

/**
 * Generate BSA compliance report summary
 */
export function generateBSAReport(entry: GoldenThreadEntry): string {
  const report = [
    `=== BUILDING SAFETY ACT COMPLIANCE RECORD ===`,
    `Document: ${entry.original_filename}`,
    `Type: ${entry.document_type}`,
    `Status: ${entry.compliance_status.toUpperCase()}`,
    `Risk Level: ${entry.risk_level.toUpperCase()}`,
    ``,
    `Inspection Date: ${entry.inspection_date || 'Not specified'}`,
    `Next Due: ${entry.next_due_date || 'Not specified'}`,
    ``,
    `FINDINGS:`,
    ...entry.findings.map(f => `• ${f}`),
    ``,
    `AI Confidence: ${entry.ai_confidence}%`,
    `OCR Source: ${entry.ocr_source}`,
    `User Confirmed: ${entry.user_confirmed ? 'Yes' : 'Pending'}`,
    ``
  ];

  if (entry.is_golden_thread) {
    report.push(`🔗 GOLDEN THREAD: This record is part of the Building Safety Act Golden Thread of information`);
  }

  if (entry.regulator_notified) {
    report.push(`⚠️ REGULATOR ALERT: Intolerable risk detected - consider regulatory notification`);
  }

  if (entry.actions_required && entry.actions_required.length > 0) {
    report.push(``, `ACTIONS REQUIRED:`, ...entry.actions_required.map(a => `• ${a}`));
  }

  return report.join('\n');
}

/**
 * Check if building is HRB (Higher Risk Building) under BSA
 */
export function isHigherRiskBuilding(building: any): boolean {
  // BSA HRB criteria:
  // - 18m+ or 7+ storeys residential
  // - Care homes
  // - Hospitals
  // - Schools

  if (!building) return false;

  const floors = parseInt(building.total_floors) || 0;
  const buildingType = building.building_type?.toLowerCase() || '';

  return (
    floors >= 7 || // 7+ storeys
    buildingType.includes('care home') ||
    buildingType.includes('hospital') ||
    buildingType.includes('residential') && floors >= 7 ||
    building.is_hrb === true // Explicitly marked as HRB
  );
}

/**
 * Generate Outlook calendar reminder for next due date
 */
export function generateOutlookReminder(
  documentType: string,
  buildingName: string,
  nextDueDate: string,
  complianceStatus: BSAComplianceStatus
): any {
  const dueDate = new Date(nextDueDate);
  const reminderDate = new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before

  const priority = complianceStatus === 'expired' ? 'high' : 'normal';
  const urgency = complianceStatus === 'expired' ? 'URGENT: ' : '';

  return {
    subject: `${urgency}${documentType} Due - ${buildingName}`,
    body: `
      Building Safety Act Compliance Reminder

      Building: ${buildingName}
      Document Type: ${documentType}
      Due Date: ${dueDate.toLocaleDateString('en-GB')}
      Current Status: ${complianceStatus}

      ${complianceStatus === 'expired'
        ? '⚠️ URGENT: This compliance document has EXPIRED and requires immediate renewal.'
        : '📅 This compliance document is due for renewal soon.'}

      Please arrange for inspection/testing to maintain Building Safety Act compliance.

      Generated by BlocIQ Compliance System
    `,
    start: reminderDate.toISOString(),
    end: new Date(reminderDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
    importance: priority,
    categories: ['Building Safety Act', 'Compliance', documentType],
    isReminderOn: true,
    reminderMinutesBeforeStart: 60
  };
}