import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import pdf from 'pdf-parse';
import { extractLeaseClausesEnhanced, isLeaseDocument } from '@/utils/leaseExtractor';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const building_id = formData.get('building_id') as string;
    const document_type = formData.get('document_type') as string || 'unknown';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text using multiple methods with fallback
    let extractedText = '';
    let extractionMethod = 'pdf_parser';
    let confidence = 'high';
    let ocrSource = null;

    // Method 1: Try pdf-parse (fastest, works for text-based PDFs)
    try {
      const pdfData = await pdf(buffer);
      extractedText = pdfData.text;
      console.log(`Extracted ${extractedText.length} characters from PDF using pdf-parse`);
      
      // Check if we have sufficient text
      if (extractedText && extractedText.trim().length >= 100) {
        extractionMethod = 'pdf_parser';
        confidence = 'high';
      } else {
        console.log('⚠️ pdf-parse yielded insufficient text, trying OCR fallback...');
        throw new Error('Insufficient text from pdf-parse');
      }
    } catch (pdfError) {
      console.log('⚠️ pdf-parse failed or yielded insufficient text, trying OCR...');
      
             // Method 2: Try OCR microservice with fallback
       try {
         console.log('🔄 Attempting OCR processing with fallback...');
         const { processDocumentWithFallback } = await import('@/lib/ocr');
         
         // Create a temporary file object for OCR processing
         const tempFile = new File([buffer], file.name, { type: file.type });
         const ocrResult = await processDocumentWithFallback(tempFile);
         
         if (ocrResult.text && ocrResult.text.trim().length > 50) {
           extractedText = ocrResult.text;
           extractionMethod = 'ocr_microservice';
           confidence = ocrResult.quality || 'medium';
           ocrSource = ocrResult.source;
           
           // Log warnings if any
           if (ocrResult.warnings && ocrResult.warnings.length > 0) {
             console.log('⚠️ OCR warnings:', ocrResult.warnings);
           }
           
           console.log(`✅ OCR successful: ${extractedText.length} characters extracted (quality: ${ocrResult.quality})`);
         } else {
           throw new Error('OCR yielded insufficient text');
         }
       } catch (ocrError) {
        console.log('⚠️ OCR microservice failed, trying Google Vision...');
        
        // Method 3: Try Google Vision API (if available) - Note: Requires PDF to image conversion
        // For now, we'll skip this as it requires additional setup
        // TODO: Implement PDF to image conversion for Google Vision fallback
        
        // If all methods failed, return error
        if (!extractedText || extractedText.trim().length < 50) {
          return NextResponse.json({ 
            error: 'Unable to extract text from PDF',
            details: 'All extraction methods failed. The PDF may be corrupted, password-protected, or of very low quality.',
            extractionMethods: ['pdf-parse', 'ocr_microservice', 'google_vision'],
            extractedLength: extractedText?.length || 0
          }, { status: 400 });
        }
      }
    }

    // Check if this is a lease document
    const isLease = isLeaseDocument(file.name, extractedText);
    console.log(`Document identified as lease: ${isLease}`);

    // Extract lease clauses if it's a lease document
    let leaseExtraction = null;
    let summary = null;

    if (isLease) {
      try {
        // Extract structured clauses
        const clauses = extractLeaseClausesEnhanced(extractedText);
        console.log(`Extracted ${Object.keys(clauses).length} lease clauses`);

        // Generate AI summary using OpenAI
        if (process.env.OPENAI_API_KEY) {
          try {
            const prompt = `Based on the following lease clauses extracted from a property lease document, provide a clear, concise summary in plain English. Focus on the key terms and conditions that would be most important for property managers and leaseholders to understand.

Lease Clauses:
${Object.entries(clauses).map(([term, clause]) => `${term}: ${clause.text || 'Not found'}`).join('\n')}

Please provide:
1. A brief overview of the lease type and key terms
2. Important clauses that were found and their significance
3. Any notable conditions or restrictions
4. A confidence assessment of the extraction quality

Keep the summary professional but accessible, suitable for property management professionals.`;

            const completion = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 500,
              temperature: 0.3,
            });

            summary = completion.choices[0]?.message?.content || 'Summary generation failed';
            console.log('AI summary generated successfully');
          } catch (aiError) {
            console.error('AI summary generation failed:', aiError);
            summary = 'AI summary generation failed - using extracted clauses only';
          }
        } else {
          summary = 'AI summary not available - OpenAI API key not configured';
        }

        leaseExtraction = {
          isLease: true,
          confidence: 0.8, // Base confidence for text-based extraction
          keyTermsFound: Object.keys(clauses).length,
          totalTerms: 18, // Total terms we look for
          extractionMethod: 'pdf_parser',
          summary: summary
        };

      } catch (extractionError) {
        console.error('Lease extraction failed:', extractionError);
        leaseExtraction = {
          isLease: true,
          confidence: 0.3,
          error: 'Extraction failed',
          extractionMethod: 'pdf_parser'
        };
      }
    }

    // Store document in Supabase
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        filename: file.name,
        file_size: file.size,
        file_type: file.type,
        building_id: building_id || null,
        document_type: document_type,
        uploaded_by: user.id,
        extraction_status: 'completed',
        extracted_text: extractedText,
        lease_extraction: leaseExtraction,
        metadata: {
          isLease: isLease,
          extractionMethod: extractionMethod,
          confidence: confidence,
          ocrSource: ocrSource,
          extractedLength: extractedText.length,
          originalFilename: file.name
        }
      })
      .select()
      .single();

    if (documentError) {
      console.error('Failed to store document:', documentError);
      return NextResponse.json({ error: 'Failed to store document' }, { status: 500 });
    }

    // If it's a lease, store detailed extraction data
    if (isLease && leaseExtraction && Object.keys(extractLeaseClausesEnhanced(extractedText)).length > 0) {
      try {
        const clauses = extractLeaseClausesEnhanced(extractedText);
        
        const { error: extractionError } = await supabase
          .from('lease_extractions')
          .insert({
            document_id: document.id,
            building_id: building_id || null,
                         extracted_clauses: Object.entries(clauses).map(([term, clause]) => ({
               term: term,
               text: clause.text || 'Not found',
               page: clause.page || null,
               found: clause.found || false
             })),
            summary: summary,
            confidence: leaseExtraction.confidence || 0.8,
            metadata: {
              keyTermsFound: Object.keys(clauses).length,
              totalTerms: 18,
              extractionMethod: 'pdf_parser',
              processingTime: Date.now()
            },
            extracted_by: user.id
          });

        if (extractionError) {
          console.error('Failed to store lease extraction:', extractionError);
          // Don't fail the entire request, just log the error
        }
      } catch (extractionError) {
        console.error('Failed to store lease extraction:', extractionError);
        // Don't fail the entire request, just log the error
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      document_id: document.id,
      filename: file.name,
      isLease: isLease,
      extractedTextLength: extractedText.length,
      extractionMethod: extractionMethod,
      confidence: confidence,
      ocrSource: ocrSource,
      leaseExtraction: leaseExtraction,
      summary: summary,
      message: isLease 
        ? 'Lease document processed successfully with clause extraction'
        : 'Document processed successfully (not identified as lease)'
    });

  } catch (error) {
    console.error('Extract API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const building_id = searchParams.get('building_id');

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        id,
        filename,
        file_size,
        file_type,
        building_id,
        document_type,
        extraction_status,
        extracted_text,
        lease_extraction,
        metadata,
        created_at,
        updated_at
      `)
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false });

    if (building_id) {
      query = query.eq('building_id', building_id);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('Failed to fetch documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      count: documents?.length || 0
    });

  } catch (error) {
    console.error('Extract API GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  // Handle preflight request for CORS
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
