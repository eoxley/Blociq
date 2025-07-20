import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { title, date, building } = await req.json();

    // Validate required fields
    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const supabase = createClient(cookies());
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Create the event data
    const eventData = {
      title: title,
      date: eventDate.toISOString(),
      building: building || null,
      user_id: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert the event into the database
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating event:', insertError);
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      );
    }

    // Try to add to Outlook calendar if connected
    let outlookResult = null;
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('outlook_access_token')?.value;

      if (accessToken) {
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
            subject: building ? `${title} – ${building}` : title,
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
              content: 'Created from BlocIQ',
            },
            reminderMinutesBeforeStart: 15,
          }),
        });

        if (calendarResponse.ok) {
          const outlookEvent = await calendarResponse.json();
          outlookResult = {
            success: true,
            eventId: outlookEvent.id,
            message: 'Event also added to Outlook calendar'
          };
        } else {
          outlookResult = {
            success: false,
            message: 'Failed to add to Outlook calendar'
          };
        }
      }
    } catch (outlookError) {
      console.error('Outlook calendar error:', outlookError);
      outlookResult = {
        success: false,
        message: 'Outlook calendar error'
      };
    }

    return NextResponse.json({
      success: true,
      event: newEvent,
      outlook: outlookResult,
      message: 'Event created successfully'
    });

  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 