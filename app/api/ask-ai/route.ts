// ✅ UNIFIED AI ENDPOINT [2025-01-15] - TEXT ONLY
// - Single endpoint for text-based AI queries
// - Comprehensive building and document context
// - Proper logging to ai_logs table
// - Consistent response format
// - File uploads handled by /api/ask-ai/upload endpoint

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AIContextHandler } from '../../../lib/ai-context-handler';
import { logBuildingQuery, detectQueryContextType } from '../../../lib/ai/buildingQueryLogger';

export const runtime = "nodejs";

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

export async function POST(req: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ Supabase not configured');
      return NextResponse.json({ 
        error: 'Service not configured. Please check environment variables.' 
      }, { status: 500 });
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI not configured');
      return NextResponse.json({ 
        error: 'AI service not configured. Please check environment variables.' 
      }, { status: 500 });
    }

    // Dynamic imports to prevent build-time execution
    const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
    const { default: OpenAI } = await import('openai');
    const { insertAiLog } = await import('../../../lib/supabase/ai_logs');
    const { MAX_CHARS_PER_DOC, MAX_TOTAL_DOC_CHARS, truncate, isSummariseLike } = await import("../../../lib/ask/text");
    const { searchBuildingAndUnits, searchLeaseholderDirect } = await import('../../../lib/supabase/buildingSearch');
    const { searchEntireDatabase, formatSearchResultsForAI, extractRelevantContext } = await import('../../../lib/supabase/comprehensiveDataSearch');

    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user (optional for public access)
    let user = null;
    let isPublicAccess = true;
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
      isPublicAccess = !user;
    } catch (authError) {
      console.warn('Auth check failed, proceeding as public access:', authError);
      isPublicAccess = true;
    }

    // Handle JSON request only
    const body = await req.json();
    const prompt = body.message || body.prompt || body.question || '';
    let building_id = body.building_id || body.buildingId || '';
    const document_ids = body.document_ids || body.documentIds || [];
    const leaseholder_id = body.leaseholder_id || body.leaseholderId || '';
    const contextType = body.context_type || body.contextType || 'general';
    const contextId = body.context_id || body.contextId || '';
    const emailThreadId = body.email_thread_id || body.emailThreadId || '';
    const tone = body.tone || 'Professional';
    const isPublic = body.is_public || body.isPublic || false;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // For public access, use intelligent context detection
    if (isPublicAccess || isPublic) {
      console.log('🌐 Public AI request:', prompt.substring(0, 100) + '...');
      
      // Determine context and build appropriate prompt
      const context = AIContextHandler.determineContext(prompt);
      const systemPrompt = await AIContextHandler.buildPrompt(context, prompt);
      
      console.log('🎯 Using context:', context);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'No response generated';
      
      // Process response based on context
      const processedResponse = AIContextHandler.processResponse(aiResponse, context);
      const displayContent = AIContextHandler.formatResponseForDisplay(processedResponse);

      return NextResponse.json({ 
        success: true,
        response: displayContent,
        result: displayContent, // For backward compatibility
        context_type: 'public',
        building_id: null,
        document_count: 0,
        has_email_thread: false,
        has_leaseholder: false,
        context: {
          complianceUsed: false,
          majorWorksUsed: false
        },
        metadata: AIContextHandler.getResponseMetadata(processedResponse)
      });
    }

    // Require authentication for private access
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 👤 Fetch User Profile for Personalization
    let userProfile = null;
    let userFirstName = "";
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('first_name, last_name, job_title, company_name')
        .eq('email', user.email)
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

    // 🎭 Add Personalization Instructions
    if (userFirstName) {
      systemPrompt += `\n\nPERSONALIZATION INSTRUCTIONS:
- The user's name is "${userFirstName}". Use their name occasionally (about every 3-4 responses) to make interactions more personal and friendly.
- Adopt a warm, upbeat, and professional tone throughout all responses.
- Use phrases like "Great question, ${userFirstName}!" or "I'm happy to help with that, ${userFirstName}" when appropriate.
- Be encouraging and positive while maintaining professionalism.
- Show enthusiasm when providing helpful information or solutions.
- Use friendly transitions like "Absolutely!" "That's a great point!" or "I'd be delighted to help!"
- Keep responses conversational but informative.
- When addressing complex property management topics, explain things in a friendly, approachable way.
`;
    } else {
      systemPrompt += `\n\nTONE INSTRUCTIONS:
- Adopt a warm, upbeat, and professional tone throughout all responses.
- Be encouraging and positive while maintaining professionalism.
- Show enthusiasm when providing helpful information or solutions.
- Use friendly transitions like "Absolutely!" "That's a great point!" or "I'd be delighted to help!"
- Keep responses conversational but informative.
- When addressing complex property management topics, explain things in a friendly, approachable way.
`;
    }

    // 🏢 Smart Building Detection from Prompt
    if (!building_id) {
      console.log('🔍 Auto-detecting building from prompt...');
      
      // Extract potential building names from the question
      const buildingKeywords = ['house', 'court', 'building', 'apartment', 'residence', 'manor', 'gardens', 'heights', 'view', 'plaza'];
      const words = prompt.toLowerCase().split(/\s+/);
      
      for (let i = 0; i < words.length - 1; i++) {
        const potentialName = words.slice(i, i + 2).join(' '); // Check 2-word combinations
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
    }

    // 🏢 Building Context
    if (building_id) {
      try {
        // Import building context utility
        const { getBuildingContext } = await import('../../../lib/updateBuilding');
        
        const buildingData = await getBuildingContext(building_id);
        
        if (buildingData) {
          const { building, units, leaseholders, setup } = buildingData;
          
          contextMetadata.buildingName = building.name;
          contextMetadata.unitCount = units.length;
          
          // Enhanced building context with all information
          buildingContext += `Building Information:
Name: ${building.name}
Address: ${building.address || 'Not specified'}
Units: ${units.length}
Status: ${building.is_hrb ? 'HRB' : 'Standard'}
Notes: ${building.notes || 'No notes'}

Structure Information:
Type: ${setup?.structure_type || 'Not set'}
Freeholder/RMC: ${setup?.client_name || 'Not set'}
Managing Agent: ${setup?.client_contact || 'Not set'}
Agent Email: ${setup?.client_email || 'Not set'}
Operational Notes: ${setup?.operational_notes || 'Not set'}

Units and Leaseholders:
${units.map(unit => {
  const leaseholder = leaseholders.find(l => l.id === unit.leaseholder_id);
  return `- Flat ${unit.unit_number}: ${leaseholder ? `${leaseholder.name} (${leaseholder.email})` : 'No leaseholder'}`
}).join('\n')}

Access Information:
Gate Code: ${setup?.operational_notes || 'Not set'}
Fire Panel Code: ${building.notes || 'Not set'}
Keys Location: Not set
Emergency Access: Not set

Contacts:
Managing Agent: ${setup?.client_contact || 'Not set'}
Agent Email: ${setup?.client_email || 'Not set'}
Insurance Contact: Not set
Cleaners: Not set
Contractors: Not set

Site Staff: No site staff assigned

Notes & Instructions: ${building.notes || 'No notes added yet'}

`;

          // Add compliance data to building context
          try {
            const { data: complianceAssets } = await supabase
              .from('building_compliance_assets')
              .select(`
                id,
                status,
                next_due_date,
                last_renewed_date,
                notes,
                compliance_assets!inner (
                  name,
                  category,
                  description,
                  frequency_months
                )
              `)
              .eq('building_id', building_id)
              .order('next_due_date', { ascending: true });

            if (complianceAssets && complianceAssets.length > 0) {
              const calculateStatus = (nextDueDate: string | null) => {
                if (!nextDueDate) return 'missing';
                const now = new Date();
                const nextDue = new Date(nextDueDate);
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(now.getDate() + 30);
                
                if (nextDue < now) return 'overdue';
                if (nextDue < thirtyDaysFromNow) return 'upcoming';
                return 'compliant';
              };

              const complianceContext = complianceAssets.map(asset => {
                const status = calculateStatus(asset.next_due_date);
                const complianceAsset = asset.compliance_assets as any;
                const assetName = Array.isArray(complianceAsset) 
                  ? complianceAsset[0]?.name || 'Unknown'
                  : complianceAsset?.name || 'Unknown';
                return `- ${assetName}: ${status} (due: ${asset.next_due_date ? new Date(asset.next_due_date).toLocaleDateString() : 'Not set'})`;
              }).join('\n');

              buildingContext += `Compliance Requirements:
${complianceContext}

`;
            }
                     } catch (complianceError) {
             console.warn('Could not fetch compliance data:', complianceError);
           }

           // Add communications data to building context
           try {
             const { data: communications } = await supabase
               .from('communications_log')
               .select(`
                 id,
                 type,
                 subject,
                 content,
                 sent_at,
                 leaseholder_name,
                 unit_number
               `)
               .eq('building_id', building_id)
               .order('sent_at', { ascending: false })
               .limit(10);

             if (communications && communications.length > 0) {
               const communicationsContext = communications.map(comm => 
                 `- ${comm.type.toUpperCase()}: "${comm.subject}" to ${comm.leaseholder_name} (${comm.unit_number}) on ${new Date(comm.sent_at).toLocaleDateString()}`
               ).join('\n');

               buildingContext += `Recent Communications:
${communicationsContext}

`;
             }
           } catch (communicationsError) {
             console.warn('Could not fetch communications data:', communicationsError);
           }
           
           // Add unit count to system prompt for better context
           systemPrompt += `\nThe building "${building.name}" contains ${building.unit_count || 'an unknown number of'} units.\n`;
        }
      } catch (error) {
        console.warn('Could not fetch building data:', error);
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
        
        buildingContext += searchContext;
        console.log('✅ Added search context to building context');
        
        // Update context metadata
        if (searchResults.building) {
          contextMetadata.buildingName = searchResults.building.name;
          contextMetadata.unitCount = searchResults.units?.length || 0;
          contextMetadata.searchResultsFound = true;
        }
      } else {
        console.log('❌ No search results found for query');
      }
    } catch (searchError) {
      console.warn('Could not perform building search:', searchError);
    }

    // 🔍 COMPREHENSIVE DATABASE SEARCH
    // Search entire Supabase system for additional contextual data
    console.log('🔍 Performing comprehensive database search...');
    let comprehensiveContext = "";
    let comprehensiveMetadata: any = {};
    
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
      if (comprehensiveContext) {
        buildingContext += `\n${comprehensiveContext}`;
        console.log('✅ Enhanced context with comprehensive search results');
      }
      
      // Update context metadata
      Object.assign(contextMetadata, comprehensiveMetadata);
      
    } catch (comprehensiveError) {
      console.warn('Comprehensive database search failed:', comprehensiveError);
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
        buildingContext += `Open Tasks:\n${todoContext}\n\n`;
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
        buildingContext += `Compliance Items:\n${complianceContext}\n\n`;
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
        buildingContext += `Leaseholders:\n${leaseholderContext}\n\n`;
        contextMetadata.leaseholderCount = leaseholders.length;
      }
    } catch (error) {
      console.warn('Could not fetch leaseholder data:', error);
    }

    // 📄 Document Context
    const wantStructured = isSummariseLike(prompt) || contextType === "document_analysis" || (Array.isArray(document_ids) && document_ids.length > 0);
    let usedDocs: Array<{id: string, file_name: string, text_content: string | null, type: string | null, created_at: string}> = [];
    let documentContext = "";
    
    if (Array.isArray(document_ids) && document_ids.length > 0) {
      try {
        const { data: documents } = await supabase
          .from('building_documents')
          .select('id, file_name, text_content, type, created_at')
          .in('id', document_ids)
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
    if (leaseholder_id) {
      try {
        const { data: leaseholder } = await supabase
          .from('leaseholders')
          .select('name, email, unit_number, phone')
          .eq('id', leaseholder_id)
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
    
    if (buildingContext) {
      fullPrompt = `Building Context:\n${buildingContext}\n\nQuestion: ${prompt}`;
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
      systemPrompt += `\n${LEAK_POLICY}\n`;
      console.log('🚰 Applied leak triage policy');
    }

    console.log('🤖 Building unified prompt for BlocIQ assistant');

    // Enhance system prompt with comprehensive search instructions
    if (comprehensiveContext) {
      systemPrompt += `\n\nCOMPREHENSIVE DATABASE CONTEXT:
The following information has been gathered from the entire property management database based on your query. Use this comprehensive context to provide detailed, accurate, and contextual responses:

${comprehensiveContext}

INSTRUCTIONS:
- Use this comprehensive data to provide complete and accurate answers
- Reference specific information from multiple data sources when relevant
- Cross-reference data between buildings, units, leaseholders, compliance, and other records
- Provide actionable insights based on the full context available
- When mentioning data, be specific about what you found (e.g., "Based on the compliance records..." or "According to the maintenance logs...")
`;
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
        document_ids: document_ids,
        leaseholder_id: leaseholder_id || undefined,
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
          leaseholderId: leaseholder_id || undefined,
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
      has_leaseholder: !!leaseholder_id,
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