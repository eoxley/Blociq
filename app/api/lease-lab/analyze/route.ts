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
Analyze this UK lease document and extract all key information. Return ONLY a valid JSON object with the following structure - do not include any markdown formatting or code blocks:

{
  "doc_type": "lease",
  "overview": "Brief overview of the document type and property",
  "parties": ["Party 1: Full Name or Company", "Party 2: Full Name or Company"],
  "key_dates": [
    {"title": "Lease Start Date", "date": "YYYY-MM-DD", "description": "When the lease begins"},
    {"title": "Lease End Date", "date": "YYYY-MM-DD", "description": "When the lease ends"},
    {"title": "Break Clause Date", "date": "YYYY-MM-DD", "description": "When break clause can be exercised"}
  ],
  "financials": [
    {"title": "Premium/Purchase Price", "amount": "£X,XXX", "description": "One-time payment"},
    {"title": "Ground Rent", "amount": "£XXX per year", "description": "Annual ground rent"},
    {"title": "Service Charge", "amount": "£XXX per year", "description": "Annual service charge"},
    {"title": "Maintenance Charge", "amount": "£XXX", "description": "Maintenance obligations"}
  ],
  "obligations": [
    {"title": "Maintenance Responsibility", "description": "Who maintains what"},
    {"title": "Insurance Obligations", "description": "Insurance requirements"},
    {"title": "Repair Obligations", "description": "Repair responsibilities"}
  ],
  "restrictions": [
    {"title": "Use Restrictions", "description": "Permitted use of property"},
    {"title": "Alteration Restrictions", "description": "Restrictions on modifications"},
    {"title": "Assignment/Subletting", "description": "Transfer restrictions"}
  ],
  "variations": [],
  "actions": [],
  "source_spans": [],
  "unknowns": ["Any unclear or missing information"]
}

IMPORTANT: Extract real information from the document. Look for specific names, dates, amounts, and terms. Return ONLY the JSON object, no other text.

Document text:
${extractedText.substring(0, 12000)}
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
            content: 'You are a legal document analyst specializing in UK lease agreements. Extract specific information from lease documents and return ONLY valid JSON - no markdown, no explanations, no code blocks. Be precise with names, dates, and financial amounts found in the document.'
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

    // Parse the JSON response - handle markdown code blocks
    let summary;
    try {
      // Clean the response text - remove markdown code blocks if present
      let cleanedText = analysisText.trim();
      
      // Remove ```json and ``` markers if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('🔍 Attempting to parse cleaned JSON response...');
      summary = JSON.parse(cleanedText);
      console.log('✅ Successfully parsed AI analysis JSON');
      
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response after cleaning:', parseError.message);
      console.error('Raw response length:', analysisText.length);
      console.error('Cleaned response preview:', analysisText.replace(/^```json\s*/, '').replace(/\s*```$/, '').substring(0, 300));
      
      // Create a fallback summary
      summary = {
        doc_type: 'lease',
        overview: 'Analysis parsing failed - manual review required',
        parties: ['Parsing Error - Check Logs'],
        key_dates: [],
        financials: [],
        obligations: [],
        restrictions: [],
        variations: [],
        actions: [{ title: 'Manual Review Required', description: 'AI analysis parsing failed' }],
        source_spans: [],
        unknowns: ['JSON parsing failed - check server logs for details']
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
