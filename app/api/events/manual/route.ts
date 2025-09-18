/**
 * Manual Events API
 * Fetches manual events for the homepage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📅 Fetching manual events for homepage...');
    const supabase = await createClient();

    // Get the current user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    const user = session?.user;
    
    if (sessionError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log('🔐 User authenticated:', user.id);

    // Get manual events
    const { data: events, error: eventsError } = await supabase
      .from('manual_events')
      .select('*')
      .gte('start_time', new Date().toISOString().split('T')[0])
      .order('start_time', { ascending: true })
      .limit(5);

    if (eventsError) {
      console.error('Error fetching manual events:', eventsError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch manual events',
        details: eventsError.message
      }, { status: 500 });
    }

    console.log('✅ Found', events?.length || 0, 'manual events');

    return NextResponse.json({
      success: true,
      data: events || []
    });

  } catch (error) {
    console.error('❌ Manual events API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
