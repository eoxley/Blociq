import { supabase } from '../supabase';
import { TablesInsert, TablesUpdate } from '../database.types';

/**
 * Save a new compliance document to Supabase and update the related building compliance asset
 * with renewal metadata.
 * 
 * @param params - Object containing all required parameters
 * @param params.buildingId - The building ID (number)
 * @param params.complianceAssetId - The compliance asset ID (string)
 * @param params.fileUrl - The Supabase public URL of the uploaded file
 * @param params.title - The document title extracted by AI
 * @param params.summary - The document summary extracted by AI
 * @param params.lastRenewedDate - The last renewal date in ISO format (YYYY-MM-DD)
 * @param params.nextDueDate - The next due date in ISO format (YYYY-MM-DD) or null
 * 
 * @throws Error if database operations fail
 */
export async function saveComplianceDocument({
  buildingId,
  complianceAssetId,
  fileUrl,
  title,
  summary,
  lastRenewedDate,
  nextDueDate
}: {
  buildingId: number;
  complianceAssetId: string;
  fileUrl: string;
  title: string;
  summary: string;
  lastRenewedDate: string;
  nextDueDate: string | null;
}): Promise<void> {
  try {
    // Validate inputs
    if (!buildingId || !complianceAssetId || !fileUrl || !title || !summary || !lastRenewedDate) {
      throw new Error('Missing required parameters for saving compliance document');
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(lastRenewedDate)) {
      throw new Error('lastRenewedDate must be in ISO format (YYYY-MM-DD)');
    }
    
    if (nextDueDate && !dateRegex.test(nextDueDate)) {
      throw new Error('nextDueDate must be in ISO format (YYYY-MM-DD) or null');
    }

    // Step 1: Insert into compliance_documents table
    const documentInsert: TablesInsert<'compliance_documents'> = {
      building_id: buildingId,
      compliance_asset_id: complianceAssetId,
      document_url: fileUrl,
      title: title,
      summary: summary,
      extracted_date: lastRenewedDate,
      doc_type: 'compliance', // Default type for compliance documents
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedDocument, error: insertError } = await supabase
      .from('compliance_documents')
      .insert(documentInsert)
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ Error inserting compliance document:', insertError);
      throw new Error(`Failed to insert compliance document: ${insertError.message}`);
    }

    if (!insertedDocument?.id) {
      throw new Error('Failed to get inserted document ID');
    }

    const documentId = insertedDocument.id;

    // Step 2: Update building_compliance_assets table
    const assetUpdate: TablesUpdate<'building_compliance_assets'> = {
      last_renewed_date: lastRenewedDate,
      next_due_date: nextDueDate,
      latest_document_id: documentId,
      last_updated: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('building_compliance_assets')
      .update(assetUpdate)
      .eq('building_id', buildingId)
      .eq('asset_id', complianceAssetId);

    if (updateError) {
      console.error('❌ Error updating building compliance asset:', updateError);
      
      // If update fails, we should clean up the inserted document
      await supabase
        .from('compliance_documents')
        .delete()
        .eq('id', documentId);
      
      throw new Error(`Failed to update building compliance asset: ${updateError.message}`);
    }

    console.log('✅ Successfully saved compliance document and updated building asset:', {
      documentId,
      buildingId,
      complianceAssetId,
      title,
      lastRenewedDate,
      nextDueDate
    });

  } catch (error) {
    console.error('❌ Error in saveComplianceDocument:', error);
    throw error;
  }
}

/**
 * Alternative function using upsert for compliance documents
 * Use this if you expect to handle re-uploads of the same document
 */
export async function saveComplianceDocumentUpsert({
  buildingId,
  complianceAssetId,
  fileUrl,
  title,
  summary,
  lastRenewedDate,
  nextDueDate
}: {
  buildingId: number;
  complianceAssetId: string;
  fileUrl: string;
  title: string;
  summary: string;
  lastRenewedDate: string;
  nextDueDate: string | null;
}): Promise<void> {
  try {
    // Validate inputs
    if (!buildingId || !complianceAssetId || !fileUrl || !title || !summary || !lastRenewedDate) {
      throw new Error('Missing required parameters for saving compliance document');
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(lastRenewedDate)) {
      throw new Error('lastRenewedDate must be in ISO format (YYYY-MM-DD)');
    }
    
    if (nextDueDate && !dateRegex.test(nextDueDate)) {
      throw new Error('nextDueDate must be in ISO format (YYYY-MM-DD) or null');
    }

    // Use upsert to handle potential duplicates
    const documentUpsert: TablesInsert<'compliance_documents'> = {
      building_id: buildingId,
      compliance_asset_id: complianceAssetId,
      document_url: fileUrl,
      title: title,
      summary: summary,
      extracted_date: lastRenewedDate,
      doc_type: 'compliance',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: upsertedDocument, error: upsertError } = await supabase
      .from('compliance_documents')
      .upsert(documentUpsert, {
        onConflict: 'building_id,compliance_asset_id,document_url'
      })
      .select('id')
      .single();

    if (upsertError) {
      console.error('❌ Error upserting compliance document:', upsertError);
      throw new Error(`Failed to upsert compliance document: ${upsertError.message}`);
    }

    if (!upsertedDocument?.id) {
      throw new Error('Failed to get upserted document ID');
    }

    const documentId = upsertedDocument.id;

    // Update building_compliance_assets table
    const assetUpdate: TablesUpdate<'building_compliance_assets'> = {
      last_renewed_date: lastRenewedDate,
      next_due_date: nextDueDate,
      latest_document_id: documentId,
      last_updated: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('building_compliance_assets')
      .update(assetUpdate)
      .eq('building_id', buildingId)
      .eq('asset_id', complianceAssetId);

    if (updateError) {
      console.error('❌ Error updating building compliance asset:', updateError);
      throw new Error(`Failed to update building compliance asset: ${updateError.message}`);
    }

    console.log('✅ Successfully upserted compliance document and updated building asset:', {
      documentId,
      buildingId,
      complianceAssetId,
      title,
      lastRenewedDate,
      nextDueDate
    });

  } catch (error) {
    console.error('❌ Error in saveComplianceDocumentUpsert:', error);
    throw error;
  }
} 