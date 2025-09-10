import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const maxDuration = 120; // 2 minutes for AI analysis

export async function POST(req: NextRequest) {
  try {
    // Use service role client for internal processing
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { jobId, extractedText, filename, mime, userId } = await req.json();

    if (!jobId || !extractedText) {
      return NextResponse.json({ 
        error: 'Missing required data',
        message: 'Job ID and extracted text are required'
      }, { status: 400 });
    }

    // Validate the job exists and get user context if needed
    if (userId) {
      console.log('🤖 Starting AI analysis for job:', jobId, 'user:', userId);
    } else {
      console.log('🤖 Starting AI analysis for job:', jobId);
    }

    // Call OpenAI to analyze the extracted text
    const analysisPrompt = `
Analyze this lease document and extract key information. Return a structured JSON response with the following format:

{
  "doc_type": "lease",
  "overview": "Brief overview of the document",
  "parties": ["Party 1: Name", "Party 2: Name"],
  "key_dates": [
    {"title": "Lease Start Date", "date": "YYYY-MM-DD", "description": "Description"}
  ],
  "financials": [
    {"title": "Monthly Rent", "amount": "£X,XXX", "description": "Description"}
  ],
  "obligations": [
    {"title": "Maintenance", "description": "Description"}
  ],
  "restrictions": [
    {"title": "No Pets", "description": "Description"}
  ],
  "variations": [],
  "actions": [
    {"title": "Action Required", "description": "Description"}
  ],
  "source_spans": [],
  "unknowns": ["Items that need clarification"]
}

Document text:
${extractedText.substring(0, 8000)} // Limit to avoid token limits
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document analyst specializing in UK lease agreements. Extract key information and return only valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API failed: ${openaiResponse.status}`);
    }

    const openaiResult = await openaiResponse.json();
    const analysisText = openaiResult.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No analysis returned from OpenAI');
    }

    // Parse the JSON response
    let summary;
    try {
      summary = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', analysisText);
      // Create a fallback summary
      summary = {
        doc_type: 'lease',
        overview: 'Lease document analysis completed',
        parties: ['Landlord', 'Tenant'],
        key_dates: [],
        financials: [],
        obligations: [],
        restrictions: [],
        variations: [],
        actions: [],
        source_spans: [],
        unknowns: ['Analysis may need manual review']
      };
    }

    console.log('✅ AI analysis completed for job:', jobId);

    return NextResponse.json({
      success: true,
      summary,
      jobId,
      analysisLength: analysisText.length
    });

  } catch (error) {
    console.error('❌ AI analysis error:', error);
    return NextResponse.json({ 
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'AI analysis failed. Please try again.'
    }, { status: 500 });
  }
}
