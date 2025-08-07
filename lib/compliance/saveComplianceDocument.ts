import { supabase } from '@/lib/supabaseClient'

interface SaveComplianceDocumentInput {
  buildingId: string
  complianceAssetId: string
  fileUrl: string
  title: string
  summary: string
  lastRenewedDate: string
  nextDueDate: string | null
}

interface SaveComplianceDocumentResult {
  success: boolean
  documentId?: string
  error?: string
}

/**
 * Saves a compliance document to the database and updates building compliance assets
 * with extracted metadata including renewal dates and document reference.
 */
export async function saveComplianceDocument(
  input: SaveComplianceDocumentInput
): Promise<SaveComplianceDocumentResult> {

  try {
    console.log('💾 Saving compliance document for asset:', input.complianceAssetId)

    // Step 1: Save document to compliance_documents table
    const { data: documentData, error: documentError } = await supabase
      .from('compliance_docs')
      .insert({
        building_id: input.buildingId,
        doc_type: input.title,
        doc_url: input.fileUrl,
        title: input.title,
        summary: input.summary,
        uploaded_at: new Date().toISOString(),
        expiry_date: input.nextDueDate,
        extracted_text: null, // Could be populated later if needed
        classification: 'compliance',
        created_at: new Date().toISOString()
      })
      .select('id, title, doc_url')
      .single()

    if (documentError) {
      console.error('❌ Failed to save compliance document:', documentError)
      return {
        success: false,
        error: `Failed to save document: ${documentError.message}`
      }
    }

    console.log('✅ Document saved with ID:', documentData.id)

    // Step 2: Update building_compliance_assets with extracted metadata
    const { error: assetError } = await supabase
      .from('building_compliance_assets')
      .update({
        last_renewed_date: input.lastRenewedDate || null,
        next_due_date: input.nextDueDate,
        latest_document_id: documentData.id,
        last_updated: new Date().toISOString(),
        notes: `Document uploaded: ${input.title}`
      })
      .eq('building_id', input.buildingId)
      .eq('asset_id', input.complianceAssetId)

    if (assetError) {
      console.error('❌ Failed to update building compliance asset:', assetError)
      
      // Try to rollback document creation if asset update fails
      try {
        await supabase
          .from('compliance_docs')
          .delete()
          .eq('id', documentData.id)
        
        console.log('🔄 Rolled back document creation due to asset update failure')
      } catch (rollbackError) {
        console.error('❌ Failed to rollback document creation:', rollbackError)
      }

      return {
        success: false,
        error: `Failed to update compliance asset: ${assetError.message}`
      }
    }

    console.log('✅ Building compliance asset updated successfully')

    // Step 3: Log the successful operation
    console.log('📋 Compliance document saved successfully:', {
      documentId: documentData.id,
      title: documentData.title,
      lastRenewed: input.lastRenewedDate,
      nextDue: input.nextDueDate,
      assetId: input.complianceAssetId
    })

    return {
      success: true,
      documentId: documentData.id
    }

  } catch (error) {
    console.error('❌ Unexpected error saving compliance document:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Helper function to validate compliance document input
 */
export function validateComplianceDocumentInput(
  input: SaveComplianceDocumentInput
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.buildingId) {
    errors.push('Building ID is required')
  }

  if (!input.complianceAssetId) {
    errors.push('Compliance asset ID is required')
  }

  if (!input.fileUrl) {
    errors.push('File URL is required')
  }

  if (!input.title) {
    errors.push('Document title is required')
  }

  if (!input.summary) {
    errors.push('Document summary is required')
  }

  // Validate date formats
  if (input.lastRenewedDate) {
    const lastRenewed = new Date(input.lastRenewedDate)
    if (isNaN(lastRenewed.getTime())) {
      errors.push('Invalid last renewed date format')
    }
  }

  if (input.nextDueDate) {
    const nextDue = new Date(input.nextDueDate)
    if (isNaN(nextDue.getTime())) {
      errors.push('Invalid next due date format')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Helper function to get compliance document by ID
 */
export async function getComplianceDocument(documentId: string) {

  const { data, error } = await supabase
    .from('compliance_docs')
    .select(`
      id,
      building_id,
      doc_type,
      doc_url,
      title,
      summary,
      uploaded_at,
      expiry_date,
      classification
    `)
    .eq('id', documentId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch compliance document: ${error.message}`)
  }

  return data
}

/**
 * Helper function to get building compliance assets with latest documents
 */
export async function getBuildingComplianceAssetsWithDocuments(buildingId: string) {

  const { data, error } = await supabase
    .from('building_compliance_assets')
    .select(`
      id,
      building_id,
      asset_id,
      status,
      last_renewed_date,
      next_due_date,
      latest_document_id,
      last_updated,
      notes,
      compliance_assets (
        id,
        name,
        description,
        category,
        recommended_frequency
      ),
      compliance_docs (
        id,
        title,
        doc_url,
        uploaded_at,
        expiry_date
      )
    `)
    .eq('building_id', buildingId)
    .eq('status', 'active')
    .order('last_updated', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch building compliance assets: ${error.message}`)
  }

  return data
} 