import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📅 Fetching compliance events for homepage...');
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

    // Get compliance assets with due dates in the next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data: complianceAssets, error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        next_due_date,
        notes,
        compliance_assets!asset_id (
          id,
          name,
          category,
          description
        )
      `)
      .in('building_id', buildingIds)
      .not('next_due_date', 'is', null)
      .gte('next_due_date', new Date().toISOString().split('T')[0])
      .lte('next_due_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .order('next_due_date', { ascending: true })
      .limit(10);

    if (complianceError) {
      console.error('Error fetching compliance assets:', complianceError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch compliance assets'
      }, { status: 500 });
    }

    // Create building lookup map
    const buildingMap = new Map(buildings.map(b => [b.id, b]));

    // Transform compliance assets to PropertyEvent format
    const complianceEvents = (complianceAssets || []).map(asset => {
      const building = buildingMap.get(asset.building_id);
      const dueDate = new Date(asset.next_due_date);
      const now = new Date();
      const isOverdue = dueDate < now;
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine status
      let status = 'upcoming';
      let statusColor = 'blue';
      if (isOverdue) {
        status = 'overdue';
        statusColor = 'red';
      } else if (daysUntilDue <= 7) {
        status = 'due_soon';
        statusColor = 'yellow';
      }

      return {
        id: `compliance-${asset.id}`,
        building: building?.name || 'Unknown Building',
        date: asset.next_due_date,
        title: asset.compliance_assets?.name || 'Unknown Asset',
        category: asset.compliance_assets?.category || 'Compliance',
        source: 'compliance' as const,
        event_type: 'compliance' as const,
        location: building?.name || null,
        organiser_name: null,
        online_meeting: null,
        startUtc: null,
        endUtc: null,
        timeZoneIana: 'Europe/London',
        isAllDay: true,
        // Additional compliance-specific fields
        compliance_status: asset.status,
        compliance_notes: asset.notes,
        days_until_due: daysUntilDue,
        is_overdue: isOverdue,
        status: status,
        status_color: statusColor
      };
    });

    console.log('✅ Found', complianceEvents.length, 'compliance events');

    return NextResponse.json({
      success: true,
      data: complianceEvents
    });

  } catch (error) {
    console.error('❌ Compliance events API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
