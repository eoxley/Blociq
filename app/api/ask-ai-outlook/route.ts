import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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

export async function POST(req: NextRequest) {
  try {
    console.log('📧 Outlook Ask BlocIQ: Processing request');

    // Parse request body
    const body = await req.json();
    const { question, building, unit } = body;

    // Validate required fields
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return createResponse({
        ok: false,
        error: 'Missing or invalid question'
      }, 400);
    }

    // Get user email from header
    const email = req.headers.get('x-user-email');
    if (!email) {
      return createResponse({
        ok: false,
        error: 'No email provided in X-User-Email header'
      }, 401);
    }

    console.log('👤 Looking up user:', email);

    // Look up or create user in Supabase users table
    let { data: user, error: userLookupError } = await supabaseAdmin
      .from('users')
      .select('id, email, agency_id, first_name, last_name')
      .eq('email', email)
      .single();

    if (userLookupError && userLookupError.code === 'PGRST116') {
      // User doesn't exist, create new one
      console.log('➕ Creating new user for:', email);

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          role: 'manager',
          first_name: email.split('@')[0], // Use email prefix as first name
          created_at: new Date().toISOString()
        })
        .select('id, email, agency_id, first_name, last_name')
        .single();

      if (createError) {
        console.error('❌ Failed to create user:', createError);
        return createResponse({
          ok: false,
          error: 'Failed to create user account'
        }, 500);
      }

      user = newUser;
    } else if (userLookupError) {
      console.error('❌ User lookup error:', userLookupError);
      return createResponse({
        ok: false,
        error: 'Failed to lookup user'
      }, 500);
    }

    if (!user) {
      return createResponse({
        ok: false,
        error: 'User not found and could not be created'
      }, 500);
    }

    const userId = user.id;
    const agencyId = user.agency_id;

    console.log('✅ User found/created:', { userId, agencyId });

    // Building lookup
    let buildingObj: { id: string; name: string; address?: string } | null = null;

    if (building && building.trim().length > 0) {
      console.log('🏢 Looking up building:', building);

      // Check if building looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(building.trim());

      if (isUUID) {
        // Direct UUID lookup
        const { data: directBuilding } = await supabaseAdmin
          .from('buildings')
          .select('id, name, address')
          .eq('id', building.trim())
          .eq('agency_id', agencyId) // Scope by agency
          .single();

        buildingObj = directBuilding || null;
      } else {
        // Fuzzy name matching for agency
        const { data: fuzzyBuildings } = await supabaseAdmin
          .from('buildings')
          .select('id, name, address')
          .eq('agency_id', agencyId) // Scope by agency
          .ilike('name', `%${building.trim()}%`)
          .limit(5);

        // Take the first match (could be improved with better scoring)
        buildingObj = fuzzyBuildings?.[0] || null;
      }

      if (buildingObj) {
        console.log('✅ Building found:', buildingObj.name);
      } else {
        console.log('❌ Building not found for:', building);
      }
    }

    // Unit lookup and leaseholders
    let units: Array<{ id: string; unit_number: string; unit_label?: string }> = [];
    let leaseholders: Array<{ name: string; email?: string; phone?: string }> = [];

    if (buildingObj && unit && unit.trim().length > 0) {
      console.log('🏠 Looking up units for:', unit, 'in building:', buildingObj.name);

      // Search for units with flexible matching
      const unitSearchTerm = unit.trim();
      const { data: foundUnits } = await supabaseAdmin
        .from('units')
        .select('id, unit_number')
        .eq('building_id', buildingObj.id)
        .or(`unit_number.ilike.%${unitSearchTerm}%,unit_number.eq.${unitSearchTerm},unit_number.eq.Flat ${unitSearchTerm},unit_number.eq.${unitSearchTerm}A,unit_number.eq.${unitSearchTerm}B`)
        .limit(10);

      units = foundUnits?.map(u => ({
        id: u.id,
        unit_number: u.unit_number,
        unit_label: u.unit_number
      })) || [];

      console.log('🏠 Found units:', units.length);

      // If we found units, get leaseholders
      if (units.length > 0) {
        const unitIds = units.map(u => u.id);

        const { data: foundLeaseholders } = await supabaseAdmin
          .from('leaseholders')
          .select('name, email, phone, unit_id')
          .in('unit_id', unitIds);

        leaseholders = foundLeaseholders?.map(lh => ({
          name: lh.name,
          email: lh.email,
          phone: lh.phone
        })) || [];

        console.log('👥 Found leaseholders:', leaseholders.length);
      }
    }

    // Get compliance summary
    let compliance: any = null;
    if (buildingObj) {
      console.log('⚠️ Fetching compliance summary for building:', buildingObj.id);

      try {
        const { data: complianceData, error: complianceError } = await supabaseAdmin
          .rpc('get_building_compliance_summary', {
            p_building_id: buildingObj.id
          });

        if (complianceError) {
          console.warn('⚠️ Compliance summary function not available:', complianceError);
          // Fallback to direct compliance query
          const { data: fallbackCompliance } = await supabaseAdmin
            .from('compliance_items')
            .select('item_name, status, due_date, priority')
            .eq('building_id', buildingObj.id)
            .order('due_date', { ascending: true })
            .limit(10);

          compliance = fallbackCompliance;
        } else {
          compliance = complianceData;
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch compliance data:', error);
        compliance = null;
      }
    }

    // Build context for AI prompt
    const contextLines: string[] = [];

    if (buildingObj) {
      contextLines.push(`Building: ${buildingObj.name}${buildingObj.address ? ` (${buildingObj.address})` : ''}`);
    }

    if (units.length > 0) {
      contextLines.push(`Units found: ${units.map(u => u.unit_number).join(', ')}`);
    }

    if (leaseholders.length > 0) {
      contextLines.push(`Leaseholders: ${leaseholders.map(lh => {
        let info = lh.name;
        if (lh.email) info += ` (${lh.email})`;
        return info;
      }).join(', ')}`);
    }

    if (compliance && Array.isArray(compliance) && compliance.length > 0) {
      const complianceItems = compliance.slice(0, 5).map(item =>
        `${item.item_name}: ${item.status}${item.due_date ? ` (due: ${item.due_date})` : ''}`
      );
      contextLines.push(`Compliance status: ${complianceItems.join(', ')}`);
    }

    // Create comprehensive AI prompt
    const systemPrompt = `You are BlocIQ, a specialist AI assistant for UK leasehold block management and property management.

IMPORTANT GUIDELINES:
- Use British English exclusively
- Adopt a property manager's perspective (not tenancy/AST)
- Apply Section 20 consultation stages and statutory caps knowledge
- Show awareness of Building Safety Act (BSA) requirements
- Provide precise, professional responses
- When information is missing, suggest specific next actions

CONTEXT:
${contextLines.length > 0 ? contextLines.join('\n') : 'No matched records in system'}

SECTION 20 KNOWLEDGE:
- Stage 1: Notice of Intention (30 days consultation)
- Stage 2: Estimates (30 days consultation)
- Statutory cap: £250 per leaseholder per year for works
- £100 per leaseholder per year for long-term agreements
- Failure to consult = contribution limited to statutory amounts

USER QUESTION:
${question.trim()}

Provide a concise, professional response. If data is incomplete, suggest exact queries or actions.`;

    console.log('🤖 Calling OpenAI API');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.BLOCIQ_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: 'You are BlocIQ, a UK property management AI assistant. Be concise, professional, and use British English.'
        },
        {
          role: 'user',
          content: systemPrompt
        }
      ]
    });

    const answer = completion.choices[0]?.message?.content?.trim() || 'No answer generated.';

    console.log('✅ OpenAI response received');

    // Generate suggested queries
    const suggestions: string[] = [];

    if (!buildingObj && building) {
      suggestions.push(`Search buildings matching "${building}"`);
      suggestions.push(`Try alternative building names`);
    }

    if (buildingObj && unit && units.length === 0) {
      suggestions.push(`Try unit variants: "Flat ${unit}" or "${unit}A"`);
      suggestions.push(`Check unit numbering scheme for ${buildingObj.name}`);
    }

    if (!building && !unit) {
      suggestions.push(`Specify building: "What compliance is due for [Building Name]?"`);
      suggestions.push(`Ask about specific units: "Who lives in Flat 5 at [Building]?"`);
    }

    // Log the interaction
    try {
      await supabaseAdmin
        .from('ai_logs')
        .insert({
          user_id: userId,
          agency_id: agencyId,
          building_id: buildingObj?.id || null,
          question: question.trim(),
          response: answer,
          context_type: 'outlook_ask_ai',
          metadata: {
            client: 'outlook',
            building_name: buildingObj?.name,
            units_found: units.length,
            leaseholders_found: leaseholders.length,
            has_compliance: !!compliance,
            suggestions: suggestions
          }
        });

      console.log('📝 Interaction logged successfully');
    } catch (logError) {
      console.error('❌ Failed to log interaction:', logError);
      // Don't fail the request if logging fails
    }

    // Return successful response
    return createResponse({
      ok: true,
      answer: answer,
      context: {
        building: buildingObj,
        units: units,
        leaseholders: leaseholders,
        compliance_items: compliance ? (Array.isArray(compliance) ? compliance.length : 1) : 0
      },
      suggested_queries: suggestions
    });

  } catch (error) {
    console.error('❌ Outlook Ask BlocIQ error:', error);

    // Provide specific error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes('OpenAI')) {
        return createResponse({
          ok: false,
          error: 'AI service temporarily unavailable'
        }, 503);
      }

      if (error.message.includes('Supabase') || error.message.includes('database')) {
        return createResponse({
          ok: false,
          error: 'Database service temporarily unavailable'
        }, 503);
      }
    }

    return createResponse({
      ok: false,
      error: 'Ask BlocIQ failed - please try again'
    }, 500);
  }
}