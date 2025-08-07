// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for title, date
// - Date format validation
// - Authentication check with session validation
// - Supabase queries with proper .eq() filters
// - Try/catch with detailed error handling
// - Used in calendar components
// - Includes Microsoft Graph integration with error handling

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { title, date, building, description } = await req.json();

    // Validate required fields
    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      );
    }

    // Validate date format (datetime-local format)
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    const supabase = createClient(cookies());
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find building ID if building name is provided
    let buildingId = null;
    if (building) {
      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .select('id')
        .eq('name', building)
        .single();
      
      if (!buildingError && buildingData) {
        buildingId = buildingData.id;
      }
    }

    // Create the event data for property_events table
    const eventData = {
      title: title,
      description: description || null,
      start_time: eventDate.toISOString(),
      end_time: null, // Optional field
      building_id: buildingId,
      event_type: 'manual',
      category: 'Property Event',
      created_by: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert the event into the property_events table
    const { data: newEvent, error: insertError } = await supabase
      .from('property_events')
      .insert(eventData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating event:', insertError);
      return NextResponse.json(
        { error: 'Failed to create event', details: insertError },
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
              content: description ? `Created from BlocIQ\n\n${description}` : 'Created from BlocIQ',
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
          
          // Update the property_events record with the Outlook event ID
          await supabase
            .from('property_events')
            .update({ outlook_event_id: outlookEvent.id })
            .eq('id', newEvent.id);
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