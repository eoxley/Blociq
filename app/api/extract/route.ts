import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { 
  extractLeaseClauses, 
  extractLeaseClausesEnhanced,
  isLeaseDocument, 
  generateLeaseSummary,
  classifyLeaseDocument,
  type LeaseExtractionResult 
} from "@/utils/leaseExtractor";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { createWorker } from "tesseract.js";
import { pdfToPng } from "pdf-to-png-converter";

/**
 * Run OCR on PDF pages using Tesseract.js
 * Fallback for scanned or image-based leases
 */
async function runOCR(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log("🖼️ Running OCR fallback for scanned PDF...");
    
    const pages = await pdfToPng(pdfBuffer, { 
      outputFolder: '/tmp'
    });

    const worker = await createWorker('eng');
    let fullText = "";

    for (const page of pages) {
      const { data: { text } } = await worker.recognize(page.path);
      fullText += text + "\n";
      
      // Clean up temporary page file
      try {
        fs.unlinkSync(page.path);
      } catch (cleanupError) {
        console.warn("Failed to cleanup temporary page file:", cleanupError);
      }
    }

    await worker.terminate();
    console.log(`✅ OCR completed: ${fullText.length} characters extracted`);
    
    return fullText;
  } catch (error) {
    console.error("❌ OCR failed:", error);
    throw new Error("OCR processing failed");
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const buildingId = formData.get("building_id") as string;
    const documentType = formData.get("document_type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log(`📄 Processing file: ${file.name} (${file.size} bytes)`);

    // 3. Extract text from PDF using multiple methods
    let extractedText = "";
    let extractionMethod = "unknown";
    
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Method 1: Try PDF text extraction first
      try {
        console.log("🔍 Attempting PDF text extraction...");
        const pdfData = await pdf(buffer);
        extractedText = pdfData.text;
        extractionMethod = "pdf_parse";
        console.log(`✅ PDF text extraction successful: ${extractedText.length} characters`);
      } catch (pdfError) {
        console.log("⚠️ PDF text extraction failed, trying OCR...");
        extractedText = "";
      }

      // Method 2: Fallback to OCR if PDF text is insufficient
      if (!extractedText || extractedText.trim().length < 100) {
        console.log("🖼️ PDF text insufficient, running OCR...");
        extractedText = await runOCR(buffer);
        extractionMethod = "ocr_tesseract";
        console.log(`✅ OCR extraction successful: ${extractedText.length} characters`);
      }

      // Validate extracted text
      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error("Failed to extract sufficient text from document");
      }

    } catch (extractionError) {
      console.error("❌ Text extraction failed:", extractionError);
      return NextResponse.json({ 
        error: "Failed to extract text from PDF",
        details: extractionError instanceof Error ? extractionError.message : "Unknown extraction error"
      }, { status: 500 });
    }

    // 4. Check if this is a lease document
    const isLease = isLeaseDocument(file.name, extractedText);
    console.log(`🔍 Document type detection: ${isLease ? 'Lease detected' : 'Not a lease'}`);

    // 5. Extract lease clauses if it's a lease
    let extractionResult: LeaseExtractionResult | null = null;
    let extractedClauses: Record<string, any> = {};
    
    if (isLease) {
      console.log("📋 Extracting lease clauses...");
      
      // Extract clauses using the enhanced method for structured data
      extractedClauses = extractLeaseClausesEnhanced(extractedText);
      const summary = generateLeaseSummary(extractedClauses);
      const documentType = classifyLeaseDocument(extractedClauses);
      
      extractionResult = {
        isLease: true,
        confidence: 0.9, // High confidence for detected leases
        clauses: extractedClauses,
        summary,
        metadata: {
          totalPages: 1, // We'll enhance this later with actual page count
          extractedTextLength: extractedText.length,
          keyTermsFound: Object.values(extractedClauses).filter(c => c.found).length,
          extractionTimestamp: new Date().toISOString()
        }
      };
      
      console.log(`✅ Lease extraction complete: ${extractionResult.metadata.keyTermsFound} terms found`);
    }

    // 6. Generate AI summary using OpenAI
    let aiSummary = "";
    try {
      if (process.env.OPENAI_API_KEY) {
        console.log("🤖 Generating AI summary...");
        
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: "You are a property management expert. Generate a concise lease summary focusing on key terms, obligations, and important clauses." 
            },
            { 
              role: "user", 
              content: `From these extracted lease clauses, generate a clear summary for property managers:\n\n${JSON.stringify(extractedClauses, null, 2)}` 
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        });

        aiSummary = completion.choices[0]?.message?.content || "";
        console.log("✅ AI summary generated successfully");
      }
    } catch (aiError) {
      console.warn("⚠️ AI summary generation failed:", aiError);
      // Don't fail the whole request, just continue without AI summary
    }

    // 7. Save to Supabase
    try {
      const { data: documentRecord, error: documentError } = await supabase
        .from('documents')
        .insert({
          filename: file.name,
          file_size: file.size,
          file_type: file.type || 'application/pdf',
          building_id: buildingId || null,
          document_type: documentType || 'unknown',
          uploaded_by: user.id,
          extraction_status: 'completed',
          extracted_text: extractedText,
          lease_extraction: extractionResult,
          metadata: {
            isLease,
            extractionMethod,
            aiSummary: aiSummary || null,
            processingTimestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (documentError) {
        console.error("Failed to save document:", documentError);
        throw documentError;
      }

      console.log(`💾 Document saved with ID: ${documentRecord.id}`);

      // 8. If it's a lease, save detailed extraction data
      if (extractionResult && documentRecord.id) {
        const { error: extractionError } = await supabase
          .from('lease_extractions')
          .insert({
            document_id: documentRecord.id,
            building_id: buildingId || null,
            extracted_clauses: extractedClauses,
            summary: aiSummary || extractionResult.summary,
            confidence: extractionResult.confidence,
            metadata: {
              ...extractionResult.metadata,
              extractionMethod,
              aiSummaryGenerated: !!aiSummary
            },
            extracted_by: user.id
          });

        if (extractionError) {
          console.error("Failed to save lease extraction:", extractionError);
          // Don't fail the whole request, just log the error
        }
      }

      // 9. Return success response
      return NextResponse.json({
        success: true,
        document_id: documentRecord.id,
        filename: file.name,
        isLease,
        extraction: extractionResult,
        aiSummary: aiSummary || null,
        extractionMethod,
        message: isLease 
          ? `Lease document processed successfully. ${extractionResult?.metadata.keyTermsFound} key terms extracted.`
          : "Document processed successfully."
      });

    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      return NextResponse.json({ 
        error: "Failed to save document",
        details: "Database error"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Extract API failed:", error);
    
    return NextResponse.json({ 
      error: "Extraction failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get extraction history for the user
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('building_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('documents')
      .select(`
        id,
        filename,
        file_size,
        document_type,
        building_id,
        extraction_status,
        lease_extraction,
        metadata,
        created_at
      `)
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (buildingId) {
      query = query.eq('building_id', buildingId);
    }

    const { data: documents, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      total: documents?.length || 0
    });

  } catch (error) {
    console.error("Failed to get extraction history:", error);
    
    return NextResponse.json({ 
      error: "Failed to retrieve extraction history",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  // Handle preflight request for CORS
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
