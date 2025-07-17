import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import OpenAI from 'openai';

interface GenerateDraftRequest {
  templateName: string;
  buildingName: string;
  leaseholderCount: number;
  category: string;
  purpose: string;
}

export async function POST(req: NextRequest) {
  try {
    const { templateName, buildingName, leaseholderCount, category, purpose }: GenerateDraftRequest = await req.json();
    
    if (!templateName || !buildingName || !purpose) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create the prompt for AI draft generation
    const systemPrompt = `You are a professional property management communication specialist. 
    Create clear, professional, and legally appropriate communications for leaseholders.
    
    Guidelines:
    - Use a professional but approachable tone
    - Be clear and concise
    - Include relevant merge tags like {{leaseholder_name}}, {{building_name}}, {{unit_number}}, {{current_date}}
    - Structure the message logically with proper paragraphs
    - End with a professional closing
    - Keep the tone appropriate for the category and purpose`;

    const userPrompt = `Create a ${category} communication template for:
    
    Template Name: ${templateName}
    Building: ${buildingName}
    Number of leaseholders: ${leaseholderCount}
    Purpose: ${purpose}
    
    Please generate a professional message that:
    1. Addresses the specific purpose mentioned
    2. Uses appropriate merge tags for personalization
    3. Maintains a professional tone
    4. Is clear and actionable
    5. Includes a proper greeting and closing
    
    Return only the message content, no additional formatting or explanations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const generatedContent = completion.choices[0]?.message?.content || '';

    if (!generatedContent) {
      return NextResponse.json({ error: 'Failed to generate draft content' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
    });

  } catch (error: any) {
    console.error('Error in generate-draft:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
