import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching detailed compliance data for portfolio...');
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log('🔐 User authenticated:', user.id);

    // Get user's buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, is_hrb')
      .or(`user_id.eq.${user.id},id.in.(select building_id from building_members where user_id = '${user.id}')`);
    
    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch buildings'
      }, { status: 500 });
    }

    if (!buildings || buildings.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const buildingIds = buildings.map(b => b.id);
    console.log('🏢 Found', buildings.length, 'buildings for user');

    // Get all building compliance assets with full details
    const { data: complianceData, error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        compliance_asset_id,
        due_date,
        document_id,
        status,
        last_renewed_date,
        next_due_date,
        notes,
        contractor,
        created_at,
        updated_at,
        compliance_assets (
          id,
          name,
          category,
          description,
          frequency_months
        ),
        compliance_documents (
          id,
          document_url,
          created_at
        )
      `)
      .in('building_id', buildingIds)
      .order('next_due_date', { ascending: true });

    if (complianceError) {
      console.error('Error fetching compliance data:', complianceError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch compliance data'
      }, { status: 500 });
    }

    // Create building lookup map
    const buildingMap = new Map(buildings.map(b => [b.id, b]));

    // Transform the data to include building information
    const transformedData = (complianceData || []).map(item => ({
      ...item,
      buildings: buildingMap.get(item.building_id)
    }));

    console.log('✅ Detailed compliance data fetched:', transformedData.length, 'assets');

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: transformedData.length
    });

  } catch (error) {
    console.error('❌ Detailed compliance API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}