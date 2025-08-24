import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RX = /^[0-9a-fA-F-]{36}$/;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId') || '';
    
    console.log('🔍 Compliance debug request for building:', buildingId);
    
    if (!buildingId) {
      return NextResponse.json({ 
        error: 'buildingId parameter required',
        usage: '/api/compliance/debug?buildingId=uuid-here'
      }, { status: 400 });
    }
    
    if (!UUID_RX.test(buildingId)) {
      return NextResponse.json({ 
        error: 'Invalid buildingId format - must be valid UUID',
        received: buildingId
      }, { status: 400 });
    }

    console.log('✅ Building ID format valid, checking system status...');

    // Check system health across all compliance tables
    const [
      { data: building, error: buildingError },
      { data: complianceAssets, error: assetsError },
      { data: buildingAssets, error: buildingAssetsError },
      { data: complianceDocs, error: docsError }
    ] = await Promise.all([
      supabaseAdmin.from('buildings').select('id, name, address').eq('id', buildingId).maybeSingle(),
      supabaseAdmin.from('compliance_assets').select('id, title, category', { count: 'exact', head: true }),
      supabaseAdmin.from('building_compliance_assets').select('id, building_id, compliance_asset_id, status', { count: 'exact', head: true }).eq('building_id', buildingId),
      supabaseAdmin.from('compliance_documents').select('id, building_id, compliance_asset_id', { count: 'exact', head: true }).eq('building_id', buildingId)
    ]);

    // Check for errors
    const errors = [buildingError, assetsError, buildingAssetsError, docsError].filter(Boolean);
    if (errors.length > 0) {
      console.error('❌ Errors during system check:', errors);
      return NextResponse.json({ 
        error: 'System check failed',
        details: errors.map(e => e?.message || 'Unknown error'),
        buildingId
      }, { status: 500 });
    }

    // Check RLS status on compliance tables
    const rlsStatus = await Promise.all([
      supabaseAdmin.rpc('get_table_rls_status', { table_name: 'compliance_assets' }).catch(() => ({ data: null, error: { message: 'RPC not available' } })),
      supabaseAdmin.rpc('get_table_rls_status', { table_name: 'building_compliance_assets' }).catch(() => ({ data: null, error: { message: 'RPC not available' } })),
      supabaseAdmin.rpc('get_table_rls_status', { table_name: 'compliance_documents' }).catch(() => ({ data: null, error: { message: 'RPC not available' } }))
    ]);

    console.log('✅ System check completed successfully');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      buildingId,
      system: {
        building: {
          exists: !!building,
          name: building?.name || null,
          address: building?.address || null
        },
        compliance_assets: {
          count: complianceAssets?.count || complianceAssets?.length || 0,
          accessible: !assetsError
        },
        building_compliance_assets: {
          count: buildingAssets?.count || buildingAssets?.length || 0,
          accessible: !buildingAssetsError,
          for_building: buildingAssets?.length || 0
        },
        compliance_documents: {
          count: complianceDocs?.count || complianceDocs?.length || 0,
          accessible: !docsError,
          for_building: complianceDocs?.length || 0
        }
      },
      rls: {
        compliance_assets: rlsStatus[0]?.data || 'Unknown',
        building_compliance_assets: rlsStatus[1]?.data || 'Unknown',
        compliance_documents: rlsStatus[2]?.data || 'Unknown'
      },
      client: {
        serviceRoleUsed: true,
        supabaseAdmin: true
      },
      recommendations: [
        building ? null : 'Building not found - check building ID',
        (complianceAssets?.count || 0) === 0 ? 'No compliance assets defined - seed the compliance_assets table' : null,
        (buildingAssets?.count || 0) === 0 ? 'No compliance setup for this building - use setup API' : null,
        'All tables accessible via service role client'
      ].filter(Boolean)
    });

  } catch (err: any) {
    console.error('❌ Compliance debug error:', err);
    
    return NextResponse.json({ 
      error: err?.message ?? 'Internal error during debug',
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
