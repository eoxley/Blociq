import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch unhandled emails from the inbox
    const { data: emails, error: fetchError } = await supabase
      .from('incoming_emails')
      .select(`
        id,
        subject,
        body_full,
        body_preview,
        from_email,
        from_name,
        received_at,
        building_id,
        unit_id,
        leaseholder_id,
        handled,
        unread,
        flag_status,
        categories,
        tag
      `)
      .eq('handled', false)
      .eq('unread', true)
      .order('received_at', { ascending: false })
      .limit(50); // Process up to 50 emails at once

    if (fetchError) {
      console.error('Error fetching inbox emails:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch inbox emails',
        details: fetchError.message 
      }, { status: 500 });
    }

    // Filter out emails that already have drafts
    const emailsToProcess = emails || [];
    
    // Add some metadata for processing
    const processedEmails = emailsToProcess.map(email => ({
      ...email,
      body: email.body_full || email.body_preview || '',
      from: email.from_email || '',
      from_name: email.from_name || 'Unknown'
    }));

    return NextResponse.json({ 
      success: true,
      emails: processedEmails,
      count: processedEmails.length,
      message: `Found ${processedEmails.length} emails to triage`
    });

  } catch (error) {
    console.error('Error in triage-inbox API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch inbox for triage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
