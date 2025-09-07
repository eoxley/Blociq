/**
 * Report Engine for Ask BlocIQ
 * Executes report queries and returns formatted results
 */

import { ReportIntent } from '../intent/report';
import { ReportHandler, ReportResult, findReportHandler, validateReportIntent } from './registry';
import { getServiceClient } from '@/lib/supabase/server';

export interface ReportContext {
  agencyId: string;
  buildingId?: string;
  unitId?: string;
  period: {
    since: string;
    until?: string;
  };
  format: 'table' | 'csv' | 'pdf';
}

export interface ReportExecutionResult {
  success: boolean;
  result?: ReportResult;
  error?: string;
  handler?: ReportHandler;
}

/**
 * Execute a report based on intent
 */
export async function executeReport(intent: ReportIntent, agencyId: string): Promise<ReportExecutionResult> {
  try {
    // Validate intent
    const validation = validateReportIntent(intent);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid report intent: ${validation.errors.join(', ')}`
      };
    }

    // Find appropriate handler
    const handler = findReportHandler(intent);
    if (!handler) {
      return {
        success: false,
        error: `No report handler found for subject: ${intent.subject}, scope: ${intent.scope}`
      };
    }

    // Execute the handler
    const result = await handler.handler(intent, agencyId);
    
    return {
      success: true,
      result,
      handler
    };

  } catch (error) {
    console.error('Report execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Build query parameters for database queries
 */
export function buildQueryParams(intent: ReportIntent, agencyId: string): {
  agencyId: string;
  buildingId?: string;
  unitId?: string;
  periodSince: string;
  periodUntil?: string;
  limit?: number;
} {
  return {
    agencyId,
    buildingId: intent.buildingId,
    unitId: intent.unitId,
    periodSince: intent.period.since,
    periodUntil: intent.period.until,
    limit: intent.format === 'table' ? 200 : undefined
  };
}

/**
 * Execute a database query with proper RLS enforcement
 */
export async function executeQuery(
  query: string,
  params: Record<string, any>,
  agencyId: string
): Promise<{ data: any[]; error: any }> {
  try {
    const supabase = getServiceClient();
    
    // Add agency filter to ensure RLS compliance
    const queryWithAgency = `${query} AND agency_id = $agencyId`;
    const paramsWithAgency = { ...params, agencyId };
    
    const { data, error } = await supabase
      .rpc('execute_report_query', {
        query: queryWithAgency,
        params: paramsWithAgency
      });

    if (error) {
      console.error('Database query error:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };

  } catch (error) {
    console.error('Query execution failed:', error);
    return { data: [], error };
  }
}

/**
 * Get building information for context
 */
export async function getBuildingContext(buildingId: string, agencyId: string): Promise<{
  buildingName: string;
  isHrb: boolean;
  address: string;
} | null> {
  try {
    const supabase = getServiceClient();
    
    const { data, error } = await supabase
      .from('buildings_min_v')
      .select('building_name, is_hrb, address')
      .eq('building_id', buildingId)
      .eq('agency_id', agencyId)
      .single();

    if (error || !data) {
      console.error('Failed to get building context:', error);
      return null;
    }

    return {
      buildingName: data.building_name,
      isHrb: data.is_hrb || false,
      address: data.address || ''
    };

  } catch (error) {
    console.error('Building context query failed:', error);
    return null;
  }
}

/**
 * Get unit information for context
 */
export async function getUnitContext(unitId: string, buildingId: string, agencyId: string): Promise<{
  unitName: string;
  unitNumber: string;
  unitType: string;
} | null> {
  try {
    const supabase = getServiceClient();
    
    const { data, error } = await supabase
      .from('units_min_v')
      .select('unit_name, unit_number, unit_type')
      .eq('unit_id', unitId)
      .eq('building_id', buildingId)
      .single();

    if (error || !data) {
      console.error('Failed to get unit context:', error);
      return null;
    }

    return {
      unitName: data.unit_name || data.unit_number,
      unitNumber: data.unit_number,
      unitType: data.unit_type || 'Unknown'
    };

  } catch (error) {
    console.error('Unit context query failed:', error);
    return null;
  }
}

/**
 * Format period for display
 */
export function formatPeriod(period: { since: string; until?: string }): string {
  const sinceDate = new Date(period.since);
  const untilDate = period.until ? new Date(period.until) : new Date();
  
  const sinceFormatted = sinceDate.toLocaleDateString('en-GB');
  const untilFormatted = untilDate.toLocaleDateString('en-GB');
  
  return `${sinceFormatted}–${untilFormatted}`;
}

/**
 * Generate report title
 */
export function generateReportTitle(
  subject: string,
  scope: string,
  buildingName?: string,
  unitName?: string
): string {
  const subjectTitle = subject.charAt(0).toUpperCase() + subject.slice(1);
  
  if (unitName) {
    return `${subjectTitle} — ${unitName}`;
  } else if (buildingName) {
    return `${subjectTitle} — ${buildingName}`;
  } else if (scope === 'agency') {
    return `${subjectTitle} — Portfolio`;
  } else {
    return subjectTitle;
  }
}

/**
 * Validate report parameters
 */
export function validateReportParameters(intent: ReportIntent, agencyId: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!agencyId) {
    errors.push('Agency ID is required');
  }
  
  if (!intent.period?.since) {
    errors.push('Report period is required');
  }
  
  if (intent.scope === 'building' && !intent.buildingId) {
    errors.push('Building ID is required for building-scoped reports');
  }
  
  if (intent.scope === 'unit' && (!intent.buildingId || !intent.unitId)) {
    errors.push('Building ID and Unit ID are required for unit-scoped reports');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get report statistics
 */
export function getReportStatistics(rows: any[]): {
  totalRows: number;
  hasData: boolean;
  summary?: Record<string, any>;
} {
  const totalRows = rows.length;
  const hasData = totalRows > 0;
  
  let summary: Record<string, any> = {};
  
  if (hasData && rows.length > 0) {
    // Basic statistics
    summary.totalRows = totalRows;
    
    // Try to extract meaningful statistics based on common columns
    const firstRow = rows[0];
    if (firstRow.status) {
      const statusCounts = rows.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      summary.statusCounts = statusCounts;
    }
    
    if (firstRow.days_overdue !== undefined) {
      const overdueCount = rows.filter(row => row.days_overdue > 0).length;
      summary.overdueCount = overdueCount;
    }
  }
  
  return {
    totalRows,
    hasData,
    summary
  };
}
