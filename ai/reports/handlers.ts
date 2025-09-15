/**
 * Report Handlers for Ask BlocIQ
 * Implements specific report generation logic
 */

import { ReportIntent } from '../intent/report';
import { ReportHandler, ReportResult, registerReportHandler } from './registry';
import { createClient } from '@/lib/supabase/server';
import { formatPeriod, generateReportTitle, getBuildingContext, getUnitContext } from './engine';

/**
 * Compliance Overview Handler
 */
async function complianceOverviewHandler(intent: ReportIntent, agencyId: string): Promise<ReportResult> {
  const supabase = await createClient();
  
  let query = supabase
    .from('building_compliance_status_v')
    .select(`
      building_id,
      asset_key,
      status,
      last_inspected_at,
      next_due_date,
      days_overdue,
      days_until_due
    `)
    .eq('agency_id', agencyId);
  
  if (intent.buildingId) {
    query = query.eq('building_id', intent.buildingId);
  }
  
  if (intent.period.until) {
    query = query.gte('next_due_date', intent.period.since).lte('next_due_date', intent.period.until);
  } else {
    query = query.gte('next_due_date', intent.period.since);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch compliance data: ${error.message}`);
  }
  
  // Get building context if building-specific
  let buildingContext = null;
  if (intent.buildingId) {
    buildingContext = await getBuildingContext(intent.buildingId, agencyId);
  }
  
  // Format data
  const columns = ['Building', 'Asset', 'Status', 'Last Inspected', 'Next Due', 'Days Overdue/Until'];
  const rows = (data || []).map(row => ({
    Building: buildingContext?.buildingName || row.building_id,
    Asset: row.asset_key,
    Status: row.status,
    'Last Inspected': row.last_inspected_at ? new Date(row.last_inspected_at).toLocaleDateString('en-GB') : 'N/A',
    'Next Due': row.next_due_date ? new Date(row.next_due_date).toLocaleDateString('en-GB') : 'N/A',
    'Days Overdue/Until': row.days_overdue > 0 ? `-${row.days_overdue}` : `+${row.days_until_due}`
  }));
  
  const title = generateReportTitle('Compliance Overview', intent.scope, buildingContext?.buildingName);
  const period = formatPeriod(intent.period);
  
  return {
    columns,
    rows,
    meta: {
      title,
      period,
      totalRows: rows.length,
      buildingName: buildingContext?.buildingName,
      isHrb: buildingContext?.isHrb
    }
  };
}

/**
 * Compliance Overdue Handler
 */
async function complianceOverdueHandler(intent: ReportIntent, agencyId: string): Promise<ReportResult> {
  const supabase = await createClient();
  
  let query = supabase
    .from('compliance_overdue_v')
    .select(`
      building_id,
      asset_key,
      status,
      last_inspected_at,
      next_due_date,
      days_overdue,
      severity
    `)
    .eq('agency_id', agencyId);
  
  if (intent.buildingId) {
    query = query.eq('building_id', intent.buildingId);
  }
  
  const { data, error } = await query.order('days_overdue', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch overdue compliance data: ${error.message}`);
  }
  
  // Get building context if building-specific
  let buildingContext = null;
  if (intent.buildingId) {
    buildingContext = await getBuildingContext(intent.buildingId, agencyId);
  }
  
  // Format data
  const columns = ['Building', 'Asset', 'Next Due', 'Days Overdue', 'Severity'];
  const rows = (data || []).map(row => ({
    Building: buildingContext?.buildingName || row.building_id,
    Asset: row.asset_key,
    'Next Due': row.next_due_date ? new Date(row.next_due_date).toLocaleDateString('en-GB') : 'N/A',
    'Days Overdue': row.days_overdue,
    Severity: row.severity
  }));
  
  const title = generateReportTitle('Compliance — Overdue', intent.scope, buildingContext?.buildingName);
  const period = formatPeriod(intent.period);
  
  return {
    columns,
    rows,
    meta: {
      title,
      period,
      totalRows: rows.length,
      buildingName: buildingContext?.buildingName,
      isHrb: buildingContext?.isHrb
    }
  };
}

/**
 * Compliance Upcoming Handler
 */
