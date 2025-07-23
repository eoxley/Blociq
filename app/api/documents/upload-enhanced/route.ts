import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { extractTextWithAnalysis, isTextSufficientForAnalysis, cleanExtractedText } from "@/lib/extractTextFromPdf";

export async function POST(req: NextRequest) {
  try {
    console.log("📄 Enhanced document upload started...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const buildingId = formData.get('building_id') as string;
    const documentType = formData.get('document_type') as string || 'General';

    if (!file) {
      return NextResponse.json({ 
        error: "No file provided" 
      }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Allowed types: PDF, TXT, DOC, DOCX" 
      }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 10MB" 
      }, { status: 400 });
    }

    console.log("✅ File validation passed:", {
      name: file.name,
      type: file.type,
      size: file.size,
      buildingId: buildingId
    });

    // Upload file to Supabase Storage
    const fileNameStorage = `documents/${buildingId || 'unlinked'}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('building-documents')
      .upload(fileNameStorage, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("❌ File upload failed:", uploadError);
      return NextResponse.json({ 
        error: "Failed to upload file",
        details: uploadError.message 
      }, { status: 500 });
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('building-documents')
      .getPublicUrl(fileNameStorage);

    // Enhanced text extraction and analysis
    let extractedText = "";
    let documentClassification = "General Document";
    let summary = "";
    let confidence = "medium";
    let keyPhrases: string[] = [];

    try {
      if (file.type === 'application/pdf') {
        console.log("🔍 Processing PDF with enhanced extraction...");
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const analysis = await extractTextWithAnalysis(buffer, file.name);
        
        extractedText = cleanExtractedText(analysis.text);
        documentClassification = analysis.documentType;
        summary = analysis.summary;
        confidence = analysis.confidence;
        keyPhrases = analysis.keyPhrases;
        
        console.log("✅ Enhanced PDF analysis completed:", {
          documentType: documentClassification,
          confidence: confidence,
          textLength: extractedText.length,
          keyPhrases: keyPhrases
        });
        
      } else if (file.type.includes('text') || file.type.includes('document')) {
        console.log("🔍 Processing text document...");
        
        const text = await file.text();
        extractedText = cleanExtractedText(text);
        
        // Basic classification for text files
        const { detectDocumentType, generateBasicSummary, extractKeyPhrases } = await import('@/lib/extractTextFromPdf');
        documentClassification = detectDocumentType(file.name, text);
        summary = generateBasicSummary(text, documentClassification);
        keyPhrases = extractKeyPhrases(text);
        
        console.log("✅ Text document analysis completed:", {
          documentType: documentClassification,
          textLength: extractedText.length
        });
        
      } else {
        console.log("⚠️ File type not supported for text extraction:", file.type);
        extractedText = `Document: ${file.name} (${file.type})`;
        documentClassification = "General Document";
        summary = "Document uploaded successfully. Content analysis limited due to file type.";
      }

    } catch (extractionError) {
      console.error("❌ Text extraction failed:", extractionError);
      extractedText = `Document: ${file.name} (${file.type})`;
      documentClassification = "General Document";
      summary = "Document uploaded successfully. Text extraction failed.";
      confidence = "low";
    }

    // Save document record to database
    const { data: document, error: documentError } = await supabase
      .from("building_documents")
      .insert({
        building_id: buildingId || null,
        file_name: file.name,
        file_url: publicUrl,
        file_path: fileNameStorage,
        file_type: file.type,
        file_size: file.size,
        type: documentType,
        classification: documentClassification,
        full_text: extractedText,
        extracted_text: extractedText,
        summary: summary,
        key_findings: keyPhrases,
        confidence_level: confidence,
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
        status: 'processed'
      })
      .select()
      .single();

    if (documentError) {
      console.error("❌ Failed to save document record:", documentError);
      return NextResponse.json({ 
        error: "Failed to save document record",
        details: documentError.message 
      }, { status: 500 });
    }

    console.log("✅ Document record saved:", document.id);

    // Enhanced AI analysis if text is sufficient
    if (isTextSufficientForAnalysis(extractedText)) {
      try {
        console.log("🧠 Starting enhanced AI analysis...");
        
        const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/documents/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: document.id,
            documentText: extractedText,
            fileName: file.name,
            documentType: documentClassification
          })
        });

        if (analysisResponse.ok) {
          const analysisResult = await analysisResponse.json();
          console.log("✅ Enhanced AI analysis completed:", analysisResult.analysis);
          
          // Update document with enhanced analysis results
          const { error: analysisUpdateError } = await supabase
            .from('building_documents')
            .update({
              suggested_action: analysisResult.analysis?.suggested_action || null,
              compliance_status: analysisResult.analysis?.compliance_status || 'unknown',
              analyzed_at: new Date().toISOString()
            })
            .eq('id', document.id);

          if (analysisUpdateError) {
            console.warn("⚠️ Failed to update document with analysis results:", analysisUpdateError);
          }
        } else {
          console.warn("⚠️ Enhanced AI analysis failed, continuing with basic analysis");
        }
      } catch (analysisError) {
        console.warn("⚠️ Enhanced AI analysis error:", analysisError);
        // Continue without enhanced analysis
      }
    }

    const responseData = {
      message: "Document uploaded and analyzed successfully",
      document: {
        id: document.id,
        name: file.name,
        type: documentClassification,
        file_url: document.file_url,
        uploaded_at: document.uploaded_at,
        building_id: document.building_id,
        summary: summary,
        confidence_level: confidence,
        key_findings: keyPhrases
      },
      analysis: {
        documentType: documentClassification,
        summary: summary,
        confidence: confidence,
        keyPhrases: keyPhrases,
        textLength: extractedText.length
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        file_name: fileNameStorage,
        original_name: file.name,
        file_size: file.size
      }
    };

    console.log("🎉 Enhanced document upload completed successfully");

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Enhanced document upload error:", error);
    return NextResponse.json({ 
      error: "Internal server error during document upload",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 