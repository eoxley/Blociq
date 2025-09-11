/**
 * Property Events API
 * Fetches property events for the homepage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📅 Fetching property events for homepage...');
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (sessionError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log('🔐 User authenticated:', user.id);

    // Get property events (both manual and synced from calendar)
    const { data: events, error: eventsError } = await supabase
      .from('property_events')
      .select(`
        *,
        buildings (
          id,
          name,
          address
        )
      `)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(10);

    if (eventsError) {
      console.error('Error fetching property events:', eventsError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch property events',
        details: eventsError.message
      }, { status: 500 });
    }

    console.log('✅ Found', events?.length || 0, 'property events');

    // Transform events to include building information and proper formatting
    const transformedEvents = (events || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      event_type: event.event_type,
      category: event.category,
      location: event.location,
      building: event.buildings?.name || 'Unknown Building',
      building_id: event.building_id,
      outlook_event_id: event.outlook_event_id,
      created_at: event.created_at,
      updated_at: event.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: transformedEvents
    });

  } catch (error) {
    console.error('❌ Property events API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
