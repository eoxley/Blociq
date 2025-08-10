/**
 * Utility function to call the extract-summary API endpoint
 * 
 * @param documentId - The ID of the document in the compliance_docs table
 * @returns Promise with the analysis results
 */

export interface ExtractSummaryResult {
  success: boolean;
  summary: string;
  doc_type: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  key_risks: string | null;
  compliance_status: string | null;
  building_id: number | null;
}

export async function extractSummary(documentId: string): Promise<ExtractSummaryResult> {
  try {
    const res = await fetch('/api/extract-summary', {
      method: 'POST',
      body: JSON.stringify({ documentId }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`AI analysis failed: ${errorData.error || 'Unknown error'}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error calling extract-summary:', error);
    throw error;
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * try {
 *   const result = await extractSummary('your-document-id');
 *   console.log('Document Type:', result.doc_type);
 *   console.log('Summary:', result.summary);
 *   console.log('Compliance Status:', result.compliance_status);
 * } catch (error) {
 *   console.error('Failed to analyze document:', error);
 * }
 * ```
 */ 