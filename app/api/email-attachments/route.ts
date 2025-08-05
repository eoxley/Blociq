// ✅ EMAIL ATTACHMENTS API
// - Fetches attachments for a specific email
// - Supports inline image rendering
// - Proper authentication and error handling

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get email ID from query parameters
    const { searchParams } = new URL(req.url);
    const emailId = searchParams.get('emailId');

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    // Fetch attachments for the email
    const { data: attachments, error } = await supabase
      .from('email_attachments')
      .select('content_id, content_bytes, content_type, name, size')
      .eq('email_id', emailId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching email attachments:', error);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attachments: attachments || []
    });

  } catch (error) {
    console.error('Error in email-attachments API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 