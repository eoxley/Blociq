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

    // Get property events
    const { data: events, error: eventsError } = await supabase
      .from('property_events')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(5);

    if (eventsError) {
      console.error('Error fetching property events:', eventsError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch property events',
        details: eventsError.message
      }, { status: 500 });
    }

    console.log('✅ Found', events?.length || 0, 'property events');

    return NextResponse.json({
      success: true,
      data: events || []
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
