import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { cookies } from "next/headers";

export const runtime = 'nodejs';

// GET endpoint for fetching asset details with documents
export async function GET(
  req: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = await createClient();
    
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

    console.log('🔍 [Asset API] Fetching asset:', { buildingId, assetId, userId: user.id });

    // First, try to fetch by building_compliance_assets.id (direct ID)
    let assetData, assetError;

    const { data: directAsset, error: directError } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets!asset_id (
          id,
          name,
          category,
          description,
          frequency_months
        )
      `)
      .eq('building_id', buildingId)
      .eq('id', assetId)
      .single();

    if (directAsset) {
      assetData = directAsset;
      assetError = directError;
    } else {
      // Fallback: try by compliance_asset_id (asset reference)
      const { data: refAsset, error: refError } = await supabase
        .from('building_compliance_assets')
        .select(`
          *,
          compliance_assets!asset_id (
            id,
            name,
            category,
            description,
            frequency_months
          )
        `)
        .eq('building_id', buildingId)
        .eq('asset_id', assetId)
        .single();

      assetData = refAsset;
      assetError = refError;
    }

    console.log('🔍 [Asset API] Query result:', { assetData, assetError });

    if (assetError || !assetData) {
      console.error('Asset fetch error:', assetError);
      return NextResponse.json({ 
        error: "Asset not found or access denied" 
      }, { status: 404 });
    }

    // Get documents separately to avoid complex join issues
    // Use the actual asset_id from the building compliance asset
    const actualAssetId = assetData.asset_id || assetId;

    const { data: documents, error: docError } = await supabase
      .from('compliance_documents')
      .select(`
        id,
        original_filename,
        file_type,
        file_size,
        document_type,
        document_category,
        ai_confidence_score,
        upload_date,
        processing_status,
        is_current_version
      `)
      .eq('building_id', buildingId)
      .eq('compliance_asset_id', actualAssetId)
      .order('upload_date', { ascending: false });

    console.log('🔍 [Asset API] Documents query:', { documents, docError });

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
        document_count: documents?.length || 0,
        latest_upload_date: documents?.[0]?.upload_date || null
      },
      documents: documents?.map((doc: any) => ({
        id: doc.id,
        original_filename: doc.original_filename,
        file_type: doc.file_type,
        file_size: doc.file_size,
        document_type: doc.document_type,
        document_category: doc.document_category,
        ai_confidence_score: doc.ai_confidence_score,
        upload_date: doc.upload_date,
        processing_status: doc.processing_status,
        is_current_version: doc.is_current_version
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
    const supabase = await createClient();
    
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

    console.log('🔍 [Asset UPDATE] Request:', { buildingId, assetId: params.assetId, status, userId: user.id });

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
    // Try updating by ID first, then by asset_id if that fails
    let updatedAsset, updateError;

    const updateData = {
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
    };

    // First try by building_compliance_assets.id
    const { data: directUpdate, error: directUpdateError } = await supabase
      .from('building_compliance_assets')
      .update(updateData)
      .eq('building_id', buildingId)
      .eq('id', params.assetId)
      .select()
      .single();

    if (directUpdate) {
      updatedAsset = directUpdate;
      updateError = directUpdateError;
    } else {
      // Fallback: try by asset_id
      const { data: refUpdate, error: refUpdateError } = await supabase
        .from('building_compliance_assets')
        .update(updateData)
        .eq('building_id', buildingId)
        .eq('asset_id', params.assetId)
        .select()
        .single();

      updatedAsset = refUpdate;
      updateError = refUpdateError;
    }

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