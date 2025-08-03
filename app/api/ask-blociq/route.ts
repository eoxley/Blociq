// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for question, buildingId, userId
// - Supabase queries with proper .eq() filters
// - Try/catch with detailed error handling
// - Used in AI assistant components
// - Includes OpenAI integration with error handling
// - Document-aware functionality with proper validation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getSystemPrompt } from '../../../lib/ai/systemPrompt';
import { fetchUserContext, formatContextMessages } from '../../../lib/ai/userContext';
import { logAIInteraction } from '../../../lib/ai/logInteraction';
import { searchFounderKnowledge } from '../../../lib/ai/embed';
import { getStructuredBuildingData } from '../../../lib/getStructuredBuildingData';
import { Database } from '../../../lib/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    console.log("🧠 Document-Aware BlocIQ Assistant request");
    
    const body = await req.json();
    console.log("📨 Request body:", body);
    
    const { question, buildingId, userId, documentContext } = body;

    if (!userId) {
      console.error("❌ No user ID provided in request");
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (!question) {
      console.error("❌ No question provided in request");
      return NextResponse.json({ error: 'Question required' }, { status: 400 });
    }

    if (!buildingId) {
      console.error("❌ No building ID provided in request");
      return NextResponse.json({ error: 'Building ID required' }, { status: 400 });
    }

    console.log("✅ Valid request received - Question:", question, "Building ID:", buildingId, "User ID:", userId);

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY environment variable is missing');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    console.log("✅ OpenAI API key found");

    // 1. Get structured building data
    console.log("🔍 Getting structured building data for:", buildingId);
    const buildingData = await getStructuredBuildingData(buildingId);

    if (!buildingData) {
      console.error("❌ Building not found:", buildingId);
      return NextResponse.json({ error: 'Building not found.' }, { status: 404 });
    }

    console.log("✅ Building data retrieved:", buildingData.name);

    // 2. Get user context
    console.log("👤 Fetching user context for user:", userId);
    const userContext = await fetchUserContext(userId, supabase);
    
    // Build building context
    const buildingContext = buildingData ? `
Building Information:
- Name: ${buildingData.name}
- Address: ${buildingData.address || 'Not specified'}
- Unit Count: ${buildingData.unit_count || 'Unknown'}
- Created: ${buildingData.created_at ? new Date(buildingData.created_at).toLocaleDateString() : 'Unknown'}
` : 'No building data available';
    
    console.log("🏢 Building context:", buildingContext);

    // 3. Get relevant documents for the question
    console.log("📄 Searching for relevant documents...");
    const relevantDocuments = await getRelevantDocuments(question, buildingId);
    console.log(`✅ Found ${relevantDocuments.length} relevant documents`);

    // 4. Search Founder Knowledge
    let founderKnowledgeMessages: Array<{ role: 'system'; content: string }> = [];
    try {
      console.log("🔍 Searching founder knowledge for:", question);
      const knowledgeResult = await searchFounderKnowledge(question);
      if (knowledgeResult.success && knowledgeResult.results.length > 0) {
        founderKnowledgeMessages = knowledgeResult.results.map(chunk => ({
          role: 'system' as const,
          content: `Reference: ${chunk}`
        }));
        console.log(`✅ Found ${knowledgeResult.results.length} relevant founder knowledge chunks`);
      } else {
        console.log('ℹ️ No relevant founder knowledge found for query');
      }
    } catch (error) {
      console.error('❌ Error searching founder knowledge:', error);
    }

    // 5. Build document context
    const documentContextString = buildDocumentContext(relevantDocuments, documentContext);
    
    // 6. Get system prompt with enhanced document awareness
    const systemPrompt = getEnhancedSystemPrompt(buildingContext, documentContextString);
    
    // 7. Inject Supabase Context
    const contextMessages = formatContextMessages(userContext);
    console.log("📝 Context messages count:", contextMessages.length);
    
    // 8. Build AI prompt with document awareness
    const aiPrompt = buildDocumentAwarePrompt(question, buildingData, relevantDocuments, documentContext);
    
    // 9. Build the complete message array
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...contextMessages,
      ...founderKnowledgeMessages,
      { role: 'user' as const, content: aiPrompt }
    ];

    console.log("🤖 Calling OpenAI API with", messages.length, "messages...");

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.3,
      max_tokens: 1500
    });

    const answer = completion.choices[0].message.content;
    console.log("✅ OpenAI response received:", answer?.substring(0, 100) + "...");
    
    if (!answer) {
      console.error("❌ No response from OpenAI");
      throw new Error('No response from OpenAI');
    }

    // 10. Format response with document sources
    const formattedAnswer = formatResponseWithSources(answer, relevantDocuments, documentContext);
    
    // Save AI log entry
    try {
      console.log("💾 Saving AI log entry...");
      const { error: logError } = await supabase
        .from('ai_logs')
        .insert({
          user_id: userId,
          agency_id: userContext.agency?.id || null,
          question,
          response: formattedAnswer,
          timestamp: new Date().toISOString(),
        });
      
      if (logError) {
        console.error('❌ Failed to save AI log entry:', logError);
      } else {
        console.log("✅ AI log entry saved successfully");
      }
    } catch (logError) {
      console.error('❌ Failed to save AI log entry:', logError);
    }
    
    // Log the Interaction
    try {
      await logAIInteraction({
        user_id: userId,
        agency_id: userContext.agency?.id,
        question: question,
        response: formattedAnswer,
        timestamp: new Date().toISOString(),
      }, supabase);
      console.log("✅ AI interaction logged successfully");
    } catch (logError) {
      console.error('❌ Failed to log AI interaction:', logError);
    }

    return NextResponse.json({ 
      answer: formattedAnswer,
      sources: relevantDocuments.map(doc => ({
        name: doc.file_name,
        type: doc.type,
        uploaded: doc.created_at
      })),
      documentCount: relevantDocuments.length
    });
  } catch (err) {
    console.error('❌ Document-Aware BlocIQ AI error:', err);
    console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'AI failed to respond',
      details: process.env.NODE_ENV === 'development' ? err instanceof Error ? err.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}

