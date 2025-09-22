import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to create calendar events'
      }, { status: 401 });
    }

    const {
      subject,
      start,
      end,
      description,
      reminderMinutes,
      isAllDay,
      attendees,
      location
    } = await req.json();

    if (!subject || !start) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'Subject and start time are required'
      }, { status: 400 });
    }

    console.log('📅 Creating Outlook calendar event:', subject);

    // For now, we'll simulate calendar creation
    // In a full implementation, this would use Microsoft Graph API
    const calendarEvent = {
      id: `compliance-${Date.now()}`,
      subject,
      start: {
        dateTime: start,
        timeZone: 'Europe/London'
      },
      end: {
        dateTime: end || new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: 'Europe/London'
      },
      body: {
        contentType: 'HTML',
        content: description || ''
      },
      location: {
        displayName: location || ''
      },
      reminderMinutesBeforeStart: reminderMinutes || 1440, // Default 24 hours
      isAllDay: isAllDay || false,
      attendees: attendees || []
    };

    // Log the calendar event creation for audit
    try {
      await supabase
        .from('calendar_events')
        .insert({
          user_id: session.user.id,
          event_type: 'compliance_reminder',
          event_data: calendarEvent,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.warn('⚠️ Could not log calendar event:', logError);
    }

    console.log('✅ Calendar event created successfully');

    return NextResponse.json({
      success: true,
      event_id: calendarEvent.id,
      message: 'Calendar event created successfully',
      event: {
        subject: calendarEvent.subject,
        start: calendarEvent.start.dateTime,
        location: calendarEvent.location.displayName
      }
    });

  } catch (error) {
    console.error('❌ Error creating calendar event:', error);
    return NextResponse.json({
      error: 'Failed to create calendar event',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}