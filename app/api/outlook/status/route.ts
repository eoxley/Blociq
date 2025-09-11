/**
 * Outlook Connection Status API
 * Checks if user has connected Outlook and provides sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking Outlook connection status...');
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (sessionError || !user) {
      return NextResponse.json({ 
        connected: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log('🔐 User authenticated:', user.id);

    // Check if user has valid Outlook tokens
    const { data: tokens, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokens) {
      console.log('❌ No Outlook tokens found');
      return NextResponse.json({
        connected: false,
        message: 'Outlook not connected'
      });
    }

    // Check if token is expired
    const isExpired = new Date(tokens.expires_at) < new Date();
    
    if (isExpired) {
      console.log('⚠️ Outlook token expired');
      return NextResponse.json({
        connected: false,
        message: 'Outlook session expired',
        expired: true
      });
    }

    // Get event count from property_events table
    const { data: events, error: eventsError } = await supabase
      .from('property_events')
      .select('id, created_at')
      .eq('created_by', user.id)
      .not('outlook_event_id', 'is', null);

    const eventCount = events?.length || 0;
    const lastSync = events?.length > 0 
      ? events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
      : null;

    console.log('✅ Outlook connection status:', {
      connected: true,
      eventCount,
      lastSync
    });

    return NextResponse.json({
      connected: true,
      eventCount,
      lastSync,
      expiresAt: tokens.expires_at
    });

  } catch (error) {
    console.error('❌ Outlook status check error:', error);
    return NextResponse.json({
      connected: false,
      error: 'Status check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}