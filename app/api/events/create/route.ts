import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface CreateEventRequest {
  building_id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  event_type: string;
  category?: string;
  location?: string;
  sync_to_outlook?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateEventRequest = await request.json();
    const {
      building_id,
      title,
      description,
      start_time,
      end_time,
      event_type,
      category,
      location,
      sync_to_outlook = true
    } = body;

    // Validate required fields
    if (!building_id || !title || !start_time || !event_type) {
      return NextResponse.json(
        { error: 'Missing required fields: building_id, title, start_time, event_type' },
        { status: 400 }
      );
    }

    // Get building details for Outlook integration
    const { data: building } = await supabase
      .from('buildings')
      .select('name, address')
      .eq('id', building_id)
      .single();

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }

    // Create event in Supabase
    const eventData = {
      building_id,
      title,
      description,
      start_time,
      end_time: end_time || null,
      event_type,
      category: category || event_type,
      location: location || building.address,
      created_by: session.user.id,
      outlook_event_id: null
    };

    const { data: event, error: insertError } = await supabase
      .from('property_events')
      .insert(eventData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating event:', insertError);
      return NextResponse.json(
        { error: 'Failed to create event', details: insertError.message },
        { status: 500 }
      );
    }

    // Sync to Outlook if requested
    let outlookEventId = null;
    if (sync_to_outlook) {
      try {
        const outlookEvent = await createOutlookEvent({
          title,
          description: description || '',
          startTime: start_time,
          endTime: end_time || start_time,
          location: location || building.address,
          buildingName: building.name
        });

        if (outlookEvent?.id) {
          outlookEventId = outlookEvent.id;
          
          // Update event with Outlook ID
          await supabase
            .from('property_events')
            .update({ outlook_event_id: outlookEventId })
            .eq('id', event.id);
        }
      } catch (outlookError) {
        console.error('Error syncing to Outlook:', outlookError);
        // Don't fail the request if Outlook sync fails
      }
    }

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        outlook_event_id: outlookEventId
      }
    });

  } catch (error) {
    console.error('Error in create event API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface OutlookEventData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  buildingName: string;
}

async function createOutlookEvent(eventData: OutlookEventData) {
  // For now, return a mock response
  // In production, this would integrate with Microsoft Graph API
  console.log('Creating Outlook event:', eventData);
  
  // Mock Outlook event creation
  return {
    id: `outlook_${Date.now()}`,
    webLink: 'https://outlook.office.com/calendar/view/month'
  };
} 