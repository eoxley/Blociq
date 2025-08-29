// ✅ COMPREHENSIVE PUBLIC AI ENDPOINT [2025-01-22]
// - All comprehensive property management AI features without Supabase data access
// - Complete legacy functionality: notices, letters, compliance, calculations, email responses
// - UK property law expertise and professional document generation
// - No access to building data, leaseholder info, or file uploads
// - Suitable for public demos and landing page trials

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai-client';

// Import comprehensive property management system
import { detectPropertyManagementContext, buildPropertyManagementPrompt, PROPERTY_MANAGEMENT_SYSTEM_PROMPT } from '@/lib/ai/propertyManagementPrompts';

// Enhanced system prompts for public access (no building data)
const PUBLIC_SYSTEM_PROMPT = `${PROPERTY_MANAGEMENT_SYSTEM_PROMPT}

**🔒 PUBLIC ACCESS RESTRICTIONS:**
- NO access to specific building data, leaseholder information, or property records
- NO file upload or document analysis capabilities  
- NO Supabase database queries or building-specific information
- Provide template documents with placeholders: [BUILDING NAME], [LEASEHOLDER NAME], [DATE], etc.
- Focus on general UK property management guidance and professional templates
- All documents and responses should be generic templates suitable for any UK leasehold property

**SECURITY NOTICE:**
This is a public demo version. For specific building data, leaseholder information, and advanced features, users should sign up for the full BlocIQ platform.`;

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

// Legacy functions removed - now using comprehensive property management system

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

    // Use comprehensive property management context detection
    const pmContext = detectPropertyManagementContext(actualQuestion);
    console.log('🔍 Public AI - Property management context detected:', pmContext);
    
    // Build comprehensive system prompt for public access (no building data)
    let finalSystemPrompt = buildPropertyManagementPrompt(pmContext, actualQuestion);
    
    // Replace with public-restricted version
    finalSystemPrompt = PUBLIC_SYSTEM_PROMPT;
    
    // Add leak policy if relevant
    if (pmContext.type === 'leak_triage' || actualQuestion.toLowerCase().includes('leak')) {
      finalSystemPrompt += `\n\n${LEAK_POLICY}`;
    }
    
    // Use original question as enhanced prompt (comprehensive system handles context)
    const enhancedPrompt = actualQuestion;

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

    console.log('✅ Comprehensive Public AI response generated');
    console.log('  - PM Context Type Used:', pmContext.type, pmContext.subtype);
    console.log('  - Response Length:', aiResponse.length);

    return NextResponse.json({ 
      success: true,
      result: aiResponse,
      response: aiResponse, // For backward compatibility
      context_type: pmContext.type,
      building_id: null, // Always null for public endpoint
      document_count: 0, // No documents in public endpoint
      has_email_thread: false, // No email threads in public endpoint
      has_leaseholder: false, // No leaseholder data in public endpoint
      context: {
        propertyManagementType: pmContext.type,
        propertyManagementSubtype: pmContext.subtype,
        complianceUsed: pmContext.type === 'compliance_document',
        majorWorksUsed: pmContext.type === 'calculation' && pmContext.subtype === 'major_works',
        leakTriageUsed: pmContext.type === 'leak_triage',
        emailReplyUsed: pmContext.type === 'email_response',
        noticeGeneration: pmContext.type === 'notice_generation',
        letterDrafting: pmContext.type === 'letter_drafting',
        publicAccess: true
      },
      metadata: {
        contextType: pmContext.type,
        contextSubtype: pmContext.subtype,
        tone: tone,
        isPublic: true,
        isComprehensive: true,
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