import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { serverTrace } from '@/lib/trace';

export async function GET(req: NextRequest) {
  return await POST(req);
}

export async function POST(req: NextRequest) {
  serverTrace("API hit", { route: "app/api/fetch-outlook-emails/route.ts", build: process.env.VERCEL_GIT_COMMIT_SHA ?? null });
  
  console.log('🔄 Starting Outlook email fetch...');

  try {
    // ✅ 1. Supabase Auth Session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError);
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please log in to fetch emails'
      }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;
    console.log('✅ User authenticated:', userEmail);

    // ✅ 2. Get Token From outlook_tokens
    const { data: token, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (tokenError || !token) {
      console.error('❌ No Outlook token found for user:', userId);
      return NextResponse.json({ 
        error: 'Outlook not connected', 
        message: 'Please connect your Outlook account first',
        code: 'OUTLOOK_NOT_CONNECTED'
      }, { status: 400 });
    }

    console.log('✅ Found Outlook token for user:', token.email);

    // ✅ 3. Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    let refreshedToken = false;

    if (expiresAt <= fiveMinutesFromNow) {
      console.log('🔄 Token expired or expiring soon, refreshing...');
      
      try {
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
            error: 'Token refresh failed',
            message: 'Your Outlook session has expired. Please reconnect your account.',
            code: 'TOKEN_REFRESH_FAILED'
          }, { status: 401 });
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
          console.error('❌ Failed to update token:', updateError);
          return NextResponse.json({ 
            error: 'Failed to update token',
            message: 'Please try again or reconnect your account'
          }, { status: 500 });
        }

        token.access_token = refreshData.access_token;
        refreshedToken = true;
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Error refreshing token:', error);
        return NextResponse.json({ 
          error: 'Token refresh failed',
          message: 'Your Outlook session has expired. Please reconnect your account.',
          code: 'TOKEN_REFRESH_FAILED'
        }, { status: 401 });
      }
    }

    // ✅ 4. Get inbox folder info for counters
    console.log('📊 Fetching inbox folder info...');
    
    const folderResponse = await fetch("https://graph.microsoft.com/v1.0/me/mailFolders/inbox?$select=unreadItemCount,totalItemCount", {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!folderResponse.ok) {
      const errorText = await folderResponse.text();
      console.error('❌ Failed to fetch inbox folder info:', errorText);
      
      if (folderResponse.status === 401 || folderResponse.status === 403) {
        return NextResponse.json({ 
          error: 'Authentication failed',
          message: 'Your Outlook session has expired. Please reconnect your account.',
          code: 'AUTH_FAILED'
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch inbox info',
        message: 'Unable to retrieve inbox information from Outlook'
      }, { status: 500 });
    }

    const folderData = await folderResponse.json();
    console.log('✅ Inbox info:', {
      total: folderData.totalItemCount,
      unread: folderData.unreadItemCount
    });

    // ✅ 5. Fetch emails from Microsoft Graph API
    console.log('📧 Fetching emails from Outlook...');
    
    const emailsResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$orderby=receivedDateTime desc&$top=100&$select=id,subject,bodyPreview,body,from,receivedDateTime,isRead,flag,importance,categories,hasAttachments,internetMessageId,toRecipients,ccRecipients",
      {
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!emailsResponse.ok) {
      const errorText = await emailsResponse.text();
      console.error('❌ Failed to fetch emails:', errorText);
      
      if (emailsResponse.status === 401 || emailsResponse.status === 403) {
        return NextResponse.json({ 
          error: 'Authentication failed',
          message: 'Your Outlook session has expired. Please reconnect your account.',
          code: 'AUTH_FAILED'
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch emails',
        message: 'Unable to retrieve emails from Outlook',
        details: process.env.NODE_ENV === 'development' ? errorText : undefined
      }, { status: 500 });
    }

    const emailsData = await emailsResponse.json();
    const emails = emailsData.value || [];
    
    console.log(`✅ Fetched ${emails.length} emails from Outlook`);

    // ✅ 6. Transform emails to match expected format
    const transformedEmails = emails.map((email: any) => ({
      id: email.id, // Use Outlook ID as primary ID
      outlook_id: email.id,
      outlook_message_id: email.internetMessageId,
      user_id: userId,
      from_email: email.from?.emailAddress?.address || null,
      from_name: email.from?.emailAddress?.name || null,
      subject: email.subject || null,
      body_preview: email.bodyPreview || null,
      body_full: email.body?.content || null,
      body_content_type: email.body?.contentType || 'text',
      received_at: email.receivedDateTime || null,
      unread: !email.isRead,
      is_read: email.isRead,
      flag_status: email.flag?.flagStatus || null,
      categories: email.categories || null,
      importance: email.importance || null,
      has_attachments: email.hasAttachments || false,
      to_email: email.toRecipients?.map((r: any) => r.emailAddress.address) || [],
      cc_email: email.ccRecipients?.map((r: any) => r.emailAddress.address) || [],
      handled: false,
      is_handled: false,
      pinned: false,
      building_id: null,
      unit_id: null,
      leaseholder_id: null,
      ai_tag: null,
      triage_category: null,
      is_deleted: false,
      deleted_at: null,
      sync_status: 'live_outlook',
      last_sync_at: new Date().toISOString(),
      created_at: email.receivedDateTime || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // ✅ 7. Optionally sync to Supabase for backup/logging (but don't use as primary source)
    if (process.env.SYNC_TO_SUPABASE === 'true') {
      console.log('💾 Syncing to Supabase for backup...');
      
      for (const email of transformedEmails) {
        try {
          // Check if email already exists
          const { data: existingEmail } = await supabase
            .from('incoming_emails')
            .select('id')
            .or(`outlook_id.eq.${email.outlook_id},outlook_message_id.eq.${email.outlook_message_id}`)
            .eq('user_id', userId)
            .single();

          if (existingEmail) {
            // Update existing email
            await supabase
              .from('incoming_emails')
              .update(email)
              .eq('id', existingEmail.id);
          } else {
            // Insert new email
            await supabase
              .from('incoming_emails')
              .insert(email);
          }
        } catch (error) {
          console.error('❌ Error syncing email to Supabase:', error);
        }
      }
      
      console.log('✅ Backup sync completed');
    }

    const responseData = {
      success: true,
      message: 'Emails fetched successfully from Outlook',
      data: {
        emails: transformedEmails,
        inboxInfo: {
          totalCount: folderData.totalItemCount,
          unreadCount: folderData.unreadItemCount
        },
        tokenRefreshed: refreshedToken,
        source: 'microsoft_graph_api'
      },
      routeId: "app/api/fetch-outlook-emails/route.ts",
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? null
    };
    const res = NextResponse.json(responseData);
    res.headers.set("x-blociq-route", "app/api/fetch-outlook-emails/route.ts");
    return res;

  } catch (error) {
    console.error('❌ Unexpected error in fetch-outlook-emails:', error);
    const errorData = { 
      error: 'Unexpected error',
      message: 'An unexpected error occurred while fetching emails',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      routeId: "app/api/fetch-outlook-emails/route.ts",
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? null
    };
    const res = NextResponse.json(errorData, { status: 500 });
    res.headers.set("x-blociq-route", "app/api/fetch-outlook-emails/route.ts");
    return res;
  }
}
