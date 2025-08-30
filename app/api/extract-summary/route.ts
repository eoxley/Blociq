/**
 * API endpoint to read and summarise uploaded compliance documents
 * 
 * Functionality:
 * - Accepts a POST request with { documentId }
 * - Fetches the PDF file from Supabase Storage based on the document ID
 * - Extracts the text content using langchain/pdf-loader
 * - Sends the content to OpenAI GPT-4 with a summarisation prompt
 * - Extracts document type (e.g. "EICR", "FRA", etc.) from the summary
 * - Saves the summary and detected doc_type to the compliance_docs table
 * - Returns the summary and doc_type in the response
 * 
 * Required environment variables:
 * - OPENAI_API_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * 
 * Example expected response:
 * {
 *   "summary": "This document is a valid EICR issued on 01/01/2024 and valid until 01/01/2029. No defects reported.",
 *   "doc_type": "EICR"
 * }
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

    parser.on("pdfParser_dataError", (err: any) => reject(err.parserError));

    parser.on("pdfParser_dataReady", (pdfData: any) => {
      const pages = pdfData?.formImage?.Pages || [];

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

    // Create AI prompt for document summarisation
    const summaryPrompt = `You are an AI assistant helping a UK property manager analyse compliance documents using British English. 

Please provide a concise summary of the following compliance document using British English spelling and terminology. Include:
- The type of document (e.g., EICR, FRA, Gas Safety Certificate, Insurance Certificate, Asbestos Survey, etc.)
- Key findings and requirements
- Issue and expiry dates if mentioned (format as DD/MM/YYYY)
- Any defects or compliance issues noted

Document content:
${fullText.substring(0, 8000)}${fullText.length > 8000 ? '...' : ''}

Please provide a clear, concise summary that includes the document type using British English spelling and terminology.`;

    // Get AI analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: summaryPrompt }],
      temperature: 0.3,
      max_tokens: 1000
    });

    const aiResponse = completion.choices[0].message?.content ?? 'Summary not available';

    // Extract document type using regex
    const docTypeRegex = /\b(EICR|FRA|Gas Safety Certificate|Insurance Certificate|Asbestos Survey|Fire Risk Assessment|Electrical Installation Condition Report|Gas Certificate|Insurance|Asbestos|Emergency Lighting|Fire Extinguisher|Lift Inspection|PAT Test|Legionella|Water Risk Assessment|EPC|Energy Performance Certificate|Building Insurance|Public Liability|Employers Liability|Roof Inspection|Structural Survey)\b/i;
    const docTypeMatch = aiResponse.match(docTypeRegex);
    const docType = docTypeMatch ? docTypeMatch[1] : null;

    const summary = aiResponse;

    // Update the compliance_docs table with the extracted information
    const updateData: any = {
      doc_type: docType
    };

    const { error: updateError } = await supabase
      .from('compliance_docs')
      .update(updateData)
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating compliance_docs:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      summary,
      doc_type: docType
    }, { status: 200 });

  } catch (error) {
    console.error('Error in extract-summary:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 