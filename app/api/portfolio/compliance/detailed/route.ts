import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching detailed compliance data for portfolio...');
    const supabase = createClient(cookies());
    
    // Get the current user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
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
          authError: sessionError?.message,
          user: session ? 'User exists' : 'No user'
        });
      } catch (debugError) {
        return NextResponse.json({ 
          success: false,
          error: 'Authentication required',
          debugError: debugError.message
        }, { status: 401 });
      }
    }

    const user = session.user;

    console.log('🔐 User authenticated:', user.id);

    // Get user's buildings - try multiple approaches
    let { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, is_hrb')
      .eq('user_id', user.id);
    
    // If no buildings found with user_id, try building_members table
    if ((!buildings || buildings.length === 0) && !buildingsError) {
      const { data: memberBuildings, error: memberError } = await supabase
        .from('building_members')
        .select('building_id, buildings!building_id(id, name, is_hrb)')
        .eq('user_id', user.id);
      
      if (!memberError && memberBuildings) {
        buildings = memberBuildings.map(m => m.buildings).filter(Boolean);
      }
    }
    
    // If still no buildings, try to get all buildings (for testing)
    if ((!buildings || buildings.length === 0) && !buildingsError) {
      console.log('No user-specific buildings found, trying to get all buildings for testing');
      const { data: allBuildings, error: allBuildingsError } = await supabase
        .from('buildings')
        .select('id, name, is_hrb')
        .limit(5);
      
      if (!allBuildingsError && allBuildings) {
        buildings = allBuildings;
      }
    }
    
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
        asset_id,
        status,
        last_renewed_date,
        last_carried_out,
        next_due_date,
        notes,
        inspector_provider,
        certificate_reference,
        contractor,
        created_at,
        updated_at,
        compliance_assets!asset_id (
          id,
          name,
          category,
          description,
          frequency_months
        ),
        buildings!building_id (
          id,
          name,
          is_hrb
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
      buildings: buildingMap.get(item.building_id) ? {
        ...buildingMap.get(item.building_id),
        id: buildingMap.get(item.building_id)!.id.toString()
      } : null
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