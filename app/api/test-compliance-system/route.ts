import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing compliance system...');
    
    // Test 1: Check if compliance_assets table exists and has data
    console.log('📊 Test 1: Checking compliance_assets table...');
    const { data: assets, error: assetsError } = await supabaseAdmin
      .from('compliance_assets')
      .select('id, title, category, description')
      .limit(5);
    
    if (assetsError) {
      console.error('❌ compliance_assets table error:', assetsError);
      return NextResponse.json({ 
        error: 'compliance_assets table not accessible', 
        details: assetsError.message 
      }, { status: 500 });
    }
    
    console.log('✅ compliance_assets table accessible, found:', assets?.length || 0, 'assets');
    
    // Test 2: Check if building_compliance_assets table exists and has data
    console.log('📊 Test 2: Checking building_compliance_assets table...');
    const { data: buildingAssets, error: buildingAssetsError } = await supabaseAdmin
      .from('building_compliance_assets')
      .select('id, building_id, compliance_asset_id, status')
      .limit(5);
    
    if (buildingAssetsError) {
      console.error('❌ building_compliance_assets table error:', buildingAssetsError);
      return NextResponse.json({ 
        error: 'building_compliance_assets table not accessible', 
        details: buildingAssetsError.message 
      }, { status: 500 });
    }
    
    console.log('✅ building_compliance_assets table accessible, found:', buildingAssets?.length || 0, 'records');
    
    // Test 3: Check if buildings table exists and has data
    console.log('📊 Test 3: Checking buildings table...');
    const { data: buildings, error: buildingsError } = await supabaseAdmin
      .from('buildings')
      .select('id, name')
      .limit(5);
    
    if (buildingsError) {
      console.error('❌ buildings table error:', buildingsError);
      return NextResponse.json({ 
        error: 'buildings table not accessible', 
        details: buildingsError.message 
      }, { status: 500 });
    }
    
    console.log('✅ buildings table accessible, found:', buildings?.length || 0, 'buildings');
    
    // Test 4: Test a join query between the tables
    console.log('📊 Test 4: Testing join query...');
    const { data: joinTest, error: joinError } = await supabaseAdmin
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        compliance_asset_id,
        status,
        buildings!inner(name),
        compliance_assets!inner(title, category)
      `)
      .limit(3);
    
    if (joinError) {
      console.error('❌ Join query error:', joinError);
      return NextResponse.json({ 
        error: 'Join query failed', 
        details: joinError.message 
      }, { status: 500 });
    }
    
    console.log('✅ Join query successful, found:', joinTest?.length || 0, 'records');
    
    // Test 5: Check column names in building_compliance_assets
    console.log('📊 Test 5: Checking column names...');
    const { data: columnInfo, error: columnError } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: 'building_compliance_assets' })
      .catch(() => ({ data: null, error: { message: 'RPC function not available' } }));
    
    console.log('📋 Column info:', columnInfo || 'RPC function not available');
    
    console.log('🎉 Compliance system test completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Compliance system test completed successfully',
      timestamp: new Date().toISOString(),
      tests: {
        compliance_assets_table: { 
          accessible: true, 
          record_count: assets?.length || 0, 
          sample_data: assets?.slice(0, 2) || [] 
        },
        building_compliance_assets_table: { 
          accessible: true, 
          record_count: buildingAssets?.length || 0, 
          sample_data: buildingAssets?.slice(0, 2) || [] 
        },
        buildings_table: { 
          accessible: true, 
          record_count: buildings?.length || 0, 
          sample_data: buildings?.slice(0, 2) || [] 
        },
        join_query: { 
          successful: true, 
          record_count: joinTest?.length || 0, 
          sample_data: joinTest?.slice(0, 2) || [] 
        },
        column_info: columnInfo || 'Not available'
      },
      summary: {
        tables_accessible: true,
        joins_working: true,
        system_ready: true
      }
    });
    
  } catch (error) {
    console.error('❌ Compliance system test failed:', error);
    return NextResponse.json({ 
      error: 'Compliance system test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
