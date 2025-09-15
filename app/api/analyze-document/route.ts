// app/api/analyze-document/route.ts - Document Summary API
import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface DocumentSummaryRequest {
  extractedText: string;
  filename: string;
  documentType: string;
  metadata: any;
}

interface DocumentSummary {
  documentName: string;
  documentType: string;
  keyDates: {
    startDate?: string;
    endDate?: string;
    paymentDates?: string[];
    reviewDates?: string[];
    noticePeriods?: string[];
    otherImportantDates?: Array<{date: string, description: string}>;
  };
  keyParties: {
    lessor?: string;
    lessee?: string;
    agent?: string;
    guarantor?: string;
  };
  propertyDetails: {
    address?: string;
    type?: string;
    description?: string;
  };
  financialTerms: {
    rent?: string;
    deposit?: string;
    serviceCharge?: string;
    otherFees?: Array<{type: string, amount: string}>;
  };
  keyTerms: string[];
  summary: string;
  extractedLength: number;
  confidence: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('📋 Document Analysis API: Processing summary request...');
    
    const { extractedText, filename, documentType, metadata }: DocumentSummaryRequest = await request.json();
    
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No extracted text provided for analysis'
      }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }
    
    console.log('📋 Generating document summary for:', filename);
    console.log('📄 Document type:', documentType);
    console.log('📊 Text length:', extractedText.length);
    
    // Step 1: Extract structured data using regex patterns
    const structuredData = extractStructuredData(extractedText);
    console.log('📐 Structured data extracted:', Object.keys(structuredData));
    
    // Step 2: Generate AI summary and analysis
    const aiAnalysis = await generateAISummary(extractedText, filename, documentType, structuredData);
    console.log('🤖 AI analysis completed');
    
    // Step 3: Combine structured extraction with AI analysis
    const summary: DocumentSummary = {
      documentName: extractDocumentName(filename, extractedText),
      documentType: documentType,
      keyDates: {
        ...structuredData.dates,
        ...aiAnalysis.dates
      },
      keyParties: {
        ...structuredData.parties,
        ...aiAnalysis.parties
      },
      propertyDetails: {
        ...structuredData.property,
        ...aiAnalysis.property
      },
      financialTerms: {
        ...structuredData.financial,
        ...aiAnalysis.financial
      },
      keyTerms: aiAnalysis.keyTerms || [],
      summary: aiAnalysis.summary || generateFallbackSummary(extractedText, structuredData).summary,
      extractedLength: extractedText.length,
      confidence: calculateSummaryConfidence(structuredData, aiAnalysis, extractedText)
    };
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Document summary generated in ${processingTime}ms with confidence:`, summary.confidence);
    
    return NextResponse.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error generating document summary:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate document summary',
      details: 'Document analysis failed'
    }, { status: 500 });
  }
}

function extractStructuredData(text: string) {
  const data = {
    dates: {} as any,
    parties: {} as any,
    property: {} as any,
    financial: {} as any
  };

  try {
    // Extract property address with enhanced patterns
    const addressPatterns = [
      /(?:Property|Address|Premises|Flat|Unit)[:\s]*([^\n]+(?:Road|Street|Avenue|Lane|Close|Way|Place|Square|Gardens|Park|Drive|Court|N\d+|SW\d+|SE\d+|NW\d+|E\d+|W\d+|EC\d+|WC\d+)[^\n]*)/i,
      /([A-Za-z0-9\s,]+(?:Road|Street|Avenue|Lane|Close|Way|Place|Square|Gardens|Park|Drive|Court)[^,\n]*,?[^,\n]*(?:N\d+|SW\d+|SE\d+|NW\d+|E\d+|W\d+|EC\d+|WC\d+)[^,\n]*)/i
    ];

    for (const pattern of addressPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.property.address = match[1]?.trim() || match[0]?.trim();
        break;
      }
    }

    // Extract parties with multiple patterns
    const lessorPatterns = [
      /(?:Lessor|Landlord)[:\s]*([^\n]+)/i,
      /(?:Lessor|Landlord):\s*([^,\n]+)/i,
      /(?:between|from)\s+([^,\n]+)(?:\s+(?:as|being)\s+(?:lessor|landlord))/i
    ];

    const lesseePatterns = [
      /(?:Lessee|Tenant)[:\s]*([^\n]+)/i,
      /(?:Lessee|Tenant):\s*([^,\n]+)/i,
      /(?:and|to)\s+([^,\n]+)(?:\s+(?:as|being)\s+(?:lessee|tenant))/i
    ];

    for (const pattern of lessorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.parties.lessor = match[1].trim();
        break;
      }
    }

    for (const pattern of lesseePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.parties.lessee = match[1].trim();
        break;
      }
    }

    // Extract financial terms with enhanced patterns
    const rentPatterns = [
      /(?:rent|rental)[:\s]*[£]?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per|\/|each)\s*(year|month|week|annum|quarterly|half[\s-]?year)/i,
      /[£](\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per|\/|each)\s*(year|month|week|annum|quarterly|half[\s-]?year)/i,
      /(?:sum|amount)\s+of\s+[£]?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per|\/|each)\s*(year|month|week|annum|quarterly|half[\s-]?year)/i
    ];

    for (const pattern of rentPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[2]) {
        const period = match[2].toLowerCase().replace(/[\s-]/g, '');
        data.financial.rent = `£${match[1]} per ${period === 'annum' ? 'year' : period}`;
        break;
      }
    }

    // Extract premium/deposit
    const premiumMatch = text.match(/(?:premium|deposit)[:\s]*[£]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (premiumMatch) {
      data.financial.deposit = `£${premiumMatch[1]}`;
    }

    // Extract dates
    const startDatePatterns = [
      /(?:from|start|commenc|begin)(?:ing|s)?\s*:?\s*([^\n]{1,50}(?:January|February|March|April|May|June|July|August|September|October|November|December)[^\n]{1,20})/gi,
      /(?:from|start|commenc|begin)(?:ing|s)?\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi
    ];

    for (const pattern of startDatePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.dates.startDate = match[1].trim();
        break;
      }
    }

    // Extract term length
    const termMatch = text.match(/(?:term|period)[:\s]*(\d+)\s*year/i);
    if (termMatch) {
      data.dates.term = `${termMatch[1]} years`;
    }

  } catch (error) {
    console.warn('⚠️ Error in structured data extraction:', error);
  }

  return data;
}

async function generateAISummary(text: string, filename: string, docType: string, structuredData: any) {
  const systemPrompt = `You are a legal document analyst specializing in UK property documents, particularly lease agreements and tenancy documents.

