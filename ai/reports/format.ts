/**
 * Report Formatters for Ask BlocIQ
 * Formats report data into different output formats
 */

import { ReportResult } from './registry';
import { createClient } from '@/lib/supabase/server';

export interface TableFormat {
  columns: string[];
  rows: any[];
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
  };
}

export interface CSVFormat {
  content: string;
  filename: string;
  signedUrl?: string;
}

export interface PDFFormat {
  content: string;
  filename: string;
  signedUrl?: string;
}

/**
 * Format data as a table (for UI display)
 */
export function toTable(
  columns: string[],
  rows: any[],
  page: number = 1,
  pageSize: number = 200
): TableFormat {
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  const paginatedRows = rows.slice(startIndex, endIndex);
  
  return {
    columns,
    rows: paginatedRows,
    pagination: {
      page,
      pageSize,
      totalPages,
      totalRows
    }
  };
}

/**
 * Format data as CSV
 */
export function toCSV(columns: string[], rows: any[]): string {
  if (rows.length === 0) {
    return columns.join(',') + '\n';
  }
  
  // Escape CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    const str = String(value);
    
    // If the value contains comma, newline, or quote, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    
    return str;
  };
  
  // Create CSV header
  const header = columns.map(escapeCSV).join(',');
  
  // Create CSV rows
  const csvRows = rows.map(row => 
    columns.map(col => escapeCSV(row[col])).join(',')
  );
  
  return [header, ...csvRows].join('\n');
}

/**
 * Save CSV to Supabase Storage and return signed URL
 */
export async function saveCSVToStorage(
  csvContent: string,
  filename: string,
  agencyId: string
): Promise<{ signedUrl: string; filename: string }> {
  try {
    const supabase = await createClient();
    
    // Create storage path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const storagePath = `exports/reports/${agencyId}/${timestamp}-${filename}`;
    
    // Upload CSV content
    const { data, error } = await supabase.storage
      .from('reports')
      .upload(storagePath, csvContent, {
        contentType: 'text/csv',
        cacheControl: '3600'
      });
    
    if (error) {
      throw new Error(`Failed to upload CSV: ${error.message}`);
    }
    
    // Generate signed URL (15 minutes expiry)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('reports')
      .createSignedUrl(storagePath, 900); // 15 minutes
    
    if (urlError) {
      throw new Error(`Failed to generate signed URL: ${urlError.message}`);
    }
    
    return {
      signedUrl: signedUrlData.signedUrl,
      filename: `${timestamp}-${filename}`
    };
    
  } catch (error) {
    console.error('Failed to save CSV to storage:', error);
    throw error;
  }
}

/**
 * Format data as PDF (stub implementation)
 */
export function toPDF(columns: string[], rows: any[], meta?: any): PDFFormat {
  // This is a stub implementation
  // In a real implementation, you would use a PDF generation library like puppeteer or jsPDF
  
  const content = `
    PDF Export Coming Soon
    
    Report: ${meta?.title || 'Untitled Report'}
    Period: ${meta?.period || 'N/A'}
    Total Rows: ${rows.length}
    
    This feature will be available in a future update.
    For now, please use the CSV export option.
  `;
  
  return {
    content,
    filename: `${meta?.title || 'report'}.pdf`
  };
}

/**
 * Format report result for API response
 */
export function formatReportResponse(
  result: ReportResult,
  format: 'table' | 'csv' | 'pdf',
  title: string,
  period: string,
  actions?: Array<{ kind: string; label: string; url: string }>
): {
  type: 'report';
  title: string;
  period: string;
  table?: TableFormat;
  csv?: CSVFormat;
  pdf?: PDFFormat;
  actions?: Array<{ kind: string; label: string; url: string }>;
  meta?: any;
} {
  const response: any = {
    type: 'report',
    title,
    period,
    meta: result.meta
  };
  
  switch (format) {
    case 'table':
      response.table = toTable(result.columns, result.rows);
      break;
    case 'csv':
      const csvContent = toCSV(result.columns, result.rows);
      response.csv = {
        content: csvContent,
        filename: `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`
      };
      break;
    case 'pdf':
      response.pdf = toPDF(result.columns, result.rows, result.meta);
      break;
  }
  
  if (actions) {
    response.actions = actions;
  }
  
  return response;
}

/**
 * Generate download actions for different formats
 */
export function generateDownloadActions(
  reportId: string,
  title: string,
  availableFormats: ('csv' | 'pdf')[] = ['csv']
): Array<{ kind: string; label: string; url: string }> {
  const actions: Array<{ kind: string; label: string; url: string }> = [];
  
  if (availableFormats.includes('csv')) {
    actions.push({
      kind: 'download',
      label: 'Download CSV',
      url: `/api/reports/${reportId}/download?format=csv`
    });
  }
  
  if (availableFormats.includes('pdf')) {
    actions.push({
      kind: 'download',
      label: 'Download PDF',
      url: `/api/reports/${reportId}/download?format=pdf`
    });
  }
  
  return actions;
}

/**
 * Format column names for display
 */
export function formatColumnNames(columns: string[]): string[] {
  return columns.map(col => {
    // Convert snake_case to Title Case
    return col
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  });
}

/**
 * Format row values for display
 */
export function formatRowValues(row: any): any {
  const formatted: any = {};
  
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      formatted[key] = '';
    } else if (typeof value === 'boolean') {
      formatted[key] = value ? 'Yes' : 'No';
    } else if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      // Format ISO date strings
      try {
        const date = new Date(value);
        formatted[key] = date.toLocaleDateString('en-GB');
      } catch {
        formatted[key] = value;
      }
    } else {
      formatted[key] = value;
    }
  }
  
  return formatted;
}

/**
 * Generate report summary text
 */
export function generateReportSummary(result: ReportResult, title: string): string {
  const { totalRows } = result.meta || { totalRows: result.rows.length };
  
  if (totalRows === 0) {
    return `No matching records found for ${title.toLowerCase()}.`;
  }
  
  let summary = `Found ${totalRows} record${totalRows === 1 ? '' : 's'} for ${title.toLowerCase()}.`;
  
  // Add specific insights based on the data
  if (result.meta?.statusCounts) {
    const statusCounts = result.meta.statusCounts;
    const statusSummary = Object.entries(statusCounts)
      .map(([status, count]) => `${count} ${status}`)
      .join(', ');
    summary += ` Status breakdown: ${statusSummary}.`;
  }
  
  if (result.meta?.overdueCount) {
    summary += ` ${result.meta.overdueCount} item${result.meta.overdueCount === 1 ? '' : 's'} overdue.`;
  }
  
  return summary;
}
