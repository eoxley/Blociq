// ✅ AUDIT COMPLETE [2025-01-15]
// - Field validation for draft ID
// - Supabase query with proper user_id filter
// - Microsoft Graph API integration for sending emails
// - Try/catch with detailed error handling
// - Used in inbox components

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await req.json();
    const { draft_id } = body;

    if (!draft_id) {
      console.error('❌ No draft ID provided in request');
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    console.log('📤 Sending draft:', draft_id);

    // Get the draft details
    const { data: draft, error: fetchError } = await supabase
      .from('email_drafts')
      .select('*')
      .eq('id', draft_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !draft) {
      console.error('❌ Failed to fetch draft:', fetchError?.message);
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (draft.status === 'sent') {
      console.error('❌ Draft already sent');
      return NextResponse.json({ error: 'Draft already sent' }, { status: 400 });
    }

    // Get the latest Outlook token
    const { data: tokens } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!tokens?.access_token) {
      console.error('❌ No valid Outlook token found');
      return NextResponse.json({ error: 'No valid Outlook token found' }, { status: 401 });
    }

    // Prepare email data for Microsoft Graph
    const emailData = {
      subject: draft.subject,
      body: {
        contentType: 'HTML',
        content: draft.body
      },
      toRecipients: draft.to_emails.map((email: string) => ({
        emailAddress: {
          address: email
        }
      })),
      ccRecipients: draft.cc_emails?.map((email: string) => ({
        emailAddress: {
          address: email
        }
      })) || [],
      bccRecipients: draft.bcc_emails?.map((email: string) => ({
        emailAddress: {
          address: email
        }
      })) || []
    };

    // If this is a reply, add the reply-to header
    if (draft.reply_to_email_id) {
      emailData.inReplyTo = draft.reply_to_email_id;
    }

    // Send email via Microsoft Graph
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: emailData,
        saveToSentItems: true
      }),
    });

    if (!graphResponse.ok) {
      const errorData = await graphResponse.json();
      console.error('❌ Failed to send email via Outlook:', errorData);
      
      // Update draft status to failed
      await supabase
        .from('email_drafts')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', draft_id);

      return NextResponse.json({ 
        error: 'Failed to send email',
        details: errorData.error?.message || 'Unknown error'
      }, { status: 500 });
    }

    // Update draft status to sent
    const { error: updateError } = await supabase
      .from('email_drafts')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', draft_id);

    if (updateError) {
      console.error('❌ Failed to update draft status:', updateError.message);
      // Don't fail the request if status update fails
    }

    console.log('✅ Draft sent successfully');
    return NextResponse.json({ 
      success: true,
      message_id: draft.id
    });

  } catch (error) {
    console.error('❌ Error in send-draft route:', error);
    return NextResponse.json({ 
      error: 'Failed to send draft',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 