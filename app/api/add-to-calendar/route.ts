import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { title, date, building } = await req.json();

    if (!title || !date || !building) {
      return NextResponse.json(
        { error: 'Title, date, and building are required' },
        { status: 400 }
      );
    }

    // For now, we'll use a placeholder implementation
    // In a full implementation, you would:
    // 1. Store user's Microsoft Graph tokens in a database
    // 2. Handle token refresh
    // 3. Make actual API calls to Microsoft Graph

    // Create the calendar event data structure
    const eventDate = new Date(date);
    const startTime = new Date(eventDate);
    startTime.setHours(10, 0, 0, 0); // 10:00 AM
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30); // 30 minutes duration

    // Mock successful response for now
    const mockEventData = {
      id: `event_${Date.now()}`,
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
    };

    // TODO: Implement actual Microsoft Graph API call
    // const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${accessToken}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(mockEventData),
    // });

    console.log('Calendar event would be created:', mockEventData);

    return NextResponse.json({
      success: true,
      event: mockEventData,
      message: 'Event added to Outlook calendar successfully (mock implementation)',
      note: 'This is a mock implementation. Full Microsoft Graph integration requires user token storage and management.',
    });

  } catch (error) {
    console.error('Error adding to calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 