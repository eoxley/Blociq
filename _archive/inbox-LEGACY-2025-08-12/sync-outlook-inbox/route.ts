import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get Outlook access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('outlook_access_token')?.value;
    const refreshToken = cookieStore.get('outlook_refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Outlook not connected. Please connect your Outlook account first.' },
        { status: 400 }
      );
    }

    // Fetch emails from Microsoft Graph API
    const graphResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages?$top=20&$select=subject,from,receivedDateTime,internetMessageId,bodyPreview&$orderby=receivedDateTime desc',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!graphResponse.ok) {
      const errorData = await graphResponse.json();
      console.error('Microsoft Graph API error:', errorData);
      
      // If token is expired and we have a refresh token, try to refresh
      if (graphResponse.status === 401 && refreshToken) {
        const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.OUTLOOK_CLIENT_ID!,
            client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          
          // Update cookies with new tokens
          cookieStore.set('outlook_access_token', refreshData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: refreshData.expires_in
          });

          if (refreshData.refresh_token) {
            cookieStore.set('outlook_refresh_token', refreshData.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 30 * 24 * 60 * 60
            });
          }

          // Retry the Graph API request with new token
          const retryResponse = await fetch(
            'https://graph.microsoft.com/v1.0/me/messages?$top=20&$select=subject,from,receivedDateTime,internetMessageId,bodyPreview&$orderby=receivedDateTime desc',
            {
              headers: {
                'Authorization': `Bearer ${refreshData.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (retryResponse.ok) {
            const emailsData = await retryResponse.json();
            return await processEmails(emailsData.value, supabase, session.user.id);
          }
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch emails from Outlook' },
        { status: 500 }
      );
    }

    const emailsData = await graphResponse.json();
    return await processEmails(emailsData.value, supabase, session.user.id);

  } catch (error) {
    console.error('Error syncing Outlook inbox:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processEmails(emails: any[], supabase: any, userId: string) {
  let syncedCount = 0;

  for (const email of emails) {
    try {
      // Check if email already exists in database
      const { data: existingEmail } = await supabase
        .from('incoming_emails')
        .select('id')
        .eq('outlook_id', email.internetMessageId)
        .single();

      if (existingEmail) {
        // Email already exists, skip
        continue;
      }

      // Extract sender information
      const from = email.from;
      const fromName = from?.name || '';
      const fromEmail = from?.emailAddress?.address || '';

      // Insert new email into database
      const { error: insertError } = await supabase
        .from('incoming_emails')
        .insert({
          subject: email.subject || '(No Subject)',
          from_name: fromName,
          from_email: fromEmail,
          received_at: email.receivedDateTime,
          preview: email.bodyPreview || '',
          outlook_id: email.internetMessageId,
          building_id: null, // Will be determined later by AI analysis
          user_id: userId, // Associate with current user
          isUnread: true,
          is_handled: false,
          folder: 'inbox'
        });

      if (insertError) {
        console.error('Error inserting email:', insertError);
        continue;
      }

      syncedCount++;
    } catch (error) {
      console.error('Error processing email:', error);
      continue;
    }
  }

  return NextResponse.json({
    success: true,
    synced: syncedCount,
    message: `Successfully synced ${syncedCount} new emails from Outlook`
  });
} 