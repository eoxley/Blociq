import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import PDFParser from 'pdf2json';
import { saveComplianceDocument } from '@/lib/compliance/saveComplianceDocument';

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
    const { fileUrl, buildingId, complianceAssetId, assetName } = await req.json();
    
    if (!fileUrl || !buildingId || !complianceAssetId || !assetName) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileUrl, buildingId, complianceAssetId, assetName' 
      }, { status: 400 });
    }

    // Fetch the PDF file from Supabase Storage
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

    // Create AI prompt for compliance document analysis
    const analysisPrompt = `You are an AI assistant helping a UK property manager analyse compliance documents. 

Please analyse the following compliance document for "${assetName}" and extract the following information:

1. Document title/type
2. Summary of the document
3. Last renewal date (if mentioned, format as YYYY-MM-DD)
4. Next due date (if mentioned, format as YYYY-MM-DD)
5. Any compliance issues or defects noted

Document content:
${fullText.substring(0, 8000)}${fullText.length > 8000 ? '...' : ''}

Please respond in JSON format:
{
  "title": "Document title",
  "summary": "Brief summary of the document",
  "last_renewed_date": "YYYY-MM-DD or null if not found",
  "next_due_date": "YYYY-MM-DD or null if not found",
  "compliance_issues": "Any issues or defects noted"
}

Use British English spelling and terminology. If dates are not found, return null for those fields.`;

    // Get AI analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.3,
      max_tokens: 1000
    });

    const aiResponse = completion.choices[0].message?.content ?? 'Analysis not available';

    // Parse AI response
    let extractedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON found
        extractedData = {
          title: assetName,
          summary: aiResponse,
          last_renewed_date: null,
          next_due_date: null,
          compliance_issues: null
        };
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      extractedData = {
        title: assetName,
        summary: aiResponse,
        last_renewed_date: null,
        next_due_date: null,
        compliance_issues: null
      };
    }

    // Use the saveComplianceDocument function to save document and update asset
    try {
      await saveComplianceDocument({
        buildingId: parseInt(buildingId),
        complianceAssetId: complianceAssetId,
        fileUrl: fileUrl,
        title: extractedData.title || assetName,
        summary: extractedData.summary || 'Document analysis completed',
        lastRenewedDate: extractedData.last_renewed_date || new Date().toISOString().split('T')[0],
        nextDueDate: extractedData.next_due_date || null
      });

      console.log('✅ Successfully saved compliance document and updated building asset');
    } catch (saveError) {
      console.error('❌ Error saving compliance document:', saveError);
      return NextResponse.json({ 
        error: 'Failed to save document metadata',
        details: saveError instanceof Error ? saveError.message : 'Unknown error'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      extracted_data: extractedData,
      message: 'Document successfully processed and saved'
    }, { status: 200 });

  } catch (error) {
    console.error('Error in extract-compliance:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 