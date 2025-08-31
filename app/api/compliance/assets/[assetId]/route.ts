import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from "next/headers";

export const runtime = 'nodejs';

// GET endpoint for fetching asset details with documents
export async function GET(
  req: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assetId = params.assetId;
    const buildingId = new URL(req.url).searchParams.get('buildingId');

    if (!buildingId) {
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    // Get building compliance asset with related data
    const { data: assetData, error: assetError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (
          id,
          name,
          category,
          description,
          frequency_months
        ),
        compliance_documents (
          id,
          original_filename,
          file_type,
          file_size,
          document_type,
          document_category,
          ai_confidence_score,
          upload_date,
          processing_status,
          ai_document_extractions (
            inspection_date,
            next_due_date,
            inspector_name,
            inspector_company,
            certificate_number,
            compliance_status,
            verified_by_user
          )
        )
      `)
      .eq('building_id', buildingId)
      .eq('compliance_asset_id', assetId)
      .single();

    if (assetError || !assetData) {
      console.error('Asset fetch error:', assetError);
      return NextResponse.json({ 
        error: "Asset not found or access denied" 
      }, { status: 404 });
    }

    // Transform the response
    const responseData = {
      asset: {
        bca_id: assetData.id,
        asset_id: assetData.compliance_asset_id,
        building_id: assetData.building_id,
        asset_name: assetData.compliance_assets?.name || "Unknown",
        category: assetData.compliance_assets?.category || "Unknown",
        description: assetData.compliance_assets?.description || "",
        frequency_months: assetData.compliance_assets?.frequency_months || assetData.frequency_months,
        
        // Current asset state
        status: assetData.status,
        last_renewed_date: assetData.last_renewed_date,
        last_carried_out: assetData.last_carried_out,
        next_due_date: assetData.next_due_date,
        notes: assetData.notes,
        contractor: assetData.contractor,
        inspector_provider: assetData.inspector_provider,
        certificate_reference: assetData.certificate_reference,
        override_reason: assetData.override_reason,
        
        // Document statistics
        document_count: assetData.document_count || 0,
        latest_upload_date: assetData.latest_upload_date
      },
      documents: assetData.compliance_documents?.map((doc: any) => ({
        id: doc.id,
        filename: doc.original_filename,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        documentType: doc.document_type,
        category: doc.document_category,
        confidence: doc.ai_confidence_score,
        uploadDate: doc.upload_date,
        processingStatus: doc.processing_status,
        extractedData: doc.ai_document_extractions?.[0] || null
      })) || [],
      success: true
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error fetching asset details:", error);
    return NextResponse.json(
      { error: "Failed to fetch asset details" },
      { status: 500 }
    );
  }
}

// PUT endpoint for updating asset details
export async function PUT(
  req: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      buildingId,
      status,
      lastRenewedDate,
      lastCarriedOut,
      nextDueDate,
      notes,
      contractor,
      inspectorProvider,
      certificateReference,
      overrideReason,
      frequencyMonths
    } = body;

    if (!buildingId) {
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    // Calculate next due date if frequency is provided and last carried out changed
    let calculatedNextDue = nextDueDate;
    if (lastCarriedOut && frequencyMonths) {
      const lastDate = new Date(lastCarriedOut);
      lastDate.setMonth(lastDate.getMonth() + frequencyMonths);
      calculatedNextDue = lastDate.toISOString().split('T')[0];
      console.log(`📅 Calculated next due date: ${calculatedNextDue} (${frequencyMonths} months from ${lastCarriedOut})`);
    }

    // Update building compliance asset
    const { data: updatedAsset, error: updateError } = await supabase
      .from('building_compliance_assets')
      .update({
        status,
        last_renewed_date: lastRenewedDate,
        last_carried_out: lastCarriedOut,
        next_due_date: calculatedNextDue,
        notes,
        contractor,
        inspector_provider: inspectorProvider,
        certificate_reference: certificateReference,
        override_reason: overrideReason,
        frequency_months: frequencyMonths,
        updated_at: new Date().toISOString()
      })
      .eq('building_id', buildingId)
      .eq('compliance_asset_id', params.assetId)
      .select()
      .single();

    if (updateError || !updatedAsset) {
      console.error('Asset update error:', updateError);
      return NextResponse.json({ 
        error: "Failed to update asset",
        details: updateError?.message 
      }, { status: 500 });
    }

    console.log(`✅ Updated building compliance asset: ${updatedAsset.id}`);

    return NextResponse.json({
      message: "Asset updated successfully",
      asset: updatedAsset,
      calculatedNextDue: calculatedNextDue !== nextDueDate ? calculatedNextDue : null,
      success: true
    });

  } catch (error) {
    console.error("Error updating asset:", error);
    return NextResponse.json(
      { 
        error: "Failed to update asset",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}