import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { EnhancedAskAI } from '@/lib/ai/enhanced-ask-ai';
import { analyzeDocument } from '@/lib/document-analysis-orchestrator';
import OpenAI from 'openai';

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
    const processedDocuments: any[] = [];

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
            // Store document in building_documents table with full text content
            const { data: document, error: docError } = await supabase
              .from('building_documents')
              .insert({
                building_id: buildingId || null,
                file_name: file.name,
                file_url: `ocr_processed_${Date.now()}_${file.name}`, // Placeholder URL
                type: 'ocr_processed',
                full_text: ocrResult.text, // Store the full OCR text
                content_summary: ocrResult.text.substring(0, 500) + '...', // Basic summary
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (docError) {
              console.error('Failed to store document:', docError);
              continue;
            }

            // Store OCR text in document_chunks table for searchability
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
              console.log('🔍 Starting document analysis for:', file.name);
              const analysis = await analyzeDocument(
                ocrResult.text, 
                file.name, 
                userQuestion || 'Analyze this document'
              );
              
              console.log('📊 Document analysis completed:', {
                filename: file.name,
                documentType: analysis.documentType,
                summary: analysis.summary?.substring(0, 100) + '...',
                hasExtractedText: !!analysis.extractedText,
                extractedTextLength: analysis.extractedText?.length || 0
              });
              
              documentAnalyses.push(analysis);
              
              // Use the AI prompt from document analysis
              enhancedPrompt = analysis.aiPrompt;
              
              // Store the processed document info
              processedDocuments.push({
                id: document.id,
                filename: file.name,
                type: analysis.documentType,
                summary: analysis.summary,
                extractedText: ocrResult.text
              });
              
            } catch (analysisError) {
              console.error('Document analysis failed:', analysisError);
              // Fallback to basic OCR text
              enhancedPrompt += `\n\nDocument: ${file.name}\nExtracted Text: ${ocrResult.text.substring(0, 2000)}${ocrResult.text.length > 2000 ? '...' : ''}`;
              
              // Store basic document info
              processedDocuments.push({
                id: document.id,
                filename: file.name,
                type: 'unknown',
                summary: 'OCR processing completed',
                extractedText: ocrResult.text
              });
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

    // 4. Use enhanced Ask AI with industry knowledge OR generate automatic lease summary
    let response: any;
    
    // Check if this is a lease document and generate automatic summary
    const isLeaseDocument = documentAnalyses.some(analysis => 
      analysis.documentType?.toLowerCase().includes('lease')
    ) || processedDocuments.some(doc => 
      doc.filename?.toLowerCase().includes('lease') || 
      doc.type?.toLowerCase().includes('lease')
    );
    
    console.log('🔍 Document analysis results:', {
      documentCount: documentAnalyses.length,
      documentTypes: documentAnalyses.map(a => a.documentType),
      isLeaseDocument,
      processedDocumentsCount: processedDocuments.length,
      filenames: processedDocuments.map(d => d.filename),
      types: processedDocuments.map(d => d.type)
    });
    
    if (isLeaseDocument && processedDocuments.length > 0) {
      console.log('📄 Lease document detected - generating automatic summary');
      
      try {
        // Get the lease document text
        const leaseDocument = processedDocuments[0];
        const leaseText = leaseDocument.extractedText;
        
        // Generate lease summary using OpenAI with specific formatting
        const openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: `You are a UK property management assistant. Analyze this lease document and return a response in this EXACT format:

Got the lease—nice, clean copy. Here's the crisp "at-a-glance" you can drop into BlocIQ or an email 👇

[Property Address] — key points
* **Term:** [lease length] from **[start date]** (to [end date]).
* **Ground rent:** £[amount] p.a., [escalation terms].
* **Use:** [permitted use].
* **Service charge share:** [percentages and descriptions]
* **Insurance:** [arrangement details]
* **Alterations:** [policy with consent requirements]
* **Alienation:** [subletting/assignment rules]
* **Pets:** [policy]
* **Smoking:** [restrictions]

Bottom line: [practical summary]

Extract the actual information from the lease text. If information is not clearly stated, use "[not specified]" for that field.`
          }, {
            role: 'user',
            content: `Analyze this lease document:\n\n${leaseText}`
          }],
          temperature: 0.3,
          max_tokens: 1500
        });

        response = {
          response: completion.choices[0].message?.content || 'Lease analysis completed but summary generation failed.',
          sources: ['lease_document_analysis'],
          confidence: 0.9,
          knowledgeUsed: ['lease_analysis'],
          documentAnalyses: documentAnalyses,
          processedDocuments: processedDocuments,
          timestamp: new Date().toISOString(),
        };
        
      } catch (openaiError) {
        console.error('OpenAI lease analysis error:', openaiError);
        // Fall back to enhanced AI
        const enhancedAI = new EnhancedAskAI();
        response = await enhancedAI.generateResponse({
          prompt: enhancedPrompt,
          building_id: buildingId,
          contextType: 'document_analysis',
          emailContext: null,
          is_outlook_addin: false,
          includeIndustryKnowledge: true,
          knowledgeCategories: ['compliance', 'property_management', 'uk_regulations']
        });
      }
    } else {
      // Use enhanced Ask AI with industry knowledge for non-lease documents
      const enhancedAI = new EnhancedAskAI();
      response = await enhancedAI.generateResponse({
        prompt: enhancedPrompt,
        building_id: buildingId,
        contextType: 'document_analysis',
        emailContext: null,
        is_outlook_addin: false,
        includeIndustryKnowledge: true,
        knowledgeCategories: ['compliance', 'property_management', 'uk_regulations']
      });
    }

    // 5. Return enhanced response with document analysis
    return NextResponse.json({
      response: response.response,
      sources: response.sources,
      confidence: response.confidence,
      knowledgeUsed: response.knowledgeUsed,
      documentAnalyses: documentAnalyses,
      processedDocuments: processedDocuments, // Include processed document info
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
