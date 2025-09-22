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

    const systemPrompt = `You are an expert compliance document analyzer for UK property management. Analyze the following compliance document and extract key information.

Document Type Detection:
- EICR (Electrical Installation Condition Report)
- Fire Risk Assessment (FRA)
- Gas Safety Certificate
- PAT Testing Certificate
- Fire Alarm Service Report
- Emergency Lighting Test
- Fire Door Inspection
- Water Hygiene Assessment (Legionella)
- Asbestos Survey
- Building Insurance Certificate
- Other Compliance Document

Extract and return the following information in JSON format:
{
  "document_type": "specific document type",
  "compliance_status": "compliant|non-compliant|requires-action|pending",
  "key_findings": ["list of key findings or defects"],
  "expiry_date": "YYYY-MM-DD or null",
  "inspection_date": "YYYY-MM-DD or null",
  "next_inspection_due": "YYYY-MM-DD or null",
  "inspector_details": "inspector name/company",
  "certificate_number": "certificate reference",
  "property_address": "property address from document",
  "recommendations": ["list of recommendations or actions required"],
  "risk_level": "low|medium|high|critical",
  "summary": "brief summary of document contents and compliance status"
}

Focus on UK compliance requirements and property management context.`;

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

    // Try to parse JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(aiResponse);
    } catch (parseError) {
      console.warn('⚠️ AI response was not valid JSON, creating structured response');
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