import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isLeaseDocument, generateBasicDocumentSummary } from '@/lib/lease/LeaseDocumentParser';

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

    // Check if this is actually a lease document
    const isLease = isLeaseDocument(filename, extractedText);
    console.log(`📄 Document type detection for "${filename}": ${isLease ? 'LEASE' : 'NON-LEASE'}`);

    if (!isLease) {
      // Generate basic summary for non-lease documents
      console.log('📋 Generating basic summary for non-lease document');
      const basicSummary = generateBasicDocumentSummary(filename, extractedText);
      
      // Update job with basic summary
      await serviceSupabase
        .from('document_jobs')
        .update({ 
          status: 'COMPLETED',
          analysis_result: basicSummary,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return NextResponse.json({ 
        success: true,
        message: 'Non-lease document processed with basic summary',
        isLease: false,
        documentType: basicSummary.documentType,
        analysis: basicSummary
      });
    }

    // Continue with lease processing for actual lease documents
    console.log('🏠 Processing as lease document');
    if (userId) {
      console.log('🤖 Starting AI lease analysis for job:', jobId, 'user:', userId);
    } else {
      console.log('🤖 Starting AI lease analysis for job:', jobId);
    }

    // Call OpenAI to analyze the extracted text with comprehensive LeaseClear-style analysis
    const analysisPrompt = `
Analyze this UK lease document with the same comprehensive detail as the professional LeaseClear service. Extract ALL information systematically and create a detailed report with specific clause references. Return ONLY a valid JSON object - no markdown formatting or code blocks:

{
  "doc_type": "lease",
  "executive_summary": "Comprehensive overview like: This is a lease for a [property type] in [location] for a term of [X] years from [start date]. The leaseholder is responsible for [key responsibilities]. A management company is responsible for [their duties], with costs recovered through [service charge details]. Key restrictions include [main restrictions].",
  "basic_property_details": {
    "property_description": "e.g. First Floor Flat at 133 Selhurst Close, Wimbledon, known as Plot 259",
    "lease_term": "e.g. 125 years starting from 1st January 1992", 
    "parties": [
      "Lessor: [Full company/person name]",
      "Lessee: [Full names of all lessees]", 
      "Management Company: [Company name if applicable]"
    ],
    "title_number": "e.g. TGL 57174",
    "referenced_clauses": ["Page references and clause citations"]
  },
  "detailed_sections": [
    {
      "section_title": "Ground Rent",
      "content": [
        "The ground rent is [amount] per year, payable on [date] if demanded by the Lessor."
      ],
      "referenced_clauses": ["TO HOLD (Page 8), Clause 2(1)"]
    },
    {
      "section_title": "Pets", 
      "content": [
        "You are not allowed to keep any bird, cat, dog, or other animal that might cause annoyance to other residents of the building or the estate."
      ],
      "referenced_clauses": ["Clause 3(15)"]
    },
    {
      "section_title": "Alterations & Improvements",
      "content": [
        "You must not make any alterations or additions to the property, either internally or externally, without first getting written consent from the Lessor.",
        "You are explicitly forbidden from interfering with, injuring, or removing any main walls, timbers, or other structural or load-bearing parts of the property."
      ],
      "referenced_clauses": ["Clause 3(10)"]
    },
    {
      "section_title": "Repairs and Maintenance Responsibilities", 
      "content": [
        "Your (Lessee's) Responsibilities: You are responsible for the repair and upkeep of the inside of your flat, including non-structural walls, floors, ceilings, windows, and window frames. You must also maintain the interior of the flat and the exterior of the flat's entrance door in good decorative condition.",
        "Company's Responsibilities: The Management Company is responsible for repairing and maintaining the main structure of the building (foundations, roof, structural walls), the Internal Common Areas, and the External Common Areas (including footpaths, accessways, and fences)."
      ],
      "referenced_clauses": ["Lessee: Clause 2(10), Clause 3(1), Clause 3(2), Company: Clause 5(1), Clause 5(2)"]
    },
    {
      "section_title": "Service Charge Provisions",
      "content": [
        "Apportionment: You must pay a service charge, which is split into two parts. Your share for internal building costs is [X]% ('Internal Specified Proportion'). Your share for external estate costs ('External Specified Proportion') is based on your property type as listed in the lease.",
        "Financial Year: The service charge year runs from [start date] to [end date].",
        "Payment Schedule: The Management Company will send an estimate of the year's costs after [date]. You must pay this within [X] days of the notice, although the Company may allow you to pay in up to [X] equal monthly instalments by standing order.",
        "Covered Costs: The service charge covers costs for repairs, maintenance, cleaning, gardening, insurance for the building, management fees, and contributions to a reserve fund for future major works."
      ],
      "referenced_clauses": ["Definitions: 'INTERNAL SPECIFIED PROPORTION', 'EXTERNAL SPECIFIED PROPORTION' (Page 1 & 2), Clause 6A(1), 6A(2), 6A(3), Clause 6B, Clause 7(8)"]
    },
    {
      "section_title": "Demised Premises Definition",
      "content": [
        "The 'Premises' refers to the flat itself, including the structure up to the halfway point of walls, floors, and ceilings shared with other properties.",
        "The demise specifically includes the external walls, doors, windows, and window frames of your flat.",
        "It also includes any allocated balcony, private store, and letterbox. For top-floor flats, the roof and its supporting structure are included."
      ],
      "referenced_clauses": ["Definitions: 'THE PREMISES' (Page 1), Clause 1(1), 1(3), 1(5), 1(6), 1(7)"]
    },
    {
      "section_title": "Access Rights & Services",
      "content": [
        "Your Rights: You have the right to use the internal and external common areas (like hallways, stairs, paths, and gardens) for their intended purposes.",
        "Lessor's/Company's Rights: The Lessor or Management Company has the right to enter your property to check its condition or carry out repairs, provided they give you reasonable notice (except in an emergency). They also have rights to run services for other properties through your demise."
      ],
      "referenced_clauses": ["Lessee's Rights: Clause 1(10), Clause 1(11), Lessor's/Company's Rights: Clause 1(15), 1(16), 1(17), Clause 2(5)"]
    },
    {
      "section_title": "Use Restrictions",
      "content": [
        "The property must only be used as a single private home for you and your family.",
        "Any garage or parking space included with the property can only be used for parking one private motor vehicle.",
        "You cannot display any signs, plates, or placards in the windows or on the exterior, except for one 'for sale' or 'to let' board."
      ],
      "referenced_clauses": ["Clause 3(8)(a), Clause 3(14), Clause 3(16)(b)"]
    },
    {
      "section_title": "Subletting & Assignment",
      "content": [
        "You cannot sell or sublet only a part of your property; it must be the whole flat.",
        "When you sell (assign) the lease, the new owner must apply in writing to become a member of the Management Company.",
        "You must notify the Lessor in writing within [X] days of any sale, mortgage, or transfer and pay a registration fee.",
        "During the last seven years of the lease term, you need the Lessor's written consent to sell or sublet, though this consent cannot be unreasonably withheld."
      ],
      "referenced_clauses": ["Clause 2(8), Clause 2(9), Clause 9"]
    },
    {
      "section_title": "Nuisance and Anti-Social Behaviour",
      "content": [
        "You must not do anything on the property or estate that could be considered a nuisance or cause annoyance to other residents, the Lessor, or the Management Company.",
        "You must not play any musical instruments, audio equipment, or sing in a way that is audible outside your flat between the hours of [X] p.m. and [X] a.m."
      ],
      "referenced_clauses": ["Clause 3(9), Clause 3(13)"]
    },
    {
      "section_title": "Insurance Obligations",
      "content": [
        "The Management Company is responsible for insuring the entire building against standard risks, including subsidence and landslip, for its full rebuilding cost.",
        "You must not do anything that could invalidate the building's insurance policy or cause the premium to increase.",
        "The Company must use any insurance payout to rebuild or repair the building."
      ],
      "referenced_clauses": ["Clause 3(12), Clause 5(6)"]
    },
    {
      "section_title": "Forfeiture & Breach",
      "content": [
        "If you fail to pay rent or breach any of your lease obligations, the Lessor has the right to 're-enter' the property, which would end your lease.",
        "This right to forfeit is subject to legal protections, and the Lessor must give one month's written notice to your mortgage lender before taking action."
      ],
      "referenced_clauses": ["Clause 8"]
    },
    {
      "section_title": "Remedial Powers for Landlord",
      "content": [
        "If the Lessor serves you a notice to carry out repairs and you fail to do so within two months, the Lessor has the right to enter your property, perform the required works, and charge you for all associated costs. These costs can be recovered from you in the same way as unpaid rent."
      ],
      "referenced_clauses": ["Clause 2(6)"]
    }
  ],
  "other_provisions": [
    {
      "title": "Company Membership",
      "description": "As the owner, you must be a member of the Management Company. On selling the property, you must ensure the buyer signs a deed to become a member.",
      "referenced_clauses": ["Clause 2(8)(b), Clause 2(9)(c)"]
    },
    {
      "title": "Parking Restrictions", 
      "description": "You must not leave any vehicle that is not roadworthy on the estate for more than 48 hours.",
      "referenced_clauses": ["Clause 3(5)"]
    },
    {
      "title": "Washing Restrictions",
      "description": "You are not allowed to hang washing or clothes lines anywhere on the exterior of your flat or in the common areas, except in any specifically designated drying areas.",
      "referenced_clauses": ["Clause 3(16)(a)"]
    }
  ],
  "disclaimer": "This analysis is generated by artificial intelligence and is for informational purposes only. It should not be considered as legal advice. The AI may make errors or omissions in its analysis. Always consult with a qualified solicitor or legal professional for specific legal matters regarding your lease agreement before making any important decisions."
}

CRITICAL INSTRUCTIONS:
1. Extract EVERY section like the LeaseClear example - be extremely comprehensive and thorough
2. Include specific clause references for EVERYTHING like "Clause 3(15)" or "Page 8" 
3. Use exact wording from the lease where possible - copy verbatim important clauses
4. Fill in specific amounts, dates, percentages, and numbers where found in the document
5. Create detailed sections for ALL lease aspects: pets, alterations, repairs, service charges, use restrictions, subletting, insurance, forfeiture, remedial powers, etc.
6. The executive_summary should be a comprehensive paragraph explaining the lease type, location, term, key responsibilities, and main restrictions
7. For service charges, extract exact percentages, payment schedules, and covered costs
8. Include the disclaimer exactly as provided
9. Return ONLY the JSON object, no other text or formatting

Document text to analyze:
${extractedText.substring(0, 60000)}
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
            content: 'You are a professional lease analysis service like LeaseClear, specializing in comprehensive UK lease document analysis. Your task is to extract EVERY detail from lease documents with the same thoroughness and structure as the LeaseClear sample provided. Create detailed sections for ALL lease aspects including: basic property details, ground rent, pets policy, alterations rules, repair responsibilities, service charge provisions, demised premises definition, access rights, use restrictions, subletting rules, nuisance clauses, insurance obligations, forfeiture terms, remedial powers, and other key provisions. Include specific clause references (e.g. "Clause 3(15)", "Page 8", "TO HOLD (Page 8)") for every statement. Extract exact wording, specific amounts, dates, percentages, and payment schedules. Match the professional formatting and comprehensive coverage of the LeaseClear example. Return ONLY valid JSON - no markdown, no explanations, no code blocks.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 6000
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