async function complianceUpcomingHandler(intent: ReportIntent, agencyId: string): Promise<ReportResult> {
  const supabase = await createClient();
  
  let query = supabase
    .from('compliance_upcoming_v')
    .select(`
      building_id,
      asset_key,
      status,
      last_inspected_at,
      next_due_date,
      days_until_due,
      priority
    `)
    .eq('agency_id', agencyId);
  
  if (intent.buildingId) {
    query = query.eq('building_id', intent.buildingId);
  }
  
  const { data, error } = await query.order('days_until_due', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to fetch upcoming compliance data: ${error.message}`);
  }
  
  // Get building context if building-specific
  let buildingContext = null;
  if (intent.buildingId) {
    buildingContext = await getBuildingContext(intent.buildingId, agencyId);
  }
  
  // Format data
  const columns = ['Building', 'Asset', 'Next Due', 'Days Until Due', 'Priority'];
  const rows = (data || []).map(row => ({
    Building: buildingContext?.buildingName || row.building_id,
    Asset: row.asset_key,
    'Next Due': row.next_due_date ? new Date(row.next_due_date).toLocaleDateString('en-GB') : 'N/A',
    'Days Until Due': row.days_until_due,
    Priority: row.priority
  }));
  
  const title = generateReportTitle('Compliance — Upcoming', intent.scope, buildingContext?.buildingName);
  const period = formatPeriod(intent.period);
  
  return {
    columns,
    rows,
    meta: {
      title,
      period,
      totalRows: rows.length,
      buildingName: buildingContext?.buildingName,
      isHrb: buildingContext?.isHrb
    }
  };
}

/**
 * Compliance By Type Handler
 */
async function complianceByTypeHandler(intent: ReportIntent, agencyId: string): Promise<ReportResult> {
  const supabase = await createClient();
  
  // Extract asset type from subject
  const assetType = intent.subject.toUpperCase();
  
  let query = supabase
    .from('compliance_by_type_v')
    .select(`
      building_id,
      asset_type,
      status,
      last_inspected_at,
      next_due_date,
      days_overdue,
      days_until_due
    `)
    .eq('agency_id', agencyId)
    .eq('asset_type', assetType);
  
  if (intent.buildingId) {
    query = query.eq('building_id', intent.buildingId);
  }
  
  const { data, error } = await query.order('next_due_date', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to fetch ${assetType} compliance data: ${error.message}`);
  }
  
  // Get building context if building-specific
  let buildingContext = null;
  if (intent.buildingId) {
    buildingContext = await getBuildingContext(intent.buildingId, agencyId);
  }
  
  // Format data
  const columns = ['Building', 'Last Inspected', 'Result', 'Next Due', 'Status'];
  const rows = (data || []).map(row => ({
    Building: buildingContext?.buildingName || row.building_id,
    'Last Inspected': row.last_inspected_at ? new Date(row.last_inspected_at).toLocaleDateString('en-GB') : 'N/A',
    Result: row.status,
    'Next Due': row.next_due_date ? new Date(row.next_due_date).toLocaleDateString('en-GB') : 'N/A',
    Status: row.days_overdue > 0 ? `Overdue (${row.days_overdue} days)` : `Due in ${row.days_until_due} days`
  }));
  
  const title = generateReportTitle(`${assetType} — Compliance`, intent.scope, buildingContext?.buildingName);
  const period = formatPeriod(intent.period);
  
  return {
    columns,
    rows,
    meta: {
      title,
      period,
      totalRows: rows.length,
      buildingName: buildingContext?.buildingName,
      isHrb: buildingContext?.isHrb,
      assetType
    }
  };
}

/**
 * Documents Latest By Type Handler
 */