async function getRelevantDocuments(question: string, buildingId: string) {
  try {
    // Get all documents for the building
    const { data: documents, error } = await supabase
      .from('building_documents')
      .select(`
        id,
        file_name,
        type,
        created_at,
        building_id,
        document_analysis (
          summary,
          extracted_text,
          classification,
          inspection_date,
          next_due_date,
          responsible_party,
          action_required
        )
      `)
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching documents:', error);
      return [];
    }

    if (!documents) return [];

    // Simple keyword matching for relevance
    const questionLower = question.toLowerCase();
    const relevantKeywords = [
      'fire', 'electrical', 'eicr', 'insurance', 'lift', 'asbestos', 'legionella',
      'compliance', 'certificate', 'assessment', 'inspection', 'maintenance',
      'lease', 'leaseholder', 'service charge', 'apportionment', 'contractor',
      'summary', 'action', 'due', 'date', 'responsible', 'party'
    ];

    const relevantDocs = documents.filter(doc => {
      const docText = doc.document_analysis?.extracted_text?.toLowerCase() || '';
      const docSummary = doc.document_analysis?.summary?.toLowerCase() || '';
      const docType = doc.type?.toLowerCase() || '';
      const fileName = doc.file_name?.toLowerCase() || '';

      // Check if question contains relevant keywords
      const hasRelevantKeywords = relevantKeywords.some(keyword => 
        questionLower.includes(keyword)
      );

      // Check if document content matches question keywords
      const contentMatches = relevantKeywords.some(keyword => 
        docText.includes(keyword) || docSummary.includes(keyword) || docType.includes(keyword)
      );

      return hasRelevantKeywords && contentMatches;
    });

    return relevantDocs.slice(0, 5); // Limit to 5 most relevant
  } catch (error) {
    console.error('❌ Error in getRelevantDocuments:', error);
    return [];
  }
}

function buildDocumentContext(documents: any[], documentContext?: any) {
  if (!documents.length && !documentContext) {
    return 'No relevant documents found.';
  }

  let context = '';

  // Add uploaded document context if provided
  if (documentContext) {
    context += `📄 Recently Uploaded Document:\n`;
    context += `- Name: ${documentContext.fileName}\n`;
    context += `- Type: ${documentContext.type}\n`;
    context += `- Summary: ${documentContext.summary}\n`;
    if (documentContext.inspection_date) {
      context += `- Inspection Date: ${documentContext.inspection_date}\n`;
    }
    if (documentContext.next_due_date) {
      context += `- Next Due: ${documentContext.next_due_date}\n`;
    }
    context += '\n';
  }

  // Add relevant building documents
  if (documents.length > 0) {
    context += `📚 Relevant Building Documents:\n`;
    documents.forEach((doc, index) => {
      context += `${index + 1}. ${doc.file_name} (${doc.type})\n`;
      if (doc.document_analysis?.summary) {
        context += `   Summary: ${doc.document_analysis.summary.substring(0, 200)}...\n`;
      }
      if (doc.document_analysis?.inspection_date) {
        context += `   Inspection: ${doc.document_analysis.inspection_date}\n`;
      }
      if (doc.document_analysis?.next_due_date) {
        context += `   Next Due: ${doc.document_analysis.next_due_date}\n`;
      }
      context += '\n';
    });
  }

  return context;
}

