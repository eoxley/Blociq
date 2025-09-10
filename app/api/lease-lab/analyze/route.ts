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

    // Call OpenAI to analyze the extracted text with enhanced clause analysis
    const analysisPrompt = `
Analyze this UK lease document and extract comprehensive clause information. Return ONLY a valid JSON object - no markdown formatting or code blocks:

{
  "doc_type": "lease",
  "overview": "Brief overview of the document type and property location",
  "parties": ["Party 1: Full Name or Company", "Party 2: Full Name or Company"],
  "property_details": {
    "address": "Full property address",
    "description": "Type of property (flat, house, etc.)",
    "lease_type": "Leasehold/Freehold"
  },
  "key_dates": [
    {"title": "Lease Start Date", "date": "YYYY-MM-DD", "description": "When the lease begins"},
    {"title": "Lease End Date", "date": "YYYY-MM-DD", "description": "When the lease ends"},
    {"title": "Break Clause Date", "date": "YYYY-MM-DD", "description": "When break clause can be exercised"}
  ],
  "financials": [
    {"title": "Premium/Purchase Price", "amount": "£X,XXX", "description": "One-time payment"},
    {"title": "Ground Rent", "amount": "£XXX per year", "description": "Annual ground rent"},
    {"title": "Service Charge", "amount": "£XXX per year", "description": "Annual service charge"}
  ],
  "clause_summaries": [
    {
      "clause_type": "Rent Review",
      "title": "Rent Review Mechanism", 
      "summary": "Detailed explanation of how rent reviews work",
      "key_points": ["Point 1", "Point 2"],
      "frequency": "Every X years",
      "impact": "High/Medium/Low impact on tenant"
    },
    {
      "clause_type": "Repair & Maintenance",
      "title": "Maintenance Responsibilities",
      "summary": "Who is responsible for what repairs and maintenance",
      "key_points": ["Tenant responsibilities", "Landlord responsibilities"],
      "frequency": "Ongoing",
      "impact": "High impact on tenant"
    },
    {
      "clause_type": "Assignment & Subletting", 
      "title": "Transfer Rights",
      "summary": "Rules about selling or subletting the lease",
      "key_points": ["Assignment process", "Consent requirements"],
      "frequency": "As needed",
      "impact": "Medium impact on tenant"
    },
    {
      "clause_type": "Use Restrictions",
      "title": "Permitted Use",
      "summary": "What the property can and cannot be used for", 
      "key_points": ["Permitted uses", "Prohibited activities"],
      "frequency": "Ongoing",
      "impact": "Medium impact on tenant"
    },
    {
      "clause_type": "Insurance",
      "title": "Insurance Requirements",
      "summary": "Insurance obligations for both parties",
      "key_points": ["Building insurance", "Contents insurance"],
      "frequency": "Annual",
      "impact": "Medium impact on tenant"
    }
  ],
  "obligations": [
    {"title": "Tenant Obligations", "description": "Key things the tenant must do"},
    {"title": "Landlord Obligations", "description": "Key things the landlord must do"}
  ],
  "restrictions": [
    {"title": "Property Use", "description": "How the property can be used"},
    {"title": "Modifications", "description": "Rules about making changes"}
  ],
  "key_risks": [
    {"risk": "Risk description", "impact": "High/Medium/Low", "mitigation": "How to address this risk"}
  ],
  "actions_required": [
    {"action": "What needs to be done", "by_whom": "Tenant/Landlord", "deadline": "When", "priority": "High/Medium/Low"}
  ],
  "unknowns": ["Items requiring legal clarification"]
}

CRITICAL INSTRUCTIONS:
1. Focus heavily on CLAUSE SUMMARIES - this is the most important section
2. Extract actual clause content, not generic descriptions
3. Look for specific lease terms, conditions, and obligations
4. Identify unusual or non-standard clauses that need attention
5. Summarize complex legal language in plain English
6. Return ONLY the JSON object, no other text

Document text:
${extractedText.substring(0, 15000)}
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
            content: 'You are an expert UK property lawyer specializing in lease analysis. Your task is to read lease documents and extract detailed clause summaries in plain English. Focus on identifying specific lease terms, unusual clauses, tenant/landlord obligations, and potential risks. Convert complex legal language into clear summaries that property professionals can understand. Return ONLY valid JSON - no markdown, no explanations, no code blocks. Be precise with actual clause content, not generic descriptions.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
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
      console.log('🔍 First 500 chars of cleaned response:', cleanedText.substring(0, 500));
      summary = JSON.parse(cleanedText);
      console.log('✅ Successfully parsed AI analysis JSON');
      console.log('🔍 Has clause_summaries:', summary.clause_summaries ? `${summary.clause_summaries.length} clauses` : 'missing');
      
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
