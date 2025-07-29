import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // ✅ 1. Supabase Auth Session
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = user.id;
    console.log('✅ User authenticated:', userId);

    // ✅ 2. Get Token From outlook_tokens for testbloc@blociq.co.uk
    const { data: token, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("email", "testbloc@blociq.co.uk")
      .single();

    if (tokenError || !token) {
      console.error('No Outlook token found for testbloc@blociq.co.uk');
      return NextResponse.json({ 
        error: 'Outlook not connected', 
        message: 'Please connect your Outlook account first' 
      }, { status: 400 });
    }

    console.log('✅ Found Outlook token for testbloc@blociq.co.uk');

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    let refreshedToken = false;

    if (expiresAt <= now) {
      console.log('🔄 Token expired, refreshing...');
      
      // Refresh token
      const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';
      const refreshResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.OUTLOOK_CLIENT_ID!,
          client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: token.refresh_token,
          redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
        }),
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('❌ Failed to refresh token:', errorText);
        return NextResponse.json({ 
          error: 'Failed to refresh Outlook token',
          details: process.env.NODE_ENV === 'development' ? errorText : undefined
        }, { status: 500 });
      }

      const refreshData = await refreshResponse.json();
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

      // Update the stored access_token + expires_at
      const { error: updateError } = await supabase
        .from("outlook_tokens")
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: newExpiresAt
        })
        .eq("email", "testbloc@blociq.co.uk");

      if (updateError) {
        console.error('Failed to update token:', updateError);
        return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
      }

      token.access_token = refreshData.access_token;
      refreshedToken = true;
      console.log('✅ Token refreshed successfully');
    }

    // ✅ 3. Call Microsoft Graph for the last 50 emails
    console.log('🔄 Fetching last 50 emails from Microsoft Graph...');
    
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Graph API response status:', graphResponse.status, graphResponse.statusText);

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('❌ Failed to fetch emails from Microsoft Graph:', errorText);
      console.error('❌ Response status:', graphResponse.status, graphResponse.statusText);
      return NextResponse.json({ 
        error: 'Failed to fetch emails from Outlook',
        details: process.env.NODE_ENV === 'development' ? errorText : undefined
      }, { status: 500 });
    }

    const graphData = await graphResponse.json();
    const messages = graphData.value || [];
    console.log(`✅ Fetched ${messages.length} messages from Outlook`);

    // ✅ 4. Save emails to incoming_emails table
    let insertedCount = 0;
    let totalProcessed = 0;

    for (const message of messages) {
      totalProcessed++;
      const {
        subject,
        bodyPreview,
        receivedDateTime,
        from,
        internetMessageId,
        body
      } = message;

      const fromEmail = from?.emailAddress?.address;
      const fromName = from?.emailAddress?.name;
      
      if (!fromEmail || !internetMessageId) {
        console.warn('Skipping message without required fields:', { subject, fromEmail, internetMessageId });
        continue;
      }

      // Check for existing row with same outlook_message_id
      const { data: existingEmail } = await supabase
        .from("incoming_emails")
        .select("id")
        .eq("outlook_message_id", internetMessageId)
        .single();

      if (existingEmail) {
        console.log('Email already exists, skipping:', subject);
        continue;
      }

      // Insert new email
      const { error: insertError } = await supabase
        .from("incoming_emails")
        .insert({
          outlook_message_id: internetMessageId,
          subject: subject || '(No Subject)',
          body_preview: bodyPreview || '',
          body: body?.content || '',
          from_email: fromEmail,
          from_name: fromName || '',
          received_at: receivedDateTime,
          is_handled: false,
          is_read: false,
          user_id: userId,
          folder: 'inbox',
          sync_status: 'synced',
          last_sync_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Failed to insert email:', insertError);
        continue;
      }

      insertedCount++;
      console.log('✅ Inserted email:', subject);
    }

    // ✅ 5. Return a Clean JSON Response
    const response = {
      success: true,
      syncedCount: insertedCount,
      totalProcessed: totalProcessed,
      refreshedToken: refreshedToken,
      userEmail: token.email
    };

    console.log('📊 Sync completed:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Sync emails error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync emails',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}
