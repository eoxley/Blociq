import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  console.log('📧 Marking email as read...');

  try {
    // ✅ 1. Supabase Auth Session
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError);
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please log in to mark emails as read'
      }, { status: 401 });
    }

    const userId = user.id;
    console.log('✅ User authenticated:', user.email);

    // ✅ 2. Get request body
    const { emailId, isRead = true } = await req.json();

    if (!emailId) {
      return NextResponse.json({ 
        error: 'Missing email ID',
        message: 'Email ID is required'
      }, { status: 400 });
    }

    // ✅ 3. Get Token From outlook_tokens
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

    // ✅ 4. Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      console.log('🔄 Token expired or expiring soon, refreshing...');
      
      try {
        const tenantId = process.env.AZURE_TENANT_ID || 'common';
        const tokenUrl = process.env.MICROSOFT_TOKEN_URL || `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        const refreshResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refresh_token,
            redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
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

    // ✅ 5. Mark email as read via Microsoft Graph API
    console.log('📧 Marking email as read via Microsoft Graph:', emailId);
    
    const graphBaseUrl = process.env.GRAPH_BASE_URL || 'https://graph.microsoft.com/v1.0';
    const markReadResponse = await fetch(
      `${graphBaseUrl}/me/messages/${emailId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isRead: isRead
        }),
      }
    );

    if (!markReadResponse.ok) {
      const errorText = await markReadResponse.text();
      console.error('❌ Failed to mark email as read:', errorText);
      
      if (markReadResponse.status === 401 || markReadResponse.status === 403) {
        return NextResponse.json({ 
          error: 'Authentication failed',
          message: 'Your Outlook session has expired. Please reconnect your account.',
          code: 'AUTH_FAILED'
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to mark email as read',
        message: 'Unable to update email status in Outlook',
        details: process.env.NODE_ENV === 'development' ? errorText : undefined
      }, { status: 500 });
    }

    console.log('✅ Email marked as read successfully in Outlook');

    // ✅ 6. Optionally update Supabase for backup/logging
    if (process.env.SYNC_TO_SUPABASE === 'true') {
      try {
        await supabase
          .from('incoming_emails')
          .update({ 
            is_read: isRead,
            unread: !isRead,
            updated_at: new Date().toISOString()
          })
          .eq('outlook_id', emailId)
          .eq('user_id', userId);
        
        console.log('✅ Backup sync to Supabase completed');
      } catch (error) {
        console.error('❌ Error syncing to Supabase:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Email ${isRead ? 'marked as read' : 'marked as unread'} successfully`,
      data: {
        emailId,
        isRead,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in mark-email-read:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      message: 'An unexpected error occurred while marking email as read',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 