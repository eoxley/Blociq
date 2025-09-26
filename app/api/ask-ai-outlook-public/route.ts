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

    // For chat mode, allow empty email body (use subject as the question)
    if (!emailBody?.trim() && !emailSubject?.trim()) {
      return createResponse({
        success: false,
        error: 'Either email subject or body is required'
      }, 400);
    }

    const userEmailToUse = userEmail || req.headers.get('x-user-email') || 'anonymous@public.com';
    console.log(`📧 Processing ${requestType} for: ${userEmailToUse}`);

    // 👤 EXTRACT FIRST NAME FOR PERSONALIZATION
    let userFirstName = '';
    try {
      if (userEmailToUse && userEmailToUse !== 'anonymous@public.com') {
        // Try to extract first name from email prefix (common pattern: firstname.lastname@domain.com)
        const emailPrefix = userEmailToUse.split('@')[0];
        const nameParts = emailPrefix.split(/[._-]/);

        if (nameParts.length > 0) {
          // Capitalize first letter of first name part
          userFirstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();

          // Validate it looks like a name (not numbers or too short)
          if (userFirstName.length < 2 || /^\d+$/.test(userFirstName)) {
            userFirstName = '';
          }
        }
      }
    } catch (error) {
      console.log('Could not extract first name from email');
      userFirstName = '';
    }

    console.log(`👤 Extracted first name: ${userFirstName || 'none'}`);

    // 📝 EXPANDED PERSONALIZED GREETING BANK
    const personalizedGreetings = userFirstName ? [
      // Direct and warm
      `Hi ${userFirstName}, great question about`,
      `Hello ${userFirstName}, I'm glad you asked about`,
      `${userFirstName}, excellent question regarding`,
      `Good to hear from you, ${userFirstName}!`,
      `Hi there ${userFirstName}, this is a really important topic...`,

      // Experience-based openings
      `${userFirstName}, I've dealt with this situation many times...`,
      `In my experience, ${userFirstName}, this type of issue...`,
      `I've encountered this before, ${userFirstName}, and here's what I've learned...`,
      `${userFirstName}, from my years in block management...`,
      `Having handled similar cases, ${userFirstName}, I can share that...`,
      `${userFirstName}, I've navigated this challenge multiple times...`,
      `Based on my experience, ${userFirstName}, this usually...`,

      // Professional colleague acknowledgment
      `Thanks for reaching out, ${userFirstName}. This is a common challenge in our field...`,
      `Good to hear from a fellow property professional, ${userFirstName}...`,
      `${userFirstName}, that's an important consideration for any block manager...`,
      `I appreciate you bringing this up, ${userFirstName}...`,
      `${userFirstName}, this is definitely worth discussing among colleagues...`,
      `Thanks for bringing this to the group, ${userFirstName}...`,
      `${userFirstName}, I'm glad we can discuss this professionally...`,
      `Good thinking on this topic, ${userFirstName}...`,

      // Understanding and empathy
      `I completely understand this concern, ${userFirstName}...`,
      `${userFirstName}, this is exactly the kind of challenge we face...`,
      `You're absolutely right to ask about this, ${userFirstName}...`,
      `${userFirstName}, I can see why this would be on your mind...`,
      `That's a really relevant question, ${userFirstName}...`,
      `${userFirstName}, you've touched on something really important here...`,
      `I hear you on this one, ${userFirstName}...`,

      // Frequency and commonality
      `${userFirstName}, this comes up frequently in property management...`,
      `I've seen this scenario quite often, ${userFirstName}...`,
      `${userFirstName}, this is something I deal with regularly...`,
      `This situation arises more than you'd think, ${userFirstName}...`,
      `${userFirstName}, I encounter this type of query regularly...`,
      `You're not alone in facing this, ${userFirstName}...`,

      // Professional expertise sharing
      `Let me share my experience with this, ${userFirstName}...`,
      `${userFirstName}, I can offer some insights from my practice...`,
      `From a colleague to colleague, ${userFirstName}, here's what I've found...`,
      `${userFirstName}, let me walk you through how I typically approach this...`,
      `I'd be happy to share my approach with you, ${userFirstName}...`,
      `${userFirstName}, here's what I've learned works best...`,

      // Smart/thoughtful acknowledgment
      `That's a smart question to ask, ${userFirstName}...`,
      `${userFirstName}, you're thinking about this the right way...`,
      `I appreciate you being proactive about this, ${userFirstName}...`,
      `${userFirstName}, that shows good professional thinking...`,
      `You're asking the right questions, ${userFirstName}...`,
      `${userFirstName}, I like that you're considering this carefully...`,

      // Collaborative tone
      `Let's tackle this together, ${userFirstName}...`,
      `${userFirstName}, this is exactly the kind of challenge we should discuss...`,
      `I'm happy to help you work through this, ${userFirstName}...`,
      `${userFirstName}, let's explore this issue together...`,
      `Between colleagues, ${userFirstName}, here's how I'd approach it...`,
      `${userFirstName}, I'm here to help with this one...`
    ] : [];

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

    // 🏢 BUILDING-SPECIFIC QUERY DETECTION - STRICT PATTERNS ONLY
    // Only flag as building-specific if asking for actual building/person data
    const isBuildingSpecificQuery = (
      // Direct person/contact queries
      /who is (the )?(leaseholder|tenant|resident|owner) (of|in|at)/i.test(messageContent) ||
      /who lives in (flat|apartment|unit)/i.test(messageContent) ||
      /who owns (flat|apartment|unit)/i.test(messageContent) ||

      // Contact details requests
      /(contact details|phone number|email address) (for|of) (the )?(leaseholder|tenant|resident)/i.test(messageContent) ||

      // Specific address patterns with person queries
      /\d+\s+\w+\s+(house|court|road|street|avenue|close|place|way).*who/i.test(messageContent) ||
      /(flat|apartment|unit)\s+\d+.*who/i.test(messageContent) ||
      /\d+\s+(flat|apartment|unit).*who/i.test(messageContent) ||

      // Specific building document requests (with building name)
      /ews1.*for.*(house|court|building|block)/i.test(messageContent) ||
      /(fire certificate|building certificate).*for.*(house|court|building|block)/i.test(messageContent) ||

      // Specific service charge/lease queries for named properties
      /(service charge|lease).*(for|at|in).*(house|court|building|block)/i.test(messageContent)
    );

    console.log('🔍 Building query detection:', {
      query: messageContent.substring(0, 80),
      isBuildingSpecificQuery
    });


    // Advanced issue detection for UK property management (but don't override building-specific queries)
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

    // 🏢 Final check: Override with building-specific if detected (takes priority)
    if (isBuildingSpecificQuery) {
      primaryIssue = 'building_specific_upgrade';
      console.log('🏢 ✅ FINAL: Setting primaryIssue to building_specific_upgrade');
    }

    // Build intelligent system prompt based on issue type and urgency
    let systemPrompt;

    if (requestType === 'chat') {
      if (primaryIssue === 'building_specific_upgrade') {
        systemPrompt = `🚨 CRITICAL: This query asks for specific building/leaseholder data.

You MUST respond EXACTLY with:

"I'm sorry, but your account doesn't have building data linked to BlocIQ, so I cannot help you with specific property information like leaseholder details, unit-specific records, or building documents.

To access your building's data, leaseholder information, maintenance records, and documents, consider upgrading to Pro BlocIQ which provides full access to your buildings, leaseholders, and property management documents.

For immediate assistance with specific property queries, please contact your property manager directly.

Is there anything else about general UK property management that I can help you with?"

Do NOT suggest Land Registry or alternative methods. Use this exact response.`;
      } else {
        systemPrompt = `You are a senior block manager and property management expert responding to queries from fellow property management professionals through BlocIQ. The user asking questions is ALSO a block manager seeking professional advice and guidance from a colleague.

CHAT MODE - COLLEAGUE-TO-COLLEAGUE RESPONSES:
- Respond as an experienced property management colleague sharing expertise
- Use language like "In my experience...", "I typically handle this by...", "What I've found works well is...", "I'd recommend..."
- Share practical insights and proven approaches from your professional experience
- Acknowledge their professional expertise while offering guidance

PRIMARY ISSUE: ${primaryIssue}
URGENCY LEVEL: ${urgencyLevel}

VARIED PROFESSIONAL OPENINGS (select different ones):
${personalizedGreetings.length > 0 ? `
PERSONALIZED OPTIONS (use these when available):
${personalizedGreetings.map(greeting => `- "${greeting}"`).join('\n')}

GENERAL OPTIONS (if no personalization):` : 'GENERAL OPTIONS:'}
- "Great question about [topic]..."
- "I've dealt with this situation many times..."
- "This is a common challenge in our field..."
- "In my experience managing similar properties..."
- "That's an important consideration for any block manager..."
- "I completely understand this concern..."
- "This comes up frequently in property management..."
- "Good to hear from a fellow property professional..."
- "I've encountered this issue before..."
- "That's a really relevant question..."
- "From my years in block management..."
- "I'm glad you asked about this..."
- "This is definitely worth discussing..."
- "I've seen this scenario quite often..."
- "That's a smart question to ask..."
- "Thanks for bringing this up..."
- "I appreciate you reaching out about this..."
- "This is something I deal with regularly..."
- "Good thinking on this topic..."
- "I've handled similar situations..."
- "Excellent question regarding..."
- "This is exactly the type of issue we need to discuss..."
- "I'm happy to share my experience with this..."
- "That's a really professional approach to..."
- "You're absolutely right to consider..."
- "I can definitely help you navigate this..."
- "This scenario comes up more often than you'd think..."
- "From a colleague's perspective..."
- "Let me share what I've learned about..."
- "I appreciate you bringing this professional challenge forward..."
- "This is a smart consideration for any block manager..."
- "You're thinking about this the right way..."
- "I've navigated this type of situation before..."
- "That's exactly the kind of proactive thinking we need..."
- "I can offer some insights from my practice..."
- "This is definitely worth exploring together..."
- "You've touched on something really important here..."
- "I'm glad we can discuss this professionally..."
- "From my experience in the field..."
- "That shows good professional judgment..."
- "I hear you on this challenge..."
- "You're asking all the right questions..."
- "Let me walk you through my typical approach..."
- "I'd be happy to share how I handle this..."
- "Between property professionals..."
- "This is exactly why we need to stay connected as colleagues..."

COLLEAGUE GUIDANCE PRINCIPLES:
- Share expertise from your professional property management experience
- Use colleague language: "In my practice, I find that...", "What works well for me is...", "I typically approach this by...", "My go-to method is..."
- Follow relevant legal frameworks (Housing Act, Landlord & Tenant Act, Leasehold Reform Act)
- Provide practical approaches you use in your own practice
- Never suggest "contacting property managers" - they ARE property managers seeking colleague advice
- Give proven techniques and best practices from your experience
- Acknowledge their professional expertise while sharing yours
- Use collaborative language: "Let's think through this...", "You might find this approach helpful...", "Here's what I've learned..."
- Reference shared professional challenges: "We all face this...", "It's one of those situations we deal with...", "As you know from your own experience..."

RESPONSE GUIDELINES BY ISSUE TYPE:`;
      }
    } else {
      if (primaryIssue === 'building_specific_upgrade') {
        systemPrompt = `🏢 BUILDING-SPECIFIC EMAIL REPLY: Generate professional response using industry knowledge with placeholders for missing building data.

EMAIL REPLY FOR BUILDING-SPECIFIC QUERIES:
- Generate a helpful, professional email reply using BlocIQ industry knowledge and building documents
- Use placeholders like [Building Name], [Leaseholder Name], [Specific Details] for missing information
- Provide contextually accurate information based on UK property management best practices
- Include actionable next steps and realistic timelines
- Reference relevant regulations and compliance requirements where applicable
- Maintain professional property management tone

PLACEHOLDERS TO USE:
- [Building Name] for property references
- [Leaseholder/Resident Name] for specific individuals
- [Flat/Unit Number] for specific unit references
- [Property Management Company] for management references
- [Relevant Documentation] for specific documents/records
- [Date/Timeline] for specific scheduling
- [Contact Details] for missing contact information

APPROACH:
1. Use the BlocIQ industry knowledge to provide accurate, contextual guidance
2. Address the specific query with professional expertise
3. Use placeholders only where building-specific data is required
4. Provide helpful next steps and relevant regulatory information
5. Include appropriate disclaimers about verification of specific details

Generate a knowledgeable, professional email response that leverages BlocIQ's industry expertise while using placeholders for missing building-specific data.`;
      } else {
        systemPrompt = `You are a professional block manager/property manager responding to resident emails through BlocIQ.

BLOCK MANAGER PERSPECTIVE - RESPONDING AS THEIR PROPERTY MANAGER:
- You are the recipient of this email and you need to provide a professional response
- Respond as the responsible block manager who will take action
- MAXIMUM 200 words - residents want quick, decisive responses
- Acknowledge the issue and confirm what you will do about it
- Provide specific next steps YOU will take as their property manager
- Include realistic timeframes for your actions
- Be professional but reassuring

PRIMARY ISSUE: ${primaryIssue}
URGENCY LEVEL: ${urgencyLevel}
RESPONSE STYLE: ${responseStyle}

BLOCK MANAGER RESPONSE STYLE:
- "Thank you for reporting this [issue]. I understand the urgency..."
- "I will arrange [specific action] within [timeframe]"
- "Our contractor will contact you within [timeframe] to arrange access"
- "I will investigate this matter and update you by [date]"
- Use first person: "I will..." not "You should..."
- Take ownership of the problem as their property manager

RESPONSE GUIDELINES BY ISSUE TYPE:`;
      }
    }

    // Add specific guidance based on issue type (skip building_specific as it's handled above)
    if (primaryIssue === 'leak') {
      systemPrompt += `
BLOCK MANAGER LEAK RESPONSE PROTOCOL:
Respond as the block manager taking immediate action:

IMMEDIATE RESPONSE AS BLOCK MANAGER:
- "Thank you for reporting this urgent leak. I understand the severity of water damage."
- "I will immediately contact our emergency contractor to investigate the source"
- "I will also reach out to the flat above to check for any obvious issues"
- "Our contractor will contact you within 2 hours to arrange emergency access"

ACTION STEPS I WILL TAKE:
1. IMMEDIATE (within 1 hour):
   - Contact emergency plumber/leak detection service
   - Attempt contact with flat above resident
   - Arrange emergency access if needed

2. NEXT STEPS (within 24 hours):
   - Full leak investigation and temporary repairs
   - Insurance claim initiation if extensive damage
   - Coordinate with all affected residents

3. FOLLOW-UP:
   - Daily updates until resolved
   - Permanent repair scheduling
   - Cost recovery from responsible party

Use professional, reassuring tone that takes ownership of the problem.`;
    } else if (primaryIssue === 'noise') {
      systemPrompt += `
BLOCK MANAGER NOISE COMPLAINT RESPONSE:
Respond as the block manager who will investigate and take action:

IMMEDIATE RESPONSE AS BLOCK MANAGER:
- "Thank you for bringing this noise issue to my attention"
- "I take noise complaints very seriously as they affect residents' quality of life"
- "I will investigate this matter and take appropriate action"

ACTION STEPS I WILL TAKE:
1. IMMEDIATE (within 48 hours):
   - Contact the resident in question to discuss the issue
   - Review lease terms regarding noise and quiet enjoyment
   - Document the complaint formally

2. FOLLOW-UP ACTIONS (within 1 week):
   - Send formal reminder letter if needed
   - Provide noise guidelines to all residents
   - Monitor the situation with regular check-ins

3. ESCALATION IF NEEDED:
   - Formal breach of lease proceedings
   - Collaboration with council Environmental Health
   - Legal action as last resort

I will keep you updated throughout this process and aim for resolution within 2-3 weeks.`;
    } else if (primaryIssue === 'service_charges') {
      systemPrompt += `
BLOCK MANAGER SERVICE CHARGE RESPONSE:
Respond as the block manager addressing service charge queries:

IMMEDIATE RESPONSE AS BLOCK MANAGER:
- "Thank you for your query regarding service charges"
- "I understand the importance of transparency in service charge management"
- "I will provide you with the detailed information you've requested"

ACTION STEPS I WILL TAKE:
1. IMMEDIATE (within 5 working days):
   - Provide itemised breakdown of current year's charges
   - Send supporting invoices and receipts as requested
   - Explain any significant variations from previous years

2. ADDITIONAL INFORMATION I CAN PROVIDE:
   - 3 years of historical accounts (Section 21 entitlement)
   - Details of any major works consultations undertaken
   - Insurance policy details and any commission arrangements

3. MEETING IF NEEDED:
   - I'm available to meet and discuss any concerns in detail
   - Annual service charge presentation to all residents
   - Individual consultations for complex queries

I aim to maintain full transparency and will ensure all charges are reasonable and properly supported by documentation.`;
    } else if (primaryIssue === 'maintenance') {
      systemPrompt += `
BLOCK MANAGER MAINTENANCE RESPONSE:
Respond as the block manager who will arrange repairs:

IMMEDIATE RESPONSE AS BLOCK MANAGER:
- "Thank you for reporting this maintenance issue"
- "I will assess the urgency and arrange appropriate repairs"
- "I'll ensure this is resolved as quickly as possible"

ACTION STEPS I WILL TAKE:
1. ASSESSMENT (within 24-48 hours):
   - Determine if this is building or leaseholder responsibility
   - Arrange inspection if the issue is unclear
   - Prioritise based on safety/urgency

2. REPAIR ARRANGEMENTS:
   - Emergency repairs: Contractor contacted within 4 hours
   - Urgent repairs: Arranged within 7 days
   - Routine repairs: Scheduled within 30 days

3. COMMUNICATION:
   - I will confirm repair appointment times with you
   - Provide cost estimates for any leaseholder-responsible items
   - Keep you updated on progress throughout

I'll ensure all work meets building standards and is completed by qualified contractors. You'll receive confirmation once repairs are complete.`;
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

Generate a professional email reply as the block manager that:
- Opens with acknowledgment: "Thank you for bringing this to my attention..."
- Confirms what actions YOU (as block manager) will take
- Uses first person: "I will arrange..." "I will contact..." "I will investigate..."
- Provides specific timeframes for YOUR actions
- Maximum 200 words total
- Ends with commitment and next communication timeline`;
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
    console.log('🔍 Searching industry knowledge from Storage for:', query.substring(0, 50));

    const supabase = createServiceClient();

    // Extract multiple search terms for broader matching
    const searchTerms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 6); // Use top 6 key terms

    console.log('🔍 Search terms:', searchTerms);

    // Strategy 1: Search building_documents table with OCR content for industry knowledge
    let chunks: string[] = [];

    if (searchTerms.length > 0) {
      const searchConditions = searchTerms
        .map(term => `ocr_text.ilike.%${term}%`)
        .join(',');

      const { data: results1, error: error1 } = await supabase
        .from('building_documents')
        .select('name, ocr_text, category, type')
        .or(searchConditions)
        .not('ocr_text', 'is', null)
        .limit(limit)
        .order('uploaded_at', { ascending: false });

      if (results1 && results1.length > 0) {
        console.log(`✅ Found ${results1.length} industry documents with relevant content`);

        chunks = results1.map(doc => {
          // Extract relevant portions of the OCR text that contain our search terms
          const text = doc.ocr_text || '';
          const sentences = text.split(/[.!?]+/);
          const relevantSentences = sentences.filter(sentence =>
            searchTerms.some(term =>
              sentence.toLowerCase().includes(term)
            )
          ).slice(0, 3); // Get first 3 relevant sentences

          if (relevantSentences.length > 0) {
            return `From ${doc.name} (${doc.category || doc.type}): ${relevantSentences.join('. ')}`;
          } else {
            // Fallback to first 200 characters
            return `From ${doc.name} (${doc.category || doc.type}): ${text.substring(0, 200)}...`;
          }
        }).filter(chunk => chunk.length > 50); // Only include substantial chunks

      } else if (error1) {
        console.warn('Strategy 1 search error:', error1);
      }
    }

    // Strategy 2: If no results, try broader category-based search
    if (chunks.length === 0) {
      const categorySearchTerms = ['leasehold', 'section', 'act', 'law', 'regulation', 'reform', 'management'];
      const relevantCategory = categorySearchTerms.find(cat =>
        query.toLowerCase().includes(cat)
      );

      if (relevantCategory) {
        console.log('🔍 Trying category search for:', relevantCategory);
        const { data: results2, error: error2 } = await supabase
          .from('building_documents')
          .select('name, ocr_text, category, type')
          .ilike('ocr_text', `%${relevantCategory}%`)
          .not('ocr_text', 'is', null)
          .limit(limit)
          .order('uploaded_at', { ascending: false });

        if (results2 && results2.length > 0) {
          console.log(`✅ Strategy 2 found ${results2.length} category-based documents`);

          chunks = results2.map(doc => {
            const text = doc.ocr_text || '';
            const sentences = text.split(/[.!?]+/);
            const relevantSentences = sentences.filter(sentence =>
              sentence.toLowerCase().includes(relevantCategory)
            ).slice(0, 3);

            if (relevantSentences.length > 0) {
              return `From ${doc.name} (${doc.category || doc.type}): ${relevantSentences.join('. ')}`;
            } else {
              return `From ${doc.name} (${doc.category || doc.type}): ${text.substring(0, 200)}...`;
            }
          }).filter(chunk => chunk.length > 50);

        } else if (error2) {
          console.warn('Strategy 2 search error:', error2);
        }
      }
    }

    // Strategy 3: If still no results, get some general property management content
    if (chunks.length === 0) {
      console.log('🔍 Trying general property management search');
      const { data: results3, error: error3 } = await supabase
        .from('industry_knowledge_chunks')
        .select(`
          chunk_text,
          industry_knowledge_documents!inner(
            title,
            category,
            subcategory
          )
        `)
        .limit(4)
        .order('created_at', { ascending: false });

      if (results3 && results3.length > 0) {
        chunks = results3;
        console.log(`✅ Strategy 3 found ${results3.length} general chunks`);
      } else if (error3) {
        console.warn('Strategy 3 search error:', error3);
      }
    }

    if (!chunks || chunks.length === 0) {
      console.log('❌ No industry knowledge chunks found after all strategies');
      return [];
    }

    const relevantChunks = chunks
      .filter(chunk => chunk.chunk_text && chunk.chunk_text.length > 20)
      .map(chunk => {
        const doc = chunk.industry_knowledge_documents;
        return `**${doc.category} Knowledge**: ${chunk.chunk_text.trim()}`;
      })
      .slice(0, limit);

    console.log(`✅ Final result: ${relevantChunks.length} industry knowledge chunks`);
    return relevantChunks;

  } catch (error) {
    console.error('Error searching industry knowledge:', error);
    return [];
  }
}

export const POST = handlePublicOutlookAI;