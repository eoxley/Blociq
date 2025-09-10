import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📅 Fetching upcoming compliance events for AI assistant...');
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

    // Get user's buildings - try multiple approaches
    let { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('user_id', user.id);
    
    // If no buildings found with user_id, try building_members table
    if ((!buildings || buildings.length === 0) && !buildingsError) {
      const { data: memberBuildings, error: memberError } = await supabase
        .from('building_members')
        .select('building_id, buildings!building_id(id, name)')
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
        .select('id, name')
        .limit(5);
      
      if (!allBuildingsError && allBuildings) {
        buildings = allBuildings;
      }
    }

    if (buildingsError || !buildings || buildings.length === 0) {
      console.log('No buildings found for user');
      return NextResponse.json({
        success: true,
        data: {
          summary: "No buildings found. Please contact support to set up building access.",
          upcomingEvents: []
        }
      });
    }

    const buildingIds = buildings.map(b => b.id);
    console.log('🏢 Found', buildings.length, 'buildings for user');

    // Calculate date range (next 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Get upcoming compliance assets
    const { data: complianceData, error: complianceError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        next_due_date,
        compliance_assets!asset_id (
          name,
          category,
          description
        ),
        buildings!building_id (
          id,
          name
        )
      `)
      .in('building_id', buildingIds)
      .gte('next_due_date', today.toISOString().split('T')[0])
      .lte('next_due_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .order('next_due_date', { ascending: true });

    if (complianceError) {
      console.error('Error fetching compliance data:', complianceError);
      return NextResponse.json({
        success: true,
        data: {
          summary: "Unable to load compliance summary at this time.",
          upcomingEvents: []
        }
      });
    }

    console.log('📋 Found', complianceData?.length || 0, 'upcoming compliance events');

    // Transform data for AI processing
    const upcomingEvents = (complianceData || []).map(asset => ({
      building: asset.buildings?.name || 'Unknown Building',
      asset: asset.compliance_assets?.name || 'Unknown Asset',
      due_date: asset.next_due_date,
      status: asset.status,
      category: asset.compliance_assets?.category || 'Unknown',
      days_until_due: asset.next_due_date ? 
        Math.ceil((new Date(asset.next_due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0
    }));

    // Generate AI summary
    let summary = "";
    
    if (upcomingEvents.length === 0) {
      summary = "All compliance assets are currently up to date. No upcoming compliance events in the next 30 days.";
    } else {
      // Group by days until due
      const urgent = upcomingEvents.filter(e => e.days_until_due <= 7);
      const upcoming = upcomingEvents.filter(e => e.days_until_due > 7 && e.days_until_due <= 14);
      const later = upcomingEvents.filter(e => e.days_until_due > 14);

      summary = `You have ${upcomingEvents.length} compliance item${upcomingEvents.length === 1 ? '' : 's'} due in the next 30 days:\n\n`;

      if (urgent.length > 0) {
        summary += `🚨 **URGENT (Next 7 days):**\n`;
        urgent.forEach(event => {
          const dueDate = new Date(event.due_date).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short' 
          });
          summary += `• ${event.asset} at ${event.building} – due ${dueDate} (${event.days_until_due} days)\n`;
        });
        summary += `\n`;
      }

      if (upcoming.length > 0) {
        summary += `⚠️ **Upcoming (8-14 days):**\n`;
        upcoming.forEach(event => {
          const dueDate = new Date(event.due_date).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short' 
          });
          summary += `• ${event.asset} at ${event.building} – due ${dueDate} (${event.days_until_due} days)\n`;
        });
        summary += `\n`;
      }

      if (later.length > 0) {
        summary += `📅 **Later (15-30 days):**\n`;
        later.forEach(event => {
          const dueDate = new Date(event.due_date).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short' 
          });
          summary += `• ${event.asset} at ${event.building} – due ${dueDate} (${event.days_until_due} days)\n`;
        });
      }

      // Add status summary
      const statusCounts = upcomingEvents.reduce((acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      summary += `\n**Status Summary:** `;
      const statusParts = Object.entries(statusCounts).map(([status, count]) => 
        `${count} ${status}`
      );
      summary += statusParts.join(', ') + '.';
    }

    console.log('✅ Generated compliance summary:', summary.substring(0, 100) + '...');

    return NextResponse.json({ 
      summary,
      upcomingEvents,
      totalCount: upcomingEvents.length,
      buildingCount: buildings.length
    });

  } catch (error) {
    console.error('❌ Compliance upcoming API error:', error);
    return NextResponse.json({ 
      summary: "Unable to load compliance summary at this time.",
      upcomingEvents: []
    });
  }
}
