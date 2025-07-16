/**
 * AI-Powered Document Analysis API
 * 
 * This endpoint analyzes compliance documents stored in Supabase Storage:
 * 1. Fetches PDF from Supabase Storage using documentId
 * 2. Extracts text using pdf2json
 * 3. Uses OpenAI GPT-4 to analyze and summarize the document
 * 4. Identifies document type, dates, and compliance status
 * 5. Updates the compliance_docs table with extracted information
 * 
 * Required environment variables:
 * - OPENAI_API_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * 
 * Usage:
 * POST /api/extract-summary
 * Body: { documentId: "uuid" }
 * 
 * Returns: { summary, doc_type, issue_date, expiry_date, key_risks, compliance_status }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import PDFParser from 'pdf2json';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Extract text from PDF using pdf2json
function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", err => reject(err.parserError));

    parser.on("pdfParser_dataReady", pdfData => {
      const pages = (pdfData as any)?.formImage?.Pages || [];

      const allText = pages
        .flatMap((page: any) =>
          page.Texts.map((t: any) => decodeURIComponent(t.R[0].T))
        )
        .join(" ");

      resolve(allText);
    });

    parser.parseBuffer(buffer);
  });
}

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // Fetch document from compliance_docs table
    const { data: doc, error } = await supabase
      .from('compliance_docs')
      .select('doc_url, building_id')
      .eq('id', documentId)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!doc.doc_url) {
      return NextResponse.json({ error: 'Document URL not found' }, { status: 404 });
    }

    // Construct the full URL to the file in Supabase Storage
    const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${doc.doc_url}`;
    
    // Fetch the PDF file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch PDF file' }, { status: 404 });
    }
    
    const buffer = await response.arrayBuffer();

    // Extract text from PDF
    const fullText = await extractTextFromPDF(Buffer.from(buffer));

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json({ error: 'No text could be extracted from PDF' }, { status: 400 });
    }

    // Create AI prompt for document analysis
    const summaryPrompt = `You are an AI assistant helping a UK property manager analyze compliance documents. 

Please analyze the following document and provide:

1. Document Type: Identify the type of compliance document (e.g., EICR, FRA, Gas Safety Certificate, Insurance Certificate, Asbestos Survey, etc.)
2. Summary: A concise summary of the document's key findings and requirements
3. Issue Date: The date the document was issued (if found)
4. Expiry Date: The date the document expires (if found)
5. Key Risks or Actions: Any notable risks, recommendations, or required actions mentioned
6. Compliance Status: Whether the document indicates compliance or identifies issues

Document content:
${fullText.substring(0, 8000)}${fullText.length > 8000 ? '...' : ''}

Please format your response as:
Document Type: [type]
Summary: [summary]
Issue Date: [date or "Not found"]
Expiry Date: [date or "Not found"]
Key Risks/Actions: [list any risks or actions]
Compliance Status: [compliant/requires attention/not specified]`;

    // Get AI analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: summaryPrompt }],
      temperature: 0.3,
      max_tokens: 1000
    });

    const aiResponse = completion.choices[0].message?.content ?? 'Analysis not available';

    // Parse the AI response to extract structured data
    const lines = aiResponse.split('\n');
    const extractedData: any = {};
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        extractedData[key.trim()] = valueParts.join(':').trim();
      }
    });

    // Extract document type for database
    const docType = extractedData['Document Type'] || null;
    const summary = extractedData['Summary'] || aiResponse;
    const issueDate = extractedData['Issue Date'] || null;
    const expiryDate = extractedData['Expiry Date'] || null;
    const keyRisks = extractedData['Key Risks/Actions'] || null;
    const complianceStatus = extractedData['Compliance Status'] || null;

    // Update the compliance_docs table with the extracted information
    const updateData: any = {
      doc_type: docType
    };

    // Only update dates if they were found and are valid
    if (issueDate && issueDate !== 'Not found') {
      updateData.start_date = issueDate;
    }
    if (expiryDate && expiryDate !== 'Not found') {
      updateData.expiry_date = expiryDate;
    }

    const { error: updateError } = await supabase
      .from('compliance_docs')
      .update(updateData)
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating compliance_docs:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      summary,
      doc_type: docType,
      issue_date: issueDate,
      expiry_date: expiryDate,
      key_risks: keyRisks,
      compliance_status: complianceStatus,
      building_id: doc.building_id
    }, { status: 200 });

  } catch (error) {
    console.error('Error in extract-summary:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 