import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // 1 minute for classification

export async function POST(req: NextRequest) {
  try {
    const { filename, ocrText } = await req.json();

    if (!filename && !ocrText) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'Either filename or OCR text is required for classification'
      }, { status: 400 });
    }

    console.log('🔍 Classifying document:', filename);

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
    const maxLength = 8000; // Shorter for classification
    const truncatedText = ocrText?.length > maxLength ?
      ocrText.substring(0, maxLength) + '\n\n[Document truncated...]' :
      ocrText;

    const systemPrompt = `You are an expert document classifier for UK property management. Classify the document into one of these categories:

**COMPLIANCE DOCUMENTS:**
- EICR (Electrical Installation Condition Report)
- Fire Risk Assessment (FRA)
- Gas Safety Certificate
- PAT Testing Certificate
- Fire Alarm Service Report
- Emergency Lighting Test
- Fire Door Inspection
- Water Hygiene Assessment (Legionella)
- Asbestos Survey
- Lift LOLER Inspection
- Building Insurance Certificate

**MAJOR WORKS:**
- Section 20 Notice (NOI - Notice of Intention, Estimates, Award, Contract)
- Major Works Estimates/Quotes
- Major Works Contract Award
- Major Works Project Scope/Specification
- Contractor Selection Documentation
- Major Works Completion Certificate

**GENERAL DOCUMENTS:**
- Insurance Documents (Building, Public Liability, Employer's Liability)
- AGM Minutes
- Board Minutes/Notices
- Management Company Correspondence
- Contractor Quotes (minor works)
- Leaseholder Correspondence
- Legal Notices
- Service Charge Documentation
- Right to Manage Documents
- Property Management Reports

Return JSON in this exact format:
{
  "document_type": "specific document type",
  "category": "compliance|major_works|general",
  "confidence": "high|medium|low",
  "stage": "NOI|Estimates|Award|Contract|null (for Section 20 only)",
  "suggested_action": "brief description of recommended next steps",
  "key_indicators": ["list of text patterns that led to this classification"],
  "requires_urgent_attention": true/false
}

Classification Guidelines:
- Section 20 Notices: Look for "Notice of Intention", "major works", "consultation", "qualifying works"
- Major Works: Look for project specifications, contractor quotes over £250, structural work
- Compliance: Look for inspection reports, certificates, test results, regulatory compliance
- General: Everything else including correspondence, minutes, insurance, routine maintenance

Focus on UK property management and leasehold legislation context.`;

    const userPrompt = `Classify this document:

Filename: ${filename || 'Unknown'}

${truncatedText ? `Content:\n${truncatedText}` : 'No content provided - classify based on filename only.'}`;

    console.log('🤖 Calling OpenAI for document classification...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 800,
    });

    const aiResponse = completion.choices[0]?.message?.content || '{}';

    // Try to parse JSON response
    let classificationResult;
    try {
      classificationResult = JSON.parse(aiResponse);
    } catch (parseError) {
      console.warn('⚠️ AI response was not valid JSON, creating fallback classification');

      // Fallback classification based on filename
      let fallbackCategory = 'general';
      let fallbackType = 'General Document';

      const filenameLower = filename?.toLowerCase() || '';
      if (filenameLower.includes('eicr') || filenameLower.includes('electrical')) {
        fallbackCategory = 'compliance';
        fallbackType = 'EICR';
      } else if (filenameLower.includes('section 20') || filenameLower.includes('s20')) {
        fallbackCategory = 'major_works';
        fallbackType = 'Section 20 Notice';
      } else if (filenameLower.includes('insurance')) {
        fallbackCategory = 'general';
        fallbackType = 'Insurance Document';
      }

      classificationResult = {
        document_type: fallbackType,
        category: fallbackCategory,
        confidence: 'low',
        stage: null,
        suggested_action: 'Manual review recommended due to classification uncertainty',
        key_indicators: ['Filename analysis only'],
        requires_urgent_attention: false
      };
    }

    // Validate required fields
    if (!classificationResult.document_type) {
      classificationResult.document_type = 'Unknown Document';
    }
    if (!classificationResult.category) {
      classificationResult.category = 'general';
    }
    if (!classificationResult.confidence) {
      classificationResult.confidence = 'medium';
    }

    console.log('✅ Document classification completed:', classificationResult.document_type,
                `(${classificationResult.category}, ${classificationResult.confidence} confidence)`);

    return NextResponse.json({
      success: true,
      classification: classificationResult,
      filename: filename
    });

  } catch (error) {
    console.error('❌ Error in document classification:', error);
    return NextResponse.json({
      error: 'Classification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}