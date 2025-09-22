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

    console.log('🤖 Starting AI analysis for general document:', jobId);

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

    const systemPrompt = `You are an expert document analyzer for UK property management. Analyze the following general business document and extract key information.

Document Type Detection:
- Meeting Minutes
- Correspondence/Letter
- Email Communication
- Report
- Spreadsheet/Financial Document
- Contract/Agreement
- Policy Document
- Notice/Announcement
- Invoice/Receipt
- Technical Document
- Other Business Document

Extract and return the following information in JSON format:
{
  "document_type": "specific document type",
  "key_topics": ["list of main topics discussed"],
  "key_points": ["list of important points or decisions"],
  "action_items": ["list of actions required or assigned"],
  "date_mentioned": "YYYY-MM-DD or null (any dates mentioned in document)",
  "participants": ["list of people mentioned"],
  "urgency": "low|medium|high",
  "category": "administrative|financial|legal|operational|communication",
  "summary": "brief summary of document contents and purpose",
  "building_references": ["any building names or addresses mentioned"],
  "follow_up_required": true/false
}

Focus on UK property management context and extract actionable information.`;

    const userPrompt = `Analyze this general business document:

Filename: ${filename}
Pages: ${pageCount}

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
        document_type: 'general_document',
        key_topics: ['Document processed'],
        summary: aiResponse.substring(0, 500),
        category: 'administrative',
        urgency: 'medium'
      };
    }

    console.log('✅ General document analysis completed for job:', jobId);

    return NextResponse.json({
      success: true,
      document_type: analysisResult.document_type,
      summary: analysisResult,
      analysis_complete: true
    });

  } catch (error) {
    console.error('❌ Error in general document analysis:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}