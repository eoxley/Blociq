// ✅ ENHANCED PUBLIC AI ENDPOINT [2025-01-22]
// - All main Ask AI features without Supabase data access
// - Advanced context types and tone control
// - Professional property management expertise
// - Leak triage policy and specialized knowledge
// - Suitable for landing page trials

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai-client';

// Enhanced system prompts for different context types (without building data)
const SYSTEM_PROMPTS = {
  general: `You are BlocIQ, a UK property management AI assistant. You help property managers with building management, compliance, leaseholder relations, and operational tasks. Provide expert advice based on UK property management best practices and regulations.`,
  
  email_reply: `You are BlocIQ, a UK property management AI assistant specializing in professional email communication. Generate clear, professional email responses that are appropriate for property management. Use British English and maintain a professional tone.`,
  
  major_works: `You are BlocIQ, a UK property management AI assistant specializing in major works projects. Help with project planning, cost analysis, leaseholder consultation, and Section 20 processes. Provide guidance on UK building regulations and best practices.`,
  
  public: `You are BlocIQ, a helpful AI assistant for UK property management. Provide general advice about property management, compliance, and best practices. Keep responses informative but not building-specific. Focus on UK regulations and industry standards.`,
  
  compliance: `You are BlocIQ, a UK property management AI assistant specializing in compliance and regulatory matters. Help with health and safety, fire safety, building regulations, and compliance tracking. Reference UK building regulations and safety standards.`,
  
  leaseholder: `You are BlocIQ, a UK property management AI assistant specializing in leaseholder relations. Help with communication, service charge queries, maintenance requests, and leaseholder support. Provide guidance on UK leasehold law and best practices.`
};

// Leak triage policy for public users (same as main system)
const LEAK_POLICY = `
You must follow BlocIQ's leak triage policy for UK long-lease blocks:

1) Demised vs Communal:
   - "Demised" = within a leaseholder's property (e.g., internal pipework/appliances/fixtures up to their demise). 
   - "Communal" = roofs, communal risers/stacks, structure, external walls, common pipes before they branch to a private demise.
   - If the ceiling is below another flat, assume "likely demised above" unless clear evidence indicates roof/communal.

2) First step – flat-to-flat:
   - Ask the reporting leaseholder to make contact with the flat above to attempt a quick local check/stop (e.g., stop taps, appliance checks).
   - If they cannot contact or it doesn't resolve, proceed to investigations.

3) Investigations (if unresolved or origin unknown):
   - Arrange non-invasive leak detection/plumber attendance with BOTH parties informed and consenting to access windows.
   - Make clear in writing that costs will be recharged to the responsible party if the source is demised; if communal, costs fall to the block.

4) Cost liability:
   - If the source is found within a demise (private pipework/fixture), the responsible leaseholder is liable for detection and repairs.
   - If the source is communal (e.g., roof/communal stack), the block/communal budget handles repairs.

5) Insurance / excess:
   - If the expected repair/damage costs are likely to exceed the building policy excess, consider a block insurance claim.
   - In such cases it is normal for the responsible party (flat of origin) to cover the policy excess; the insurer handles the works.
   - If below the excess, costs are private and recharged as above.

6) Communications & tone:
   - Use British English.
   - Be clear, neutral, and practical. Avoid legal overreach; refer to the lease as the primary authority.
   - DO NOT cite "Leasehold Property Act 2002 s.11". If you mention legislation at all, note that LTA 1985 s.11 applies to short tenancies, not long-leasehold service obligations; rely on the lease terms.

When preparing an email to the reporting leaseholder and (if relevant) the upstairs leaseholder:
- Include flat-to-flat first step.
- Explain investigation process + consent.
- State cost responsibility rules (demised vs communal).
- Mention insurance-excess option when likely beneficial.
`;

