import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(cookies());
    const documentId = params.id;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📋 Checking status for document: ${documentId}`);

    // Get document with AI extraction data
    const { data: document, error: docError } = await supabase
      .from('compliance_documents_with_extractions')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('❌ Document not found:', docError);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify user has access to this document's building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id')
      .eq('id', document.building_id)
      .eq('user_id', user.id)
      .single();

    if (buildingError || !building) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get public URL for the file
    let fileUrl = null;
    if (document.file_path) {
      const { data: { publicUrl } } = supabase.storage
        .from('compliance-documents')
        .getPublicUrl(document.file_path);
      fileUrl = publicUrl;
    }

    const response = {
      documentId: document.id,
      filename: document.original_filename,
      fileType: document.file_type,
      fileSize: document.file_size,
      fileUrl,
      uploadDate: document.upload_date,
      processingStatus: document.processing_status,
      
      // AI Classification Results
      aiClassification: {
        documentType: document.document_type,
        category: document.document_category,
        confidence: document.ai_confidence_score
      },

      // AI Extracted Data
      extractedData: {
        inspectionDate: document.inspection_date,
        nextDueDate: document.ai_next_due_date,
        inspectorName: document.inspector_name,
        inspectorCompany: document.inspector_company,
        certificateNumber: document.certificate_number,
        propertyAddress: document.property_address,
        complianceStatus: document.ai_compliance_status,
        rawExtractedData: document.extracted_data,
        confidenceScores: document.confidence_scores
      },

      // Verification Status
      verification: {
        verified: document.verified_by_user,
        verificationDate: document.verification_date,
        verificationNotes: document.verification_notes
      },

      // Processing metadata
      processing: {
        status: document.processing_status,
        processedDate: document.processed_date,
        aiModelVersion: document.ai_model_version
      }
    };

    console.log(`✅ Document status retrieved: ${document.processing_status}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error checking document status:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH endpoint to update document verification status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(cookies());
    const documentId = params.id;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { verified, verificationNotes, correctedData } = body;

    console.log(`📝 Updating document verification: ${documentId}`);

    // Verify user has access to this document
    const { data: document, error: docError } = await supabase
      .from('compliance_documents')
      .select('building_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check building access
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id')
      .eq('id', document.building_id)
      .eq('user_id', user.id)
      .single();

    if (buildingError || !building) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update AI extraction verification
    const { error: updateError } = await supabase
      .from('ai_document_extractions')
      .update({
        verified_by_user: verified,
        verification_user_id: user.id,
        verification_date: new Date().toISOString(),
        verification_notes: verificationNotes,
        // If corrected data is provided, update the extracted data
        ...(correctedData && {
          extracted_data: correctedData,
          inspection_date: correctedData.inspectionDate,
          next_due_date: correctedData.nextDueDate,
          inspector_name: correctedData.inspectorName,
          inspector_company: correctedData.inspectorCompany,
          certificate_number: correctedData.certificateNumber,
          compliance_status: correctedData.complianceStatus
        })
      })
      .eq('document_id', documentId);

    if (updateError) {
      console.error('❌ Failed to update verification:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update verification status',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Document verification updated successfully');
    return NextResponse.json({ success: true, message: 'Verification updated successfully' });

  } catch (error) {
    console.error('❌ Error updating document verification:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}