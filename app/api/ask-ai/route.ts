// ✅ UNIFIED AI ENDPOINT [2025-01-15] - COMPLETE SYSTEM
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
import { AIContextHandler } from '../../../lib/ai-context-handler';
import { logBuildingQuery, detectQueryContextType } from '../../../lib/ai/buildingQueryLogger';
import { buildPrompt } from '../../../lib/buildPrompt';
import { insertAiLog } from '../../../lib/supabase/ai_logs';

export const runtime = "nodejs";

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
  general: `You are BlocIQ, a UK property management AI assistant. You help property managers with building management, compliance, leaseholder relations, and operational tasks.`,
  
  email_reply: `You are BlocIQ, a UK property management AI assistant specializing in professional email communication. Generate clear, professional email responses that are appropriate for property management.

IMPORTANT EMAIL REPLY RULES:
- Always produce a professional, British-English draft reply
- Use only verified building/lease facts from the provided context
- If information is unknown, write "Not specified in the records"
- Do not auto-send - the draft is always editable by the user
- Be concise but comprehensive
- Address the specific points raised in the original email
- Use appropriate property management terminology
- Maintain a helpful but professional tone`,
  
  major_works: `You are BlocIQ, a UK property management AI assistant specializing in major works projects. Help with project planning, cost analysis, leaseholder consultation, and Section 20 processes.`,
  
  public: `You are BlocIQ, a helpful AI assistant for UK property management. Provide general advice about property management, compliance, and best practices. Keep responses informative but not building-specific.`,
  
  compliance: `You are BlocIQ, a UK property management AI assistant specializing in compliance and regulatory matters. Help with health and safety, fire safety, building regulations, and compliance tracking.`,
  
  leaseholder: `You are BlocIQ, a UK property management AI assistant specializing in leaseholder relations. Help with communication, service charge queries, maintenance requests, and leaseholder support.`
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
    const { createClient } = await import('@/utils/supabase/server');
    const { default: OpenAI } = await import('openai');
    const { MAX_CHARS_PER_DOC, MAX_TOTAL_DOC_CHARS, truncate, isSummariseLike } = await import("../../../lib/ask/text");
    const { searchBuildingAndUnits, searchLeaseholderDirect } = await import('../../../lib/supabase/buildingSearch');
    const { searchEntireDatabase, formatSearchResultsForAI, extractRelevantContext } = await import('../../../lib/supabase/comprehensiveDataSearch');

    const supabase = createClient(cookies());
    
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
    const userAgent = req.headers.get('user-agent') || '';
    
    console.log('🔍 Request context analysis:');
    console.log('  - Referer:', referer);
    console.log('  - User Agent:', userAgent.substring(0, 100) + '...');
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

    // 🔍 Check for document intent
    if (!isPublic && user) {
      try {
        const { detectDocumentIntent } = await import('../../../ai/intent/document');
        const { getLatestDocument, formatDocumentDate, extractSummarySnippet } = await import('../../../lib/docs/getLatestDocument');
        const { resolveBuildingContext } = await import('../../../lib/buildings/resolveContext');
        const { getDocumentTypeDisplayName } = await import('../../../ai/intent/document');
        
        const documentIntent = detectDocumentIntent(prompt, building_id);
        
        if (documentIntent) {
          console.log('📄 Document intent detected:', documentIntent);
          
          // Get user's agency
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('agency_id')
            .eq('id', user.id)
            .single();
          
          if (!userProfile?.agency_id) {
            return NextResponse.json({
              success: false,
              error: 'User not linked to agency',
              message: 'Please complete your profile setup'
            }, { status: 400 });
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
            .eq('agency_id', userProfile.agency_id);
          
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
            agencyId: userProfile.agency_id,
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

          // Get user's agency
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('agency_id')
            .eq('id', user.id)
            .single();

          if (!userProfile?.agency_id) {
            return NextResponse.json({
              success: false,
              error: 'User not linked to agency',
              message: 'Please complete your profile setup'
            }, { status: 400 });
          }

          // Execute the report
          const reportResult = await executeReport(reportIntent, userProfile.agency_id);

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
            
            const { data: building } = await supabase
              .from('buildings')
              .select('id, name, address, unit_count')
              .ilike('name', `%${potentialName}%`)
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
    let systemPrompt = await AIContextHandler.buildPrompt(context, prompt, buildingContext);

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 🏢 Building Context
    if (building_id) {
      try {
        console.log('🔍 Fetching building context for:', building_id);
        
        // Fetch building data with units and leaseholders
        const { data: buildingData, error: buildingError } = await supabase
          .from('buildings')
          .select(`
            id, name, address, unit_count, notes, is_hrb,
            building_setup (
              structure_type, client_name, client_contact, client_email, operational_notes
            )
          `)
          .eq('id', building_id)
          .single();

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

    console.log('📝 Prompt built, calling OpenAI...');

    // Call OpenAI
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: finalPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
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

    // Log the AI interaction
    let logId = null;
    if (user?.id) {
      logId = await insertAiLog({
        question: prompt,
        response: displayContent,
        user_id: user.id,
        context_type: contextType,
        building_id: building_id || undefined,
        document_ids: documentIds,
        leaseholder_id: leaseholderId || undefined,
        email_thread_id: emailThreadId || undefined,
      });
    }

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
      metadata: AIContextHandler.getResponseMetadata(processedResponse)
    });

  } catch (error) {
    console.error('❌ Error in ask-ai route:', error);
    return NextResponse.json({ 
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 