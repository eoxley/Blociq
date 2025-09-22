import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120; // 2 minutes for general document analysis

export async function POST(req: NextRequest) {
  try {
    const { jobId, ocrText, filename, pageCount, category, documentType } = await req.json();

    if (!jobId || !ocrText) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'jobId and ocrText are required for general document analysis'
      }, { status: 400 });
    }

    console.log('🔍 Starting general document analysis for job:', jobId, 'type:', documentType);

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI not configured');
      return NextResponse.json({
        error: 'AI service not configured',
        message: 'OpenAI API key is missing'
      }, { status: 500 });
    }

    // Dynamic import of OpenAI
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Truncate text if too long
    const maxLength = 10000; // Moderate length for general documents
    const truncatedText = ocrText.length > maxLength ?
      ocrText.substring(0, maxLength) + '\n\n[Document truncated...]' :
      ocrText;

    const systemPrompt = `You are an expert in UK property management and leasehold administration. Analyze the general document and extract relevant information in the following JSON format:

{
  "document_type": "specific document type",
  "document_category": "correspondence|insurance|legal|minutes|reports|contracts|other",
  "sender_recipient": {
    "sender": "who sent this document",
    "recipient": "who received this document",
    "sender_type": "leaseholder|management_company|freeholder|contractor|solicitor|insurer|other"
  },
  "key_dates": [
    {
      "date": "YYYY-MM-DD",
      "description": "what happened on this date"
    }
  ],
  "key_parties": [
    {
      "name": "party name",
      "role": "their role/relationship",
      "contact_details": "any contact information mentioned"
    }
  ],
  "financial_information": {
    "amounts_mentioned": [
      {
        "amount": "monetary value as number or null",
        "description": "what this amount relates to",
        "currency": "GBP|EUR|USD|other"
      }
    ],
    "payment_terms": "payment schedule or terms mentioned",
    "service_charge_related": true/false
  },
  "property_details": {
    "properties_mentioned": ["list of property addresses or names"],
    "building_works_mentioned": true/false,
    "maintenance_issues": ["list of any maintenance issues mentioned"]
  },
  "legal_matters": {
    "legal_notices": true/false,
    "disputes_mentioned": true/false,
    "compliance_issues": ["list of any compliance matters"],
    "right_to_manage": true/false,
    "lease_matters": ["list of any lease-related issues"]
  },
  "insurance_matters": {
    "insurance_claims": true/false,
    "policy_details": "any insurance policy information",
    "claim_numbers": ["list of claim reference numbers"],
    "coverage_issues": ["list of coverage matters discussed"]
  },
  "meeting_information": {
    "meeting_type": "AGM|EGM|Board|Committee|Other|null",
    "meeting_date": "YYYY-MM-DD or null",
    "attendees": ["list of attendees if mentioned"],
    "key_decisions": ["list of decisions made"],
    "action_items": ["list of action items assigned"]
  },
  "correspondence_details": {
    "subject_matter": "main topic of correspondence",
    "urgency_level": "urgent|standard|informational",
    "response_required": true/false,
    "deadline_mentioned": "YYYY-MM-DD or null"
  },
  "key_issues": [
    "Important matters requiring attention",
    "Problems or concerns raised",
    "Decisions or approvals needed"
  ],
  "recommended_actions": [
    "Follow-up actions needed",
    "Filing or administrative tasks",
    "Communication requirements"
  ],
  "requires_urgent_attention": true/false,
  "summary": "2-3 sentence summary of the document's content and significance"
}

**Document Type Categories:**

**CORRESPONDENCE:**
- Letters between leaseholders and management
- Email communications
- Formal notices and announcements
- Complaints and responses

**INSURANCE:**
- Building insurance certificates
- Public liability documentation
- Employer's liability certificates
- Insurance correspondence and claims

**LEGAL:**
- Legal notices and correspondence
- Right to Manage documentation
- Lease-related documents
- Dispute resolution materials

**MINUTES & MEETINGS:**
- AGM minutes and notices
- Board meeting minutes
- Committee meeting records
- Voting records and resolutions

**REPORTS:**
- Property management reports
- Financial reports and statements
- Maintenance reports
- Survey reports (non-compliance)

**CONTRACTS:**
- Service contracts (cleaning, gardening, etc.)
- Maintenance agreements
- Professional service agreements
- Supplier contracts

Focus on extracting actionable information and identifying items requiring follow-up or attention from the property management team.`;

    const userPrompt = `Analyze this general document:

Filename: ${filename || 'Unknown'}
Document Type: ${documentType || 'Unknown'}
Pages: ${pageCount || 'Unknown'}

Document Content:
${truncatedText}`;

    console.log('🤖 Calling OpenAI for general document analysis...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content || '{}';

    // Extract JSON from AI response (handle markdown code blocks)
    let analysisResult;
    try {
      let jsonString = aiResponse;

      // Remove markdown code block formatting if present
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      } else {
        // Try to find JSON object in response
        const objectMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonString = objectMatch[0];
        }
      }

      analysisResult = JSON.parse(jsonString);
      console.log('✅ Successfully parsed JSON response');
    } catch (parseError) {
      console.warn('⚠️ AI response was not valid JSON, creating fallback analysis');
      console.log('Raw AI response:', aiResponse.substring(0, 500));

      // Create fallback analysis for general documents
      analysisResult = {
        document_type: documentType || 'General Document',
        document_category: 'other',
        sender_recipient: {
          sender: 'Unknown',
          recipient: 'Unknown',
          sender_type: 'other'
        },
        key_dates: [],
        key_parties: [],
        financial_information: {
          amounts_mentioned: [],
          payment_terms: 'Unknown',
          service_charge_related: false
        },
        property_details: {
          properties_mentioned: [],
          building_works_mentioned: false,
          maintenance_issues: []
        },
        legal_matters: {
          legal_notices: false,
          disputes_mentioned: false,
          compliance_issues: [],
          right_to_manage: false,
          lease_matters: []
        },
        insurance_matters: {
          insurance_claims: false,
          policy_details: 'None identified',
          claim_numbers: [],
          coverage_issues: []
        },
        meeting_information: {
          meeting_type: null,
          meeting_date: null,
          attendees: [],
          key_decisions: [],
          action_items: []
        },
        correspondence_details: {
          subject_matter: 'General property management document',
          urgency_level: 'standard',
          response_required: false,
          deadline_mentioned: null
        },
        key_issues: ['Document analysis failed - manual review required'],
        recommended_actions: ['Manual review and filing', 'Determine appropriate follow-up actions'],
        requires_urgent_attention: true,
        summary: 'General document requiring manual analysis due to processing limitations'
      };
    }

    // Validate and ensure required fields
    if (!analysisResult.document_type) {
      analysisResult.document_type = documentType || 'General Document';
    }
    if (!analysisResult.document_category) {
      analysisResult.document_category = 'other';
    }
    if (!analysisResult.summary) {
      analysisResult.summary = `${analysisResult.document_type} processed for property management filing`;
    }

    console.log('✅ General document analysis completed:', analysisResult.document_type,
                `(${analysisResult.document_category})`);

    return NextResponse.json({
      success: true,
      document_type: analysisResult.document_type,
      category: 'general',
      summary: analysisResult,
      analysis_type: 'general_document',
      confidence: aiResponse.includes('"document_type"') ? 'high' : 'low'
    });

  } catch (error) {
    console.error('❌ Error in general document analysis:', error);
    return NextResponse.json({
      error: 'General document analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}