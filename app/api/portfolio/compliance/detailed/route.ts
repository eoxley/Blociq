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
      console.log('⚠️ Authentication failed, returning debug info');
      
      // Return debug info instead of failing
      try {
        const { data: allBuildings } = await supabase
          .from('buildings')
          .select('id, name, is_hrb')
          .limit(5);
          
        const { data: allAssets } = await supabase
          .from('building_compliance_assets')
          .select('id, building_id, status')
          .limit(10);
          
        return NextResponse.json({
          success: false,
          debug: true,
          error: 'Authentication required',
          buildings: allBuildings || [],
          assets: allAssets || [],
          authError: authError?.message,
          user: user ? 'User exists' : 'No user'
        });
      } catch (debugError) {
        return NextResponse.json({ 
          success: false,
          error: 'Authentication required',
          debugError: debugError.message
        }, { status: 401 });
      }
    }

    console.log('🔐 User authenticated:', user.id);

    // Get user's buildings - use same pattern as working overview API
    let { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, is_hrb')
      .eq('user_id', user.id);
    
    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError);
      // Try fallback approach if user_id column doesn't exist
      const { data: fallbackBuildings, error: fallbackError } = await supabase
        .from('buildings')
        .select('id, name, is_hrb');
      
      if (fallbackError) {
        return NextResponse.json({ 
          success: false,
          error: 'Failed to fetch buildings'
        }, { status: 500 });
      }
      
      console.log('Using fallback buildings query');
      // Filter to user buildings if we have building members table
      try {
        const { data: memberBuildings } = await supabase
          .from('building_members')
          .select('building_id')
          .eq('user_id', user.id);
        
        const memberBuildingIds = memberBuildings?.map(m => m.building_id) || [];
        const userBuildings = fallbackBuildings?.filter(b => memberBuildingIds.includes(b.id)) || [];
        
        buildings = userBuildings;
      } catch {
        // If building_members doesn't exist, return all buildings for now
        console.log('Building members table not available, returning all buildings');
        buildings = fallbackBuildings || [];
      }
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