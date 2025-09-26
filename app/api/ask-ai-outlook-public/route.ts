import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase/server';

// CORS headers for Outlook Add-in compatibility
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Helper function to create response with CORS headers
function createResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: CORS_HEADERS
  });
}

export async function OPTIONS(req: NextRequest) {
  // Handle preflight requests for Outlook Add-in
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS
  });
}

/**
 * PUBLIC OUTLOOK AI
 *
 * Streamlined AI with intelligent email reply generation but NO access to BlocIQ database.
 * Provides sophisticated property management guidance without building/agency data.
 */
async function handlePublicOutlookAI(req: NextRequest) {
  try {
    console.log('🌐 Public Outlook AI: Processing request');

    const body = await req.json();
    const {
      emailSubject = '',
      emailBody = '',
      senderEmail = '',
      senderName = '',
      requestType = 'reply',
      userEmail,
      tone = 'professional'
    } = body;

    if (!emailBody?.trim()) {
      return createResponse({
        success: false,
        error: 'Email body is required'
      }, 400);
    }

    const userEmailToUse = userEmail || req.headers.get('x-user-email') || 'anonymous@public.com';
    console.log(`📧 Processing ${requestType} for: ${userEmailToUse}`);

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // 🤖 INTELLIGENT ISSUE DETECTION
    console.log('🤖 Analyzing email content for intelligent response...');

    const messageContent = `${emailSubject} ${emailBody}`.toLowerCase();
    const fullQuery = `${emailSubject} ${emailBody}`.trim();
    let primaryIssue = 'general';
    let urgencyLevel = 'medium';
    let responseStyle = 'professional';

    // Advanced issue detection for UK property management
    if (messageContent.includes('leak') || messageContent.includes('water') || messageContent.includes('dripping') || messageContent.includes('flooding')) {
      primaryIssue = 'leak';
      responseStyle = 'urgent_professional';
    } else if (messageContent.includes('noise') || messageContent.includes('loud') || messageContent.includes('music') || messageContent.includes('party')) {
      primaryIssue = 'noise';
      responseStyle = 'diplomatic_firm';
    } else if (messageContent.includes('repair') || messageContent.includes('maintenance') || messageContent.includes('broken') || messageContent.includes('fix')) {
      primaryIssue = 'maintenance';
      responseStyle = 'solution_focused';
    } else if (messageContent.includes('service charge') || messageContent.includes('ground rent') || messageContent.includes('payment') || messageContent.includes('bill')) {
      primaryIssue = 'service_charges';
      responseStyle = 'explanatory_professional';
    } else if (messageContent.includes('parking') || messageContent.includes('car') || messageContent.includes('vehicle') || messageContent.includes('space')) {
      primaryIssue = 'parking';
      responseStyle = 'policy_focused';
    } else if (messageContent.includes('safety') || messageContent.includes('security') || messageContent.includes('dangerous') || messageContent.includes('risk')) {
      primaryIssue = 'safety';
      responseStyle = 'urgent_supportive';
    } else if (messageContent.includes('complaint') || messageContent.includes('dissatisfied') || messageContent.includes('unhappy') || messageContent.includes('problem')) {
      primaryIssue = 'complaint';
      responseStyle = 'empathetic_solution_focused';
    }

    // Urgency and sentiment detection
    if (messageContent.includes('urgent') || messageContent.includes('emergency') || messageContent.includes('immediate')) {
      urgencyLevel = 'high';
    } else if (messageContent.includes('asap') || messageContent.includes('critical') || messageContent.includes('serious')) {
      urgencyLevel = 'critical';
    }

    // Build intelligent system prompt based on issue type and urgency
    let systemPrompt;

    if (requestType === 'chat') {
      systemPrompt = `You are a helpful UK property management AI assistant providing friendly, conversational guidance without access to specific building or leaseholder data.

CHAT MODE - CONVERSATIONAL RESPONSES:
- Respond naturally and conversationally, like a knowledgeable friend
- Be warm, approachable, and helpful
- Provide practical UK property management guidance
- Keep responses concise but informative
- Don't format as emails - just direct, helpful answers

PRIMARY ISSUE: ${primaryIssue}
URGENCY LEVEL: ${urgencyLevel}

CORE PRINCIPLES:
- Provide general UK property management guidance based on industry best practices
- Follow relevant legal frameworks (Housing Act, Landlord & Tenant Act, Leasehold Reform Act)
- Be empathetic and solution-focused
- Guide users to contact their property manager for building-specific matters
- Give practical next steps where appropriate

RESPONSE GUIDELINES BY ISSUE TYPE:`;
    } else {
      systemPrompt = `You are a professional UK property management assistant generating concise, actionable email replies.

EMAIL REPLY MODE - PROFESSIONAL BUT CONCISE:
- Write clear, professional email responses
- Keep replies focused and actionable (200-400 words max)
- Use bullet points for multiple steps
- Be empathetic but efficient
- Focus on immediate next steps rather than extensive explanations
- Include appropriate urgency based on the issue

PRIMARY ISSUE: ${primaryIssue}
URGENCY LEVEL: ${urgencyLevel}
RESPONSE STYLE: ${responseStyle}

CORE PRINCIPLES:
- Provide specific, actionable guidance based on UK property management best practices
- Reference relevant legal frameworks when necessary
- Be solution-focused with clear next steps
- Direct to property manager for building-specific matters
- Include realistic timeframes for actions

RESPONSE GUIDELINES BY ISSUE TYPE:`;
    }

    // Add specific guidance based on issue type
    if (primaryIssue === 'leak') {
      systemPrompt += `
LEAK RESPONSE PROTOCOL:
1. IMMEDIATE ACTION: Contact flat above (if applicable) and check for obvious sources
2. Turn off water supply if source identified in their flat
3. Arrange emergency leak detection if source unclear (24-48 hours)
4. Cost liability: Originating flat responsible (check lease terms)
5. Insurance: Contact insurers if damage extensive
6. Document damage with photos for insurance/property manager`;
    } else if (primaryIssue === 'noise') {
      systemPrompt += `
NOISE COMPLAINT GUIDANCE:
1. Document incidents with dates, times, and nature of noise
2. Attempt direct neighbor communication if appropriate
3. Review lease terms regarding noise and nuisance
4. Consider mediation services if direct contact fails
5. Escalate through proper channels if pattern continues
6. Know statutory nuisance laws and council involvement`;
    } else if (primaryIssue === 'service_charges') {
      systemPrompt += `
SERVICE CHARGE GUIDANCE:
1. Explain transparency requirements under leasehold law
2. Right to demand supporting documentation and receipts
3. Service charge budgets and year-end reconciliation process
4. Consultation requirements for major works (Section 20)
5. Dispute resolution through Property Tribunal if needed
6. Payment obligations and consequences of non-payment`;
    } else if (primaryIssue === 'maintenance') {
      systemPrompt += `
MAINTENANCE REQUEST GUIDANCE:
1. Clarify responsibility (landlord vs leaseholder) based on lease terms
2. Reporting procedures and reasonable timeframes for response
3. Emergency vs non-emergency maintenance prioritization
4. Right to carry out urgent repairs and recover costs if landlord fails
5. Health and safety obligations and regulatory requirements
6. Documentation requirements and follow-up procedures`;
    }

    systemPrompt += `

IMPORTANT LIMITATIONS:
- You do NOT have access to specific building data, lease terms, or leaseholder records
- For building-specific information, direct users to contact their property manager
- Provide general guidance that applies to UK leasehold properties
- Include disclaimers about seeking specific legal or professional advice when appropriate

${requestType === 'chat' ?
  'Generate a helpful, conversational response that addresses their question naturally.' :
  'Generate a helpful, professional response that addresses their concern while being clear about your limitations.'
}`;

    // Create the main prompt based on request type
    let prompt;
    if (requestType === 'chat') {
      // For chat requests, provide conversational responses
      prompt = `${systemPrompt}

CHAT CONVERSATION MODE:
You are responding in a chat interface, NOT generating an email. Respond conversationally and directly to the user's question.

USER QUESTION: ${emailSubject}
${emailBody ? `CONTEXT: ${emailBody}` : ''}

Provide a helpful, conversational response (not an email format):`;
    } else {
      // For email reply requests, generate formal email responses
      prompt = `${systemPrompt}

EMAIL TO RESPOND TO:
Subject: ${emailSubject}
From: ${senderName} (${senderEmail})

${emailBody}

Generate a concise, professional email reply that:
- Acknowledges the urgency appropriately
- Provides 3-4 clear action steps
- Uses bullet points for clarity
- Includes realistic timeframes
- Keeps total length under 300 words
- Focuses on immediate next steps rather than extensive background`;
    }

    // 📚 SEARCH INDUSTRY KNOWLEDGE
    console.log('📚 Searching BlocIQ industry knowledge base...');
    const industryKnowledge = await searchIndustryKnowledge(fullQuery);

    // Add industry knowledge to system prompt if found
    if (industryKnowledge.length > 0) {
      systemPrompt += `

RELEVANT INDUSTRY KNOWLEDGE:
${industryKnowledge.slice(0, 5).join('\n\n')}

Use this BlocIQ industry knowledge to provide more accurate and specific guidance where relevant.`;
      console.log(`✅ Enhanced response with ${industryKnowledge.length} industry knowledge chunks`);
    }

    console.log('🤖 Generating intelligent AI response...');

    // Generate AI response with appropriate temperature based on urgency
    const temperature = urgencyLevel === 'critical' ? 0.3 : urgencyLevel === 'high' ? 0.5 : 0.7;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt
        }
      ],
      max_tokens: requestType === 'chat' ?
        (urgencyLevel === 'critical' ? 600 : urgencyLevel === 'high' ? 500 : 400) :
        (urgencyLevel === 'critical' ? 800 : urgencyLevel === 'high' ? 700 : 600),
      temperature: temperature,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response generated from AI');
    }

    console.log('✅ Public Outlook AI: Response generated successfully');

    // Return response with metadata
    return createResponse({
      success: true,
      response: aiResponse,
      metadata: {
        version: 'public-v1.0',
        source: 'Public Outlook AI - Streamlined Intelligence',
        processing: {
          primaryIssue,
          urgencyLevel,
          responseStyle,
          temperatureUsed: temperature,
          maxTokens: requestType === 'chat' ?
            (urgencyLevel === 'critical' ? 600 : urgencyLevel === 'high' ? 500 : 400) :
            (urgencyLevel === 'critical' ? 800 : urgencyLevel === 'high' ? 700 : 600)
        },
        limitations: [
          'No access to BlocIQ database',
          'No building-specific information',
          'General UK property management guidance only'
        ],
        industryKnowledgeUsed: industryKnowledge.length,
        tokens: completion.usage?.total_tokens || 0,
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('❌ Public Outlook AI Error:', error);
    return createResponse({
      success: false,
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}

// Search industry knowledge function
async function searchIndustryKnowledge(query: string, limit: number = 8): Promise<string[]> {
  try {
    console.log('🔍 Searching industry knowledge for:', query.substring(0, 50));

    const supabase = createServiceClient();

    // Extract key terms from the query for better matching
    const keyTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 3)
      .slice(0, 5) // Use top 5 key terms
      .join('|');

    const { data: chunks, error } = await supabase
      .from('industry_knowledge_chunks')
      .select(`
        chunk_text,
        industry_knowledge_documents!inner(
          title,
          category,
          subcategory
        )
      `)
      .or(`chunk_text.ilike.%${query.split(' ')[0]}%,chunk_text.ilike.%${query.split(' ').slice(-1)[0]}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Industry knowledge search error:', error);
      return [];
    }

    if (!chunks || chunks.length === 0) {
      console.log('No industry knowledge chunks found for query');
      return [];
    }

    const relevantChunks = chunks
      .filter(chunk => chunk.chunk_text && chunk.chunk_text.length > 50)
      .map(chunk => {
        const doc = chunk.industry_knowledge_documents;
        return `**${doc.category} Knowledge**: ${chunk.chunk_text.trim()}`;
      });

    console.log(`✅ Found ${relevantChunks.length} industry knowledge chunks`);
    return relevantChunks;

  } catch (error) {
    console.error('Error searching industry knowledge:', error);
    return [];
  }
}

export const POST = handlePublicOutlookAI;