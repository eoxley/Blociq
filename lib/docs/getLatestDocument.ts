/**
 * Get Latest Document Resolver
 * Fetches the most recent document of a specific type for a building/unit
 */

import { getServiceClient } from '@/lib/supabase/server';
import { createApiClient } from '@/lib/supabase/server';

export interface LatestDocumentResult {
  document_id: string;
  filename: string;
  doc_date: string;
  storage_path: string;
  doc_type: string;
  summary_json?: any;
  signed_url?: string;
  url_expires_at?: string;
}

export interface DocumentRequest {
  docType: string;
  buildingId?: string;
  unitId?: string;
  agencyId: string;
  userId: string;
}

/**
 * Generate signed URL for document access
 */
async function generateSignedUrl(storagePath: string, expiresIn: number = 900): Promise<{ url: string; expires_at: string }> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase.storage
    .from('building_documents')
    .createSignedUrl(storagePath, expiresIn);
  
  if (error) {
    console.error('Failed to generate signed URL:', error);
    throw new Error('Failed to generate document access URL');
  }
  
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  
  return {
    url: data.signedUrl,
    expires_at: expiresAt
  };
}

/**
 * Log document access for audit purposes
 */
async function logDocumentAccess(
  userId: string,
  buildingId: string | undefined,
  unitId: string | undefined,
  docType: string,
  documentId: string
): Promise<void> {
  try {
    const supabase = getServiceClient();
    
    await supabase
      .from('ai_logs')
      .insert({
        user_id: userId,
        log_type: 'document_access',
        message: `Accessed ${docType} document ${documentId}`,
        metadata: {
          building_id: buildingId,
          unit_id: unitId,
          doc_type: docType,
          document_id: documentId,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.warn('Failed to log document access:', error);
    // Don't throw - logging is not critical
  }
}

/**
 * Get the latest document of a specific type for a building
 */
export async function getLatestBuildingDocument(request: DocumentRequest): Promise<LatestDocumentResult | null> {
  const { docType, buildingId, agencyId, userId } = request;
  
  if (!buildingId) {
    throw new Error('Building ID is required for document lookup');
  }
  
  const supabase = createApiClient();
  
  try {
    // Query the latest document view
    const { data, error } = await supabase
      .from('latest_building_docs_v')
      .select(`
        document_id,
        filename,
        doc_date,
        storage_path,
        doc_type,
        summary_json,
        agency_id
      `)
      .eq('building_id', buildingId)
      .eq('doc_type', docType)
      .eq('agency_id', agencyId) // Ensure RLS compliance
      .eq('rn', 1) // Only get the latest (rn = 1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('Database error fetching latest document:', error);
      throw new Error('Failed to fetch document');
    }
    
    if (!data) {
      return null;
    }
    
    // Generate signed URL
    const { url, expires_at } = await generateSignedUrl(data.storage_path);
    
    // Log access
    await logDocumentAccess(userId, buildingId, undefined, docType, data.document_id);
    
    return {
      document_id: data.document_id,
      filename: data.filename,
      doc_date: data.doc_date,
      storage_path: data.storage_path,
      doc_type: data.doc_type,
      summary_json: data.summary_json,
      signed_url: url,
      url_expires_at: expires_at
    };
    
  } catch (error) {
    console.error('Error in getLatestBuildingDocument:', error);
    throw error;
  }
}

/**
 * Get the latest document of a specific type for a unit
 */
export async function getLatestUnitDocument(request: DocumentRequest): Promise<LatestDocumentResult | null> {
  const { docType, buildingId, unitId, agencyId, userId } = request;
  
  if (!buildingId || !unitId) {
    throw new Error('Building ID and Unit ID are required for unit document lookup');
  }
  
  const supabase = createApiClient();
  
  try {
    // Query the latest unit document view
    const { data, error } = await supabase
      .from('latest_unit_docs_v')
      .select(`
        document_id,
        filename,
        doc_date,
        storage_path,
        doc_type,
        summary_json,
        agency_id
      `)
      .eq('building_id', buildingId)
      .eq('unit_id', unitId)
      .eq('doc_type', docType)
      .eq('agency_id', agencyId) // Ensure RLS compliance
      .eq('rn', 1) // Only get the latest (rn = 1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('Database error fetching latest unit document:', error);
      throw new Error('Failed to fetch unit document');
    }
    
    if (!data) {
      return null;
    }
    
    // Generate signed URL
    const { url, expires_at } = await generateSignedUrl(data.storage_path);
    
    // Log access
    await logDocumentAccess(userId, buildingId, unitId, docType, data.document_id);
    
    return {
      document_id: data.document_id,
      filename: data.filename,
      doc_date: data.doc_date,
      storage_path: data.storage_path,
      doc_type: data.doc_type,
      summary_json: data.summary_json,
      signed_url: url,
      url_expires_at: expires_at
    };
    
  } catch (error) {
    console.error('Error in getLatestUnitDocument:', error);
    throw error;
  }
}

/**
 * Get the latest document with fallback logic
 * Tries unit-specific first, then falls back to building-level
 */
export async function getLatestDocument(request: DocumentRequest): Promise<LatestDocumentResult | null> {
  const { unitId } = request;
  
  // If unit ID is provided, try unit-specific first
  if (unitId) {
    try {
      const unitDoc = await getLatestUnitDocument(request);
      if (unitDoc) {
        return unitDoc;
      }
    } catch (error) {
      console.warn('Failed to fetch unit document, falling back to building:', error);
    }
  }
  
  // Fall back to building-level document
  return await getLatestBuildingDocument(request);
}

/**
 * Format document date for display
 */
export function formatDocumentDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Extract summary snippet for display
 */
export function extractSummarySnippet(summaryJson: any, docType: string): string | null {
  if (!summaryJson) return null;
  
  switch (docType) {
    case 'insurance':
      const periodFrom = summaryJson.period_from;
      const periodTo = summaryJson.period_to;
      const sumInsured = summaryJson.buildings_sum_insured;
      
      if (periodFrom && periodTo) {
        const fromDate = formatDocumentDate(periodFrom);
        const toDate = formatDocumentDate(periodTo);
        let snippet = `Policy period: ${fromDate}–${toDate}`;
        if (sumInsured) {
          snippet += ` · Sum insured: ${sumInsured}`;
        }
        return snippet;
      }
      break;
      
    case 'EICR':
      const result = summaryJson.result;
      const nextDue = summaryJson.next_due_date;
      
      if (result) {
        let snippet = `Result: ${result}`;
        if (nextDue) {
          const dueDate = formatDocumentDate(nextDue);
          snippet += ` · Next due: ${dueDate}`;
        }
        return snippet;
      }
      break;
      
    case 'FRA':
      const riskRating = summaryJson.risk_rating;
      if (riskRating) {
        return `Risk rating: ${riskRating}`;
      }
      break;
      
    default:
      // Generic summary for other document types
      if (summaryJson.result) {
        return `Result: ${summaryJson.result}`;
      }
      if (summaryJson.status) {
        return `Status: ${summaryJson.status}`;
      }
      break;
  }
  
  return null;
}
