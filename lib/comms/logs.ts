/**
 * Communications Log System
 * Manages audit logs for all communications sent via mail-merge
 */

import { getServiceClient } from '@/lib/supabase/server';

export interface CommunicationLog {
  id: string;
  agency_id: string;
  building_id: string;
  unit_id?: string;
  lease_id?: string;
  leaseholder_id?: string;
  type: 'letter' | 'email';
  status: 'generated' | 'queued' | 'sent' | 'failed' | 'delivered' | 'bounced';
  template_id?: string;
  storage_path?: string;
  message_id?: string;
  subject?: string;
  recipient_email?: string;
  recipient_address?: string;
  metadata?: any;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface LogFilters {
  buildingId?: string;
  type?: 'letter' | 'email';
  status?: string;
  templateId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byBuilding: Record<string, number>;
  byTemplate: Record<string, number>;
  recentActivity: CommunicationLog[];
}

/**
 * Get communications log with filters
 */
export async function getCommunicationsLog(
  agencyId: string,
  filters: LogFilters = {}
): Promise<CommunicationLog[]> {
  const supabase = getServiceClient();
  
  let query = supabase
    .from('communications_log')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });
  
  if (filters.buildingId) {
    query = query.eq('building_id', filters.buildingId);
  }
  
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.templateId) {
    query = query.eq('template_id', filters.templateId);
  }
  
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch communications log: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get communication log statistics
 */
export async function getLogStats(agencyId: string): Promise<LogStats> {
  const supabase = getServiceClient();
  
  // Get all logs for the agency
  const { data: logs, error } = await supabase
    .from('communications_log')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch log stats: ${error.message}`);
  }
  
  const stats: LogStats = {
    total: logs.length,
    byType: {},
    byStatus: {},
    byBuilding: {},
    byTemplate: {},
    recentActivity: logs.slice(0, 10)
  };
  
  // Calculate statistics
  for (const log of logs) {
    // By type
    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
    
    // By status
    stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
    
    // By building
    if (log.building_id) {
      stats.byBuilding[log.building_id] = (stats.byBuilding[log.building_id] || 0) + 1;
    }
    
    // By template
    if (log.template_id) {
      stats.byTemplate[log.template_id] = (stats.byTemplate[log.template_id] || 0) + 1;
    }
  }
  
  return stats;
}

/**
 * Get log entry by ID
 */
export async function getLogEntry(logId: string, agencyId: string): Promise<CommunicationLog | null> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase
    .from('communications_log')
    .select('*')
    .eq('id', logId)
    .eq('agency_id', agencyId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Log entry not found
    }
    throw new Error(`Failed to fetch log entry: ${error.message}`);
  }
  
  return data;
}

/**
 * Update log entry status
 */
export async function updateLogStatus(
  logId: string,
  status: CommunicationLog['status'],
  agencyId: string,
  metadata?: any
): Promise<void> {
  const supabase = getServiceClient();
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };
  
  if (metadata) {
    updateData.metadata = metadata;
  }
  
  const { error } = await supabase
    .from('communications_log')
    .update(updateData)
    .eq('id', logId)
    .eq('agency_id', agencyId);
  
  if (error) {
    throw new Error(`Failed to update log status: ${error.message}`);
  }
}

/**
 * Get logs for a specific building
 */
export async function getBuildingLogs(
  buildingId: string,
  agencyId: string,
  limit: number = 50
): Promise<CommunicationLog[]> {
  return getCommunicationsLog(agencyId, {
    buildingId,
    limit
  });
}

/**
 * Get logs for a specific template
 */
export async function getTemplateLogs(
  templateId: string,
  agencyId: string,
  limit: number = 50
): Promise<CommunicationLog[]> {
  return getCommunicationsLog(agencyId, {
    templateId,
    limit
  });
}

/**
 * Get failed communications
 */
export async function getFailedCommunications(
  agencyId: string,
  limit: number = 50
): Promise<CommunicationLog[]> {
  return getCommunicationsLog(agencyId, {
    status: 'failed',
    limit
  });
}

/**
 * Get recent activity
 */
export async function getRecentActivity(
  agencyId: string,
  limit: number = 20
): Promise<CommunicationLog[]> {
  return getCommunicationsLog(agencyId, {
    limit
  });
}

/**
 * Get communication summary for a building
 */
export async function getBuildingSummary(
  buildingId: string,
  agencyId: string
): Promise<{
  total: number;
  letters: number;
  emails: number;
  successful: number;
  failed: number;
  lastActivity?: string;
}> {
  const logs = await getBuildingLogs(buildingId, agencyId, 1000);
  
  const summary = {
    total: logs.length,
    letters: logs.filter(l => l.type === 'letter').length,
    emails: logs.filter(l => l.type === 'email').length,
    successful: logs.filter(l => ['sent', 'delivered', 'generated'].includes(l.status)).length,
    failed: logs.filter(l => l.status === 'failed').length,
    lastActivity: logs.length > 0 ? logs[0].created_at : undefined
  };
  
  return summary;
}

/**
 * Get template usage statistics
 */
export async function getTemplateUsage(
  templateId: string,
  agencyId: string
): Promise<{
  total: number;
  successful: number;
  failed: number;
  lastUsed?: string;
  buildings: string[];
}> {
  const logs = await getTemplateLogs(templateId, agencyId, 1000);
  
  const summary = {
    total: logs.length,
    successful: logs.filter(l => ['sent', 'delivered', 'generated'].includes(l.status)).length,
    failed: logs.filter(l => l.status === 'failed').length,
    lastUsed: logs.length > 0 ? logs[0].created_at : undefined,
    buildings: [...new Set(logs.map(l => l.building_id).filter(Boolean))]
  };
  
  return summary;
}

/**
 * Delete old log entries (cleanup)
 */
export async function cleanupOldLogs(
  agencyId: string,
  olderThanDays: number = 365
): Promise<number> {
  const supabase = getServiceClient();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const { data, error } = await supabase
    .from('communications_log')
    .delete()
    .eq('agency_id', agencyId)
    .lt('created_at', cutoffDate.toISOString())
    .select('id');
  
  if (error) {
    throw new Error(`Failed to cleanup old logs: ${error.message}`);
  }
  
  return data?.length || 0;
}

/**
 * Export logs to CSV
 */
export async function exportLogsToCSV(
  agencyId: string,
  filters: LogFilters = {}
): Promise<string> {
  const logs = await getCommunicationsLog(agencyId, { ...filters, limit: 10000 });
  
  const headers = [
    'ID',
    'Type',
    'Status',
    'Subject',
    'Recipient Email',
    'Recipient Address',
    'Building ID',
    'Unit ID',
    'Lease ID',
    'Leaseholder ID',
    'Template ID',
    'Storage Path',
    'Message ID',
    'Created At',
    'Created By'
  ];
  
  const rows = logs.map(log => [
    log.id,
    log.type,
    log.status,
    log.subject || '',
    log.recipient_email || '',
    log.recipient_address || '',
    log.building_id,
    log.unit_id || '',
    log.lease_id || '',
    log.leaseholder_id || '',
    log.template_id || '',
    log.storage_path || '',
    log.message_id || '',
    log.created_at,
    log.created_by || ''
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => escapeCSV(field)).join(','))
    .join('\n');
  
  return csvContent;
}

/**
 * Escape CSV value
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}
