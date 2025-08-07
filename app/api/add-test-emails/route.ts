import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please log in to add test emails'
      }, { status: 401 });
    }

    const userId = user.id;
    console.log('✅ Adding test emails for user:', userId);

    // Sample test emails
    const testEmails = [
      {
        user_id: userId,
        from_email: 'john.smith@example.com',
        from_name: 'John Smith',
        subject: 'Heating Issue in Flat 1',
        body_preview: 'The heating system is not working properly in my flat. Can someone please check it?',
        body_full: 'Dear Property Manager,\n\nThe heating system in my flat (Flat 1) is not working properly. The radiators are cold and the thermostat is not responding. This is quite urgent as the weather is getting colder.\n\nCould you please arrange for someone to check this as soon as possible?\n\nThank you,\nJohn Smith',
        received_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        is_read: false,
        handled: false,
        is_handled: false,
        flag_status: null,
        categories: ['maintenance'],
        importance: 'normal',
        has_attachments: false,
        building_id: 1,
        unit: 'Flat 1'
      },
      {
        user_id: userId,
        from_email: 'sarah.johnson@example.com',
        from_name: 'Sarah Johnson',
        subject: 'Noise Complaint - Flat 2',
        body_preview: 'There is excessive noise coming from the flat above. Can this be addressed?',
        body_full: 'Hello,\n\nI am writing to report excessive noise coming from the flat above mine (Flat 2). There has been loud music and banging sounds for the past few days, especially in the evenings.\n\nThis is affecting my ability to work from home and get proper rest. Could you please investigate this matter?\n\nRegards,\nSarah Johnson',
        received_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        is_read: false,
        handled: false,
        is_handled: false,
        flag_status: 'flagged',
        categories: ['complaint'],
        importance: 'high',
        has_attachments: false,
        building_id: 1,
        unit: 'Flat 2'
      },
      {
        user_id: userId,
        from_email: 'michael.brown@example.com',
        from_name: 'Michael Brown',
        subject: 'Maintenance Request - Kitchen Tap',
        body_preview: 'The kitchen tap is leaking. Please send a plumber.',
        body_full: 'Hi,\n\nThe kitchen tap in my flat (Flat 3) has been leaking for the past week. The water is dripping constantly and has started to cause some damage to the cabinet below.\n\nCould you please arrange for a plumber to fix this issue?\n\nThanks,\nMichael Brown',
        received_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        is_read: true,
        handled: true,
        is_handled: true,
        flag_status: null,
        categories: ['maintenance'],
        importance: 'normal',
        has_attachments: false,
        building_id: 1,
        unit: 'Flat 3'
      },
      {
        user_id: userId,
        from_email: 'emma.davis@example.com',
        from_name: 'Emma Davis',
        subject: 'Parking Space Request',
        body_preview: 'I would like to request a parking space for my vehicle.',
        body_full: 'Dear Property Manager,\n\nI am a resident in Flat 4 and would like to request a parking space for my vehicle. I currently have to park on the street which is inconvenient and sometimes unsafe.\n\nIs there any availability for a dedicated parking space?\n\nBest regards,\nEmma Davis',
        received_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        is_read: true,
        handled: false,
        is_handled: false,
        flag_status: null,
        categories: ['request'],
        importance: 'normal',
        has_attachments: false,
        building_id: 1,
        unit: 'Flat 4'
      },
      {
        user_id: userId,
        from_email: 'david.wilson@example.com',
        from_name: 'David Wilson',
        subject: 'Internet Connection Issue',
        body_preview: 'The internet connection in my flat is very slow. Can this be investigated?',
        body_full: 'Hello,\n\nThe internet connection in my flat (Flat 5) has been extremely slow for the past few days. I work from home and this is affecting my productivity significantly.\n\nCould you please investigate this issue? I have tried restarting the router but the problem persists.\n\nThank you,\nDavid Wilson',
        received_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
        is_read: false,
        handled: false,
        is_handled: false,
        flag_status: null,
        categories: ['technical'],
        importance: 'high',
        has_attachments: false,
        building_id: 1,
        unit: 'Flat 5'
      }
    ];

    // Insert test emails
    const { data: insertedEmails, error: insertError } = await supabase
      .from('incoming_emails')
      .insert(testEmails)
      .select();

    if (insertError) {
      console.error('❌ Error inserting test emails:', insertError);
      return NextResponse.json({ 
        error: 'Failed to add test emails',
        details: insertError.message
      }, { status: 500 });
    }

    console.log('✅ Successfully added test emails:', insertedEmails?.length || 0);

    return NextResponse.json({
      success: true,
      message: 'Test emails added successfully',
      data: {
        added: insertedEmails?.length || 0,
        emails: insertedEmails
      }
    });

  } catch (error) {
    console.error('❌ Error in add-test-emails:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      message: 'Failed to add test emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 