import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

// GET endpoint for fetching specific building compliance asset
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string; assetId: string }> }
) {
  try {
    const { buildingId, assetId } = await params;
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🔍 Fetching compliance asset: buildingId=${buildingId}, assetId=${assetId}`);

    // Get building compliance asset with related data
    const { data: assetData, error: assetError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        compliance_asset_id,
        status,
        last_carried_out,
        next_due_date,
        inspector_provider,
        certificate_reference,
        override_reason,
        notes,
        contractor,
        created_at,
        updated_at,
        buildings (
          id,
          name
        ),
        compliance_assets (
          id,
          name,
          category,
          description,
          frequency_months
        )
      `)
      .eq('building_id', parseInt(buildingId))
      .eq('compliance_asset_id', assetId)
      .single();

    if (assetError) {
      console.error('Asset fetch error:', assetError);
      
      // If no data found, return 404
      if (assetError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: "Asset not found",
          details: `No compliance asset found for building ${buildingId} and asset ${assetId}`
        }, { status: 404 });
      }
      
      // Other database errors
      return NextResponse.json({ 
        error: "Database error",
        details: assetError.message
      }, { status: 500 });
    }

    if (!assetData) {
      return NextResponse.json({ 
        error: "Asset not found" 
      }, { status: 404 });
    }

    // Fetch associated documents
    const { data: documents, error: docsError } = await supabase
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
        file_path
      `)
      .eq('building_id', parseInt(buildingId))
      .eq('building_compliance_asset_id', assetData.id)
      .order('upload_date', { ascending: false });

    if (docsError) {
      console.warn('Documents fetch error (non-critical):', docsError);
    }

    // Transform the response to match frontend expectations
    const responseData = {
      success: true,
      asset: {
        // Building compliance asset data
        bca_id: assetData.id,
        building_id: assetData.building_id,
        asset_id: assetData.compliance_asset_id,
        status: assetData.status,
        last_carried_out: assetData.last_carried_out,
        next_due_date: assetData.next_due_date,
        inspector_provider: assetData.inspector_provider,
        certificate_reference: assetData.certificate_reference,
        override_reason: assetData.override_reason,
        notes: assetData.notes,
        contractor: assetData.contractor,
        created_at: assetData.created_at,
        updated_at: assetData.updated_at,
        
        // Asset details
        asset_name: assetData.compliance_assets?.name,
        category: assetData.compliance_assets?.category,
        description: assetData.compliance_assets?.description,
        frequency_months: assetData.compliance_assets?.frequency_months,
        
        // Document metadata
        document_count: documents?.length || 0,
        latest_upload_date: documents?.[0]?.upload_date || null,
        
        // Building info
        building_name: assetData.buildings?.name
      },
      documents: documents || [],
      metadata: {
        buildingId: parseInt(buildingId),
        assetId: assetId,
        fetchedAt: new Date().toISOString()
      }
    };

    console.log(`✅ Asset data fetched successfully: ${assetData.compliance_assets?.name}`);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in compliance asset GET endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT endpoint for updating compliance asset
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string; assetId: string }> }
) {
  try {
    const { buildingId, assetId } = await params;
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log(`📝 Updating compliance asset: buildingId=${buildingId}, assetId=${assetId}`);

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only include fields that are provided
    if (body.status !== undefined) updateData.status = body.status;
    if (body.last_carried_out !== undefined) updateData.last_carried_out = body.last_carried_out;
    if (body.next_due_date !== undefined) updateData.next_due_date = body.next_due_date;
    if (body.inspector_provider !== undefined) updateData.inspector_provider = body.inspector_provider;
    if (body.certificate_reference !== undefined) updateData.certificate_reference = body.certificate_reference;
    if (body.override_reason !== undefined) updateData.override_reason = body.override_reason;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.contractor !== undefined) updateData.contractor = body.contractor;

    // Update the asset
    const { data: updatedAsset, error: updateError } = await supabase
      .from('building_compliance_assets')
      .update(updateData)
      .eq('building_id', parseInt(buildingId))
      .eq('compliance_asset_id', assetId)
      .select()
      .single();

    if (updateError) {
      console.error('Asset update error:', updateError);
      return NextResponse.json({
        error: 'Failed to update asset',
        details: updateError.message
      }, { status: 500 });
    }

    if (!updatedAsset) {
      return NextResponse.json({
        error: 'Asset not found or no changes made'
      }, { status: 404 });
    }

    console.log(`✅ Asset updated successfully: ${assetId}`);
    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      message: 'Asset updated successfully'
    });

  } catch (error) {
    console.error('Error in compliance asset PUT endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
