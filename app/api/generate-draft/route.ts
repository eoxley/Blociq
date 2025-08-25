import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { subject, body, building_id, from_email, from_name } = await req.json();

    if (!subject || !body) {
      return NextResponse.json({ error: 'Missing required fields: subject and body' }, { status: 400 });
    }

    // Get building context if available
    let buildingContext = '';
    if (building_id) {
      const { data: building } = await supabase
        .from('buildings')
        .select('name, address')
        .eq('id', building_id)
        .single();
      
      if (building) {
        buildingContext = `\n\nBuilding Context: ${building.name} - ${building.address}`;
      }
    }

    // Create the AI prompt for UK leasehold property management
    const prompt = `You are a professional UK leasehold property manager. Draft a professional, courteous, and helpful reply to the following email. 

The reply should:
- Be professional and courteous
- Acknowledge the sender's concern
- Provide clear next steps or information
- Use appropriate UK property management terminology
- Be concise but comprehensive
- End with a professional sign-off

Email Details:
From: ${from_name || from_email || 'Unknown'}
Subject: ${subject}

Message Content:
${body}${buildingContext}

Please draft a professional reply:`;

    // For now, we'll use a template-based approach since we don't have OpenAI API key
    // In production, you would integrate with OpenAI here
    
    // Generate a contextual reply based on the email content
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();
    
    let draftReply = '';
    
    if (lowerSubject.includes('leak') || lowerBody.includes('leak') || lowerBody.includes('water')) {
      draftReply = `Dear ${from_name || 'there'},

Thank you for your email regarding the water leak issue. I understand this is a concerning situation and I'm sorry to hear about it.

I have logged this as an urgent maintenance request and will be contacting our plumbing contractor immediately. They should be in touch with you within the next 2 hours to arrange access and assess the situation.

In the meantime, if the leak is still active, please:
- Turn off the water supply to the affected area if it's safe to do so
- Take photos of the damage if possible
- Keep any receipts for emergency repairs you may need to make

I'll keep you updated on the progress and will ensure this is resolved as quickly as possible.

Kind regards,
BlocIQ Property Management`;
    } else if (lowerSubject.includes('lift') || lowerBody.includes('lift') || lowerBody.includes('elevator')) {
      draftReply = `Dear ${from_name || 'there'},

Thank you for reporting the lift issue. I have immediately notified our lift maintenance contractor about this problem.

They will be in touch shortly to arrange access and assess the situation. In the meantime, I'll ensure that appropriate notices are posted in the building to inform other residents.

Please note that lift repairs can sometimes take several hours depending on the nature of the fault and parts availability. I'll keep you updated on the progress and estimated resolution time.

If you have any urgent accessibility requirements, please let me know immediately and I'll arrange alternative solutions.

Kind regards,
BlocIQ Property Management`;
    } else if (lowerSubject.includes('noise') || lowerBody.includes('noise') || lowerBody.includes('complaint')) {
      draftReply = `Dear ${from_name || 'there'},

Thank you for bringing this noise complaint to my attention. I understand that noise disturbances can be very disruptive to your daily life.

I will investigate this matter by:
- Contacting the relevant resident to discuss the situation
- Reviewing our building's noise policy and quiet hours
- If necessary, arranging a meeting between parties to resolve the issue amicably

Please keep a record of any further incidents, including dates and times, as this will help us address the situation more effectively.

I'll be in touch within 24 hours with an update on the progress.

Kind regards,
BlocIQ Property Management`;
    } else if (lowerSubject.includes('maintenance') || lowerBody.includes('repair') || lowerBody.includes('broken')) {
      draftReply = `Dear ${from_name || 'there'},

Thank you for reporting this maintenance issue. I have logged it in our system and will arrange for our maintenance team to investigate.

I'll be in touch within the next 4 hours to arrange access and provide you with an estimated timeline for the repair. In the meantime, please let me know if the situation becomes more urgent or if you have any specific access requirements.

If this is an emergency that requires immediate attention outside of normal hours, please contact our emergency line on [emergency number].

Kind regards,
BlocIQ Property Management`;
    } else {
      // Generic professional reply
      draftReply = `Dear ${from_name || 'there'},

Thank you for your email regarding ${subject}.

I have received your message and will review the details carefully. I'll be in touch within the next 24 hours with a comprehensive response and any necessary next steps.

If this matter requires urgent attention, please don't hesitate to contact me directly or call our office during business hours.

Kind regards,
BlocIQ Property Management`;
    }

    return NextResponse.json({ 
      success: true,
      reply: draftReply,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating draft:', error);
    return NextResponse.json({ 
      error: 'Failed to generate draft reply',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
