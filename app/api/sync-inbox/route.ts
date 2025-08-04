import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  return await POST(req);
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🔄 Starting inbox sync...');

  try {
    // ✅ 1. Supabase Auth Session
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError);
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please log in to sync emails'
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
    let refreshedToken = false;

    if (expiresAt <= now) {
      console.log('🔄 Token expired, refreshing...');
      
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
            error: 'Failed to refresh Outlook token',
            message: 'Please reconnect your Outlook account',
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
          message: 'Please reconnect your Outlook account'
        }, { status: 500 });
      }
    }

    // ✅ 4. Call Microsoft Graph for main inbox with better filtering
    console.log('🔄 Fetching emails from main inbox...');
    
    try {
      // Get emails from the main inbox with better filtering
      // Fetch more emails and filter by recent date to ensure we get new emails
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const emailsResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailfolders/inbox/messages?$top=100&$orderby=receivedDateTime desc&$filter=receivedDateTime ge '${thirtyDaysAgo}'&$select=id,subject,bodyPreview,body,from,receivedDateTime,isRead,flag,importance,categories,hasAttachments,internetMessageId`,
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
        return NextResponse.json({ 
          error: 'Failed to fetch emails',
          message: 'Unable to retrieve emails from Outlook',
          details: process.env.NODE_ENV === 'development' ? errorText : undefined
        }, { status: 500 });
      }

      const emailsData = await emailsResponse.json();
      const emails = emailsData.value || [];
      
      console.log(`✅ Fetched ${emails.length} emails from Outlook`);

      // ✅ 5. Process and store emails in Supabase with better conflict resolution
      let processedCount = 0;
      let newEmailsCount = 0;
      let updatedEmailsCount = 0;

      for (const email of emails) {
        try {
          // Check if email already exists by outlook_id OR internetMessageId
          const { data: existingEmail } = await supabase
            .from('incoming_emails')
            .select('id, outlook_id, outlook_message_id')
            .or(`outlook_id.eq.${email.id},outlook_message_id.eq.${email.internetMessageId}`)
            .eq('user_id', userId)
            .single();

          const emailData = {
            outlook_id: email.id,
            outlook_message_id: email.internetMessageId,
            user_id: userId,
            from_email: email.from?.emailAddress?.address || null,
            from_name: email.from?.emailAddress?.name || null,
            subject: email.subject || null,
            body_preview: email.bodyPreview || null,
            body_full: email.body?.content || null,
            received_at: email.receivedDateTime || null,
            unread: !email.isRead,
            is_read: email.isRead,
            flag_status: email.flag?.flagStatus || null,
            categories: email.categories || null,
            importance: email.importance || null,
            has_attachments: email.hasAttachments || false,
            sync_status: 'manual_synced',
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          if (existingEmail) {
            // Update existing email
            const { error: updateError } = await supabase
              .from('incoming_emails')
              .update(emailData)
              .eq('id', existingEmail.id);

            if (updateError) {
              console.error('❌ Error updating email:', updateError);
            } else {
              updatedEmailsCount++;
              console.log('✅ Updated email:', email.subject);
            }
          } else {
            // Insert new email
            const { error: insertError } = await supabase
              .from('incoming_emails')
              .insert({
                ...emailData,
                created_at: new Date().toISOString()
              });

            if (insertError) {
              console.error('❌ Error inserting email:', insertError);
            } else {
              newEmailsCount++;
              console.log('✅ New email added:', email.subject);
            }
          }

          processedCount++;
        } catch (error) {
          console.error('❌ Error processing email:', error);
        }
      }

      const syncTime = Date.now() - startTime;
      console.log(`✅ Sync completed in ${syncTime}ms`);
      console.log(`📊 Processed: ${processedCount}, New: ${newEmailsCount}, Updated: ${updatedEmailsCount}`);

      return NextResponse.json({
        success: true,
        message: 'Emails synced successfully',
        data: {
          processed: processedCount,
          new: newEmailsCount,
          updated: updatedEmailsCount,
          syncTime: `${syncTime}ms`
        }
      });

    } catch (error) {
      console.error('❌ Error in email sync:', error);
      return NextResponse.json({ 
        error: 'Email sync failed',
        message: 'Unable to sync emails at this time',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Unexpected error in sync:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      message: 'An unexpected error occurred during sync',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 