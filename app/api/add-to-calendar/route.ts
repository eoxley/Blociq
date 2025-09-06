// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for title, date, building
// - Try/catch with detailed error handling
// - Used in calendar components
// - Includes Microsoft Graph integration with token refresh
// - Proper error handling for authentication failures

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { title, date, building } = await req.json();

    if (!title || !date || !building) {
      return NextResponse.json(
        { error: 'Title, date, and building are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('outlook_access_token')?.value;
    const refreshToken = cookieStore.get('outlook_refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Outlook not connected. Please connect your Outlook account first.' },
        { status: 400 }
      );
    }

    // Create the calendar event
    const eventDate = new Date(date);
    const startTime = new Date(eventDate);
    startTime.setHours(10, 0, 0, 0); // 10:00 AM
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30); // 30 minutes duration

    const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: `${title} – ${building}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Europe/London',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Europe/London',
        },
        body: {
          contentType: 'HTML',
          content: 'Auto-generated from BlocIQ AI Assistant',
        },
        reminderMinutesBeforeStart: 15, // 15 minutes reminder
      }),
    });

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json();
      console.error('Microsoft Graph API error:', errorData);
      
      // If token is expired and we have a refresh token, try to refresh
      if (calendarResponse.status === 401 && refreshToken) {
        const tenantId = process.env.AZURE_TENANT_ID || 'common';
        const refreshResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
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

          // Retry the calendar request with new token
          const retryResponse = await fetch('https://graph.microsoft.com/v1.0/me/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${refreshData.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subject: `${title} – ${building}`,
              start: {
                dateTime: startTime.toISOString(),
                timeZone: 'Europe/London',
              },
              end: {
                dateTime: endTime.toISOString(),
                timeZone: 'Europe/London',
              },
              body: {
                contentType: 'HTML',
                content: 'Auto-generated from BlocIQ AI Assistant',
              },
              reminderMinutesBeforeStart: 15,
            }),
          });

          if (retryResponse.ok) {
            const eventData = await retryResponse.json();
            return NextResponse.json({
              success: true,
              event: eventData,
              message: 'Event added to Outlook calendar successfully',
            });
          }
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }

    const eventData = await calendarResponse.json();

    return NextResponse.json({
      success: true,
      event: eventData,
      message: 'Event added to Outlook calendar successfully',
    });

  } catch (error) {
    console.error('Error adding to calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 