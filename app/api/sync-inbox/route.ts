import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
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

    // ✅ 2. Get Token From outlook_tokens
    const { data: token, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (tokenError || !token) {
      console.error('No Outlook token found for user:', userId);
      return NextResponse.json({ 
        error: 'Outlook not connected', 
        message: 'Please connect your Outlook account first' 
      }, { status: 400 });
    }

    console.log('✅ Found Outlook token for user:', token.email);

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
        console.error('Failed to refresh token');
        return NextResponse.json({ error: 'Failed to refresh Outlook token' }, { status: 500 });
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
        .eq("user_id", userId);

      if (updateError) {
        console.error('Failed to update token:', updateError);
        return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
      }

      token.access_token = refreshData.access_token;
      refreshedToken = true;
      console.log('✅ Token refreshed successfully');
    }

    // ✅ 3. Call Microsoft Graph /me/messages
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=20&$orderby=receivedDateTime desc', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      console.error('Failed to fetch emails from Microsoft Graph');
      return NextResponse.json({ error: 'Failed to fetch emails from Outlook' }, { status: 500 });
    }

    const graphData = await graphResponse.json();
    const messages = graphData.value || [];
    console.log(`✅ Fetched ${messages.length} messages from Outlook`);

    // ✅ 4. Insert Into incoming_emails (if not already inserted)
    let insertedCount = 0;

    for (const message of messages) {
      const {
        subject,
        bodyPreview,
        receivedDateTime,
        from,
        internetMessageId
      } = message;

      const fromEmail = from?.emailAddress?.address;
      
      if (!fromEmail || !internetMessageId) {
        console.warn('Skipping message without required fields:', { subject, fromEmail, internetMessageId });
        continue;
      }

      // Check for existing row with same outlook_id (using internetMessageId)
      const { data: existingEmail } = await supabase
        .from("incoming_emails")
        .select("id")
        .eq("outlook_id", internetMessageId)
        .single();

      if (existingEmail) {
        console.log('Email already exists, skipping:', subject);
        continue;
      }

      // Insert new email
      const { error: insertError } = await supabase
        .from("incoming_emails")
        .insert({
          outlook_id: internetMessageId,
          subject: subject || '(No Subject)',
          body_preview: bodyPreview || '',
          from_email: fromEmail,
          received_at: receivedDateTime,
          handled: false,
          user_id: userId,
          unread: true
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
      fetched: messages.length,
      inserted: insertedCount,
      refreshedToken: refreshedToken,
      userEmail: token.email
    };

    console.log('📊 Sync completed:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Sync inbox error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync inbox',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 