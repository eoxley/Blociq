import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

// GET endpoint for fetching building compliance overview
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    const { buildingId } = await params;
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🏢 Fetching compliance data for building: ${buildingId}`);

    // Get building information
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name, address, floors, is_hrb')
      .eq('id', parseInt(buildingId))
      .single();

    if (buildingError || !building) {
      return NextResponse.json({
        error: 'Building not found',
        details: buildingError?.message || 'Building does not exist'
      }, { status: 404 });
    }

    // Get all compliance assets for this building
    const { data: assets, error: assetsError } = await supabase
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
        notes,
        contractor,
        created_at,
        updated_at,
        compliance_assets (
          id,
          name,
          category,
          description,
          frequency_months,
          is_required,
          is_hrb_related
        )
      `)
      .eq('building_id', parseInt(buildingId))
      .order('created_at', { ascending: false });

    if (assetsError) {
      console.warn('Assets fetch error (returning empty):', assetsError);
    }

    // Get document counts for each asset
    const assetIds = assets?.map(asset => asset.id) || [];
    let documentCounts: Record<string, number> = {};

    if (assetIds.length > 0) {
      const { data: docCounts } = await supabase
        .from('compliance_documents')
        .select('building_compliance_asset_id')
        .eq('building_id', parseInt(buildingId))
        .in('building_compliance_asset_id', assetIds);

      if (docCounts) {
        documentCounts = docCounts.reduce((acc, doc) => {
          const assetId = doc.building_compliance_asset_id;
          acc[assetId] = (acc[assetId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Transform assets for frontend
    const transformedAssets = (assets || []).map(asset => ({
      id: asset.id,
      building_id: asset.building_id,
      asset_type: asset.compliance_asset_id,
      asset_name: asset.compliance_assets?.name,
      category: asset.compliance_assets?.category,
      description: asset.compliance_assets?.description,
      frequency_months: asset.compliance_assets?.frequency_months,
      is_required: asset.compliance_assets?.is_required,
      is_hrb_related: asset.compliance_assets?.is_hrb_related,
      status: asset.status,
      last_carried_out: asset.last_carried_out,
      next_due_date: asset.next_due_date,
      inspector_provider: asset.inspector_provider,
      certificate_reference: asset.certificate_reference,
      notes: asset.notes,
      contractor: asset.contractor,
      document_count: documentCounts[asset.id] || 0,
      created_at: asset.created_at,
      updated_at: asset.updated_at
    }));

    // Calculate compliance statistics
    const totalAssets = transformedAssets.length;
    const compliantAssets = transformedAssets.filter(asset => asset.status === 'Compliant').length;
    const overdue = transformedAssets.filter(asset => {
      if (!asset.next_due_date) return false;
      return new Date(asset.next_due_date) < new Date();
    }).length;
    const dueSoon = transformedAssets.filter(asset => {
      if (!asset.next_due_date) return false;
      const dueDate = new Date(asset.next_due_date);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= thirtyDaysFromNow;
    }).length;

    const responseData = {
      success: true,
      data: {
        building: {
          id: building.id,
          name: building.name,
          address: building.address,
          floors: building.floors,
          is_hrb: building.is_hrb
        },
        assets: transformedAssets,
        statistics: {
          total: totalAssets,
          compliant: compliantAssets,
          overdue: overdue,
          due_soon: dueSoon,
          compliance_rate: totalAssets > 0 ? Math.round((compliantAssets / totalAssets) * 100) : 0
        },
        metadata: {
          fetchedAt: new Date().toISOString(),
          buildingId: parseInt(buildingId)
        }
      }
    };

    console.log(`✅ Compliance data fetched: ${totalAssets} assets, ${compliantAssets} compliant`);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in building compliance GET endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint for adding new compliance assets to building
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    const { buildingId } = await params;
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { asset_ids, status = 'Missing' } = body;

    if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
      return NextResponse.json({
        error: 'Invalid request',
        details: 'asset_ids array is required'
      }, { status: 400 });
    }

    console.log(`➕ Adding ${asset_ids.length} compliance assets to building ${buildingId}`);

    // Prepare insert data
    const insertData = asset_ids.map(assetId => ({
      building_id: parseInt(buildingId),
      compliance_asset_id: assetId,
      status: status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert assets (use upsert to handle duplicates)
    const { data: insertedAssets, error: insertError } = await supabase
      .from('building_compliance_assets')
      .upsert(insertData, {
        onConflict: 'building_id,compliance_asset_id'
      })
      .select();

    if (insertError) {
      console.error('Asset insertion error:', insertError);
      return NextResponse.json({
        error: 'Failed to add assets',
        details: insertError.message
      }, { status: 500 });
    }

    console.log(`✅ Successfully added/updated ${insertedAssets?.length || 0} compliance assets`);
    return NextResponse.json({
      success: true,
      assets: insertedAssets,
      message: `Successfully added ${insertedAssets?.length || 0} compliance assets`
    });

  } catch (error) {
    console.error('Error in building compliance POST endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