Your task is to analyze the provided document and extract key information in a structured JSON format.

Focus on extracting:
1. Key dates (lease start/end, payment dates, review periods, notice requirements)
2. All parties involved (lessor, lessee, agents, guarantors, managing companies)
3. Property details (complete address, property type, description)
4. Financial terms (rent amounts, payment frequencies, deposits, service charges, fees)
5. Important clauses, obligations, and restrictions
6. A comprehensive but concise summary in plain English

For dates, be very specific about what each date represents and extract ALL dates mentioned.
For financial terms, include exact amounts, payment frequencies, and what each payment covers.
For parties, distinguish between different roles (lessor vs agent vs guarantor).

Return ONLY a valid JSON object with this structure:
{
  "dates": {
    "startDate": "string or null",
    "endDate": "string or null", 
    "paymentDates": ["array of payment dates"],
    "reviewDates": ["array of review dates"],
    "noticePeriods": ["array of notice requirements"],
    "otherImportantDates": [{"date": "string", "description": "string"}]
  },
  "parties": {
    "lessor": "string or null",
    "lessee": "string or null",
    "agent": "string or null",
    "guarantor": "string or null"
  },
  "property": {
    "address": "string or null",
    "type": "string or null",
    "description": "string or null"
  },
  "financial": {
    "rent": "string or null",
    "deposit": "string or null",
    "serviceCharge": "string or null",
    "otherFees": [{"type": "string", "amount": "string"}]
  },
  "keyTerms": ["array of important terms and obligations"],
  "summary": "comprehensive summary paragraph"
}`;

  const userPrompt = `Document: ${filename}
Type: ${docType}
Text Length: ${text.length} characters

Already extracted data:
- Address: ${structuredData.property?.address || 'Not found'}
- Lessor: ${structuredData.parties?.lessor || 'Not found'} 
- Lessee: ${structuredData.parties?.lessee || 'Not found'}
- Rent: ${structuredData.financial?.rent || 'Not found'}