// Enhanced context detection for public users
function detectContextType(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('leak') || lowerPrompt.includes('water') || lowerPrompt.includes('damp') || lowerPrompt.includes('ceiling')) {
    return 'leak_triage';
  }
  
  if (lowerPrompt.includes('email') || lowerPrompt.includes('reply') || lowerPrompt.includes('response') || lowerPrompt.includes('draft')) {
    return 'email_reply';
  }
  
  if (lowerPrompt.includes('major works') || lowerPrompt.includes('section 20') || lowerPrompt.includes('project') || lowerPrompt.includes('construction')) {
    return 'major_works';
  }
  
  if (lowerPrompt.includes('compliance') || lowerPrompt.includes('safety') || lowerPrompt.includes('fire') || lowerPrompt.includes('regulation')) {
    return 'compliance';
  }
  
  if (lowerPrompt.includes('leaseholder') || lowerPrompt.includes('tenant') || lowerPrompt.includes('service charge') || lowerPrompt.includes('maintenance')) {
    return 'leaseholder';
  }
  
  return 'general';
}

// Enhanced prompt building for public users
function buildEnhancedPrompt(userPrompt: string, contextType: string, tone: string = 'Professional'): string {
  let enhancedPrompt = userPrompt;
  
  // Add context-specific enhancements
  switch (contextType) {
    case 'leak_triage':
      enhancedPrompt += `\n\nPlease provide guidance following BlocIQ's leak triage policy for UK long-lease blocks.`;
      break;
      
    case 'email_reply':
      enhancedPrompt += `\n\nPlease draft a professional email response appropriate for UK property management. Use a ${tone.toLowerCase()} tone.`;
      break;
      
    case 'major_works':
      enhancedPrompt += `\n\nPlease provide guidance on UK major works projects, including Section 20 processes and best practices.`;
      break;
      
    case 'compliance':
      enhancedPrompt += `\n\nPlease provide guidance on UK building compliance, regulations, and best practices.`;
      break;
      
    case 'leaseholder':
      enhancedPrompt += `\n\nPlease provide guidance on UK leaseholder relations, service charges, and maintenance best practices.`;
      break;
  }
  
  return enhancedPrompt;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      prompt: userPrompt,
      question, // Keep for backward compatibility
      context_type: contextType = 'general',
      tone = 'Professional',
      building_id = null, // Ignored for public endpoint
      is_public = true // Always true for this endpoint
    } = body;

    const actualQuestion = userPrompt || question;

    if (!actualQuestion) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log('🤖 Enhanced Public AI request:', actualQuestion.substring(0, 100) + '...');
    console.log('  - Context Type:', contextType);
    console.log('  - Tone:', tone);
    console.log('  - Is Public:', is_public);

    // Auto-detect context type if not specified
    const detectedContextType = contextType === 'general' ? detectContextType(actualQuestion) : contextType;
    
    // Get appropriate system prompt
    const systemPrompt = SYSTEM_PROMPTS[detectedContextType as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.general;
    
    // Add leak policy if relevant
    let finalSystemPrompt = systemPrompt;
    if (detectedContextType === 'leak_triage' || actualQuestion.toLowerCase().includes('leak')) {
      finalSystemPrompt += `\n\n${LEAK_POLICY}`;
    }
    
    // Build enhanced user prompt
    const enhancedPrompt = buildEnhancedPrompt(actualQuestion, detectedContextType, tone);

    // Initialize OpenAI client
    const openai = getOpenAIClient();

    // Call OpenAI with enhanced parameters
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: enhancedPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500, // Increased to match main system
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';

    console.log('✅ Enhanced Public AI response generated');
    console.log('  - Context Type Used:', detectedContextType);
    console.log('  - Response Length:', aiResponse.length);

    return NextResponse.json({ 
      success: true,
      result: aiResponse,
      response: aiResponse, // For backward compatibility
      context_type: detectedContextType,
      building_id: null, // Always null for public endpoint
      document_count: 0, // No documents in public endpoint
      has_email_thread: false, // No email threads in public endpoint
      has_leaseholder: false, // No leaseholder data in public endpoint
      context: {
        complianceUsed: detectedContextType === 'compliance',
        majorWorksUsed: detectedContextType === 'major_works',
        leakTriageUsed: detectedContextType === 'leak_triage',
        emailReplyUsed: detectedContextType === 'email_reply',
        publicAccess: true
      },
      metadata: {
        contextType: detectedContextType,
        tone: tone,
        isPublic: true,
        enhancedPrompt: enhancedPrompt
      }
    });

  } catch (error) {
    console.error('❌ Error in enhanced public ask-ai route:', error);
    return NextResponse.json({ 
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 