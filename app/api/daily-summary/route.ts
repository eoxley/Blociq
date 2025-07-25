import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get today's date in ISO format
    const today = new Date().toISOString().split('T')[0];

    // 1. Query upcoming property events (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString();

    const { data: upcomingEvents, error: eventsError } = await supabase
      .from('property_events')
      .select(`
        *,
        buildings(name)
      `)
      .gte('start_time', new Date().toISOString())
      .lte('start_time', sevenDaysFromNowStr)
      .order('start_time', { ascending: true });



    if (eventsError) {
      console.error('Error fetching events:', eventsError?.message || JSON.stringify(eventsError));
    }

    // 2. Query unread emails (using correct field name)
    const { data: unreadEmails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select(`
        *,
        buildings(name)
      `)
      .eq('unread', true) // Changed from is_read to unread
      .order('received_at', { ascending: false });

    if (emailsError) {
      console.error('Error fetching emails:', emailsError);
    }

    // 3. Query compliance documents expiring soon (next 7 days)
    const { data: complianceAlerts, error: complianceError } = await supabase
      .from('compliance_docs')
      .select(`
        *,
        buildings(name)
      `)
      .lte('expiry_date', sevenDaysFromNowStr)
      .gte('expiry_date', today)
      .order('expiry_date', { ascending: true });

    if (complianceError) {
      console.error('Error fetching compliance documents:', complianceError);
    }

    // 4. Get building portfolio overview
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select(`
        id,
        name,
        address,
        unit_count,
        demo_ready
      `)
      .order('name');

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError);
    }



    // Group data by building
    const buildingData: { [key: string]: any } = {};

    // Group events by building
    if (upcomingEvents) {
      upcomingEvents.forEach(event => {
        const buildingName = event.buildings?.name || 'Unknown Building';
        if (!buildingData[buildingName]) {
          buildingData[buildingName] = { events: [], emails: [], compliance: [] };
        }
        buildingData[buildingName].events.push(event);
      });
    }

    // Group emails by building
    if (unreadEmails) {
      unreadEmails.forEach(email => {
        const buildingName = email.buildings?.name || 'Unknown Building';
        if (!buildingData[buildingName]) {
          buildingData[buildingName] = { events: [], emails: [], compliance: [] };
        }
        buildingData[buildingName].emails.push(email);
      });
    }

    // Group compliance alerts by building
    if (complianceAlerts) {
      complianceAlerts.forEach(doc => {
        const buildingName = doc.buildings?.name || 'Unknown Building';
        if (!buildingData[buildingName]) {
          buildingData[buildingName] = { events: [], emails: [], compliance: [] };
        }
        buildingData[buildingName].compliance.push(doc);
      });
    }

    // Check if we have any data to summarise
    const hasData = Object.keys(buildingData).length > 0 && 
      Object.values(buildingData).some(building => 
        building.events.length > 0 || building.emails.length > 0 || building.compliance.length > 0
      );

    if (!hasData) {
      return NextResponse.json({
        summary: "Good morning! You're all caught up today. No upcoming events, unread emails, or compliance alerts to address. Enjoy your day! 🌟"
      });
    }

    // Construct the prompt for OpenAI
    let prompt = "You are a helpful assistant to a property manager. Create a comprehensive morning summary based on this portfolio data:\n\n";

    // Add portfolio overview
    if (buildings && buildings.length > 0) {
      const totalUnits = buildings.reduce((sum, building) => sum + (building.unit_count || 0), 0);
      
      prompt += `Portfolio Overview:\n`;
      prompt += `- Total Buildings: ${buildings.length}\n`;
      prompt += `- Total Units: ${totalUnits}\n\n`;
    }

    // Add events section
    if (upcomingEvents && upcomingEvents.length > 0) {
      prompt += "Upcoming Property Events (Next 7 Days):\n";
      upcomingEvents.forEach(event => {
        const buildingName = event.buildings?.name || 'Unknown Building';
        const eventDate = new Date(event.start_time);
        const daysUntilEvent = Math.floor((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const dateStr = eventDate.toLocaleDateString('en-GB', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        prompt += `- ${buildingName}: ${event.title} (${dateStr}${daysUntilEvent > 0 ? `, in ${daysUntilEvent} day${daysUntilEvent > 1 ? 's' : ''}` : ' today'})\n`;
      });
      prompt += "\n";
    }



    // Add emails section
    if (unreadEmails && unreadEmails.length > 0) {
      prompt += "Unread Emails:\n";
      Object.entries(buildingData).forEach(([buildingName, data]) => {
        if (data.emails.length > 0) {
          prompt += `- ${buildingName}: ${data.emails.length} unread message${data.emails.length > 1 ? 's' : ''}\n`;
        }
      });
      prompt += "\n";
    }

    // Add compliance section
    if (complianceAlerts && complianceAlerts.length > 0) {
      prompt += "Compliance Alerts:\n";
      complianceAlerts.forEach(doc => {
        const buildingName = doc.buildings?.name || 'Unknown Building';
        const daysUntilExpiry = Math.floor((new Date(doc.expiry_date || '').getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        prompt += `- ${buildingName}: ${doc.doc_type || 'Document'} expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}\n`;
      });
      prompt += "\n";
    }



    prompt += "Return a clear, friendly summary using bullet points using British English. Keep it concise but informative. Start with a greeting and organise the information logically.";

    // Call OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OpenAI API key not found');
      return NextResponse.json({
        summary: "Good morning! I'm having trouble accessing the AI service right now, but you can check your events and emails manually. Have a great day! 🌅"
      });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful property management assistant using British English. Provide clear, actionable summaries in a friendly tone with British spelling and terminology.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return NextResponse.json({
        summary: "Good morning! I'm having trouble generating your summary right now, but you can check your events and emails manually. Have a productive day! 🌅"
      });
    }

    const openaiData = await openaiResponse.json();
    const summary = openaiData.choices?.[0]?.message?.content || "No summary available at the moment.";

    return NextResponse.json({ summary });

  } catch (error) {
    console.error('Error generating daily summary:', error);
    return NextResponse.json({
      summary: "Good morning! I'm having trouble generating your summary right now, but you can check your events and emails manually. Have a productive day! 🌅"
    });
  }
} 