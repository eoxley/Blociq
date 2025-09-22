import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120; // 2 minutes for AI analysis

export async function POST(req: NextRequest) {
  try {
    const { jobId, ocrText, filename, pageCount, category } = await req.json();

    if (!jobId || !ocrText) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'jobId and ocrText are required'
      }, { status: 400 });
    }

    console.log('🤖 Starting AI analysis for compliance document:', jobId);

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

    // Truncate OCR text if too long (keep within token limits)
    const maxLength = 15000; // Approximately 3000-4000 tokens
    const truncatedText = ocrText.length > maxLength ?
      ocrText.substring(0, maxLength) + '\n\n[Document truncated...]' :
      ocrText;

    const systemPrompt = `You are an expert compliance document analyzer for UK property management with specialized knowledge of BS 7671 wiring regulations, Fire Safety Order requirements, and all UK building compliance standards.

Document Type Detection:
- EICR (Electrical Installation Condition Report) - Include C1/C2/C3/FI classifications
- Fire Risk Assessment (FRA) - Include risk ratings and action priorities
- Gas Safety Certificate - Include gas appliance details and safety status
- PAT Testing Certificate - Include appliance test results
- Fire Alarm Service Report - Include zone testing and defects
- Emergency Lighting Test - Include emergency lighting duration and battery status
- Fire Door Inspection - Include door integrity and compliance status
- Water Hygiene Assessment (Legionella) - Include water temperature readings and risk assessment
- Asbestos Survey - Include asbestos type, condition, and risk rating
- Building Insurance Certificate - Include coverage details and renewal dates
- Lift LOLER Inspection - Include thorough examination results
- Other Compliance Document

For EICR documents specifically, extract:
- C1 observations (Danger present - immediate action required)
- C2 observations (Potentially dangerous - urgent remedial action required)
- C3 observations (Improvement recommended)
- FI observations (Further investigation required)
- Overall electrical installation condition
- Distribution board details
- RCD testing results
- Insulation resistance values
- Earth fault loop impedance readings

Extract and return the following information in JSON format:
{
  "document_type": "specific document type (e.g., EICR, FRA, Gas Safety Certificate)",
  "compliance_status": "satisfactory|unsatisfactory|requires-action|not-applicable",
  "property_details": {
    "address": "full property address",
    "description": "property description/type",
    "client_details": "client/freeholder name and contact"
  },
  "inspection_details": {
    "inspection_date": "YYYY-MM-DD",
    "next_inspection_due": "YYYY-MM-DD",
    "inspector_name": "inspector name",
    "inspector_company": "inspector company/organization",
    "inspector_qualifications": "relevant qualifications",
    "certificate_number": "certificate/report reference number"
  },
  "key_findings": [
    {
      "observation": "description of finding/defect",
      "classification": "C1|C2|C3|FI|High|Medium|Low|Fail|Pass",
      "location": "specific location in building",
      "action_required": "required remedial action",
      "priority": "immediate|urgent|routine|monitoring"
    }
  ],
  "test_results": {
    "overall_condition": "satisfactory|unsatisfactory",
    "distribution_boards": ["list of board conditions"],
    "rcd_test_results": ["RCD test outcomes"],
    "insulation_resistance": "values where available",
    "earth_fault_readings": "readings where available"
  },
  "recommendations": [
    {
      "action": "specific recommended action",
      "reason": "justification for recommendation",
      "timeframe": "suggested completion timeframe",
      "regulation_reference": "relevant BS 7671 regulation or other standard"
    }
  ],
  "expiry_date": "YYYY-MM-DD or null",
  "next_review_date": "YYYY-MM-DD or null",
  "risk_assessment": {
    "overall_risk": "low|medium|high|critical",
    "immediate_hazards": ["list of immediate safety concerns"],
    "compliance_gaps": ["areas not meeting current regulations"]
  },
  "regulatory_compliance": {
    "meets_current_standards": true/false,
    "relevant_regulations": ["BS 7671", "IET Wiring Regulations", "etc."],
    "landlord_obligations": ["specific obligations under current legislation"]
  },
  "summary": "comprehensive summary including overall condition, critical findings, and recommended next steps"
}

IMPORTANT:
- For EICRs, always classify observations as C1 (immediate danger), C2 (potentially dangerous), C3 (improvement recommended), or FI (further investigation)
- For FRAs, use risk levels: Trivial, Tolerable, Moderate, Substantial, Intolerable
- Extract exact dates, readings, and reference numbers where available
- Focus on actionable findings that property managers need to address
- Identify legal compliance requirements and landlord obligations`;

    const userPrompt = `Analyze this compliance document:

Filename: ${filename}
Pages: ${pageCount}

Document Content:
${truncatedText}`;

    console.log('🤖 Calling OpenAI for compliance analysis...');

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
      console.warn('⚠️ AI response was not valid JSON, creating structured response');
      console.log('Raw AI response:', aiResponse.substring(0, 500));

      analysisResult = {
        document_type: 'compliance_document',
        compliance_status: 'pending',
        key_findings: ['Document processed but detailed analysis unavailable'],
        summary: aiResponse.substring(0, 500),
        risk_level: 'medium'
      };
    }

    console.log('✅ Compliance analysis completed for job:', jobId);

    return NextResponse.json({
      success: true,
      document_type: analysisResult.document_type,
      summary: analysisResult,
      analysis_complete: true
    });

  } catch (error) {
    console.error('❌ Error in compliance document analysis:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}