Document Content:
${text.substring(0, 4000)}${text.length > 4000 ? '...[truncated]' : ''}

Analyze this document and provide a complete JSON response with all the fields specified in the system prompt.`;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content || '{}';
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(response);
      return {
        dates: parsed.dates || {},
        parties: parsed.parties || {},
        property: parsed.property || {},
        financial: parsed.financial || {},
        keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [],
        summary: parsed.summary || 'AI analysis completed successfully.'
      };
    } catch (parseError) {
      console.warn('⚠️ JSON parse error, attempting text extraction:', parseError);
      return parseTextResponse(response);
    }
    
  } catch (error) {
    console.error('❌ Error with AI analysis:', error);
    return generateFallbackAnalysis(text, structuredData);
  }
}

function parseTextResponse(response: string) {
  // Fallback parser if AI doesn't return proper JSON
  const dates = {};
  const parties = {};
  const property = {};
  const financial = {};
  const keyTerms = [];
  
  // Extract summary from response
  const summaryMatch = response.match(/summary['":\s]*['"](.*?)['"]/i);
  const summary = summaryMatch ? summaryMatch[1] : response.substring(0, 500) + (response.length > 500 ? '...' : '');
  
  return { dates, parties, property, financial, keyTerms, summary };
}

function generateFallbackAnalysis(text: string, structuredData: any) {
  const keyTerms = [];
  
  // Extract some basic terms
  if (text.toLowerCase().includes('repair')) keyTerms.push('Property maintenance and repair obligations');
  if (text.toLowerCase().includes('alteration')) keyTerms.push('Restrictions on property alterations');
  if (text.toLowerCase().includes('rent')) keyTerms.push('Rent payment obligations');
  if (text.toLowerCase().includes('insurance')) keyTerms.push('Insurance requirements');
  if (text.toLowerCase().includes('notice')) keyTerms.push('Notice period requirements');

  const summary = `This appears to be a ${structuredData.property?.address ? 'lease agreement for ' + structuredData.property.address : 'legal property document'}. The document contains ${text.length} characters of extracted text and establishes various obligations and terms between the parties involved.`;

  return {
    dates: structuredData.dates || {},
    parties: structuredData.parties || {},
    property: structuredData.property || {},
    financial: structuredData.financial || {},
    keyTerms,
    summary
  };
}

function extractDocumentName(filename: string, text: string): string {
  // Try to extract a proper document title from the text
  const titlePatterns = [
    /^([A-Z\s]+(?:AGREEMENT|CONTRACT|LEASE|DEED|TENANCY))/i,
    /(LEASE\s+AGREEMENT[^\n]*)/i,
    /(TENANCY\s+AGREEMENT[^\n]*)/i
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Clean up filename as fallback
  return filename
    .replace(/\.(pdf|doc|docx)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function calculateSummaryConfidence(structuredData: any, aiAnalysis: any, text: string): number {
  let confidence = 0.3; // Base confidence
  
  // Boost for successful structured extractions
  if (structuredData.property?.address) confidence += 0.15;
  if (structuredData.parties?.lessor || structuredData.parties?.lessee) confidence += 0.15;
  if (structuredData.financial?.rent) confidence += 0.1;
  if (structuredData.dates?.startDate) confidence += 0.1;
  
  // Boost for AI analysis quality
  if (aiAnalysis.summary && aiAnalysis.summary.length > 100) confidence += 0.1;
  if (aiAnalysis.keyTerms && aiAnalysis.keyTerms.length > 0) confidence += 0.05;
  if (aiAnalysis.parties && Object.keys(aiAnalysis.parties).length > 0) confidence += 0.05;
  if (aiAnalysis.financial && Object.keys(aiAnalysis.financial).length > 0) confidence += 0.05;
  
  // Boost for document completeness
  if (text.length > 1000) confidence += 0.05;
  if (text.length > 5000) confidence += 0.05;
  
  return Math.min(Math.max(confidence, 0.1), 0.95);
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Document Analysis API is running',
    usage: 'POST to this endpoint with extractedText, filename, documentType, and metadata',
    example: {
      extractedText: 'Your extracted document text here...',
      filename: 'lease.pdf',
      documentType: 'lease_agreement',
      metadata: {
        fileSize: 1936870,
        timestamp: new Date().toISOString()
      }
    }
  });
}