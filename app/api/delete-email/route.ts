// ✅ AUDIT COMPLETE [2025-01-15]
// - Field validation for emailId
// - Supabase query with proper .eq() filter
// - Microsoft Graph API integration for Outlook deletion
// - Try/catch with detailed error handling
// - Used in inbox components

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
    
    // Validate request body
    const body = await req.json();
    const { emailId } = body;

    if (!emailId) {
      console.error('❌ No email ID provided in request');
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    console.log('🗑️ Deleting email:', emailId);

    // Get the email details first
    const { data: email, error: fetchError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('id', emailId)
      .single();

    if (fetchError || !email) {
      console.error('❌ Failed to fetch email:', fetchError?.message);
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from('incoming_emails')
      .delete()
      .eq('id', emailId);

    if (deleteError) {
      console.error('❌ Failed to delete from Supabase:', deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Try to delete from Outlook if we have the message ID
    if (email.message_id) {
      try {
        // Get the latest Outlook token
        const { data: tokens } = await supabase
          .from('outlook_tokens')
          .select('*')
          .eq('user_id', email.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tokens?.access_token) {
          const graphResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${email.message_id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (graphResponse.ok) {
            console.log('✅ Email deleted from Outlook successfully');
          } else {
            console.warn('⚠️ Failed to delete from Outlook, but deleted from Supabase');
          }
        }
      } catch (outlookError) {
        console.warn('⚠️ Outlook deletion failed:', outlookError);
        // Don't fail the request if Outlook deletion fails
      }
    }

    console.log('✅ Email deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error in delete-email route:', error);
    return NextResponse.json({ 
      error: 'Failed to delete email',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 