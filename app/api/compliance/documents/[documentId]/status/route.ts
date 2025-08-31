import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from "next/headers";

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    console.log(`📊 Checking status for document: ${params.documentId}`);
    
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get document with AI extraction data
    const { data: document, error: docError } = await supabase
      .from("compliance_documents")
      .select(`
        id,
        processing_status,
        document_type,
        document_category,
        ai_confidence_score,
        processed_date,
        building_id,
        ai_document_extractions (
          id,
          extracted_data,
          confidence_scores,
          inspection_date,
          next_due_date,
          inspector_name,
          inspector_company,
          certificate_number,
          compliance_status,
          verified_by_user
        )
      `)
      .eq('id', params.documentId)
      .eq('uploaded_by_user_id', user.id) // Ensure user owns this document
      .single();

    if (docError || !document) {
      console.error("❌ Document not found or access denied:", docError);
      return NextResponse.json({ 
        error: "Document not found or access denied" 
      }, { status: 404 });
    }

    const extraction = document.ai_document_extractions?.[0];

    const responseData = {
      documentId: document.id,
      processingStatus: document.processing_status,
      processedDate: document.processed_date,
      aiClassification: {
        documentType: document.document_type,
        category: document.document_category,
        confidence: document.ai_confidence_score
      },
      extractedData: extraction ? {
        inspectionDate: extraction.inspection_date,
        nextDueDate: extraction.next_due_date,
        inspectorName: extraction.inspector_name,
        inspectorCompany: extraction.inspector_company,
        certificateNumber: extraction.certificate_number,
        complianceStatus: extraction.compliance_status,
        fullData: extraction.extracted_data,
        confidenceScores: extraction.confidence_scores,
        verified: extraction.verified_by_user
      } : null
    };

    console.log(`✅ Status retrieved for document ${params.documentId}: ${document.processing_status}`);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Error checking document status:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}