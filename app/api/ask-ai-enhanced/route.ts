import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { EnhancedAskAI } from '@/lib/ai/enhanced-ask-ai';
import { analyzeDocument } from '@/lib/document-analysis-orchestrator';
import { searchAllRelevantTables, isPropertyQuery, formatDatabaseResponse } from '@/lib/ai/database-search';
import { processFileWithOCR, getOCRConfig, formatOCRError } from '@/lib/ai/ocrClient';
import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const { supabase, user } = await requireAuth();

    // 2. Parse multipart form data
    const formData = await request.formData();
    const userQuestion = formData.get('userQuestion') as string;
    const useMemory = formData.get('useMemory') as string;
    const conversationId = formData.get('conversationId') as string;
    const buildingIdRaw = formData.get('buildingId') as string;
    const buildingId = buildingIdRaw === 'null' ? null : buildingIdRaw;
    
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

    // Check if this is a database query first
    console.log('🔍 Checking if property query for:', userQuestion);
    const isDbQuery = isPropertyQuery(userQuestion);
    console.log('🔍 isPropertyQuery result:', isDbQuery);
    
    if (isDbQuery) {
      console.log('🎯 Database query detected! Searching database first:', userQuestion);
      console.log('🔍 Query details:', {
        query: userQuestion,
        isProperty: isDbQuery,
        length: userQuestion?.length,
        type: typeof userQuestion
      });
      
      try {
        console.log('🚀 Starting database search...');
        const databaseResults = await searchAllRelevantTables(supabase, userQuestion);
        console.log('📊 Database search completed. Result keys:', Object.keys(databaseResults));
        console.log('📊 Database results summary:', {
          totalTables: Object.keys(databaseResults).length,
          tablesWithData: Object.keys(databaseResults).filter(table => databaseResults[table].length > 0),
          totalRecords: Object.values(databaseResults).reduce((sum, arr) => sum + arr.length, 0)
        });
        
        if (Object.keys(databaseResults).length > 0) {
          console.log('✅ Database search successful, found data in tables:', Object.keys(databaseResults));
          
          // Format the database response
          const formattedResponse = formatDatabaseResponse(userQuestion, databaseResults);
          
          return NextResponse.json({
            response: formattedResponse,
            sources: ['database_search'],
            confidence: 0.9,
            knowledgeUsed: false,
            databaseResults: databaseResults,
            timestamp: new Date().toISOString(),
            isDatabaseQuery: true
          });
        } else {
          console.log('ℹ️ Database search returned no results, proceeding with AI processing');
          console.log('🔍 Empty database results details:', JSON.stringify(databaseResults, null, 2));
        }
      } catch (dbError) {
        console.error('❌ Database search failed:', dbError);
        console.log('🔄 Continuing with AI processing due to database error');
      }
    } else {
      console.log('ℹ️ Not a property query, proceeding with standard AI processing');
    }

    let enhancedPrompt = userQuestion;
    const documentAnalyses: any[] = [];
    const processedDocuments: any[] = [];

    // 3. Process files through hardened OCR and store in database
    const ocrConfig = getOCRConfig();
    if (files.length > 0) {
      for (const file of files) {
        try {
          console.log(`🔍 Processing file: ${file.name} (${file.size} bytes)`);
          
          // Process file through hardened OCR client
          const ocrResult = await processFileWithOCR(file, ocrConfig);
          
          if (!ocrResult.success) {
            console.error('❌ OCR processing failed:', ocrResult.error);
            const errorMessage = formatOCRError(ocrResult.error!, file.name);
            
            // Store error information for user feedback
            processedDocuments.push({
              id: null,
              filename: file.name,
              type: 'ocr_failed',
              summary: errorMessage,
              extractedText: null,
              error: ocrResult.error
            });
            
            continue; // Continue with other files
          }
          
          console.log(`✅ OCR successful for ${file.name}: ${ocrResult.text!.length} characters extracted`);
          
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
                created_at: new Date().toISOString(),
                metadata: ocrResult.metadata || {}
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
                  source: 'ocr_microservice_hardened',
                  file_size: file.size,
                  file_type: file.type,
                  processing_time: ocrResult.metadata?.processingTime,
                  attempts: ocrResult.metadata?.attempts
                }
              });

            // Update document processing status
            await supabase
              .from('document_processing_status')
              .insert({
                document_id: document.id,
                status: 'completed',
                processing_type: 'ocr_extraction_hardened',
                metadata: { 
                  ocr_confidence: ocrResult.confidence,
                  text_length: ocrResult.text.length,
                  processing_time: ocrResult.metadata?.processingTime || 0,
                  attempts: ocrResult.metadata?.attempts || 1,
                  file_size: ocrResult.metadata?.fileSize || file.size,
                  completed_at: new Date().toISOString()
                }
              });

            // Perform document analysis using our system
            try {
              console.log('🔍 Starting document analysis for:', file.name);
              console.log('📊 Document analysis inputs:', {
                textLength: ocrResult.text?.length || 0,
                filename: file.name,
                userQuestion: userQuestion || 'Analyze this document',
                hasText: !!ocrResult.text
              });
              
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
                extractedTextLength: analysis.extractedText?.length || 0,
                analysisKeys: Object.keys(analysis),
                hasDocumentType: !!analysis.documentType,
                documentTypeLength: analysis.documentType?.length || 0,
                fullAnalysis: analysis
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
              console.log('📊 Analysis error details:', {
                errorType: analysisError instanceof Error ? analysisError.constructor.name : 'Unknown',
                errorMessage: analysisError instanceof Error ? analysisError.message : 'Unknown error',
                errorStack: analysisError instanceof Error ? analysisError.stack?.substring(0, 200) + '...' : 'No stack trace'
              });
              
              // Check if this is a lease document by filename even if analysis failed
              const isLeaseByFilename = file.name.toLowerCase().includes('lease');
              console.log('🔍 Fallback lease detection by filename:', {
                filename: file.name,
                isLeaseByFilename,
                willForceLeaseType: isLeaseByFilename
              });
              
              // Fallback to basic OCR text
              enhancedPrompt += `\n\nDocument: ${file.name}\nExtracted Text: ${ocrResult.text.substring(0, 2000)}${ocrResult.text.length > 2000 ? '...' : ''}`;
              
              // Store basic document info with lease detection fallback
              processedDocuments.push({
                id: document.id,
                filename: file.name,
                type: isLeaseByFilename ? 'lease' : 'unknown',
                summary: isLeaseByFilename ? 'Lease document (detected by filename)' : 'OCR processing completed',
                extractedText: ocrResult.text
              });
            }

          } else {
            console.error('OCR extracted empty text for file:', file.name);
            // This case shouldn't happen with the hardened client, but handle gracefully
            processedDocuments.push({
              id: null,
              filename: file.name,
              type: 'ocr_empty',
              summary: 'OCR processing completed but no text was extracted',
              extractedText: null
            });
          }
        } catch (ocrError) {
          console.error('Unexpected error during OCR processing for file:', file.name, ocrError);
          // Store error information
          processedDocuments.push({
            id: null,
            filename: file.name,
            type: 'ocr_failed',
            summary: `OCR processing failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`,
            extractedText: null,
            error: ocrError
          });
          // Continue with other files
        }
      }
    }

    // 4. Use enhanced Ask AI with industry knowledge OR generate automatic lease summary
    let response: any;
    
    // Check if this is a lease document and generate automatic summary
    let isLeaseDocument = documentAnalyses.some(analysis => 
      analysis.documentType?.toLowerCase().includes('lease')
    ) || processedDocuments.some(doc => 
      doc.filename?.toLowerCase().includes('lease') || 
      doc.type?.toLowerCase().includes('lease')
    );
    
    console.log('🔍 Lease detection analysis:', {
      documentAnalysesCount: documentAnalyses.length,
      documentAnalysesTypes: documentAnalyses.map(a => a.documentType),
      documentAnalysesFull: documentAnalyses.map(a => ({
        documentType: a.documentType,
        hasDocumentType: !!a.documentType,
        typeLength: a.documentType?.length || 0,
        typeIncludesLease: a.documentType?.toLowerCase().includes('lease'),
        classification: a.classification,
        filename: a.filename
      })),
      processedDocumentsCount: processedDocuments.length,
      processedDocumentsInfo: processedDocuments.map(d => ({
        filename: d.filename,
        type: d.type,
        filenameLower: d.filename?.toLowerCase(),
        typeLower: d.type?.toLowerCase(),
        filenameHasLease: d.filename?.toLowerCase().includes('lease'),
        typeHasLease: d.type?.toLowerCase().includes('lease')
      })),
      initialIsLeaseDocument: isLeaseDocument
    });
    
    console.log('🔍 Initial lease detection:', {
      documentAnalyses: documentAnalyses.map(a => ({
        documentType: a.documentType,
        hasType: !!a.documentType,
        typeIncludesLease: a.documentType?.toLowerCase().includes('lease')
      })),
      processedDocuments: processedDocuments.map(d => ({
        filename: d.filename,
        type: d.type,
        filenameIncludesLease: d.filename?.toLowerCase().includes('lease'),
        typeIncludesLease: d.type?.toLowerCase().includes('lease')
      })),
      isLeaseDocument
    });
    
    console.log('🔍 Document analysis results:', {
      documentCount: documentAnalyses.length,
      documentTypes: documentAnalyses.map(a => a.documentType),
      isLeaseDocument,
      processedDocumentsCount: processedDocuments.length,
      filenames: processedDocuments.map(d => d.filename),
      types: processedDocuments.map(d => d.type),
      // Add more detailed analysis info
      analysisDetails: documentAnalyses.map(a => ({
        type: a.documentType,
        hasType: !!a.documentType,
        typeLength: a.documentType?.length || 0
      }))
    });
    
    // Additional check: if filename contains 'lease' but analysis didn't catch it
    const hasLeaseInFilename = processedDocuments.some(doc => 
      doc.filename?.toLowerCase().includes('lease')
    );
    
    if (hasLeaseInFilename && !isLeaseDocument) {
      console.log('🔍 Filename contains "lease" but analysis didn\'t detect it - forcing lease detection');
      isLeaseDocument = true;
    }
    
    // Additional check: if the document text contains lease-related keywords
    const hasLeaseKeywords = processedDocuments.some(doc => {
      if (!doc.extractedText) return false;
      const text = doc.extractedText.toLowerCase();
      const leaseKeywords = ['lease', 'agreement', 'lessor', 'lessee', 'demise', 'term', 'ground rent', 'service charge'];
      const hasKeywords = leaseKeywords.some(keyword => text.includes(keyword));
      
      console.log('🔍 Lease keyword check for:', doc.filename, {
        textLength: text.length,
        textPreview: text.substring(0, 200) + '...',
        leaseKeywords,
        hasKeywords,
        foundKeywords: leaseKeywords.filter(keyword => text.includes(keyword))
      });
      
      return hasKeywords;
    });
    
    if (hasLeaseKeywords && !isLeaseDocument) {
      console.log('🔍 Document text contains lease keywords but analysis didn\'t detect it - forcing lease detection');
      isLeaseDocument = true;
    }
    
    console.log('🔍 Final lease detection result:', {
      isLeaseDocument,
      hasLeaseInFilename,
      hasLeaseKeywords,
      willGenerateSummary: isLeaseDocument && processedDocuments.length > 0,
      processedDocumentsSummary: processedDocuments.map(d => ({
        filename: d.filename,
        type: d.type,
        isLeaseByType: d.type?.toLowerCase().includes('lease'),
        isLeaseByFilename: d.filename?.toLowerCase().includes('lease')
      }))
    });
    
    // Final fallback: if any document has "lease" in the filename, force lease detection
    if (!isLeaseDocument && processedDocuments.some(doc => doc.filename?.toLowerCase().includes('lease'))) {
      console.log('🔍 Final fallback: Forcing lease detection based on filename');
      isLeaseDocument = true;
    }
    
    if (isLeaseDocument && processedDocuments.length > 0) {
      console.log('📄 Lease document detected - generating automatic summary');
      console.log('📊 Lease document details:', {
        filename: processedDocuments[0].filename,
        type: processedDocuments[0].type,
        extractedTextLength: processedDocuments[0].extractedText?.length || 0,
        hasExtractedText: !!processedDocuments[0].extractedText
      });
      
      try {
        // Get the lease document text
        const leaseDocument = processedDocuments[0];
        const leaseText = leaseDocument.extractedText;
        
        console.log('🔍 About to call OpenAI for lease summary generation');
        console.log('📝 Lease text preview:', leaseText?.substring(0, 200) + '...');
        console.log('🔑 OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
        console.log('📊 Lease document metadata:', {
          filename: leaseDocument.filename,
          type: leaseDocument.type,
          textLength: leaseText?.length || 0,
          hasText: !!leaseText
        });
        
        // Generate lease summary using OpenAI with specific formatting
        const openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
        console.log('🔑 OpenAI client created, API key exists:', !!process.env.OPENAI_API_KEY);
        console.log('📝 About to call OpenAI with lease text length:', leaseText?.length || 0);
        
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
        
        console.log('✅ OpenAI API call successful:', {
          model: completion.model,
          usage: completion.usage,
          hasChoices: !!completion.choices,
          choiceCount: completion.choices?.length || 0
        });

        console.log('✅ OpenAI lease summary generated successfully');
        console.log('📝 Generated summary length:', completion.choices[0].message?.content?.length || 0);

        const leaseSummary = completion.choices[0].message?.content || 'Lease analysis completed but summary generation failed.';
        
        console.log('✅ Lease summary generated successfully:', {
          summaryLength: leaseSummary.length,
          summaryPreview: leaseSummary.substring(0, 200) + '...',
          willDisplayInChat: true
        });
        
        response = {
          response: leaseSummary,
          sources: ['lease_document_analysis'],
          confidence: 0.9,
          knowledgeUsed: ['lease_analysis'],
          documentAnalyses: documentAnalyses,
          processedDocuments: processedDocuments,
          timestamp: new Date().toISOString(),
          // Add special flag to indicate this is a lease summary
          isLeaseSummary: true,
          leaseDocumentInfo: {
            filename: processedDocuments[0]?.filename,
            type: processedDocuments[0]?.type,
            extractedTextLength: processedDocuments[0]?.extractedText?.length || 0
          }
        };
        
      } catch (openaiError) {
        console.error('❌ OpenAI lease analysis error:', openaiError);
        console.log('🔄 Falling back to enhanced AI due to OpenAI error');
        console.log('📊 Fallback details:', {
          errorType: openaiError instanceof Error ? openaiError.constructor.name : 'Unknown',
          errorMessage: openaiError instanceof Error ? openaiError.message : 'Unknown error',
          willUseEnhancedAI: true
        });
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
      console.log('ℹ️ Not a lease document or no processed documents - using enhanced AI');
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
    const responseData: any = {
      response: response.response,
      sources: response.sources,
      confidence: response.confidence,
      knowledgeUsed: response.knowledgeUsed,
      documentAnalyses: documentAnalyses,
      processedDocuments: processedDocuments, // Include processed document info
      timestamp: new Date().toISOString(),
    };
    
    // Add lease-specific information if this was a lease summary
    if ((response as any).isLeaseSummary) {
      responseData.isLeaseSummary = true;
      responseData.leaseDocumentInfo = (response as any).leaseDocumentInfo;
      console.log('📤 Returning lease summary response:', {
        hasLeaseSummary: true,
        responseLength: response.response?.length || 0,
        willDisplayInChat: true
      });
    }
    
    return NextResponse.json(responseData);

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
    const { supabase, user } = await requireAuth();

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
