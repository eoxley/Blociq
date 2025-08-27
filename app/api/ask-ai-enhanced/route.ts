import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { EnhancedAskAI } from '@/lib/ai/enhanced-ask-ai';
import { analyzeDocument } from '@/lib/document-analysis-orchestrator';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const userQuestion = formData.get('userQuestion') as string;
    const useMemory = formData.get('useMemory') as string;
    const conversationId = formData.get('conversationId') as string;
    const buildingId = formData.get('buildingId') as string;
    
    // Get files from form data
    const files: File[] = [];
    let index = 0;
    while (formData.has(`file_${index}`)) {
      const file = formData.get(`file_${index}`) as File;
      if (file) {
        files.push(file);
      }
      index++;
    }

    if (!userQuestion && files.length === 0) {
      return NextResponse.json({ error: 'User question or files are required' }, { status: 400 });
    }

    let enhancedPrompt = userQuestion;
    const documentAnalyses: any[] = [];

    // 3. Process files through OCR and store in database
    if (files.length > 0) {
      for (const file of files) {
        try {
          // Process file through OCR microservice
          const ocrFormData = new FormData();
          ocrFormData.append('file', file);
          
          const ocrResponse = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
            method: 'POST',
            body: ocrFormData
          });

          if (!ocrResponse.ok) {
            throw new Error(`OCR service error: ${ocrResponse.status}`);
          }

          const ocrResult = await ocrResponse.json();
          
          if (ocrResult.text) {
            // Store document in building_documents table
            const { data: document, error: docError } = await supabase
              .from('building_documents')
              .insert({
                building_id: buildingId || null,
                file_name: file.name,
                file_url: `ocr_processed_${Date.now()}_${file.name}`, // Placeholder URL
                type: 'ocr_processed',
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (docError) {
              console.error('Failed to store document:', docError);
              continue;
            }

            // Store OCR text in document_chunks table
            await supabase
              .from('document_chunks')
              .insert({
                document_id: document.id,
                chunk_index: 0,
                content: ocrResult.text,
                metadata: { 
                  confidence: ocrResult.confidence || 'medium',
                  source: 'ocr_microservice',
                  file_size: file.size,
                  file_type: file.type
                }
              });

            // Update document processing status
            await supabase
              .from('document_processing_status')
              .insert({
                document_id: document.id,
                status: 'completed',
                processing_type: 'ocr_extraction',
                metadata: { 
                  ocr_confidence: ocrResult.confidence,
                  text_length: ocrResult.text.length,
                  processing_time: new Date().toISOString()
                }
              });

            // Perform document analysis using our system
            try {
              const analysis = await analyzeDocument(
                ocrResult.text, 
                file.name, 
                userQuestion || 'Analyze this document'
              );
              
              documentAnalyses.push(analysis);
              
              // Use the AI prompt from document analysis
              enhancedPrompt = analysis.aiPrompt;
              
            } catch (analysisError) {
              console.error('Document analysis failed:', analysisError);
              // Fallback to basic OCR text
              enhancedPrompt += `\n\nDocument: ${file.name}\nExtracted Text: ${ocrResult.text.substring(0, 2000)}${ocrResult.text.length > 2000 ? '...' : ''}`;
            }

          } else {
            console.error('OCR failed to extract text from file:', file.name);
          }
        } catch (ocrError) {
          console.error('OCR processing failed for file:', file.name, ocrError);
          // Continue with other files
        }
      }
    }

    // 4. Use enhanced Ask AI with industry knowledge
    const enhancedAI = new EnhancedAskAI();
    const response = await enhancedAI.generateResponse({
      prompt: enhancedPrompt,
      building_id: buildingId,
      contextType: 'document_analysis',
      emailContext: null,
      is_outlook_addin: false,
      includeIndustryKnowledge: true,
      knowledgeCategories: ['compliance', 'property_management', 'uk_regulations']
    });

    // 5. Return enhanced response with document analysis
    return NextResponse.json({
      response: response.response,
      sources: response.sources,
      confidence: response.confidence,
      knowledgeUsed: response.knowledgeUsed,
      documentAnalyses: documentAnalyses,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Enhanced Ask AI failed:', error);
    
    return NextResponse.json({ 
      error: 'Failed to generate response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return knowledge base statistics for admin users
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      const enhancedAI = new EnhancedAskAI();
      const stats = await enhancedAI.getKnowledgeStats();
      const categories = await enhancedAI.getKnowledgeCategories();

      return NextResponse.json({
        stats,
        categories,
        message: 'Enhanced Ask AI endpoint is active with OCR integration and industry knowledge'
      });
    }

    return NextResponse.json({
      message: 'Enhanced Ask AI endpoint is active with OCR integration and industry knowledge'
    });

  } catch (error) {
    console.error('Failed to get Enhanced Ask AI info:', error);
    
    return NextResponse.json({ 
      error: 'Failed to retrieve information'
    }, { status: 500 });
  }
}
