import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { extractTextWithAnalysis, isTextSufficientForAnalysis, cleanExtractedText } from '@/lib/extractTextFromPdf';
import { getOpenAIClient } from '@/lib/openai-client';
import axios from 'axios';


export async function POST(req: NextRequest) {
  try {
    console.log("🔄 Starting document reprocessing...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get documents that need reprocessing
    const { data: docs, error: docsError } = await supabase
      .from('building_documents')
      .select('id, file_url, file_name, file_type, building_id')
      .or('full_text.is.null,extracted_text.is.null')
      .limit(10); // limit to avoid batch overload

    if (docsError) {
      console.error("❌ Failed to fetch documents:", docsError);
      return NextResponse.json({ 
        error: "Failed to fetch documents",
        details: docsError.message 
      }, { status: 500 });
    }

    if (!docs || docs.length === 0) {
      console.log("✅ No documents to reprocess");
      return NextResponse.json({ 
        message: 'No documents to reprocess.',
        processed: 0
      });
    }

    console.log(`📄 Found ${docs.length} documents to reprocess`);

    let processedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const doc of docs) {
      try {
        console.log(`🔄 Processing document: ${doc.file_name} (ID: ${doc.id})`);
        
        // Download file from storage
        const fileRes = await axios.get(doc.file_url, { 
          responseType: 'arraybuffer',
          timeout: 30000 // 30 second timeout
        });
        
        const buffer = Buffer.from(fileRes.data);
        
        // Enhanced text extraction with analysis
        let extractedText = "";
        let documentType = "General Document";
        let summary = "";
        let suggestedAction = "";
        let confidence = "medium";
        let keyPhrases: string[] = [];

        if (doc.file_type === 'application/pdf') {
          console.log("🔍 Processing PDF with enhanced extraction...");
          
          const analysis = await extractTextWithAnalysis(buffer, doc.file_name);
          
          extractedText = cleanExtractedText(analysis.text);
          documentType = analysis.documentType;
          summary = analysis.summary;
          confidence = analysis.confidence;
          keyPhrases = analysis.keyPhrases;
          
        } else if (doc.file_type.includes('text') || doc.file_type.includes('document')) {
          console.log("🔍 Processing text document...");
          
          const text = buffer.toString('utf-8');
          extractedText = cleanExtractedText(text);
          
          // Basic classification for text files
          const { detectDocumentType, generateBasicSummary, extractKeyPhrases } = await import('@/lib/extractTextFromPdf');
          documentType = detectDocumentType(doc.file_name, text);
          summary = generateBasicSummary(text, documentType);
          keyPhrases = extractKeyPhrases(text);
          
        } else {
          console.log("⚠️ File type not supported for text extraction:", doc.file_type);
          extractedText = `Document: ${doc.file_name} (${doc.file_type})`;
          documentType = "General Document";
          summary = "Document uploaded successfully. Content analysis limited due to file type.";
        }

        // Enhanced AI analysis if text is sufficient
        if (isTextSufficientForAnalysis(extractedText)) {
          console.log("🧠 Generating AI analysis...");
          
          const aiPrompt = `
You are BlocIQ, a UK property management AI assistant. Analyze this document and provide:

1. A concise summary of key findings (max 200 words)
2. A specific suggested action for the property manager (max 100 words)
3. Compliance status (compliant/requires_action/clear/unknown)
4. Confidence level (high/medium/low)

Document Information:
- File Name: ${doc.file_name}
- Document Type: ${documentType}
- Content Length: ${extractedText.length} characters

Document Content:
${extractedText.slice(0, 3000)}

Please respond in this JSON format:
{
  "summary": "Brief summary of key findings",
  "suggested_action": "Specific action for property manager",
  "compliance_status": "compliant|requires_action|clear|unknown",
  "confidence_level": "high|medium|low"
}

Focus on:
- Compliance requirements and deadlines
- Safety issues or risks
- Required follow-up actions
- Cost implications
- Legal requirements
- Maintenance recommendations
`;

    const openai = getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are a property management expert. Analyze documents and provide actionable insights in JSON format.'
              },
              {
                role: 'user',
                content: aiPrompt
              }
            ],
            temperature: 0.3,
            max_tokens: 1000
          });

          const aiResponse = completion.choices[0].message.content;
          
          // Parse AI response
          try {
            const aiResult = JSON.parse(aiResponse || '{}');
            suggestedAction = aiResult.suggested_action || suggestedAction;
            summary = aiResult.summary || summary;
            confidence = aiResult.confidence_level || confidence;
          } catch (parseError) {
            console.warn("⚠️ Failed to parse AI response, using fallback:", parseError);
            // Fallback: extract summary and action from AI response
            const lines = aiResponse?.split('\n') || [];
            for (const line of lines) {
              if (line.toLowerCase().includes('summary:')) {
                summary = line.replace(/summary:/i, '').trim();
              } else if (line.toLowerCase().includes('suggested action:')) {
                suggestedAction = line.replace(/suggested action:/i, '').trim();
              }
            }
          }
        } else {
          console.log("⚠️ Insufficient text for AI analysis");
          suggestedAction = "Document contains limited readable text. Consider re-uploading with OCR or a text-based version.";
        }

        // Update document with extracted data
        const { error: updateError } = await supabase
          .from('building_documents')
          .update({
            full_text: extractedText,
            extracted_text: extractedText,
            classification: documentType,
            summary: summary,
            suggested_action: suggestedAction,
            confidence_level: confidence,
            key_findings: keyPhrases,
            updated_at: new Date().toISOString(),
            reprocessed_at: new Date().toISOString()
          })
          .eq('id', doc.id);

        if (updateError) {
          console.error(`❌ Failed to update document ${doc.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Successfully processed document: ${doc.file_name}`);
          processedCount++;
          
          results.push({
            id: doc.id,
            fileName: doc.file_name,
            documentType: documentType,
            textLength: extractedText.length,
            summary: summary.substring(0, 100) + '...',
            confidence: confidence
          });
        }

      } catch (err) {
        console.error(`❌ Failed to reprocess document ${doc.id}:`, err);
        errorCount++;
        
        // Update document with error status
        await supabase
          .from('building_documents')
          .update({
            summary: "Document reprocessing failed. Please try re-uploading.",
            suggested_action: "Re-upload document for processing.",
            confidence_level: "low",
            updated_at: new Date().toISOString(),
            reprocessed_at: new Date().toISOString()
          })
          .eq('id', doc.id);
      }
    }

    console.log(`🎉 Document reprocessing completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      message: 'Document reprocessing completed.',
      processed: processedCount,
      errors: errorCount,
      results: results
    });

  } catch (error) {
    console.error("❌ Document reprocessing error:", error);
    return NextResponse.json({ 
      error: "Internal server error during document reprocessing",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 