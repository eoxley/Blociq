import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

interface AnalyseEmailRequest {
  emailId: string;
  subject: string | null;
  body: string | null;
  fromEmail: string | null;
  fromName: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { emailId, subject, body, fromEmail, fromName }: AnalyseEmailRequest = await req.json();
    
    if (!emailId || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all buildings for matching
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, name, address');

    if (!buildings) {
      return NextResponse.json({ error: 'No buildings found' }, { status: 404 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Prepare building context for AI
    const buildingContext = buildings.map(b => `${b.name}${b.address ? ` (${b.address})` : ''}`).join(', ');

    const systemPrompt = `You are an AI assistant that analyses property management emails using British English. Your task is to:

1. TAG the email with relevant categories from: Finance, Maintenance, Complaint, Inquiry, Emergency, Compliance, Lease, General
2. MATCH the email to a specific building if mentioned
3. Provide a confidence score (0-100) for the building match

Available buildings: ${buildingContext}

Return your response as a JSON object with this exact structure:
{
  "tags": ["tag1", "tag2"],
  "buildingMatch": {
    "buildingId": "uuid-or-null",
    "buildingName": "building-name-or-null", 
    "confidence": 85,
    "reasoning": "explanation of why this building was matched using British English"
  }
}`;

    const userPrompt = `Analyse this email using British English:

Subject: ${subject}
From: ${fromName || fromEmail}
Content: ${body}

Please provide tags and building match as specified.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the AI response
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse AI response:', responseText);
      // Fallback analysis
      analysis = {
        tags: ['General'],
        buildingMatch: {
          buildingId: null,
          buildingName: null,
          confidence: 0,
          reasoning: 'Could not parse AI response'
        }
      };
    }

    // Validate and clean the analysis
    const tags = Array.isArray(analysis.tags) ? analysis.tags : ['General'];
    const buildingMatch = analysis.buildingMatch || {
      buildingId: null,
      buildingName: null,
      confidence: 0,
      reasoning: 'No building match found'
    };

    // Update the email with analysis results
    const updateData: any = {
      tags: tags,
      analysed_at: new Date().toISOString()
    };

    // Only set building_id if confidence is high enough and building exists
    if (buildingMatch.confidence >= 70 && buildingMatch.buildingId) {
      const matchedBuilding = buildings.find(b => b.id === buildingMatch.buildingId);
      if (matchedBuilding) {
        updateData.building_id = buildingMatch.buildingId;
      }
    }

    const { error: updateError } = await supabase
      .from('incoming_emails')
      .update(updateData)
      .eq('id', emailId);

    if (updateError) {
      console.error('Error updating email with analysis:', updateError);
    }

    return NextResponse.json({
      success: true,
      analysis: {
        tags,
        buildingMatch,
        updated: !updateError
      }
    });

  } catch (error: any) {
    console.error('Error in analyse-email:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 