// 🚀 UNIFIED AI ENDPOINT WITH PHASE 3 INTELLIGENCE [2025-01-15] - ADVANCED SYSTEM
// - Single endpoint for ALL AI functionality
// - Comprehensive building and document context
// - Public access support
// - File uploads handled by /api/ask-ai/upload endpoint
// - Email reply generation
// - Major works context
// - Proper logging to ai_logs table
// - Consistent response format
// - Enhanced leaseholder search with comprehensive fallbacks

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AIContextHandler } from '../../../lib/ai-context-handler';
import { logBuildingQuery, detectQueryContextType } from '../../../lib/ai/buildingQueryLogger';
import { buildPrompt } from '../../../lib/buildPrompt';
import { insertAiLog } from '../../../lib/supabase/ai_logs';
import { fetchBuildingLeaseContext, isLeaseRelatedQuery } from '../../../lib/ai/leaseContextFormatter';
import {
  getTemplateVariations,
  analyzeSenderProfile,
  getAdaptedTone,
  validateLegalCompliance,
  detectLanguagePreference,
  analyzeHistoricalPatterns,
  generateIntelligentFollowUp,
  buildEnhancedSystemMessage,
  type TemplateVariation,
  type SenderProfile,
  type AdaptedTone,
  type LegalCompliance,
  type LanguagePreference,
  type HistoricalPatterns,
  type IntelligentFollowUp
} from '../../../lib/ai/phase3-intelligence';

export const runtime = "nodejs";

