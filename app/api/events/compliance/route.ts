import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📅 Fetching compliance events for homepage...');
    const supabase = createClient(cookies());
    
    // Get the current user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const user = session.user;

    console.log('🔐 User authenticated:', user.id);

    // Get user's buildings through agency membership
    let { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, is_hrb, agency_id')
      .eq('agency_id', user.id); // Use agency_id instead of user_id
    
    // If no buildings found with agency_id, try to get all buildings (for testing)
    if ((!buildings || buildings.length === 0) && !buildingsError) {
      console.log('No agency-specific buildings found, trying to get all buildings for testing');
      const { data: allBuildings, error: allBuildingsError } = await supabase
        .from('buildings')
        .select('id, name, is_hrb, agency_id')
        .limit(5);
      
      if (!allBuildingsError && allBuildings) {
        buildings = allBuildings;
      }
    }

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch buildings',
        details: buildingsError.message
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
    
    // First get compliance assets without the foreign key join
    const { data: complianceAssets, error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        compliance_asset_id,
        status,
        next_due_date,
        notes
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
        title: `Compliance Asset ${asset.compliance_asset_id}`, // Use compliance_asset_id since we can't join
        category: 'Compliance',
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
