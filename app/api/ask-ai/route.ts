import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { EnhancedAskAI } from '@/lib/ai/enhanced-ask-ai';

// Restore runtime declaration for full database access
export const runtime = "nodejs";

const DEBUG = process.env.DEBUG_ASK_BLOCIQ === '1';

export async function POST(request: NextRequest) {
  try {
    if (DEBUG) {
      const url = new URL(request.url);
      const dbg = url.searchParams.get('debug') === '1';
      const on = dbg || DEBUG;
      if (on) {
        console.info('[ASK-XRAY] runtime=', (globalThis as any).__NEXT_PRIVATE_PREBUNDLED_REACT ? 'edge?' : 'node?');
        console.info('[ASK-XRAY] env.present=', {
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        });
      }
    }

    // 1. Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { 
      prompt, 
      building_id, 
      contextType, 
      emailContext, 
      is_outlook_addin,
      includeIndustryKnowledge = true, // Default to true for enhanced responses
      knowledgeCategories,
      isPublic = false
    } = body;

    if (DEBUG) console.info('[ASK-XRAY] parsed=', { building: building_id, unit: null });

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // 3. Fetch building context if building_id is provided and not in public mode
    let buildingContext = "";
    let contextMetadata: any = {};
    
    if (building_id && !isPublic) {
      try {
        console.log('🔍 Fetching building context for:', building_id);
        
        // Fetch building data with units and leaseholders
        const { data: buildingData, error: buildingError } = await supabase
          .from('buildings')
          .select('id, name, address, unit_count, notes, is_hrb')
          .eq('id', building_id)
          .single();

        if (buildingData && !buildingError) {
          console.log('✅ Building data loaded:', buildingData.name);
          
          // Fetch units and leaseholders
          const { data: units, error: unitsError } = await supabase
            .from('units')
            .select('id, unit_number, floor, type, leaseholder_id')
            .eq('building_id', building_id)
            .order('unit_number', { ascending: true });

          if (units && !unitsError) {
            console.log('✅ Units loaded:', units.length);
            
            // Fetch leaseholders for these units
            const leaseholderIds = units.map(unit => unit.leaseholder_id).filter(Boolean);
            let leaseholders: any[] = [];
            
            if (leaseholderIds.length > 0) {
              const { data: leaseholderData } = await supabase
                .from('leaseholders')
                .select('id, name, email, phone')
                .in('id', leaseholderIds);
              leaseholders = leaseholderData || [];
            }
            
            // Build comprehensive building context
            buildingContext = `Building Information:
Name: ${buildingData.name}
Address: ${buildingData.address || 'Not specified'}
Units: ${units.length}
Status: ${buildingData.is_hrb ? 'HRB' : 'Standard'}
Notes: ${buildingData.notes || 'No notes'}

Units and Leaseholders:
${units.map(unit => {
  const leaseholder = leaseholders.find(lh => lh.id === unit.leaseholder_id);
  return `- Flat ${unit.unit_number}: ${leaseholder ? `${leaseholder.name} (${leaseholder.email})` : 'No leaseholder'}`
}).join('\n')}

Access Information:
Gate Code: Not set
Fire Panel Code: Not set
Keys Location: Not set
Emergency Access: Not set

Contacts:
Managing Agent: Not set
Agent Email: Not set
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
        
        // Fetch additional building context
        if (building_id) {
          // Building Todos
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
              buildingContext += `\n\nOpen Tasks:\n${todoContext}`;
              contextMetadata.todoCount = todos.length;
            }
          } catch (error) {
            console.warn('Could not fetch building todos:', error);
          }

          // Compliance Issues
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
              buildingContext += `\n\nCompliance Items:\n${complianceContext}`;
              contextMetadata.complianceCount = compliance.length;
            }
          } catch (error) {
            console.warn('Could not fetch compliance data:', error);
          }
        }
      } catch (error) {
        console.warn('Could not fetch building context:', error);
      }
    }

    // 4. Enhanced leaseholder search for specific queries
    if (!isPublic && (prompt.toLowerCase().includes('leaseholder') || prompt.toLowerCase().includes('who is') || prompt.toLowerCase().includes('flat') || prompt.toLowerCase().includes('unit'))) {
      console.log('🔍 Detected leaseholder-specific query, searching for data...');
      
      try {
        // Search for leaseholders across all buildings if no specific building
        const searchQuery = prompt.toLowerCase();
        let searchResults = null;
        
        if (building_id) {
          // Search within specific building
          const { data: leaseholders } = await supabase
            .from('leaseholders')
            .select('id, name, email, phone, unit_number')
            .eq('building_id', building_id)
            .or(`name.ilike.%${searchQuery}%,unit_number.ilike.%${searchQuery}%`);
          
          if (leaseholders && leaseholders.length > 0) {
            searchResults = leaseholders;
          }
        } else {
          // Search across all buildings
          const { data: leaseholders } = await supabase
            .from('leaseholders')
            .select('id, name, email, phone, unit_number')
            .or(`name.ilike.%${searchQuery}%,unit_number.ilike.%${searchQuery}%`)
            .limit(10);
          
          if (leaseholders && leaseholders.length > 0) {
            searchResults = leaseholders;
          }
        }
        
        if (searchResults && searchResults.length > 0) {
          console.log('✅ Found leaseholder data:', searchResults.length, 'results');
          
          const leaseholderContext = searchResults.map(lh => 
            `👤 ${lh.name} - Unit ${lh.unit_number}
📧 Email: ${lh.email || 'Not provided'}
📞 Phone: ${lh.phone || 'Not provided'}
🏢 Building: ${building_id ? 'Current building' : 'Multiple buildings'}`
          ).join('\n\n');
          
          buildingContext += `\n\n🎯 LEASEHOLDER DATA FOUND:\n${leaseholderContext}`;
          
          // Update context metadata
          contextMetadata.searchResultsFound = true;
          contextMetadata.leaseholderFound = true;
          contextMetadata.leaseholderCount = searchResults.length;
        } else {
          console.log('❌ No leaseholder data found');
        }
      } catch (searchError) {
        console.error('❌ Leaseholder search failed:', searchError);
      }
    }

    // 5. Use enhanced Ask AI with industry knowledge and building context
    const enhancedAI = new EnhancedAskAI();
    
    // Enhance the prompt with building context
    let enhancedPrompt = prompt;
    if (buildingContext) {
      enhancedPrompt = `Building Context:\n${buildingContext}\n\nQuestion: ${prompt}`;
    }
    
    const response = await enhancedAI.generateResponse({
      prompt: enhancedPrompt,
      building_id,
      contextType: isPublic ? 'public' : (contextType || 'general'),
      emailContext,
      is_outlook_addin,
      includeIndustryKnowledge,
      knowledgeCategories,
    });

    if (DEBUG) {
      console.info('[ASK-XRAY] db.result=', { 
        rows: contextMetadata.leaseholderCount || 0, 
        sample: contextMetadata.buildingName ? { 
          building_name: contextMetadata.buildingName, 
          unit_count: contextMetadata.unitCount,
          has_leaseholder: contextMetadata.leaseholderFound 
        } : null 
      });
      
      if (contextMetadata.leaseholderFound) {
        console.info('[ASK-XRAY] path=direct-db-answer');
      } else if (buildingContext) {
        console.info('[ASK-XRAY] path=building-context-only');
      } else {
        console.info('[ASK-XRAY] path=fallback-no-data');
      }
    }

    // 4. Log usage analytics (optional - can be added later)
    // For now, we'll skip this since we don't have the industry_knowledge_usage table
    // You can add this later if you want to track usage

    // 5. Return enhanced response with building context
    return NextResponse.json({
      success: true,
      response: response.response,
      sources: response.sources,
      confidence: response.confidence,
      knowledgeUsed: response.knowledgeUsed,
      buildingContext: buildingContext || null,
      contextMetadata: contextMetadata,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Ask AI failed:', error);
    
    return NextResponse.json({ 
      error: 'Failed to generate response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        message: 'Industry knowledge base is active and enhancing AI responses'
      });
    }

    return NextResponse.json({
      message: 'Ask AI endpoint is active with industry knowledge integration'
    });

  } catch (error) {
    console.error('Failed to get Ask AI info:', error);
    
    return NextResponse.json({ 
      error: 'Failed to retrieve information'
    }, { status: 500 });
  }
} 