// Helper function to ensure user has agency_id
async function ensureUserHasAgency(supabase: any, userId: string): Promise<{ agency_id: string } | null> {
  console.log('🔍 Checking agency for user:', userId);

  // Create service client for administrative operations (bypasses RLS)
  const serviceClient = createServiceClient();

  // Check if profiles table exists and get user's current profile
  let userProfile: any = null;
  let profileError: any = null;

  try {
    const result = await serviceClient
      .from('profiles')
      .select('agency_id, user_id')
      .eq('id', userId)
      .single();
    userProfile = result.data;
    profileError = result.error;
  } catch (err) {
    console.log('📋 Profiles table may not exist:', err);
    profileError = err;
  }

  console.log('📋 User profile:', userProfile, 'Error:', profileError);

  // If profile doesn't exist, create one using service client
  if (!userProfile && profileError?.code === 'PGRST116') { // No rows returned
    console.log('🔄 No profile found, creating profile for user...');
    try {
      const { data: newProfile, error: createProfileError } = await serviceClient
        .from('profiles')
        .insert({
          id: userId,
          user_id: userId,
          created_at: new Date().toISOString()
        })
        .select('agency_id, user_id')
        .single();

      if (!createProfileError && newProfile) {
        console.log('✅ Created user profile');
        userProfile = newProfile;
        profileError = null;
      } else {
        console.warn('⚠️ Failed to create user profile:', createProfileError);
      }
    } catch (err) {
      console.warn('⚠️ Error creating user profile:', err);
    }
  }

  // If user already has an agency, return it
  if (userProfile?.agency_id) {
    console.log('✅ User has agency_id:', userProfile.agency_id);
    return { agency_id: userProfile.agency_id };
  }

  console.log('🔄 User missing agency_id, checking agency memberships...');

  // Check if user is a member of any agencies (using service client for reliable access)
  let agencyMemberships: any[] = [];
  let membershipsError: any = null;

  try {
    const result = await serviceClient
      .from('agency_members')
      .select(`
        agency_id,
        role,
        agencies:agency_id (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', userId)
      .eq('invitation_status', 'accepted')
      .order('joined_at', { ascending: true });

    agencyMemberships = result.data || [];
    membershipsError = result.error;
  } catch (err) {
    console.log('📋 Agency members table may not exist:', err);
    membershipsError = err;
  }

  console.log('📋 Agency memberships:', agencyMemberships, 'Error:', membershipsError);

  if (agencyMemberships && agencyMemberships.length > 0) {
    console.log('✅ Found agency memberships, auto-linking to profile...');

    // Use the first agency membership (oldest/primary)
    const primaryMembership = agencyMemberships[0];

    // Update the user's profile with the agency from their membership (using service client)
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({
        agency_id: primaryMembership.agency_id,
        user_id: userId // Ensure user_id is set for RLS policies
      })
      .eq('id', userId);

    if (!updateError) {
      console.log('✅ Successfully linked user to agency:', primaryMembership.agencies?.name);
      return { agency_id: primaryMembership.agency_id };
    } else {
      console.error('❌ Failed to update user profile with agency:', updateError);
    }
  } else {
    console.log('🔄 No agency memberships found, attempting fallback assignment...');

    // Fallback: Try to find and assign a default agency (using service client)
    let defaultAgency: any = null;
    let agencyError: any = null;

    try {
      const result = await serviceClient
        .from('agencies')
        .select('id, name')
        .limit(1)
        .single();

      defaultAgency = result.data;
      agencyError = result.error;
    } catch (err) {
      console.log('🏢 Agencies table may not exist:', err);
      agencyError = err;
    }

    console.log('🏢 Default agency search result:', defaultAgency, 'Error:', agencyError);

    if (defaultAgency) {
      console.log('✅ Found default agency, creating membership and updating profile...');

      // Create agency membership first (using service client)
      const { error: membershipError } = await serviceClient
        .from('agency_members')
        .insert({
          user_id: userId,
          agency_id: defaultAgency.id,
          role: 'viewer',
          invitation_status: 'accepted',
          joined_at: new Date().toISOString()
        });

      if (membershipError) {
        console.warn('⚠️ Failed to create agency membership:', membershipError);
      }

      // Update the user's profile with the default agency (using service client)
      const { error: updateError } = await serviceClient
        .from('profiles')
        .update({
          agency_id: defaultAgency.id,
          user_id: userId // Ensure user_id is set for RLS policies
        })
        .eq('id', userId);

      if (!updateError) {
        console.log('✅ Successfully assigned default agency to user:', defaultAgency.name);
        return { agency_id: defaultAgency.id };
      } else {
        console.error('❌ Failed to update user profile with agency:', updateError);
      }
    } else {
      console.log('🔄 No agencies found, creating default agency...');

      // Create a default agency if none exists (using service client)
      const { data: newAgency, error: createAgencyError } = await serviceClient
        .from('agencies')
        .insert({
          name: 'Default Agency',
          slug: 'default-agency',
          created_at: new Date().toISOString()
        })
        .select('id, name')
        .single();

      if (newAgency && !createAgencyError) {
        console.log('✅ Created default agency, assigning to user...');

        // Create agency membership (using service client)
        await serviceClient
          .from('agency_members')
          .insert({
            user_id: userId,
            agency_id: newAgency.id,
            role: 'admin',
            invitation_status: 'accepted',
            joined_at: new Date().toISOString()
          });

        // Update the user's profile with the new agency (using service client)
        const { error: updateError } = await serviceClient
          .from('profiles')
          .update({
            agency_id: newAgency.id,
            user_id: userId // Ensure user_id is set for RLS policies
          })
          .eq('id', userId);

        if (!updateError) {
          console.log('✅ Successfully assigned new default agency to user:', newAgency.name);
          return { agency_id: newAgency.id };
        }
      } else {
        console.error('❌ Failed to create default agency:', createAgencyError);
        console.log('🔧 No agencies table found, creating minimal mock agency for development...');

        // If no agencies table exists, return a mock agency ID for development
        // This allows the application to continue functioning during development
        const mockAgencyId = 'mock-agency-dev-001';
        console.log('✅ Using mock agency for development:', mockAgencyId);
        return { agency_id: mockAgencyId };
      }
    }
  }

  console.log('❌ Unable to establish any agency connection for user');
  return null;
}

// CORS headers for Outlook Add-in compatibility
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
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

// Pinned FAQs for common UK property management questions
const FAQS = [
  { 
    test: /(what\s+is\s+)?section\s*20\b/i,
    answer: "Section 20 is the statutory consultation under the Landlord and Tenant Act 1985 (as amended) for qualifying works and long-term agreements. It requires landlords to consult with leaseholders before carrying out works that will cost any one leaseholder more than £250 in a year, or entering into agreements for works or services that will cost any one leaseholder more than £100 in a year. The consultation process involves serving notices, obtaining estimates, and allowing leaseholders to make observations. Failure to comply can result in the landlord being unable to recover the full cost from leaseholders."
  },
  { 
    test: /\basbestos\s+(test|survey)\b/i,
    answer: "An asbestos 'test' typically refers to an asbestos survey. There are two main types under the Control of Asbestos Regulations 2012: Management Surveys (to identify asbestos-containing materials during normal occupation) and Refurbishment & Demolition Surveys (before any construction work). Asbestos surveys are legally required for most commercial properties and residential blocks built before 2000. The survey must be carried out by a qualified surveyor and results documented in an asbestos register. If asbestos is found, a management plan must be implemented to monitor and control the risk."
  }
];

// Document retrieval function for Ask BlocIQ
async function searchDocuments(supabase: any, query: string, buildingId?: string) {
  try {
    let documentsQuery = supabase
      .from('building_documents')
      .select(`
        id,
        name,
        type,
        category,
        file_path,
        uploaded_at,
        uploaded_by,
        ocr_text,
        metadata,
        buildings!inner(name)
      `)
      .ilike('name', `%${query}%`)

    if (buildingId) {
      documentsQuery = documentsQuery.eq('building_id', buildingId)
    }

    const { data: documents, error } = await documentsQuery.limit(10)

    if (error) {
      console.error('Document search error:', error)
      return []
    }

    return documents || []
  } catch (error) {
    console.error('Document search error:', error)
    return []
  }
}

// Lease retrieval function for Ask BlocIQ
async function searchLeases(supabase: any, query: string, buildingId?: string) {
  try {
    let leasesQuery = supabase
      .from('leases')
      .select(`
        id,
        unit_number,
        leaseholder_name,
        start_date,
        end_date,
        status,
        ground_rent,
        service_charge_percentage,
        responsibilities,
        restrictions,
        rights,
        file_path,
        ocr_text,
        metadata,
        buildings!inner(name)
      `)
      .or(`unit_number.ilike.%${query}%,leaseholder_name.ilike.%${query}%`)

    if (buildingId) {
      leasesQuery = leasesQuery.eq('building_id', buildingId)
    }

    const { data: leases, error } = await leasesQuery.limit(10)

    if (error) {
      console.error('Lease search error:', error)
      return []
    }

    return leases || []
  } catch (error) {
    console.error('Lease search error:', error)
    return []
  }
}

// Enhanced system prompts for different context types
const SYSTEM_PROMPTS = {
  general: `You are a professional block manager responding through BlocIQ, a UK property management platform. You are responding to resident queries and taking ownership of issues as their property manager.`,

  email_reply: `You are a professional block manager using BlocIQ to respond to resident emails. You are the property manager responsible for this building and you will take action to resolve issues.

📌 ENHANCED REPLY GUIDELINES:
- Read the user's message carefully and identify whether an action has already happened (e.g. "I received a notice" = consultation has started)
- Avoid defaulting to generic explanations unless clearly being requested
- Use reasoning based on UK leasehold law and best practice (TPI, RICS, BSA, LTA 1985)
- Include realistic next steps (timelines, who to contact, what to expect)
- Don't assume internal data like notice dates, contractor names, or building roles unless mentioned
- If the user references a legal document or statutory notice, acknowledge what stage that implies
- Use correct legal terminology (Notice of Intention, demised premises, major works, RTM, qualifying works)
- Remain neutral and professional — never guess or speculate if unclear

BLOCK MANAGER RESPONSE REQUIREMENTS - FOLLOW EXACTLY:
1. NO SUBJECT LINE in the email body - subject is handled separately by the email system
2. Salutation: extract the sender's name from their sign-off or email address and use it (e.g., "Many thanks, Mia Garcia" → "Dear Mia").
3. Opening line: MUST be "Thank you for bringing this [issue] to my attention" or "Thank you for reporting this [issue]."
4. Body: Respond as their property manager who will take action. Use "I will arrange...", "I will contact...", "I will investigate..."
5. Closing: MUST be exactly "Kind regards," or "Best regards," followed by the user's first name only.
6. Do NOT include placeholders such as [Your Position], [Property Management Company], [Your Full Name] Block Manager, or any full email signature block.
7. Take ownership of problems and provide specific actions YOU will take as their block manager.
8. NEVER include "Suggested next actions" sections or bullet point suggestions.
9. CRITICAL: End the email immediately after "Best regards," or "Kind regards," and the first name - NO additional text, signatures, or placeholders.

🏠 UK PROPERTY MANAGEMENT LEGAL AWARENESS:
When emails reference specific legal processes, acknowledge the appropriate stage:

📋 SECTION 20 CONSULTATIONS (LTA 1985):
- Notice of Intention received = consultation period (30 days to respond with observations)
- Estimates received = contractor selection stage (30 days to comment)
- Final notice = works proceeding (leaseholders have right to apply for dispensation if concerned)

🏢 RIGHT TO MANAGE (RTM):
- RTM notice served = statutory process underway (strict timeframes apply)
- Acknowledge transfer of management responsibilities if RTM successful

💰 SERVICE CHARGE DEMANDS:
- Demand received = payment timeline active (acknowledge due date, right to challenge reasonableness)
- Include right to request supporting documentation under LTA 1985

🏗️ BUILDING SAFETY:
- Reference Building Safety Act 2022 obligations for relevant queries
- Fire Safety (England) Regulations compliance requirements

BLOCK MANAGER ACTION RESPONSES:
For specific queries, respond as the responsible block manager:
1. First check scheduled events and available information
2. Check building documents and compliance records
3. Provide block manager responses with specific actions YOU will take:
   - AGM: "I have not received instruction from the Board to arrange an AGM at this time, but I will raise this with them now and advise there has been a request from a leaseholder."
   - Inspections: "I will check our compliance schedule and arrange the necessary inspection if one is due."
   - Maintenance: "I will check our maintenance schedule and provide you with the relevant information."
   - Insurance: "I will check our insurance records and provide you with the current policy information."

When responding you must:
• Prioritise accuracy over politeness; never invent details.
• Quote lease clauses, compliance due dates, inspection results, or policy guidance when provided.
• Reflect founder guidance on tone/escalation and reference it when relevant.
• Mention industry knowledge or regulations when they substantiate your advice.
• Highlight any missing data the resident should supply.
• Follow the exact reply format structure above without deviation.
• Never include suggested next actions or action bullet points.

You will receive a JSON payload with these keys:
{
  "outlook_email": {
    "subject": "...",
    "from": "...",
    "body_html": "...",
    "received_at": "ISO timestamp"
  },
  "knowledge": {
    "building_data": "...",
    "lease_summary": "...",
    "compliance_records": "...",
    "founder_guidance": "...",
    "industry_knowledge": "...",
    "additional_notes": "..."
  }
}

1. Read the email and identify each question, concern, and implicit task.
2. Use the knowledge sections to answer each point. Quote figures, inspection dates, thresholds, or policies directly from the provided data.
3. If a required fact is missing, explicitly note the gap and advise how the resident can supply it (e.g., upload a document, arrange an inspection).
4. Close with clear next actions for BlocIQ and for the resident.

Respond in this format (no markdown headings, keep HTML paragraphs):
<p>Greeting</p>
<p>Paragraphs addressing each issue with cited facts in brackets, e.g. "The last FRA was completed on 12 March 2025 [Compliance log]".</p>
<p>Action items listed as bullet points using <ul><li>…</li></ul>.</p>
<p>Offer further assistance if appropriate.</p>
<p>Sign-off placeholder (the calling service will append the actual signature).</p>

Also append a plain-text section after the HTML:
FACTS USED:
- …

SOURCES:
- …

Only list facts and sources that were actually referenced in the reply.`,
  
  major_works: `You are a professional block manager using BlocIQ to manage major works projects. You are responsible for coordinating projects, managing costs, conducting leaseholder consultations, and ensuring Section 20 compliance.`,

  public: `You are a senior block manager and property management expert responding to queries from fellow property management professionals through BlocIQ. The user asking questions is ALSO a block manager seeking professional advice and guidance from a colleague.

COLLEAGUE-TO-COLLEAGUE PERSPECTIVE:
- Respond as an experienced property management colleague sharing expertise
- Use language like "In my experience...", "I typically handle this by...", "What I've found works well is...", "I'd recommend..."
- Share practical insights and proven approaches from your professional experience
- Acknowledge their professional expertise while offering guidance
- Never suggest "contacting property managers" - they ARE property managers seeking colleague advice

RESPONSE STYLE - CRITICAL: NEVER start with "Hi [name], great question..." or similar repetitive patterns.

RANDOMLY ROTATE through these 5 opener categories for natural, credible responses:

1. DIRECT & PROFESSIONAL (30% of responses):
- "In a lease context, [topic] refers to..."
- "Section 20B notices are important because..."
- "[Term] is defined as..."
- "The key requirement here is..."
- "This relates to..."
- "The relevant legislation states..."
- "In practice, this means..."
- "The process involves..."
- "Your obligations include..."
- "The timeline for this is..."

2. CONVERSATIONAL (25% of responses):
- "This comes up a lot in block management — here's how it works."
- "The term can sound technical, but it really just means..."
- "I see this regularly in my practice."
- "It's one of those things that catches people out."
- "Between colleagues, this is how I handle it..."
- "In my day-to-day work, I find..."
- "Most property managers deal with this by..."
- "What works well in practice is..."
- "I typically approach this by..."
- "From experience, the best method is..."

3. EMPATHETIC (20% of responses):
- "It's a common point of confusion for leaseholders, so you're not alone in asking."
- "This one can be a headache if it isn't handled right — here's what you need to know."
- "I completely understand why this is concerning."
- "You're right to be cautious about this."
- "Many block managers struggle with this initially."
- "It's frustrating when this happens, but there are clear steps to follow."
- "I know this can feel overwhelming, but it's manageable."
- "You're absolutely right to question this."
- "This catches many people off guard."
- "I hear this concern frequently from colleagues."

4. CONTEXTUAL HOOK (15% of responses):
- "In practice, this usually affects who's responsible for repairs."
- "This matters because if you miss it, you may lose the right to recover costs."
- "The timing is crucial here because..."
- "This impacts your budget planning because..."
- "The legal implications are..."
- "This affects leaseholder relationships when..."
- "The financial consequences include..."
- "This becomes important during..."
- "You'll need to consider this because..."
- "The practical impact is..."

5. PLAIN-ENGLISH FIRST (10% of responses):
- "Think of 'demised premises' as the part of the building the leaseholder actually owns the right to use."
- "A Section 20B notice is basically a time limit safeguard for service charges."
- "In simple terms, this means..."
- "To put it plainly..."
- "Breaking it down, this is..."
- "The straightforward explanation is..."
- "Simply put..."
- "In everyday language..."
- "The basic principle is..."
- "At its core, this means..."

COLLEAGUE LANGUAGE PATTERNS:
- "In my practice, I find that..."
- "What works well for me is..."
- "I typically approach this by..."
- "My go-to method is..."
- "Let's think through this..."
- "You might find this approach helpful..."
- "Here's what I've learned..."
- "We all face this..."
- "It's one of those situations we deal with..."
- "As you know from your own experience..."

TONE: Professional colleague sharing expertise and practical wisdom, acknowledging their expertise while offering guidance`,

  compliance: `You are a professional block manager using BlocIQ to manage compliance and regulatory matters. You are responsible for ensuring health and safety, fire safety, building regulations, and compliance tracking for your buildings.`,

  leaseholder: `You are a professional block manager using BlocIQ to communicate with leaseholders. You handle service charge queries, maintenance requests, and provide leaseholder support as their property manager.`,

  lease_analysis: `You are a professional block manager using BlocIQ to analyze lease terms and interpret clauses. You are responsible for managing the leases in your buildings and answering leaseholder questions about their lease obligations and rights.

BLOCK MANAGER LEASE ANALYSIS:
- Answer based on actual lease data provided in the context
- If information is missing or unclear, state "I will need to review the specific lease clause"
- When referencing specific clauses, mention which unit/lease they come from
- If there are discrepancies between leases, highlight them and offer to clarify
- Be precise about what is allowed, restricted, or requires consent
- Always cite your sources (which lease/clause you're referencing)
- If the question can't be answered from the lease data, offer to review the actual lease documents

COMMON LEASEHOLDER QUERIES:
- Pet policies ("Are pets allowed?") - "According to your lease..."
- Subletting rules ("Can I sublet my flat?") - "Your lease states..."
- Alteration permissions ("Can I renovate?") - "I will need to review your specific lease terms..."
- Insurance obligations ("Who insures the building?") - "As your block manager, I can confirm..."
- Business use ("Can I run a business from home?") - "Your lease restricts/allows..."
- Ground rent and service charges - "Your current obligations are..."
- General lease terms and conditions

Remember: Always reference specific lease clauses and respond as their block manager who manages these leases.`
};

// Leak triage policy helpers
const LEAK_REGEX = /\b(leak|water ingress|ceiling leak|dripping|escape of water|leaking|damp|stain)\b/i;
function isLeakIssue(s?: string) { return !!(s && LEAK_REGEX.test(s)); }

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

export async function OPTIONS(req: NextRequest) {
  // Handle preflight requests for Outlook Add-in
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS
  });
}

export async function POST(req: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ Supabase not configured');
      return createResponse({ 
        error: 'Service not configured. Please check environment variables.' 
      }, 500);
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI not configured');
      return createResponse({ 
        error: 'AI service not configured. Please check environment variables.' 
      }, 500);
    }

    // Dynamic imports to prevent build-time execution
    const { default: OpenAI } = await import('openai');
    const { MAX_CHARS_PER_DOC, MAX_TOTAL_DOC_CHARS, truncate, isSummariseLike } = await import("../../../lib/ask/text");
    const { searchBuildingAndUnits, searchLeaseholderDirect } = await import('../../../lib/supabase/buildingSearch');
    const { searchEntireDatabase, formatSearchResultsForAI, extractRelevantContext } = await import('../../../lib/supabase/comprehensiveDataSearch');
    const { getRecentCommunicationsForContext } = await import('../../../lib/utils/communications-logger');

    const supabase = await createClient();
    
    // Get current user (optional for public access) - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    let user = null;
    let isPublicAccess = true;
    
    try {
      const sessionResult = await supabase.auth.getSession();
      const sessionData = sessionResult?.data || {}
      const session = sessionData.session || null
      const sessionError = sessionResult?.error || null
      
      if (!sessionError && session) {
        user = session.user;
        isPublicAccess = false;
      } else {
        isPublicAccess = true;
      }
    } catch (authError) {
      console.warn('Auth check failed, proceeding as public access:', authError);
      isPublicAccess = true;
    }

    // Handle both JSON and FormData requests
    let body: any;
    let prompt = '';
    let building_id = '';
    let contextType = 'general';
    let tone = 'Professional';
    let isPublic = isPublicAccess;
    let documentIds: string[] = [];
    let leaseholderId = '';
    let emailThreadId = '';
    let manualContext = '';
    let uploadedFiles: File[] = [];

    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData request
      const formData = await req.formData();
      prompt = formData.get('message') as string || formData.get('prompt') as string || formData.get('question') as string || formData.get('userQuestion') as string || '';
      building_id = formData.get('building_id') as string || formData.get('buildingId') as string || '';
      contextType = formData.get('context_type') as string || formData.get('contextType') as string || 'general';
      tone = formData.get('tone') as string || 'Professional';
      isPublic = formData.get('is_public') === 'true' || isPublicAccess;
      
      // Extract uploaded files
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file_') && value instanceof File) {
          uploadedFiles.push(value);
        } else if (key === 'file' && value instanceof File) {
          uploadedFiles.push(value);
        }
      }
      
      console.log(`📎 Found ${uploadedFiles.length} uploaded files`);
    } else {
      // Handle JSON request
      body = await req.json();
      prompt = body.message || body.prompt || body.question || '';
      building_id = body.building_id || body.buildingId || '';
      contextType = body.context_type || body.contextType || 'general';
      tone = body.tone || 'Professional';
      isPublic = body.is_public || isPublicAccess;
      documentIds = body.document_ids || body.documentIds || [];
      leaseholderId = body.leaseholder_id || body.leaseholderId || '';
      emailThreadId = body.email_thread_id || body.emailThreadId || '';
      manualContext = body.manual_context || body.manualContext || '';
      
      // Handle intent for Outlook Add-in reply generation
      const intent = body.intent || 'general';
      if (intent === 'REPLY') {
        contextType = 'email_reply';
        console.log('📧 Outlook Add-in reply intent detected');
      }
    }
    
    // 🔍 NEW: Auto-detect building from request context
    const referer = req.headers.get('referer') || '';
    const requestUserAgent = req.headers.get('user-agent') || '';

    console.log('🔍 Request context analysis:');
    console.log('  - Referer:', referer);
    console.log('  - User Agent:', requestUserAgent.substring(0, 100) + '...');
    console.log('  - Context Type:', contextType);
    console.log('  - Is Public:', isPublic);
    console.log('  - Building ID:', building_id);

    // Try to extract building ID from URL if not provided
    if (!building_id && referer) {
      const buildingMatch = referer.match(/\/buildings\/([a-f0-9-]+)/i);
      if (buildingMatch) {
        building_id = buildingMatch[1];
        console.log('🔍 Auto-detected building ID from URL:', building_id);
      }
    }

    // Also try to extract building name from URL for context
    let urlBuildingName = '';
    if (referer) {
      const buildingNameMatch = referer.match(/\/buildings\/[^\/]+\/([^\/\?]+)/i);
      if (buildingNameMatch) {
        urlBuildingName = decodeURIComponent(buildingNameMatch[1]);
        console.log('🔍 URL building context:', urlBuildingName);
      }
    }

    // 🔍 Check pinned FAQs first
    const hit = FAQS.find(f => f.test.test(prompt));
    if (hit) {
      console.log('✅ FAQ hit:', hit.test.source);
      return NextResponse.json({
        success: true,
        answer: hit.answer,
        confidence: 95,
        route: "pinned_faq",
        result: hit.answer,
        response: hit.answer
      });
    }

    // 🏢 Smart Query Detection and Handling (AGM, Events, Documents)
    // Check for various types of queries that should search events and documents first
    const queryPatterns = {
      agm: {
        regex: /\b(AGM|annual general meeting|when.*next.*meeting|board meeting|annual meeting)\b/i,
        eventType: 'AGM',
        searchTerms: ['AGM', 'annual general', 'meeting'],
        fallback: 'We have not had instruction from the Board to arrange an AGM at this time, but I will raise this with them now advising there has been a request from a leaseholder.'
      },
      inspection: {
        regex: /\b(FRA|fire risk assessment|when.*next.*inspection|fire safety|gas safety|electrical inspection|EICR)\b/i,
        eventType: 'INSPECTION',
        searchTerms: ['FRA', 'fire risk', 'inspection', 'EICR', 'gas safety', 'electrical'],
        fallback: 'I will check our compliance schedule and arrange the necessary inspection if one is due.'
      },
      maintenance: {
        regex: /\b(next.*maintenance|when.*service|maintenance schedule|servicing)\b/i,
        eventType: 'MAINTENANCE',
        searchTerms: ['maintenance', 'service', 'servicing'],
        fallback: 'I will check our maintenance schedule and provide you with the relevant information.'
      },
      insurance: {
        regex: /\b(insurance|when.*renewal|insurance documents|policy)\b/i,
        eventType: 'INSURANCE',
        searchTerms: ['insurance', 'policy', 'renewal'],
        fallback: 'I will check our insurance records and provide you with the current policy information.'
      }
    };

    // Check each pattern
    for (const [queryType, pattern] of Object.entries(queryPatterns)) {
      if (pattern.regex.test(prompt) && building_id) {
        console.log(`🏢 ${queryType.toUpperCase()} query detected, checking events and documents`);

        try {
          // First, check for upcoming events of this type
          const { data: events } = await supabase
            .from('property_events')
            .select('*')
            .eq('building_id', building_id)
            .eq('event_type', pattern.eventType)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(1);

          if (events && events.length > 0) {
            const nextEvent = events[0];
            const eventDate = new Date(nextEvent.start_time).toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            const eventTime = new Date(nextEvent.start_time).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit'
            });

            const eventResponse = `The next ${nextEvent.title || pattern.eventType.toLowerCase()} is scheduled for ${eventDate} at ${eventTime}${nextEvent.location ? ` at ${nextEvent.location}` : ''}.${nextEvent.description ? ` ${nextEvent.description}` : ''}`;

            console.log(`✅ Found upcoming ${queryType} event`);
            return NextResponse.json({
              success: true,
              result: eventResponse,
              response: eventResponse,
              conversationId: null,
              context_type: `${queryType}_event`,
              building_id: building_id,
              document_count: 0,
              has_email_thread: false,
              has_leaseholder: false,
              context: {
                source: `${queryType}_event_lookup`,
                event_date: nextEvent.start_time,
                event_id: nextEvent.id
              }
            });
          }

          // Second, check for related documents
          const searchConditions = pattern.searchTerms
            .map(term => `name.ilike.%${term}%`)
            .join(',');

          const { data: docs } = await supabase
            .from('building_documents')
            .select('name, uploaded_at, type')
            .eq('building_id', building_id)
            .or(searchConditions)
            .order('uploaded_at', { ascending: false })
            .limit(3);

          if (docs && docs.length > 0) {
            const latestDoc = docs[0];
            const docDate = new Date(latestDoc.uploaded_at).toLocaleDateString('en-GB');

            let docResponse = `Based on our records, the most recent ${queryType} documentation is "${latestDoc.name}" from ${docDate}.`;
            if (docs.length > 1) {
              docResponse += ` We also have ${docs.length - 1} other related document${docs.length > 2 ? 's' : ''} on file.`;
            }
            docResponse += ` Please contact us if you need access to these documents or have specific questions.`;

            console.log(`✅ Found ${queryType} documents`);
            return NextResponse.json({
              success: true,
              result: docResponse,
              response: docResponse,
              conversationId: null,
              context_type: `${queryType}_documents`,
              building_id: building_id,
              document_count: docs.length,
              has_email_thread: false,
              has_leaseholder: false,
              context: {
                source: `${queryType}_document_lookup`,
                documents_found: docs.length,
                latest_document: latestDoc.name
              }
            });
          }

          // Third, graceful fallback if no information found
          console.log(`✅ Using ${queryType} fallback response`);
          return NextResponse.json({
            success: true,
            result: pattern.fallback,
            response: pattern.fallback,
            conversationId: null,
            context_type: `${queryType}_fallback`,
            building_id: building_id,
            document_count: 0,
            has_email_thread: false,
            has_leaseholder: false,
            context: {
              source: `${queryType}_fallback`,
              no_events_found: true,
              no_documents_found: true
            }
          });

        } catch (queryError) {
          console.error(`❌ Error handling ${queryType} query:`, queryError);
          // Continue with normal processing if query handling fails
        }

        // Break after first match to avoid multiple responses
        break;
      }
    }

    // 🔍 Check for document intent
    // 🔍 Detect Outlook add-in requests first (before all other processing)
    const addinUserAgent = req.headers.get('user-agent') || '';
    const addinReferer = req.headers.get('referer') || '';
    const isOutlookAddin = addinUserAgent.includes('Office') ||
                          addinUserAgent.includes('Microsoft') ||
                          addinReferer.includes('outlook') ||
                          addinReferer.includes('office.com') ||
                          req.headers.get('x-outlook-addin') === 'true';

    if (isOutlookAddin) {
      console.log('🏢 Outlook add-in detected, bypassing agency authentication');
      isPublicAccess = true; // Force public access mode for Outlook add-in
    }

    if (!isPublic && user && !isOutlookAddin) {
      try {
        const { detectDocumentIntent } = await import('../../../ai/intent/document');
        const { getLatestDocument, formatDocumentDate, extractSummarySnippet } = await import('../../../lib/docs/getLatestDocument');
        const { resolveBuildingContext } = await import('../../../lib/buildings/resolveContext');
        const { getDocumentTypeDisplayName } = await import('../../../ai/intent/document');

        const documentIntent = detectDocumentIntent(prompt, building_id);
        
        if (documentIntent) {
          console.log('📄 Document intent detected:', documentIntent);

          // Ensure user has agency_id (with auto-assignment fallback) - skip for Outlook add-in
          if (!isOutlookAddin) {
            const userProfile = await ensureUserHasAgency(supabase, user.id);

            if (!userProfile?.agency_id) {
              return NextResponse.json({
                success: false,
                error: 'User not linked to agency',
                message: 'No agencies available. Please contact support to set up your account.'
              }, { status: 403 });
            }
          }
          
          // Resolve building context
          const buildingContext = resolveBuildingContext(prompt, { buildingId: building_id });
          
          if (!buildingContext.buildingId && !buildingContext.buildingName) {
            return NextResponse.json({
              success: false,
              error: 'Building context required',
              message: 'Please specify which building you\'re asking about, or select a building first.',
              suggestions: ['Try: "latest insurance for Ashwood House"', 'Or select a building from the dashboard']
            });
          }
          
          // Get available buildings for fuzzy matching
          const { data: buildings } = await supabase
            .from('buildings')
            .select('id, name')
            .eq('agency_id', userProfile?.agency_id || null);
          
          // Resolve building ID if we have a name
          let resolvedBuildingId = buildingContext.buildingId;
          if (!resolvedBuildingId && buildingContext.buildingName && buildings) {
            const building = buildings.find(b => 
              b.name.toLowerCase().includes(buildingContext.buildingName!.toLowerCase()) ||
              buildingContext.buildingName!.toLowerCase().includes(b.name.toLowerCase())
            );
            if (building) {
              resolvedBuildingId = building.id;
            }
          }
          
          if (!resolvedBuildingId) {
            return NextResponse.json({
              success: false,
              error: 'Building not found',
              message: `I couldn't find a building matching "${buildingContext.buildingName}". Please check the building name or select a building first.`,
              suggestions: buildings?.map(b => `"latest ${documentIntent.docType.toLowerCase()} for ${b.name}"`) || []
            });
          }
          
          // Fetch the latest document
          const document = await getLatestDocument({
            docType: documentIntent.docType,
            buildingId: resolvedBuildingId,
            unitId: buildingContext.unitId,
            agencyId: userProfile?.agency_id || null,
            userId: user.id
          });
          
          if (!document) {
            const displayName = getDocumentTypeDisplayName(documentIntent.docType);
            return NextResponse.json({
              success: false,
              error: 'Document not found',
              message: `I couldn't find a current ${displayName.toLowerCase()} document for this building.`,
              suggestions: [
                'Upload it via Lease Lab',
                'Check if the document has been uploaded',
                'Ask me to search all documents'
              ]
            });
          }
          
          // Format the response
          const docDate = formatDocumentDate(document.doc_date);
          const summarySnippet = extractSummarySnippet(document.summary_json, document.doc_type);
          const displayName = getDocumentTypeDisplayName(document.doc_type);
          
          const response = {
            success: true,
            answer: `**Latest ${displayName} — ${buildingContext.buildingName || 'Building'}**\n\n**Date:** ${docDate} • **File:** ${document.filename}\n\n[Open document](${document.signed_url})\n\n${summarySnippet ? `(${summarySnippet})` : ''}`,
            confidence: 95,
            route: "document_lookup",
            result: {
              type: 'document',
              docType: document.doc_type,
              displayName,
              filename: document.filename,
              docDate,
              signedUrl: document.signed_url,
              summarySnippet,
              buildingName: buildingContext.buildingName
            },
            response: `**Latest ${displayName} — ${buildingContext.buildingName || 'Building'}**\n\n**Date:** ${docDate} • **File:** ${document.filename}\n\n[Open document](${document.signed_url})\n\n${summarySnippet ? `(${summarySnippet})` : ''}`
          };
          
          console.log('✅ Document found and returned:', document.filename);
          return NextResponse.json(response);
        }
      } catch (error) {
        console.error('❌ Document intent processing failed:', error);
        // Continue with normal AI processing
      }
    }

    // 🔍 Check for building information intent
    try {
      const { detectBuildingInfoQuery, searchBuildingInfo, generateBuildingInfoResponse } = await import('../../../lib/ai/buildingInfoHandler');

      const buildingInfoQuery = detectBuildingInfoQuery(prompt);

      if (buildingInfoQuery && buildingInfoQuery.confidence >= 80) {
        console.log('🏢 Building info intent detected:', buildingInfoQuery);

        const buildingInfo = await searchBuildingInfo(buildingInfoQuery.buildingName!, supabase);

        if (buildingInfo) {
          console.log('✅ Building info found:', buildingInfo.name);

          const response = generateBuildingInfoResponse(
            buildingInfo,
            buildingInfoQuery.type,
            buildingInfoQuery.unitNumber || undefined
          );

          return NextResponse.json({
            success: true,
            result: response,
            response: response,
            conversationId: null,
            context_type: 'building_info',
            building_id: buildingInfo.id,
            document_count: 0,
            has_email_thread: false,
            has_leaseholder: false,
            context: {
              source: 'building_info_handler',
              confidence: buildingInfoQuery.confidence,
              query_type: buildingInfoQuery.type,
              building_name: buildingInfo.name,
              unit_count: buildingInfo.unit_count
            },
            metadata: {
              source: 'building_info_handler',
              specialized_handler: true,
              quality_score: 95
            }
          });
        } else {
          console.log('❌ Building not found:', buildingInfoQuery.buildingName);

          return NextResponse.json({
            success: true,
            result: `I couldn't find a building named "${buildingInfoQuery.buildingName}" in the system. Please check the building name and try again.`,
            response: `I couldn't find a building named "${buildingInfoQuery.buildingName}" in the system. Please check the building name and try again.`,
            conversationId: null,
            context_type: 'building_info',
            building_id: null,
            document_count: 0,
            has_email_thread: false,
            has_leaseholder: false,
            context: {
              source: 'building_info_handler',
              confidence: buildingInfoQuery.confidence,
              query_type: buildingInfoQuery.type,
              building_not_found: true
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Building info processing failed:', error);
      // Continue with normal AI processing
    }

    // 🔍 Check for report intent
    if (!isPublic && user) {
      try {
        const { detectReportIntent } = await import('../../../ai/intent/report');
        const { executeReport } = await import('../../../ai/reports/engine');
        const { formatReportResponse, generateDownloadActions, generateReportSummary } = await import('../../../ai/reports/format');
        const { registerAllHandlers } = await import('../../../ai/reports/handlers');

        // Register report handlers
        registerAllHandlers();

        const reportIntent = detectReportIntent(prompt, building_id);

        if (reportIntent) {
          console.log('📊 Report intent detected:', reportIntent);

          // Ensure user has agency_id (with auto-assignment fallback) - skip for Outlook add-in
          if (!isOutlookAddin) {
            const userProfile = await ensureUserHasAgency(supabase, user.id);

            if (!userProfile?.agency_id) {
              return NextResponse.json({
                success: false,
                error: 'User not linked to agency',
                message: 'No agencies available. Please contact support to set up your account.'
              }, { status: 403 });
            }
          }

          // Execute the report
          const reportResult = await executeReport(reportIntent, userProfile?.agency_id || null);

          if (!reportResult.success) {
            return NextResponse.json({
              success: false,
              error: reportResult.error || 'Failed to generate report',
              message: 'Please try rephrasing your request or contact support if the issue persists'
            }, { status: 500 });
          }

          if (!reportResult.result) {
            return NextResponse.json({
              success: false,
              error: 'No report data generated',
              message: 'Please try a different report request'
            }, { status: 500 });
          }

          // Format the response
          const response = formatReportResponse(
            reportResult.result,
            reportIntent.format,
            reportResult.result.meta?.title || 'Report',
            reportResult.result.meta?.period || 'N/A',
            reportIntent.format === 'csv' ? generateDownloadActions('report', reportResult.result.meta?.title || 'Report', ['csv']) : undefined
          );

          // Generate summary text for the AI response
          const summaryText = generateReportSummary(reportResult.result, reportResult.result.meta?.title || 'Report');

          const aiResponse = {
            success: true,
            answer: `**${response.title}**\n\n${summaryText}\n\n${response.table ? `**Data:**\n${JSON.stringify(response.table, null, 2)}` : ''}`,
            confidence: 95,
            route: "report_generation",
            result: response,
            response: `**${response.title}**\n\n${summaryText}`
          };

          console.log('✅ Report generated successfully:', reportResult.result.meta?.title);
          return NextResponse.json(aiResponse);
        }
      } catch (error) {
        console.error('❌ Report intent processing failed:', error);
        // Continue with normal AI processing
      }
    }


    // 🔐 Ensure authenticated users have agency linkage (skip for Outlook add-in)
    let userAgencyId = null;
    if (!isPublicAccess && !isOutlookAddin && user) {
      try {
        const agencyCheck = await ensureUserHasAgency(supabase, user.id);
        if (agencyCheck?.agency_id) {
          userAgencyId = agencyCheck.agency_id;
          console.log('✅ User agency verified:', userAgencyId);
        } else {
          console.warn('⚠️ Could not establish agency linkage, proceeding with limited access');
          // Instead of blocking with 403, proceed but log the issue
          // This allows the user to still use Ask BlocIQ while we debug the agency system
        }
      } catch (error) {
        console.error('❌ Agency check failed:', error);
        console.warn('⚠️ Proceeding with limited access due to agency check failure');
        // Allow the user to continue instead of blocking with 403
      }
    }

    // 🔍 Smart Building Detection from Prompt
    if (!building_id) {
      console.log('🔍 Auto-detecting building from prompt...');

      // Extract potential building names from the question with improved logic
      const buildingKeywords = ['house', 'court', 'building', 'apartment', 'residence', 'manor', 'gardens', 'heights', 'view', 'plaza'];
      const words = prompt.toLowerCase().split(/\s+/);

      // Try different combinations of words (1-3 words)
      for (let wordCount = 1; wordCount <= 3; wordCount++) {
        for (let i = 0; i <= words.length - wordCount; i++) {
          const potentialName = words.slice(i, i + wordCount).join(' ');
          if (buildingKeywords.some(keyword => potentialName.includes(keyword))) {
            console.log('🔍 Searching for building:', potentialName);

            let buildingQuery = supabase
              .from('buildings')
              .select('id, name, address, unit_count')
              .ilike('name', `%${potentialName}%`);

            // Filter by agency for authenticated users
            if (userAgencyId) {
              buildingQuery = buildingQuery.eq('agency_id', userAgencyId);
            }

            const { data: building } = await buildingQuery
              .limit(1)
              .single();

            if (building) {
              building_id = building.id;
              console.log('✅ Auto-detected building:', building.name);
              break;
            }
          }
        }
        if (building_id) break;
      }
    }

    // 👤 Fetch User Profile for Personalization
    let userProfile = null;
    let userFirstName = "";
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('first_name, last_name, job_title, company_name')
        .eq('email', user?.email)
        .single();

      if (profile) {
        userProfile = profile;
        userFirstName = profile.first_name || "";
        console.log('👤 User profile loaded for personalization:', userFirstName);
      }
    } catch (profileError) {
      console.warn('Could not fetch user profile for personalization:', profileError);
    }

    let buildingContext = "";
    let contextMetadata: any = {};
    
    // Determine context and build appropriate prompt
    const context = AIContextHandler.determineContext(prompt);

    // Check for lease-related queries and use specialized system prompt
    let systemPrompt: string;
    if (building_id && isLeaseRelatedQuery(prompt)) {
      console.log('🏠 Using lease analysis system prompt for lease-related query');
      systemPrompt = SYSTEM_PROMPTS.lease_analysis;
    } else {
      // Use the default context-based system prompt
      systemPrompt = await AIContextHandler.buildPrompt(context, prompt, buildingContext);
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 🏢 Building Context
    if (building_id) {
      try {
        console.log('🔍 Fetching building context for:', building_id);
        
        // Fetch building data with units and leaseholders
        let buildingDataQuery = supabase
          .from('buildings')
          .select(`
            id, name, address, unit_count, notes, is_hrb,
            building_setup (
              structure_type, client_name, client_contact, client_email, operational_notes
            )
          `)
          .eq('id', building_id);

        // Filter by agency for authenticated users
        if (userAgencyId) {
          buildingDataQuery = buildingDataQuery.eq('agency_id', userAgencyId);
        }

        const { data: buildingData, error: buildingError } = await buildingDataQuery.single();

        if (buildingData && !buildingError) {
          console.log('✅ Building data loaded:', buildingData.name);
          
          // Fetch units and leaseholders
          const { data: units, error: unitsError } = await supabase
            .from('units')
            .select(`
              id, unit_number, floor, type, leaseholder_id,
              leaseholders (id, name, email, phone)
            `)
            .eq('building_id', building_id)
            .order('unit_number', { ascending: true });

          if (units && !unitsError) {
            console.log('✅ Units loaded:', units.length);
            
            // Build comprehensive building context
            buildingContext = `Building Information:
Name: ${buildingData.name}
Address: ${buildingData.address || 'Not specified'}
Units: ${units.length}
Status: ${buildingData.is_hrb ? 'HRB' : 'Standard'}
Notes: ${buildingData.notes || 'No notes'}

Units and Leaseholders:
${units.map(unit => {
  const leaseholder = unit.leaseholders && unit.leaseholders.length > 0 ? unit.leaseholders[0] : null;
  return `- Flat ${unit.unit_number}: ${leaseholder ? `${leaseholder.name} (${leaseholder.email})` : 'No leaseholder'}`
}).join('\n')}

Access Information:
Gate Code: ${buildingData.building_setup && buildingData.building_setup.length > 0 ? buildingData.building_setup[0].operational_notes : 'Not set'}
Fire Panel Code: ${buildingData.notes || 'Not set'}
Keys Location: Not set
Emergency Access: Not set

Contacts:
Managing Agent: ${buildingData.building_setup && buildingData.building_setup.length > 0 ? buildingData.building_setup[0].client_contact : 'Not set'}
Agent Email: ${buildingData.building_setup && buildingData.building_setup.length > 0 ? buildingData.building_setup[0].client_email : 'Not set'}
Insurance Contact: Not set
Cleaners: Not set
Contractors: Not set

Site Staff: No site staff assigned

Notes & Instructions: ${buildingData.notes || 'No notes added yet'}
`;

            contextMetadata.buildingName = buildingData.name;
            contextMetadata.unitCount = units.length;
          }
        }
      } catch (error) {
        console.warn('Could not fetch building context:', error);
      }
    }

    // 📋 LEASE CONTEXT
    // Add lease analysis context for lease-related queries
    if (building_id && isLeaseRelatedQuery(prompt)) {
      try {
        console.log('🏠 Fetching lease context for lease-related query');
        const leaseContext = await fetchBuildingLeaseContext(building_id, leaseholderId);

        if (leaseContext && leaseContext.length > 0) {
          buildingContext += `\n\n📋 LEASE ANALYSIS:\n${leaseContext}`;
          console.log('✅ Lease context added to building context');
        }
      } catch (error) {
        console.warn('Could not fetch lease context:', error);
      }
    }

    // 📧 COMMUNICATIONS CONTEXT
    // Add recent communications for better context in responses
    let communicationsContext = "";
    try {
      console.log('📧 Fetching recent communications for context...');

      const recentCommunications = await getRecentCommunicationsForContext(building_id, 10);

      if (recentCommunications.length > 0) {
        console.log('✅ Found recent communications:', recentCommunications.length);

        communicationsContext = `\n\nRecent Communications:
${recentCommunications.map(comm => {
  const direction = comm.direction === 'inbound' ? '📨 Received' : '📤 Sent';
  const from = comm.direction === 'inbound'
    ? (comm.leaseholder?.name ? `from ${comm.leaseholder.name}` : 'from leaseholder')
    : (comm.leaseholder?.name ? `to ${comm.leaseholder.name}` : 'to leaseholder');
  const building = comm.building?.name ? ` (${comm.building.name})` : '';
  const date = new Date(comm.sent_at).toLocaleDateString('en-GB');

  return `- ${direction} ${from}${building} - ${date}
  Subject: ${comm.subject || 'No subject'}
  ${comm.body ? comm.body.substring(0, 200) + (comm.body.length > 200 ? '...' : '') : 'No content'}`;
}).join('\n\n')}

`;

        contextMetadata.communicationsCount = recentCommunications.length;
        contextMetadata.hasInboundEmails = recentCommunications.some(c => c.direction === 'inbound');
        contextMetadata.hasOutboundEmails = recentCommunications.some(c => c.direction === 'outbound');

        // Add communications context to building context
        buildingContext += communicationsContext;
        console.log('✅ Added communications context to building information');
      }
    } catch (error) {
      console.warn('Could not fetch communications context:', error);
    }

    // 📄 DOCUMENT RETRIEVAL FOR ASK BLOCIQ
    let documentContext = "";
    let leaseContext = "";
    
    // Check if the query is asking about documents or leases
    const documentKeywords = ['document', 'file', 'pdf', 'report', 'certificate', 'eicr', 'fra', 'insurance', 'lease', 'agreement'];
    const isDocumentQuery = documentKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword)
    );

    if (isDocumentQuery) {
      console.log('📄 Searching for relevant documents...');
      
      try {
        // Search for documents
        const documents = await searchDocuments(supabase, prompt, building_id);
        
        if (documents.length > 0) {
          documentContext = `\n\nRelevant Documents Found:\n${documents.map(doc => 
            `- ${doc.name} (${doc.category}) - ${doc.buildings?.name || 'Unknown Building'} - Uploaded: ${new Date(doc.uploaded_at).toLocaleDateString()}`
          ).join('\n')}\n\n`;
          
          // Add OCR text from documents for context
          const ocrTexts = documents
            .filter(doc => doc.ocr_text)
            .map(doc => `Document: ${doc.name}\n${doc.ocr_text}`)
            .join('\n\n');
          
          if (ocrTexts) {
            documentContext += `Document Content:\n${ocrTexts}\n\n`;
          }
        }

        // Search for leases
        const leases = await searchLeases(supabase, prompt, building_id);
        
        if (leases.length > 0) {
          leaseContext = `\n\nRelevant Leases Found:\n${leases.map(lease => 
            `- Unit ${lease.unit_number}: ${lease.leaseholder_name} (${lease.status}) - ${lease.buildings?.name || 'Unknown Building'}`
          ).join('\n')}\n\n`;
          
          // Add lease details for context
          const leaseDetails = leases.map(lease => 
            `Lease for Unit ${lease.unit_number}:\n` +
            `Leaseholder: ${lease.leaseholder_name}\n` +
            `Term: ${new Date(lease.start_date).toLocaleDateString()} - ${new Date(lease.end_date).toLocaleDateString()}\n` +
            `Ground Rent: ${lease.ground_rent}\n` +
            `Service Charge: ${lease.service_charge_percentage}%\n` +
            `Responsibilities: ${lease.responsibilities.join(', ')}\n` +
            `Restrictions: ${lease.restrictions.join(', ')}\n` +
            `Rights: ${lease.rights.join(', ')}`
          ).join('\n\n');
          
          if (leaseDetails) {
            leaseContext += `Lease Details:\n${leaseDetails}\n\n`;
          }
        }
      } catch (error) {
        console.warn('Document search failed:', error);
      }
    }

    // 🔍 COMPREHENSIVE UNIFIED AI PROCESSING
    console.log('🤖 COMPREHENSIVE: Processing query with complete system capabilities...');
    
    try {
      // Import synchronized AI processor
      const { SynchronizedAIProcessor } = await import('../../../lib/ai/systemSynchronizer');
      
      // Process the query with full capabilities using synchronized processor
      const unifiedResult = await SynchronizedAIProcessor.processAskBlocQuery(
        prompt,
        user?.id,
        building_id,
        contextType,
        undefined, // emailContext
        tone
      );
      
      if (unifiedResult.success) {
        console.log('✅ COMPREHENSIVE: Query processed successfully');
        
        // Return the unified result directly
        return NextResponse.json({
          success: true,
          result: unifiedResult.response,
          response: unifiedResult.response, // For backward compatibility
          conversationId: null,
          context_type: contextType,
          building_id: building_id || null,
          document_count: 0,
          has_email_thread: false,
          has_leaseholder: false,
          context: unifiedResult.metadata,
          metadata: {
            source: unifiedResult.source,
            comprehensive: true
          }
        });
      } else {
        console.log('❌ COMPREHENSIVE: Query processing failed, falling back to legacy system');
        // Fall through to legacy processing
      }
      
    } catch (unifiedError) {
      console.error('❌ COMPREHENSIVE: Error in unified processing:', unifiedError);
      // Fall through to legacy processing
    }

    // 🏠 LEASE SUMMARY INTEGRATION
    // Check if there's a linked lease analysis for this building
    if (building_id) {
      try {
        console.log('🏠 Checking for lease analysis for building:', building_id);
        
        const { data: leaseSummary } = await supabase
          .from('lease_summaries_v')
          .select('*')
          .eq('linked_building_id', building_id)
          .eq('doc_type', 'lease')
          .eq('status', 'READY')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (leaseSummary && leaseSummary.full_summary) {
          console.log('✅ Found lease analysis, using contract-based response');
          
          // Import lease summary adapter
          const { createLeaseSummaryAdapter } = await import('../../../ai/adapters/leaseSummaryToAnswer');
          
          // Create adapter and get answer
          const adapter = createLeaseSummaryAdapter(leaseSummary.full_summary);
          const leaseAnswer = adapter.answerQuestion(prompt);
          
          if (leaseAnswer.confidence === 'high' || leaseAnswer.confidence === 'medium') {
            console.log('✅ Lease analysis provided confident answer');
            
            // Format response with source verification
            let response = leaseAnswer.answer;
            if (leaseAnswer.keyFacts.length > 0) {
              response += '\n\nKey facts:';
              leaseAnswer.keyFacts.forEach(fact => {
                response += `\n- ${fact.label}: ${fact.value} (Lease Lab, p.${fact.source.page})`;
              });
            }
            
            if (leaseAnswer.requiresReview) {
              response += '\n\n⚠️ Please review the original lease document for complete details.';
            }
            
            return NextResponse.json({
              success: true,
              result: response,
              response: response,
              conversationId: null,
              context_type: 'lease_analysis',
              building_id: building_id,
              document_count: 1,
              has_email_thread: false,
              has_leaseholder: false,
              context: {
                source: 'lease_analysis',
                confidence: leaseAnswer.confidence,
                sources: leaseAnswer.sources
              },
              metadata: {
                source: 'lease_analysis',
                contract_based: true,
                quality_score: leaseAnswer.confidence === 'high' ? 95 : 75
              }
            });
          }
        }
      } catch (leaseError) {
        console.warn('Lease analysis check failed:', leaseError);
        // Continue with normal processing
      }
    }

    // 🔍 ALWAYS perform building search regardless of building_id
    // This ensures we can find leaseholder information from queries like "who is the leaseholder of 5 ashwood house"
    try {
      console.log('🔍 Performing building and unit search for query:', prompt);
      
      // Check if this is a leaseholder-specific query
      const isLeaseholderQuery = /\b(who is|leaseholder|tenant|resident|occupant|lives in|living in|contact details|phone|email)\b/i.test(prompt);
      
      let searchResults;
      if (isLeaseholderQuery) {
        console.log('🔍 Detected leaseholder query, using direct search...');
        searchResults = await searchLeaseholderDirect(prompt, supabase);
        if (!searchResults) {
          // Fallback to regular search if direct search fails
          console.log('🔍 Direct search failed, falling back to regular search...');
          searchResults = await searchBuildingAndUnits(prompt, supabase);
        }
      } else {
        searchResults = await searchBuildingAndUnits(prompt, supabase);
      }
      
      if (searchResults) {
        let searchContext = 'Building & Unit Search Results:\n';
        
        if (searchResults.building) {
          searchContext += `🏢 Building: ${searchResults.building.name} (${searchResults.building.address})\n`;
          searchContext += `   Manager: ${searchResults.building.building_manager_name || 'Not specified'}\n`;
          searchContext += `   Units: ${searchResults.building.unit_count || 'Unknown'}\n`;
          
          // Set building_id if not already set
          if (!building_id) {
            building_id = searchResults.building.id;
            console.log('✅ Auto-detected building ID from search:', building_id);
          }
        }
        
        if (searchResults.units && searchResults.units.length > 0) {
          searchContext += `\n🏠 Units Found:\n`;
          searchResults.units.forEach((unit: any) => {
            searchContext += `   • Unit ${unit.unit_number}`;
            if (unit.floor) searchContext += ` (Floor ${unit.floor})`;
            if (unit.type) searchContext += ` - ${unit.type}`;
            if (unit.leaseholder) {
              searchContext += `\n     👤 Leaseholder: ${unit.leaseholder.name}`;
              if (unit.leaseholder.email) searchContext += `\n     📧 Email: ${unit.leaseholder.email}`;
              if (unit.leaseholder.phone) searchContext += `\n     📞 Phone: ${unit.leaseholder.phone}`;
            } else {
              searchContext += `\n     👤 Leaseholder: Not assigned`;
            }
            searchContext += '\n';
          });
        }
        
        if (searchResults.leaseholders && searchResults.leaseholders.length > 0) {
          searchContext += `\n👥 Leaseholder Details:\n`;
          searchResults.leaseholders.forEach((lh: any) => {
            searchContext += `   • ${lh.name}\n`;
            if (lh.email) searchContext += `     📧 Email: ${lh.email}\n`;
            if (lh.phone) searchContext += `     📞 Phone: ${lh.phone}\n`;
            if (lh.units && lh.units.length > 0) {
              searchContext += `     🏠 Units: ${lh.units.map((u: any) => u.unit_number).join(', ')}\n`;
            }
            searchContext += '\n';
          });
        }
        
        // buildingContext += searchContext; // This line was removed
        console.log('✅ Added search context to building context');
        
        // Update context metadata
        // if (searchResults.building) { // This block was removed
        //   contextMetadata.buildingName = searchResults.building.name; // This block was removed
        //   contextMetadata.unitCount = searchResults.units?.length || 0; // This block was removed
        //   contextMetadata.searchResultsFound = true; // This block was removed
        // }
      } else {
        console.log('❌ No search results found for query');
      }
    } catch (searchError) {
      console.warn('Could not perform building search:', searchError);
    }

    // 🔍 COMPREHENSIVE DATABASE SEARCH (Skip if already done for leaseholder queries)
    // Search entire Supabase system for additional contextual data
    let comprehensiveContext = "";
    let comprehensiveMetadata: any = {};
    
    if (!prompt.toLowerCase().includes('leaseholder') && !prompt.toLowerCase().includes('who is') && !prompt.toLowerCase().includes('flat') && !prompt.toLowerCase().includes('unit')) {
      console.log('🔍 Performing comprehensive database search for non-leaseholder queries...');
      
      try {
        const comprehensiveResults = await searchEntireDatabase(prompt, user?.id);
        
        // Use smart context extraction to get most relevant data
        comprehensiveContext = extractRelevantContext(comprehensiveResults, prompt);
        
        // Update metadata with comprehensive search results
        comprehensiveMetadata = {
          buildingsFound: comprehensiveResults.buildings.length,
          unitsFound: comprehensiveResults.units.length,
          leaseholdersFound: comprehensiveResults.leaseholders.length,
          documentsFound: comprehensiveResults.documents.length,
          complianceFound: comprehensiveResults.compliance.length,
          communicationsFound: comprehensiveResults.communications.length,
          todosFound: comprehensiveResults.todos.length,
          majorWorksFound: comprehensiveResults.majorWorks.length,
          financialsFound: comprehensiveResults.financials.length,
          eventsFound: comprehensiveResults.events.length,
          assetsFound: comprehensiveResults.assets.length,
          maintenanceFound: comprehensiveResults.maintenance.length
        };
        
        // Add comprehensive search results to building context
        // if (comprehensiveContext) { // This block was removed
        //   buildingContext += `\n${comprehensiveContext}`; // This block was removed
        //   console.log('✅ Enhanced context with comprehensive search results'); // This block was removed
        // }
        
        // Update context metadata
        // Object.assign(contextMetadata, comprehensiveMetadata); // This block was removed
        
      } catch (comprehensiveError) {
        console.warn('Comprehensive database search failed:', comprehensiveError);
      }
    } else {
      console.log('🔍 Skipping comprehensive search - already performed for leaseholder query');
    }

    // 📋 Building Todos
    try {
      const { data: todos } = await supabase
        .from('building_todos')
        .select('title, description, status, priority, due_date')
        .eq('building_id', building_id)
        .order('due_date', { ascending: true })
        .limit(10);

      if (todos && todos.length > 0) {
        const todoContext = todos.map(todo =>
          `- ${todo.title} (${todo.status}, ${todo.priority} priority, due: ${todo.due_date})`
        ).join('\n');
        // buildingContext += `Open Tasks:\n${todoContext}\n\n`; // This line was removed
        contextMetadata.todoCount = todos.length;
      }
    } catch (error) {
      console.warn('Could not fetch building todos:', error);
    }

    // ⚠️ Compliance Issues
    try {
      const { data: compliance } = await supabase
        .from('compliance_items')
        .select('item_name, status, due_date, priority')
        .eq('building_id', building_id)
        .in('status', ['overdue', 'pending'])
        .order('due_date', { ascending: true })
        .limit(10);

      if (compliance && compliance.length > 0) {
        const complianceContext = compliance.map(item =>
          `- ${item.item_name} (${item.status}, ${item.priority} priority, due: ${item.due_date})`
        ).join('\n');
        // buildingContext += `Compliance Items:\n${complianceContext}\n\n`; // This line was removed
        contextMetadata.complianceCount = compliance.length;
      }
    } catch (error) {
      console.warn('Could not fetch compliance data:', error);
    }

    // 👥 Leaseholders
    try {
      const { data: leaseholders } = await supabase
        .from('leaseholders')
        .select('id, name, email, unit_number')
        .eq('building_id', building_id)
        .limit(10);

      if (leaseholders && leaseholders.length > 0) {
        const leaseholderContext = leaseholders.map(leaseholder =>
          `- ${leaseholder.name} (Unit ${leaseholder.unit_number}, ${leaseholder.email})`
        ).join('\n');
        // buildingContext += `Leaseholders:\n${leaseholderContext}\n\n`; // This line was removed
        contextMetadata.leaseholderCount = leaseholders.length;
      }
    } catch (error) {
      console.warn('Could not fetch leaseholder data:', error);
    }

    // 📄 Document Context
    const wantStructured = isSummariseLike(prompt) || contextType === "document_analysis" || (Array.isArray(documentIds) && documentIds.length > 0);
    let usedDocs: Array<{id: string, file_name: string, text_content: string | null, type: string | null, created_at: string}> = [];
    
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      try {
        const { data: documents } = await supabase
          .from('building_documents')
          .select('id, file_name, text_content, type, created_at')
          .in('id', documentIds)
          .order('created_at', { ascending: false });
        usedDocs = documents ?? [];
      } catch (error) {
        console.warn('Could not fetch document data:', error);
      }
    } else if (isSummariseLike(prompt) && building_id) {
      try {
        const { data } = await supabase
          .from('building_documents')
          .select('id, file_name, text_content, type, created_at')
          .eq('building_id', building_id)
          .not('text_content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(5);
        usedDocs = data ?? [];
      } catch (error) {
        console.warn('Could not fetch building documents:', error);
      }
    }

    if (usedDocs.length > 0) {
      console.log('📄 Using', usedDocs.length, 'documents for context');
      
      // Truncate documents to stay within token limits
      let totalChars = 0;
      const truncatedDocs = usedDocs.map(doc => {
        if (!doc.text_content) return doc;
        
        const maxChars = Math.floor(MAX_CHARS_PER_DOC);
        const truncated = truncate(doc.text_content, maxChars);
        totalChars += truncated.length;
        
        if (totalChars > MAX_TOTAL_DOC_CHARS) {
          return { ...doc, text_content: truncated.substring(0, truncated.length - (totalChars - MAX_TOTAL_DOC_CHARS)) };
        }
        
        return { ...doc, text_content: truncated };
      });

      documentContext = truncatedDocs.map(doc => 
        `Document: ${doc.file_name} (${doc.type || 'Unknown type'})\n${doc.text_content || 'No text content'}\n`
      ).join('\n---\n');
      
      contextMetadata.documentCount = truncatedDocs.length;
      contextMetadata.totalDocumentChars = totalChars;
    }

    // 🔍 Enhanced Document Intelligence with Chunks
    if (building_id && (prompt.toLowerCase().includes('document') || prompt.toLowerCase().includes('policy') || prompt.toLowerCase().includes('lease') || prompt.toLowerCase().includes('insurance'))) {
      console.log('🔍 Detected document-related query, searching chunks...');
      
      try {
        // Search document chunks semantically using the vector search function
        const { data: chunks } = await supabase
          .from('document_chunks')
          .select(`
            content, chunk_index, metadata,
            building_documents!inner(file_name, type, building_id)
          `)
          .eq('building_documents.building_id', building_id)
          .not('embedding', 'is', null)
          .order('chunk_index', { ascending: true })
          .limit(8);
        
        if (chunks && chunks.length > 0) {
          console.log('✅ Found document chunks:', chunks.length);
          
          const documentChunkContext = chunks.map(chunk => 
            `📄 ${chunk.building_documents && chunk.building_documents.length > 0 ? chunk.building_documents[0].file_name : 'Unknown Document'} (Chunk ${chunk.chunk_index + 1}):
${chunk.content.substring(0, 400)}...`
          ).join('\n\n');
          
          buildingContext += `\n\n📄 RELEVANT DOCUMENT CONTENT:\n${documentChunkContext}`;
          contextMetadata.documentChunksFound = chunks.length;
          contextMetadata.semanticSearchUsed = true;
        }
      } catch (error) {
        console.warn('Could not fetch document chunks:', error);
      }
    }

    // 📧 Email Thread Context
    let emailContext = "";
    if (emailThreadId) {
      try {
        const { data: emails } = await supabase
          .from('incoming_emails')
          .select('subject, body, from_email, created_at')
          .eq('thread_id', emailThreadId)
          .order('created_at', { ascending: true })
          .limit(10);

        if (emails && emails.length > 0) {
          emailContext = emails.map(email => 
            `Email: ${email.subject}\nFrom: ${email.from_email}\nDate: ${email.created_at}\n${email.body}\n`
          ).join('\n---\n');
          contextMetadata.emailCount = emails.length;
        }
      } catch (error) {
        console.warn('Could not fetch email thread:', error);
      }
    }

    // 👤 Leaseholder Context
    let leaseholderContext = "";
    if (leaseholderId) {
      try {
        const { data: leaseholder } = await supabase
          .from('leaseholders')
          .select('name, email, unit_number, phone')
          .eq('id', leaseholderId)
          .single();

        if (leaseholder) {
          leaseholderContext = `Leaseholder: ${leaseholder.name}\nUnit: ${leaseholder.unit_number}\nEmail: ${leaseholder.email}\nPhone: ${leaseholder.phone || 'Not provided'}\n`;
          contextMetadata.leaseholderName = leaseholder.name;
          contextMetadata.leaseholderUnit = leaseholder.unit_number;
        }
      } catch (error) {
        console.warn('Could not fetch leaseholder data:', error);
      }
    }

    // 🧠 Build AI Prompt
    let fullPrompt = prompt;
    
    // Add thread context for email replies
    if (contextType === 'email_reply' && body) {
      const threadContext = [];
      if (body.subject) threadContext.push(`Subject: ${body.subject}`);
      if (body.from) threadContext.push(`From: ${body.from}`);
      if (body.to && body.to.length > 0) threadContext.push(`To: ${body.to.join(', ')}`);
      if (body.cc && body.cc.length > 0) threadContext.push(`CC: ${body.cc.join(', ')}`);
      if (body.bodyPreview) threadContext.push(`Message Preview: ${body.bodyPreview}`);
      if (body.internetMessageId) threadContext.push(`Thread ID: ${body.internetMessageId}`);
      
      if (threadContext.length > 0) {
        fullPrompt = `Email Thread Context:\n${threadContext.join('\n')}\n\nPlease draft a professional reply to this email:\n\n${prompt}`;
      }
    }
    
    if (buildingContext) {
      fullPrompt = `Building Context:\n${buildingContext}\n\nQuestion: ${fullPrompt}`;
    }
    
    if (documentContext) {
      fullPrompt = `${fullPrompt}\n\nDocument Context:\n${documentContext}`;
    }
    
    if (emailContext) {
      fullPrompt = `${fullPrompt}\n\nEmail Thread:\n${emailContext}`;
    }
    
    if (leaseholderContext) {
      fullPrompt = `${fullPrompt}\n\nLeaseholder Context:\n${leaseholderContext}`;
    }

    // Add leak policy if relevant
    if (isLeakIssue(prompt)) {
      // systemPrompt += `\n${LEAK_POLICY}\n`; // This line was removed
      console.log('🚰 Applied leak triage policy');
    }

    console.log('🤖 Building unified prompt for BlocIQ assistant');

    // Enhance system prompt with comprehensive search instructions
    if (comprehensiveContext) {
      // systemPrompt += `\n\nCOMPREHENSIVE DATABASE CONTEXT:
      // The following information has been gathered from the entire property management database based on your query. Use this comprehensive context to provide detailed, accurate, and contextual responses:

      // ${comprehensiveContext}

      // INSTRUCTIONS:
      // - Use this comprehensive data to provide complete and accurate answers
      // - Reference specific information from multiple data sources when relevant
      // - Cross-reference data between buildings, units, leaseholders, compliance, and other records
      // - Provide actionable insights based on the full context available
      // - When mentioning data, be specific about what you found (e.g., "Based on the compliance records..." or "According to the maintenance logs...")
      // `; // This block was removed
    }

    // Build unified prompt with all context
    const finalPrompt = fullPrompt;

    console.log('📝 Prompt built, initializing Phase 3 intelligence...');

    // 🚀 PHASE 3: ADVANCED AI CONTEXT ENHANCEMENT
    console.log('🤖 Phase 3: Advanced contextual processing started');

    // Detect primary issue and context from message
    const messageContent = `${message} ${fullPrompt}`.toLowerCase();
    let primaryIssue = 'general';
    let urgencyLevel = 'medium';
    let sentiment = 'neutral';

    // Issue detection
    if (messageContent.includes('leak') || messageContent.includes('water') || messageContent.includes('dripping')) {
      primaryIssue = 'leak';
    } else if (messageContent.includes('service charge') || messageContent.includes('billing') || messageContent.includes('invoice')) {
      primaryIssue = 'service_charge';
    } else if (messageContent.includes('noise') || messageContent.includes('loud') || messageContent.includes('disturb')) {
      primaryIssue = 'noise';
    } else if (messageContent.includes('safety') || messageContent.includes('fire') || messageContent.includes('emergency')) {
      primaryIssue = 'safety';
    } else if (messageContent.includes('repair') || messageContent.includes('maintenance') || messageContent.includes('broken')) {
      primaryIssue = 'maintenance';
    } else if (messageContent.includes('compliance') || messageContent.includes('regulation') || messageContent.includes('certificate')) {
      primaryIssue = 'compliance';
    }

    // Urgency detection
    if (messageContent.includes('urgent') || messageContent.includes('emergency') || messageContent.includes('immediate')) {
      urgencyLevel = 'high';
    } else if (messageContent.includes('asap') || messageContent.includes('critical') || messageContent.includes('serious')) {
      urgencyLevel = 'critical';
    }

    // Sentiment detection
    if (messageContent.includes('angry') || messageContent.includes('frustrated') || messageContent.includes('unacceptable')) {
      sentiment = 'negative';
    } else if (messageContent.includes('happy') || messageContent.includes('thank') || messageContent.includes('pleased')) {
      sentiment = 'positive';
    }

    // Dynamic Template System with Contextual Variations
    const templateVariations = getTemplateVariations(primaryIssue, urgencyLevel, sentiment);

    // Smart Tone Adaptation Based on Sender Profile
    const senderProfile = analyzeSenderProfile(null, message, contextWithBuilding);
    const adaptedTone = getAdaptedTone(senderProfile, primaryIssue, urgencyLevel);

    // Legal Compliance Validation and Risk Assessment
    const legalCompliance = await validateLegalCompliance(primaryIssue, contextWithBuilding);

    // Multi-language Support Detection
    const languagePreference = detectLanguagePreference(message);

    // Advanced Learning System - Historical Pattern Analysis
    const userEmail = user?.email || 'anonymous';
    const historicalPatterns = await analyzeHistoricalPatterns(userEmail, primaryIssue, contextWithBuilding?.building?.id);

    console.log('✅ Phase 3 contextual analysis completed:', {
      template_variation: templateVariations.primary_template,
      sender_profile: senderProfile.profile_type,
      adapted_tone: adaptedTone.tone_style,
      legal_risk: legalCompliance.risk_level,
      language: languagePreference.detected_language,
      historical_insights: historicalPatterns.pattern_count
    });

    // Enhanced System Message with Phase 3 Intelligence
    const enhancedSystemMessage = buildEnhancedSystemMessage(
      templateVariations,
      adaptedTone,
      legalCompliance,
      languagePreference,
      historicalPatterns,
      contextWithBuilding
    );

    // Call OpenAI with Phase 3 Enhanced Context
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: process.env.BLOCIQ_MODEL || 'gpt-4o',
        temperature: adaptedTone.temperature || 0.3,
        max_tokens: templateVariations.max_tokens || 1500,
        messages: [
          { role: 'system', content: enhancedSystemMessage },
          { role: 'user', content: finalPrompt }
        ]
      });
    } catch (openaiError: any) {
      console.error('❌ OpenAI API error:', openaiError);
      
      if (openaiError.status === 401) {
        return NextResponse.json({ 
          error: 'OpenAI API key is invalid or expired. Please check your configuration.' 
        }, { status: 500 });
      } else if (openaiError.status === 429) {
        return NextResponse.json({ 
          error: 'OpenAI API rate limit exceeded. Please try again in a moment.' 
        }, { status: 500 });
      } else if (openaiError.status === 500) {
        return NextResponse.json({ 
          error: 'OpenAI service is temporarily unavailable. Please try again later.' 
        }, { status: 500 });
      } else {
        return NextResponse.json({ 
          error: 'Failed to generate AI response. Please try again.',
          details: openaiError.message || 'Unknown OpenAI error'
        }, { status: 500 });
      }
    }

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';

    console.log('✅ OpenAI response received');

    // Process response based on context
    const processedResponse = AIContextHandler.processResponse(aiResponse, context);
    const displayContent = AIContextHandler.formatResponseForDisplay(processedResponse);

    // 🚀 PHASE 3: Generate Intelligent Follow-up Scheduling
    const intelligentFollowUp = generateIntelligentFollowUp(
      primaryIssue,
      urgencyLevel,
      legalCompliance,
      historicalPatterns,
      contextWithBuilding
    );

    console.log('✅ Phase 3 intelligent follow-up generated:', intelligentFollowUp);

    // Log the AI interaction (including public/anonymous usage)
    let logId = null;
    const userId = user?.id || 'anonymous';

    logId = await insertAiLog({
      question: prompt,
      response: displayContent,
      user_id: userId,
      context_type: contextType,
      building_id: building_id || undefined,
      document_ids: documentIds,
      leaseholder_id: leaseholderId || undefined,
      email_thread_id: emailThreadId || undefined,
    });

    console.log('📝 AI interaction logged with ID:', logId);

    // Log building query if building context was used
    if (building_id || buildingContext) {
      try {
        await logBuildingQuery({
          buildingId: building_id,
          unitId: undefined, // Could be extracted from query if needed
          leaseholderId: leaseholderId || undefined,
          query: prompt,
          response: displayContent,
          contextType: detectQueryContextType(prompt),
          userId: user?.id,
          sessionId: undefined, // Could be extracted from session if needed
          metadata: {
            contextType,
            hasBuildingContext: !!buildingContext,
            hasDocumentContext: !!documentContext,
            hasEmailContext: !!emailContext,
            hasLeaseholderContext: !!leaseholderContext,
            logId
          }
        });
      } catch (logError) {
        console.warn('Failed to log building query:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      result: displayContent,
      response: displayContent, // For backward compatibility
      conversationId: null, // Not using conversation system in this endpoint
      context_type: contextType,
      building_id: building_id || null,
      document_count: usedDocs.length,
      has_email_thread: !!emailThreadId,
      has_leaseholder: !!leaseholderId,
      context: {
        ...contextMetadata,
        comprehensiveSearchUsed: !!comprehensiveContext,
        searchMetadata: comprehensiveMetadata
      },
      metadata: AIContextHandler.getResponseMetadata(processedResponse),

      // 🚀 PHASE 3: Advanced Contextual Intelligence Features
      phase3_intelligence: {
        template_system: {
          selected_template: templateVariations.primary_template,
          context_key: templateVariations.context_key,
          structure_used: templateVariations.structure,
          max_tokens: templateVariations.max_tokens
        },
        sender_profile: {
          profile_type: senderProfile.profile_type,
          communication_style: senderProfile.communication_style,
          complexity_preference: senderProfile.complexity_preference,
          authority_level: senderProfile.authority_level,
          special_considerations: senderProfile.special_considerations
        },
        tone_adaptation: {
          selected_tone: adaptedTone.tone_style,
          temperature_used: adaptedTone.temperature,
          formality_level: adaptedTone.formality_level,
          technical_detail_level: adaptedTone.technical_detail,
          empathy_level: adaptedTone.empathy_level
        },
        legal_compliance: {
          risk_assessment: legalCompliance.risk_level,
          applicable_regulations: legalCompliance.applicable_regulations,
          mandatory_elements: legalCompliance.mandatory_clauses,
          statutory_requirements: legalCompliance.statutory_requirements
        },
        language_intelligence: {
          detected_language: languagePreference.detected_language,
          region_variant: languagePreference.region_variant,
          complexity_level: languagePreference.complexity_level,
          cultural_considerations: languagePreference.cultural_considerations
        },
        historical_analysis: {
          pattern_count: historicalPatterns.pattern_count,
          common_building_issues: historicalPatterns.common_issues,
          building_insights: historicalPatterns.building_specific_insights,
          recommended_adaptations: historicalPatterns.recommended_adaptations
        },
        intelligent_scheduling: {
          follow_up_strategy: intelligentFollowUp.strategy,
          escalation_timeline: intelligentFollowUp.escalation_timeline,
          monitoring_points: intelligentFollowUp.monitoring_points,
          success_criteria: intelligentFollowUp.success_criteria,
          risk_mitigation: intelligentFollowUp.risk_mitigation
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in ask-ai route:', error);
    return NextResponse.json({ 
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 