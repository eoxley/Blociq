/**
 * Report Registry for Ask BlocIQ
 * Maps report subjects and modifiers to specific report handlers
 */

import { ReportIntent } from '../intent/report';

export interface ReportHandler {
  id: string;
  name: string;
  description: string;
  handler: (intent: ReportIntent, agencyId: string) => Promise<ReportResult>;
}

export interface ReportResult {
  columns: string[];
  rows: any[];
  meta?: {
    title: string;
    period: string;
    totalRows: number;
    buildingName?: string;
    unitName?: string;
    isHrb?: boolean;
    [key: string]: any;
  };
}

// Report handler registry
const REPORT_HANDLERS: Map<string, ReportHandler> = new Map();

/**
 * Register a report handler
 */
export function registerReportHandler(handler: ReportHandler): void {
  REPORT_HANDLERS.set(handler.id, handler);
}

/**
 * Get a report handler by ID
 */
export function getReportHandler(id: string): ReportHandler | undefined {
  return REPORT_HANDLERS.get(id);
}

/**
 * Get all registered report handlers
 */
export function getAllReportHandlers(): ReportHandler[] {
  return Array.from(REPORT_HANDLERS.values());
}

/**
 * Find the best report handler for an intent
 */
export function findReportHandler(intent: ReportIntent): ReportHandler | null {
  const { subject, scope } = intent;
  
  // Try exact matches first
  const exactKey = `${subject}.${scope}`;
  if (REPORT_HANDLERS.has(exactKey)) {
    return REPORT_HANDLERS.get(exactKey)!;
  }
  
  // Try subject-only matches
  const subjectKey = `${subject}.overview`;
  if (REPORT_HANDLERS.has(subjectKey)) {
    return REPORT_HANDLERS.get(subjectKey)!;
  }
  
  // Try generic compliance handler
  if (subject === 'compliance' || subject === 'overdue' || subject === 'upcoming') {
    const complianceKey = `compliance.${subject === 'compliance' ? 'overview' : subject}`;
    if (REPORT_HANDLERS.has(complianceKey)) {
      return REPORT_HANDLERS.get(complianceKey)!;
    }
  }
  
  // Try documents handler
  if (subject === 'documents' || subject === 'eicr' || subject === 'fra' || subject === 'ews1' || subject === 'insurance') {
    const documentsKey = `documents.${subject === 'documents' ? 'allForBuilding' : 'latestByType'}`;
    if (REPORT_HANDLERS.has(documentsKey)) {
      return REPORT_HANDLERS.get(documentsKey)!;
    }
  }
  
  return null;
}

/**
 * Get available report types for a subject
 */
export function getAvailableReportsForSubject(subject: string): string[] {
  const reports: string[] = [];
  
  for (const [key, handler] of REPORT_HANDLERS) {
    if (key.startsWith(`${subject}.`)) {
      reports.push(key);
    }
  }
  
  return reports;
}

/**
 * Get report suggestions based on intent
 */
export function getReportSuggestions(intent: ReportIntent): string[] {
  const suggestions: string[] = [];
  const { subject, scope } = intent;
  
  // Add specific suggestions based on subject
  switch (subject) {
    case 'compliance':
      suggestions.push(
        'compliance.overview',
        'compliance.overdue',
        'compliance.upcoming',
        'compliance.byType'
      );
      break;
    case 'documents':
      suggestions.push(
        'documents.latestByType',
        'documents.allForBuilding'
      );
      break;
    case 'eicr':
    case 'fra':
    case 'ews1':
    case 'insurance':
      suggestions.push(
        'documents.latestByType',
        'compliance.byType'
      );
      break;
    case 'emails':
      suggestions.push(
        'emails.inboxOverview'
      );
      break;
  }
  
  // Filter by scope
  return suggestions.filter(key => {
    const handler = REPORT_HANDLERS.get(key);
    return handler && key.includes(scope);
  });
}

/**
 * Validate report intent
 */
export function validateReportIntent(intent: ReportIntent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!intent.subject) {
    errors.push('Report subject is required');
  }
  
  if (!intent.scope) {
    errors.push('Report scope is required');
  }
  
  if (!intent.period?.since) {
    errors.push('Report period is required');
  }
  
  if (!intent.format) {
    errors.push('Report format is required');
  }
  
  // Check if handler exists
  const handler = findReportHandler(intent);
  if (!handler) {
    errors.push(`No report handler found for subject: ${intent.subject}, scope: ${intent.scope}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get report metadata
 */
export function getReportMetadata(handlerId: string): { name: string; description: string } | null {
  const handler = REPORT_HANDLERS.get(handlerId);
  if (!handler) {
    return null;
  }
  
  return {
    name: handler.name,
    description: handler.description
  };
}

/**
 * List all available reports
 */
export function listAllReports(): Array<{ id: string; name: string; description: string; subject: string; scope: string }> {
  return Array.from(REPORT_HANDLERS.values()).map(handler => {
    const [subject, scope] = handler.id.split('.');
    return {
      id: handler.id,
      name: handler.name,
      description: handler.description,
      subject: subject || 'unknown',
      scope: scope || 'unknown'
    };
  });
}

// Initialize registry with default handlers
// These will be populated by the actual handler implementations
export function initializeReportRegistry(): void {
  // This will be called when the handlers are imported
  console.log('Report registry initialized');
}
