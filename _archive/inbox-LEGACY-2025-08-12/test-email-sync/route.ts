import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please log in to test email sync'
      }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;

    // Check Outlook connection
    const { data: token, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Get email stats
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('id, subject, received_at, is_read, is_handled, sync_status, last_sync_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('received_at', { ascending: false })
      .limit(10);

    // Get recent emails (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentEmails, error: recentError } = await supabase
      .from('incoming_emails')
      .select('id, subject, received_at, sync_status')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('received_at', sevenDaysAgo)
      .order('received_at', { ascending: false });

    // Get total email count
    const { count: totalEmails, error: countError } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_deleted', false);

    const result = {
      user: {
        id: userId,
        email: userEmail
      },
      outlook: {
        connected: !tokenError && !!token,
        email: token?.email || null,
        tokenExpired: token ? new Date(token.expires_at) <= new Date() : null
      },
      emails: {
        total: totalEmails || 0,
        recent: recentEmails?.length || 0,
        latest: emails?.[0] || null,
        sample: emails?.slice(0, 5) || []
      },
      sync: {
        lastSync: emails?.[0]?.last_sync_at || null,
        syncStatus: emails?.[0]?.sync_status || null
      }
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error in test email sync:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      message: 'Failed to test email sync',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 