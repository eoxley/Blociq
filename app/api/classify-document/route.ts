import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("🤖 Starting document classification...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    const body = await req.json();
    const { 
      documentId, 
      filePath, 
      documentType = 'general',
      isUnlinked = false,
      buildingId = null
    } = body;

    console.log("📋 Received classification request:", {
      documentId,
      filePath: filePath ? `${filePath.substring(0, 50)}...` : null,
      documentType,
      isUnlinked,
      buildingId
    });

    // Validation
    if (!documentId) {
      console.error("❌ Validation failed: Missing documentId");
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    // Get document from database
    let tableName = 'building_documents';
    if (documentType === 'compliance') {
      tableName = 'compliance_documents';
    } else if (documentType === 'general') {
      tableName = 'general_documents';
    }

    const { data: document, error: documentError } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", documentId)
      .single();

    if (documentError || !document) {
      console.error("❌ Document not found:", documentError);
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    console.log("✅ Document found:", {
      id: document.id,
      name: document.file_name,
      type: document.file_type,
      is_unlinked: document.is_unlinked || isUnlinked
    });

    // Download file from storage for processing
    console.log("📥 Downloading file from storage...");
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(filePath || document.file_path);

    if (downloadError || !fileData) {
      console.error("❌ Failed to download file:", downloadError);
      return NextResponse.json({ 
        error: "Failed to download file for processing",
        details: downloadError?.message || "Unknown error"
      }, { status: 500 });
    }

    console.log("✅ File downloaded successfully");

    // Extract text from file
    let extractedText = "";
    let classification = "Unknown";
    let summary = "";
    let confidence = "medium";

    try {
      if (document.file_type === 'application/pdf') {
        // Enhanced PDF text extraction
        const { extractTextWithAnalysis } = await import('@/lib/extractTextFromPdf');
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const analysis = await extractTextWithAnalysis(buffer, document.file_name);
        
        extractedText = analysis.text;
        classification = analysis.documentType;
        summary = analysis.summary;
        confidence = analysis.confidence;
        
        console.log("✅ Enhanced PDF processing completed:", {
          documentType: classification,
          confidence: confidence,
          textLength: extractedText.length,
          summary: summary.substring(0, 100) + '...'
        });
      } else if (document.file_type.includes('text') || document.file_type.includes('document')) {
        // Text file extraction
        const text = await fileData.text();
        extractedText = text;
        
        // Basic classification for text files
        const { detectDocumentType, generateBasicSummary } = await import('@/lib/extractTextFromPdf');
        classification = detectDocumentType(document.file_name, text);
        summary = generateBasicSummary(text, classification);
        
        console.log("✅ Text file extracted, length:", text.length);
      } else {
        console.log("⚠️ File type not supported for text extraction:", document.file_type);
        extractedText = `Document: ${document.file_name} (${document.file_type})`;
        classification = "General Document";
        summary = "Document uploaded successfully. Content analysis limited due to file type.";
      }

      // AI Classification and summarization
      if (extractedText && extractedText.length > 10) {
        console.log("🤖 Processing with AI...");
        
        // Prepare context for AI
        const context = {
          document_name: document.file_name,
          document_type: documentType,
          is_unlinked: document.is_unlinked || isUnlinked,
          building_id: buildingId || document.building_id,
          extracted_text: extractedText.substring(0, 4000) // Limit text for API
        };

        // Call AI for classification and summary
        const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ask-ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Please analyse this document and provide:
1. A classification category (e.g., "Contract", "Invoice", "Report", "Notice", "Certificate", "Manual", "Policy", "Other")
2. A brief summary (2-3 sentences) of the main content using British English
3. Key topics or themes mentioned

Document: ${document.file_name}
Type: ${documentType}
Content: ${extractedText.substring(0, 2000)}`,
            context: `Document Analysis - ${documentType} document${isUnlinked ? ' (unlinked)' : ''}`
          })
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const aiText = aiResult.response || aiResult.message || "";
          
          // Parse AI response for classification and summary
          const lines = aiText.split('\n').filter((line: string) => line.trim());
          
          // Extract classification (look for category in first few lines)
          for (const line of lines.slice(0, 5)) {
            if (line.toLowerCase().includes('classification') || line.toLowerCase().includes('category')) {
              const match = line.match(/:\s*(.+)/i);
              if (match) {
                classification = match[1].trim();
                break;
              }
            }
          }
          
          // If no classification found, try to extract from AI response
          if (classification === "Unknown") {
            const categoryMatch = aiText.match(/(?:classification|category):\s*([^\n]+)/i);
            if (categoryMatch) {
              classification = categoryMatch[1].trim();
            } else {
              // Fallback: look for common document types
              const commonTypes = ['Contract', 'Invoice', 'Report', 'Notice', 'Certificate', 'Manual', 'Policy'];
              for (const type of commonTypes) {
                if (aiText.toLowerCase().includes(type.toLowerCase())) {
                  classification = type;
                  break;
                }
              }
            }
          }
          
          // Extract summary (look for summary section)
          const summaryMatch = aiText.match(/(?:summary|summary:)\s*([^\n]+(?:\n[^\n]+)*)/i);
          if (summaryMatch) {
            summary = summaryMatch[1].trim();
          } else {
            // Fallback: use first few sentences of AI response
            summary = aiText.split('. ').slice(0, 2).join('. ') + '.';
          }
          
          console.log("✅ AI processing completed:", {
            classification,
            summary_length: summary.length
          });
        } else {
          console.warn("⚠️ AI processing failed, using fallback classification");
          // Fallback classification based on file name and type
          classification = classifyDocumentFallback(document.file_name, documentType);
          summary = `Document uploaded successfully. Content analysis available.`;
        }
      } else {
        console.log("⚠️ Insufficient text for AI processing, using fallback");
        classification = classifyDocumentFallback(document.file_name, documentType);
        summary = `Document uploaded successfully. Text extraction limited.`;
      }

    } catch (processingError) {
      console.error("❌ Document processing error:", processingError);
      classification = classifyDocumentFallback(document.file_name, documentType);
      summary = `Document uploaded successfully. Processing encountered an error.`;
      extractedText = "Error during text extraction";
    }

    // Update document with results
    console.log("💾 Updating document with classification results...");
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        classification: classification,
        extracted_text: extractedText,
        summary: summary,
        ai_processed_at: new Date().toISOString(),
        status: 'processed'
      })
      .eq('id', documentId);

    if (updateError) {
      console.error("❌ Failed to update document:", updateError);
      return NextResponse.json({ 
        error: "Failed to save classification results",
        details: updateError.message
      }, { status: 500 });
    }

    // Enhanced document analysis for actionable insights
    if (extractedText && extractedText.length > 50) {
      try {
        console.log("🧠 Starting enhanced document analysis...");
        
        const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/documents/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: documentId,
            documentText: extractedText,
            fileName: document.file_name,
            documentType: classification
          })
        });

        if (analysisResponse.ok) {
          const analysisResult = await analysisResponse.json();
          console.log("✅ Enhanced analysis completed:", analysisResult.analysis);
          
          // Update document with enhanced analysis results
          const { error: analysisUpdateError } = await supabase
            .from(tableName)
            .update({
              suggested_action: analysisResult.analysis?.suggested_action || null,
              confidence_level: analysisResult.analysis?.confidence_level || 'medium',
              key_findings: analysisResult.analysis?.key_findings || [],
              compliance_status: analysisResult.analysis?.compliance_status || 'unknown'
            })
            .eq('id', documentId);

          if (analysisUpdateError) {
            console.warn("⚠️ Failed to update document with analysis results:", analysisUpdateError);
          }
        } else {
          console.warn("⚠️ Enhanced analysis failed, continuing with basic classification");
        }
      } catch (analysisError) {
        console.warn("⚠️ Enhanced analysis error:", analysisError);
        // Continue without enhanced analysis
      }
    }

    // Get the latest document data including analysis results
    const { data: updatedDocument } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', documentId)
      .single();

    const responseData = {
      message: "Document classified and analyzed successfully",
      document: {
        id: documentId,
        name: document.file_name,
        type: document.file_type,
        is_unlinked: document.is_unlinked || isUnlinked,
        building_id: buildingId || document.building_id
      },
      classification: classification,
      summary: summary,
      extracted_text: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
      suggested_action: updatedDocument?.suggested_action || null,
      confidence_level: updatedDocument?.confidence_level || 'medium',
      key_findings: updatedDocument?.key_findings || [],
      compliance_status: updatedDocument?.compliance_status || 'unknown',
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        document_type: documentType,
        is_unlinked: document.is_unlinked || isUnlinked,
        text_length: extractedText.length,
        enhanced_analysis: updatedDocument?.suggested_action ? 'completed' : 'not_applicable'
      }
    };

    console.log("🎉 Document classification completed successfully");
    console.log("📊 Results:", {
      classification,
      summary_length: summary.length,
      text_length: extractedText.length,
      is_unlinked: document.is_unlinked || isUnlinked
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Document classification error:", error);
    return NextResponse.json({ 
      error: "Internal server error during document classification",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Fallback classification based on file name and type
function classifyDocumentFallback(fileName: string, documentType: string): string {
  const name = fileName.toLowerCase();
  
  // Check for common document patterns
  if (name.includes('contract') || name.includes('agreement')) return 'Contract';
  if (name.includes('invoice') || name.includes('bill')) return 'Invoice';
  if (name.includes('report') || name.includes('assessment')) return 'Report';
  if (name.includes('notice') || name.includes('letter')) return 'Notice';
  if (name.includes('certificate') || name.includes('cert')) return 'Certificate';
  if (name.includes('manual') || name.includes('guide')) return 'Manual';
  if (name.includes('policy') || name.includes('procedure')) return 'Policy';
  if (name.includes('lease') || name.includes('tenancy')) return 'Lease';
  if (name.includes('insurance') || name.includes('policy')) return 'Insurance';
  if (name.includes('maintenance') || name.includes('repair')) return 'Maintenance';
  if (name.includes('compliance') || name.includes('regulatory')) return 'Compliance';
  
  // Check file extension
  if (name.endsWith('.pdf')) return 'PDF Document';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'Word Document';
  if (name.endsWith('.txt')) return 'Text Document';
  
  // Default based on document type
  switch (documentType) {
    case 'compliance': return 'Compliance Document';
    case 'building': return 'Building Document';
    default: return 'General Document';
  }
} 