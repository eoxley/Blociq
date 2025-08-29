import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getOpenAIClient } from '@/lib/openai-client';
import { insertAiLog } from '@/lib/supabase/ai_logs';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const { supabase, user } = await requireAuth();

    // 2. Parse request body
    const body = await request.json();
    const { question, buildingId, documentIds, conversationId } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log('🔍 Document-aware AI query:', { question, buildingId, documentIds });

    let documentContext = '';
    let relevantDocuments: any[] = [];
    let response = '';

    // 3. Search for relevant documents if no specific documents provided
    if (!documentIds || documentIds.length === 0) {
      // Search for documents that might be relevant to the question
      const { data: documents, error: docError } = await supabase
        .from('building_documents')
        .select(`
          id,
          file_name,
          type,
          full_text,
          content_summary,
          building_id,
          created_at
        `)
        .eq('building_id', buildingId)
        .not('full_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (docError) {
        console.error('Error fetching documents:', docError);
      } else if (documents && documents.length > 0) {
        relevantDocuments = documents;
      }
    } else {
      // Fetch specific documents by ID
      const { data: documents, error: docError } = await supabase
        .from('building_documents')
        .select(`
          id,
          file_name,
          type,
          full_text,
          content_summary,
          building_id,
          created_at
        `)
        .in('id', documentIds);

      if (docError) {
        console.error('Error fetching specific documents:', docError);
      } else if (documents) {
        relevantDocuments = documents;
      }
    }

    // 4. Build document context for AI
    if (relevantDocuments.length > 0) {
      documentContext = buildDocumentContext(relevantDocuments, question);
      console.log('📄 Document context built for', relevantDocuments.length, 'documents');
    }

    // 5. Generate AI response with document context
    try {
      const openai = getOpenAIClient();
      
      // Check if this is a lease document question
      const isLeaseQuestion = question.toLowerCase().includes('lease') || 
                             question.toLowerCase().includes('term') ||
                             question.toLowerCase().includes('ground rent') ||
                             question.toLowerCase().includes('service charge') ||
                             relevantDocuments.some(doc => doc.type?.toLowerCase().includes('lease'));

      if (isLeaseQuestion && relevantDocuments.length > 0) {
        // Generate lease-specific response with the exact format requested
        response = await generateLeaseResponse(openai, relevantDocuments, question);
      } else if (documentContext) {
        // Generate general document-aware response
        response = await generateDocumentAwareResponse(openai, documentContext, question);
      } else {
        // Generate general response without document context
        response = await generateGeneralResponse(openai, question);
      }
    } catch (aiError) {
      console.error('AI response generation failed:', aiError);
      response = 'I apologize, but I encountered an error while processing your request. Please try again.';
    }

    // 6. Log the interaction
    let logId = null;
    try {
      logId = await insertAiLog({
        user_id: user.id,
        question,
        response,
        context_type: 'document_aware_chat',
        building_id: buildingId,
        document_ids: relevantDocuments.map(doc => doc.file_name),
      });
    } catch (logError) {
      console.error('Failed to log AI interaction:', logError);
    }

    // 7. Return response
    return NextResponse.json({
      success: true,
      response,
      documents_analyzed: relevantDocuments.map(doc => ({
        id: doc.id,
        name: doc.file_name,
        type: doc.type,
        building_id: doc.building_id
      })),
      ai_log_id: logId,
      metadata: {
        queryType: 'document_aware',
        documentsFound: relevantDocuments.length,
        hasDocumentContext: !!documentContext,
        processingTime: Date.now()
      }
    });

  } catch (error: any) {
    console.error('Document-aware AI route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process your request',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Build document context for AI prompt
 */
function buildDocumentContext(documents: any[], question: string): string {
  let context = '\n\n**RELEVANT DOCUMENTS:**\n';
  
  documents.forEach((doc, index) => {
    context += `\n${index + 1}. **${doc.file_name}** (${doc.type || 'Unknown Type'})\n`;
    
    if (doc.content_summary) {
      context += `   Summary: ${doc.content_summary.substring(0, 300)}...\n`;
    }
    
    if (doc.full_text) {
      context += `   Content: ${doc.full_text.substring(0, 1000)}...\n`;
    }
    
    context += `   Uploaded: ${new Date(doc.created_at).toLocaleDateString()}\n`;
  });

  context += '\n**INSTRUCTIONS:** Use the above document content to provide accurate, specific answers. ';
  context += 'Reference specific documents when relevant. If the documents don\'t fully address the query, ';
  context += 'acknowledge this and provide general guidance based on best practices.\n';

  return context;
}

/**
 * Generate lease-specific response with exact formatting
 */
async function generateLeaseResponse(openai: any, documents: any[], question: string): Promise<string> {
  // Find the most relevant lease document
  const leaseDoc = documents.find(doc => 
    doc.type?.toLowerCase().includes('lease') || 
    doc.file_name?.toLowerCase().includes('lease')
  ) || documents[0];

  const leaseText = leaseDoc.full_text || '';
  
  const prompt = `You are a UK property management assistant. Analyze this lease document and return a response in this EXACT format:

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

Extract the actual information from the lease text. If information is not clearly stated, use "[not specified]" for that field.

Lease document: ${leaseDoc.file_name}
Lease text:
${leaseText.substring(0, 8000)}

User question: ${question}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a leasehold property management expert. Return responses in the exact format specified.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  return completion.choices[0].message?.content || 'Lease analysis failed - please try again.';
}

/**
 * Generate document-aware response
 */
async function generateDocumentAwareResponse(openai: any, documentContext: string, question: string): Promise<string> {
  const prompt = `You are BlocIQ, a comprehensive UK property management AI assistant. 

You have access to relevant documents and their content. Use this information to provide accurate, helpful responses.

${documentContext}

**USER QUESTION:** ${question}

Please provide a comprehensive response that:
1. References specific documents when relevant
2. Extracts key information from the documents
3. Provides actionable insights
4. Uses UK property management terminology
5. Is professional and helpful

**RESPONSE:**`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a knowledgeable property management assistant with expertise in UK leasehold block management.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  return completion.choices[0].message?.content || 'Document analysis failed - please try again.';
}

/**
 * Generate general response without document context
 */
async function generateGeneralResponse(openai: any, question: string): Promise<string> {
  const prompt = `You are BlocIQ, a comprehensive UK property management AI assistant. 

You can help with notice generation, letter drafting, compliance documents, calculations, email responses, and UK property law guidance. 

Always provide professional, legally appropriate responses using British English and current UK property management regulations.

**USER QUESTION:** ${question}

**RESPONSE:**`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a knowledgeable property management assistant with expertise in UK leasehold block management.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 1500
  });

  return completion.choices[0].message?.content || 'I can help you with property management questions. Please ask a specific question.';
}
