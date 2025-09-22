import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 180; // 3 minutes for major works analysis

export async function POST(req: NextRequest) {
  try {
    const { jobId, ocrText, filename, pageCount, category, documentType, stage } = await req.json();

    if (!jobId || !ocrText) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'jobId and ocrText are required for major works analysis'
      }, { status: 400 });
    }

    console.log('🔍 Starting major works analysis for job:', jobId, 'type:', documentType, 'stage:', stage);

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
    const maxLength = 12000; // Longer for major works documents
    const truncatedText = ocrText.length > maxLength ?
      ocrText.substring(0, maxLength) + '\n\n[Document truncated...]' :
      ocrText;

    const systemPrompt = `You are an expert in UK property management and Section 20 consultation procedures for major works. Analyze the document and extract comprehensive information in the following JSON format:

{
  "document_type": "specific document type (e.g., Section 20 Notice of Intention, Major Works Estimates, Contract Award)",
  "stage": "NOI|Estimates|Award|Contract|null",
  "consultation_details": {
    "consultation_period_start": "YYYY-MM-DD or null",
    "consultation_period_end": "YYYY-MM-DD or null",
    "response_deadline": "YYYY-MM-DD or null",
    "consultation_type": "Section 20|Section 20ZA|Informal|null",
    "leaseholder_count": "number or null"
  },
  "project_description": {
    "scope_of_works": "detailed description of the proposed works",
    "reason_for_works": "why the works are necessary",
    "building_areas_affected": ["list of areas/components"],
    "urgency_level": "urgent|standard|routine"
  },
  "financial_details": {
    "estimated_cost": "total estimated cost as number or null",
    "cost_per_unit": "average cost per leaseholder or null",
    "cost_breakdown": [
      {
        "item": "description of work item",
        "cost": "cost as number or null"
      }
    ],
    "service_charge_implications": "description of how this affects service charges"
  },
  "contractor_details": {
    "contractors_invited": ["list of contractor names"],
    "selected_contractor": "name of selected contractor or null",
    "tender_process": "description of tendering process",
    "contractor_qualifications": "relevant experience/qualifications mentioned"
  },
  "legal_compliance": {
    "section_20_compliant": true/false,
    "statutory_requirements_met": ["list of requirements addressed"],
    "consultation_requirements": "description of consultation obligations",
    "dispensation_applied": true/false/null
  },
  "timeline": {
    "works_start_date": "YYYY-MM-DD or null",
    "estimated_completion": "YYYY-MM-DD or null",
    "key_milestones": [
      {
        "milestone": "description",
        "date": "YYYY-MM-DD or null"
      }
    ]
  },
  "leaseholder_impact": {
    "disruption_level": "high|medium|low",
    "alternative_arrangements": "description of temporary arrangements",
    "leaseholder_obligations": "what leaseholders need to do",
    "payment_schedule": "when payments are due"
  },
  "key_findings": [
    "Important points extracted from the document",
    "Compliance concerns or recommendations",
    "Action items for property management"
  ],
  "requires_urgent_attention": true/false,
  "recommended_actions": [
    "Next steps in the consultation process",
    "Items requiring immediate attention",
    "Compliance actions needed"
  ],
  "summary": "2-3 sentence summary of the document's purpose and key information"
}

**Document Analysis Guidelines:**

**Section 20 Notice of Intention (NOI):**
- Look for: "Notice of Intention", "qualifying works", "major works", consultation periods
- Extract: consultation deadlines, scope of works, estimated costs
- Focus on: compliance with statutory consultation requirements

**Estimates Stage:**
- Look for: multiple contractor quotes, detailed specifications, cost breakdowns
- Extract: contractor details, itemised costs, comparison criteria
- Focus on: value for money assessment, contractor selection process

**Award/Contract Stage:**
- Look for: contractor selection rationale, final costs, contract terms
- Extract: selected contractor details, final pricing, contract commencement
- Focus on: transparent selection process, cost justification

**General Major Works:**
- Look for: scope of works, necessity, impact on leaseholders
- Extract: project description, costs, timelines, disruption
- Focus on: proportionality, necessity, proper process

Focus on UK leasehold law, property management best practices, and Section 20 consultation procedures. Identify any compliance issues or areas requiring attention.`;

    const userPrompt = `Analyze this major works document:

Filename: ${filename || 'Unknown'}
Document Type: ${documentType || 'Unknown'}
Stage: ${stage || 'Unknown'}
Pages: ${pageCount || 'Unknown'}

Document Content:
${truncatedText}`;

    console.log('🤖 Calling OpenAI for major works analysis...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
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

      // Create fallback analysis for major works
      analysisResult = {
        document_type: documentType || 'Major Works Document',
        stage: stage || null,
        consultation_details: {
          consultation_period_start: null,
          consultation_period_end: null,
          response_deadline: null,
          consultation_type: 'Section 20',
          leaseholder_count: null
        },
        project_description: {
          scope_of_works: 'Major works project - detailed analysis unavailable',
          reason_for_works: 'Analysis could not be completed',
          building_areas_affected: [],
          urgency_level: 'standard'
        },
        financial_details: {
          estimated_cost: null,
          cost_per_unit: null,
          cost_breakdown: [],
          service_charge_implications: 'Unknown - manual review required'
        },
        contractor_details: {
          contractors_invited: [],
          selected_contractor: null,
          tender_process: 'Unknown',
          contractor_qualifications: 'Unknown'
        },
        legal_compliance: {
          section_20_compliant: null,
          statutory_requirements_met: [],
          consultation_requirements: 'Manual review required',
          dispensation_applied: null
        },
        timeline: {
          works_start_date: null,
          estimated_completion: null,
          key_milestones: []
        },
        leaseholder_impact: {
          disruption_level: 'medium',
          alternative_arrangements: 'Unknown',
          leaseholder_obligations: 'Manual review required',
          payment_schedule: 'Unknown'
        },
        key_findings: ['Document analysis failed - manual review required'],
        requires_urgent_attention: true,
        recommended_actions: ['Manual review by property management team', 'Verify consultation requirements'],
        summary: 'Major works document requiring manual analysis due to processing limitations'
      };
    }

    // Validate and ensure required fields
    if (!analysisResult.document_type) {
      analysisResult.document_type = documentType || 'Major Works Document';
    }
    if (!analysisResult.stage) {
      analysisResult.stage = stage || null;
    }
    if (!analysisResult.summary) {
      analysisResult.summary = `${analysisResult.document_type} document processed for property management review`;
    }

    console.log('✅ Major works analysis completed:', analysisResult.document_type,
                `(${analysisResult.stage || 'stage unknown'})`);

    return NextResponse.json({
      success: true,
      document_type: analysisResult.document_type,
      category: 'major_works',
      summary: analysisResult,
      analysis_type: 'major_works',
      confidence: aiResponse.includes('"document_type"') ? 'high' : 'low'
    });

  } catch (error) {
    console.error('❌ Error in major works analysis:', error);
    return NextResponse.json({
      error: 'Major works analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}