async function documentsLatestByTypeHandler(intent: ReportIntent, agencyId: string): Promise<ReportResult> {
  const supabase = await createClient();
  
  // Map subject to document type
  const docTypeMap: Record<string, string> = {
    'eicr': 'EICR',
    'fra': 'FRA',
    'ews1': 'EWS1',
    'insurance': 'insurance',
    'documents': 'all'
  };
  
  const docType = docTypeMap[intent.subject] || intent.subject.toUpperCase();
  
  let query = supabase
    .from('latest_building_docs_v')
    .select(`
      building_id,
      doc_type,
      document_id,
      filename,
      doc_date,
      storage_path
    `)
    .eq('agency_id', agencyId)
    .eq('rn', 1); // Only latest documents
  
  if (docType !== 'all') {
    query = query.eq('doc_type', docType);
  }
  
  if (intent.buildingId) {
    query = query.eq('building_id', intent.buildingId);
  }
  
  const { data, error } = await query.order('doc_date', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch latest documents: ${error.message}`);
  }
  
  // Get building context if building-specific
  let buildingContext = null;
  if (intent.buildingId) {
    buildingContext = await getBuildingContext(intent.buildingId, agencyId);
  }
  
  // Format data
  const columns = ['Building', 'Doc Type', 'Date', 'Filename'];
  const rows = (data || []).map(row => ({
    Building: buildingContext?.buildingName || row.building_id,
    'Doc Type': row.doc_type,
    Date: row.doc_date ? new Date(row.doc_date).toLocaleDateString('en-GB') : 'N/A',
    Filename: row.filename
  }));
  
  const title = generateReportTitle(`Latest ${docType} Documents`, intent.scope, buildingContext?.buildingName);
  const period = formatPeriod(intent.period);
  
  return {
    columns,
    rows,
    meta: {
      title,
      period,
      totalRows: rows.length,
      buildingName: buildingContext?.buildingName,
      isHrb: buildingContext?.isHrb,
      docType
    }
  };
}

/**
 * Documents All For Building Handler
 */
async function documentsAllForBuildingHandler(intent: ReportIntent, agencyId: string): Promise<ReportResult> {
  const supabase = await createClient();
  
  if (!intent.buildingId) {
    throw new Error('Building ID is required for building-specific document reports');
  }
  
  let query = supabase
    .from('building_documents')
    .select(`
      id,
      doc_type,
      filename,
      doc_date,
      created_at,
      summary_json
    `)
    .eq('building_id', intent.buildingId)
    .eq('is_deleted', false);
  
  if (intent.period.until) {
    query = query.gte('doc_date', intent.period.since).lte('doc_date', intent.period.until);
  } else {
    query = query.gte('doc_date', intent.period.since);
  }
  
  const { data, error } = await query.order('doc_date', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch building documents: ${error.message}`);
  }
  
  // Get building context
  const buildingContext = await getBuildingContext(intent.buildingId, agencyId);
  
  // Format data
  const columns = ['Doc Type', 'Date', 'Filename', 'Summary'];
  const rows = (data || []).map(row => ({
    'Doc Type': row.doc_type,
    Date: row.doc_date ? new Date(row.doc_date).toLocaleDateString('en-GB') : 'N/A',
    Filename: row.filename,
    Summary: row.summary_json ? 'Available' : 'N/A'
  }));
  
  const title = generateReportTitle('All Documents', 'building', buildingContext?.buildingName);
  const period = formatPeriod(intent.period);
  
  return {
    columns,
    rows,
    meta: {
      title,
      period,
      totalRows: rows.length,
      buildingName: buildingContext?.buildingName,
      isHrb: buildingContext?.isHrb
    }
  };
}

/**
 * Emails Inbox Overview Handler (stub)
 */
async function emailsInboxOverviewHandler(intent: ReportIntent, agencyId: string): Promise<ReportResult> {
  // This is a stub implementation
  // In a real implementation, you would query the emails/inbox data
  
  const columns = ['Date', 'From', 'Subject', 'Status'];
  const rows: any[] = [];
  
  const title = generateReportTitle('Inbox Overview', intent.scope);
  const period = formatPeriod(intent.period);
  
  return {
    columns,
    rows,
    meta: {
      title,
      period,
      totalRows: 0,
      note: 'Email inbox overview not yet implemented'
    }
  };
}

/**
 * Register all report handlers
 */
export function registerAllHandlers(): void {
  // Compliance handlers
  registerReportHandler({
    id: 'compliance.overview',
    name: 'Compliance Overview',
    description: 'Overview of compliance status for all assets',
    handler: complianceOverviewHandler
  });
  
  registerReportHandler({
    id: 'compliance.overdue',
    name: 'Compliance Overdue',
    description: 'Assets that are overdue for inspection or renewal',
    handler: complianceOverdueHandler
  });
  
  registerReportHandler({
    id: 'compliance.upcoming',
    name: 'Compliance Upcoming',
    description: 'Assets due for inspection or renewal in the next 90 days',
    handler: complianceUpcomingHandler
  });
  
  registerReportHandler({
    id: 'compliance.byType',
    name: 'Compliance By Type',
    description: 'Compliance status for specific asset types (EICR, FRA, etc.)',
    handler: complianceByTypeHandler
  });
  
  // Document handlers
  registerReportHandler({
    id: 'documents.latestByType',
    name: 'Latest Documents By Type',
    description: 'Most recent documents of a specific type',
    handler: documentsLatestByTypeHandler
  });
  
  registerReportHandler({
    id: 'documents.allForBuilding',
    name: 'All Documents For Building',
    description: 'All documents for a specific building',
    handler: documentsAllForBuildingHandler
  });
  
  // Email handlers
  registerReportHandler({
    id: 'emails.inboxOverview',
    name: 'Inbox Overview',
    description: 'Overview of inbox emails and communications',
    handler: emailsInboxOverviewHandler
  });
}