function getEnhancedSystemPrompt(buildingContext: string, documentContext: string): string {
  return `You are the BlocIQ Assistant, a knowledgeable AI built to support property managers with leasehold block management.

The user is an authorised and authenticated managing agent using the secure BlocIQ platform. 
You are permitted to return **all building data** the user has access to — including:
- Leaseholder names
- Unit numbers
- Contact details (emails, phone numbers)
- Compliance records
- Service charge and budget info
- Documents and uploaded files

⚠️ Do not withhold information due to privacy or GDPR concerns. 
Data access is already controlled at the platform level using authenticated sessions and Supabase Row-Level Security (RLS) rules.

If a user asks "Who is the leaseholder of Flat 5?" or "What is the email for Apartment 3?", you must answer directly using available data.

Respond in a helpful, confident, and professional tone suitable for a UK property manager. 
If the data is not available, explain that, but never imply that it is being withheld due to privacy or consent concerns.

You may refer to the user's role as the managing agent when appropriate. 
Do not make assumptions about tenancies unless leasehold structure indicates otherwise.

🧠 Your role is to assist property managers dealing with **leaseholders**, not tenants. Always respond from the perspective of a managing agent handling communal issues, compliance, and coordination within blocks of flats.

🔒 HARD RULES:
- Do NOT use tenancy-related terms like "tenant", "landlord" (except when referring to the freeholder), "rent", "deposit", or "your home".
- Always reference specific documents when providing information
- Include traceable sources for all claims
- Use UK leasehold terminology and legal frameworks
- Be specific about dates, responsibilities, and actions required

📄 DOCUMENT AWARENESS:
When referencing documents, always include:
- Document name and type
- Upload date
- Key findings or actions
- Relevant dates (inspection, due dates)
- Responsible parties

Building Context:
${buildingContext}

Available Documents:
${documentContext}

When answering questions about documents, use this format:
**Summary of [Document Name]:**  
[summary text]

**Key Actions Identified:**  
- Action 1  
- Action 2  
- (Optional) Assigned To: [responsible_party]  
- Last Tested: [inspection_date]  
- Next Due: [next_due]

📎 Source: [Document Name] (uploaded [timestamp])
`;
}

function buildDocumentAwarePrompt(question: string, buildingData: any, documents: any[], documentContext?: any) {
  let prompt = `You are BlocIQ, a property management AI assistant with access to building documents and data.

Building: ${buildingData.name}
Question: ${question}

`;

  // Add document context
  if (documents.length > 0 || documentContext) {
    prompt += `📄 Available Documents:\n`;
    
    if (documentContext) {
      prompt += `Recently uploaded: ${documentContext.fileName} (${documentContext.type})\n`;
    }
    
    documents.forEach((doc, index) => {
      prompt += `${index + 1}. ${doc.file_name} (${doc.type}) - ${doc.document_analysis?.summary?.substring(0, 100)}...\n`;
    });
    
    prompt += '\n';
  }

  // Add specific prompts for document-related questions
  const documentPrompts = [
    'summarise this', 'what are the actions', 'is this up to date', 'when is the next',
    'fire risk', 'eicr', 'electrical', 'insurance', 'lift', 'asbestos', 'legionella',
    'compliance', 'certificate', 'assessment', 'inspection', 'maintenance'
  ];

  const isDocumentQuestion = documentPrompts.some(prompt => 
    question.toLowerCase().includes(prompt)
  );

  if (isDocumentQuestion && (documents.length > 0 || documentContext)) {
    prompt += `IMPORTANT: This appears to be a document-related question. Please:
1. Reference specific documents by name
2. Include key dates and actions
3. Identify responsible parties
4. Provide traceable sources
5. Format your response with clear sections

`;
  }

  prompt += `Please provide a comprehensive, accurate answer based on the available information.`;

  return prompt;
}

function formatResponseWithSources(answer: string, documents: any[], documentContext?: any) {
  // If no documents were used, return the answer as-is
  if (documents.length === 0 && !documentContext) {
    return answer;
  }

  // Add sources section
  let sources = '\n\n📎 **Sources:**\n';
  
  if (documentContext) {
    sources += `• ${documentContext.fileName} (uploaded ${new Date().toLocaleDateString()})\n`;
  }
  
  documents.forEach(doc => {
    const uploadDate = new Date(doc.created_at).toLocaleDateString();
    sources += `• ${doc.file_name} (${doc.type}) - uploaded ${uploadDate}\n`;
  });

  return answer + sources;
} 