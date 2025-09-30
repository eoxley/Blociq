/**
 * UNIFIED DATA ACCESS LAYER
 * 
 * This module provides a single source of truth for all AI data access,
 * ensuring both Ask Bloc AI and Outlook Add-in AI return identical responses.
 * 
 * Key Features:
 * - Live Supabase data access only (no mock data)
 * - Comprehensive search across all tables
 * - Industry knowledge and expertise
 * - Email drafting and reply generation
 * - Anti-hallucination safeguards
 * - Consistent response formatting
 * - Multiple fallback strategies
 * - Document analysis capabilities
 * - Building context integration
 */

import { createClient } from '@supabase/supabase-js';
import { searchEntireDatabase, ComprehensiveSearchResult } from '../supabase/comprehensiveDataSearch';
import { searchBuildingAndUnits, searchLeaseholderDirect } from '../supabase/buildingSearch';
import { AIContextHandler } from '../ai-context-handler';
import OpenAI from 'openai';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Industry Knowledge Base - UK Property Management
const INDUSTRY_KNOWLEDGE = {
  // Pinned FAQs for common UK property management questions
  faqs: [
    { 
      test: /(what\s+is\s+)?section\s*20\b/i,
      answer: "Section 20 is the statutory consultation under the Landlord and Tenant Act 1985 (as amended) for qualifying works and long-term agreements. It requires landlords to consult with leaseholders before carrying out works that will cost any one leaseholder more than £250 in a year, or entering into agreements for works or services that will cost any one leaseholder more than £100 in a year. The consultation process involves serving notices, obtaining estimates, and allowing leaseholders to make observations. Failure to comply can result in the landlord being unable to recover the full cost from leaseholders."
    },
    { 
      test: /\basbestos\s+(test|survey)\b/i,
      answer: "An asbestos 'test' typically refers to an asbestos survey. There are two main types under the Control of Asbestos Regulations 2012: Management Surveys (to identify asbestos-containing materials during normal occupation) and Refurbishment & Demolition Surveys (before any construction work). Asbestos surveys are legally required for most commercial properties and residential blocks built before 2000. The survey must be carried out by a qualified surveyor and results documented in an asbestos register. If asbestos is found, a management plan must be implemented to monitor and control the risk."
    },
    {
      test: /\bbsr\b|building\s+safety\s+regulator/i,
      answer: "The BSR, or Building Safety Regulator, is a crucial part of managing a residential block. It's a record of all the safety-related aspects of a building, including fire safety, structural safety, and other health and safety matters. The BSR should include details such as: - Fire risk assessments and their outcomes - Details of fire safety measures in place (e.g., alarms, extinguishers, fire doors) - Records of regular safety checks and maintenance - Details of any safety incidents and the actions taken in response - Any other relevant health and safety information. The BSR is not just a passive record. It should be actively used and updated regularly to ensure the building remains safe for all residents and visitors. It's a key tool for managing agents to demonstrate their commitment to safety and their compliance with relevant regulations and standards."
    },
    {
      test: /\bpib\s+box|post\s+indicator\s+box/i,
      answer: "A PIB (Post Indicator Box) is typically used for fire safety systems, particularly in larger buildings or complexes. The location of a PIB box should be carefully considered to ensure it is both accessible and visible to emergency services. Here are some general guidelines: 1. Visibility: The PIB box should be placed in a location that is easily visible and accessible to fire services. This often means placing it near the main entrance or in a location that is clearly marked and unobstructed. 2. Accessibility: Ensure that the box is not blocked by landscaping, parked vehicles, or other obstacles. It should be easy to reach without any hindrance. 3. Proximity to Fire Systems: The PIB box should be located close to the main fire control systems it is intended to monitor or control. This helps in quick identification and operation during an emergency. 4. Compliance with Regulations: Always ensure that the placement of the PIB box complies with local fire safety regulations and building codes. These regulations can vary, so it's important to check with local authorities or a fire safety consultant. 5. Signage: Adequate signage should be provided to direct emergency personnel to the PIB box quickly."
    }
  ],

  // Leak triage policy
  leakPolicy: `You must follow BlocIQ's leak triage policy for UK long-lease blocks:

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
- Mention insurance-excess option when likely beneficial.`,

  // System prompts for different context types
  systemPrompts: {
    general: `You are BlocIQ, a UK property management AI assistant. You help property managers with building management, compliance, leaseholder relations, and operational tasks.`,
    
    email_reply: `You are BlocIQ, a UK property management AI assistant specializing in professional email communication. Generate clear, professional email responses that are appropriate for property management.`,
    
    major_works: `You are BlocIQ, a UK property management AI assistant specializing in major works projects. Help with project planning, cost analysis, leaseholder consultation, and Section 20 processes.`,
    
    public: `You are BlocIQ, a helpful AI assistant for UK property management. Provide general advice about property management, compliance, and best practices. Keep responses informative but not building-specific.`,
    
    compliance: `You are BlocIQ, a UK property management AI assistant specializing in compliance and regulatory matters. Help with health and safety, fire safety, building regulations, and compliance tracking.`,
    
    leaseholder: `You are BlocIQ, a UK property management AI assistant specializing in leaseholder relations. Help with communication, service charge queries, maintenance requests, and leaseholder support.`
  }
};

export interface LeaseholderResult {
  success: boolean;
  data?: {
    name: string;
    email?: string;
    phone?: string;
    unit_number: string;
    building_name: string;
    building_id: string;
    is_director?: boolean;
    director_role?: string;
  };
  error?: string;
  suggestions?: any[];
}

export interface BuildingResult {
  success: boolean;
  data?: {
    name: string;
    address?: string;
    unit_count?: number;
    building_manager_name?: string;
    building_manager_email?: string;
    building_manager_phone?: string;
    entry_code?: string;
    gate_code?: string;
    access_notes?: string;
    notes?: string;
  };
  error?: string;
}

export interface UnitsResult {
  success: boolean;
  data?: Array<{
    unit_number: string;
    building_name: string;
    leaseholder_name?: string;
    leaseholder_email?: string;
    leaseholder_phone?: string;
  }>;
  error?: string;
}

/**
 * UNIFIED LEASEHOLDER SEARCH
 * 
 * This function provides the single source of truth for leaseholder queries.
 * Both Ask Bloc AI and Outlook Add-in AI will use this function.
 */
export async function findLeaseholder(
  unit: string, 
  building: string, 
  userId?: string
): Promise<LeaseholderResult> {
  try {
    console.log(`🔍 UNIFIED: Searching for leaseholder - Unit ${unit} at ${building}`);
    
    // Step 1: Try comprehensive database search first
    const comprehensiveResults = await searchEntireDatabase(
      `leaseholder unit ${unit} ${building}`, 
      userId
    );
    
    if (comprehensiveResults.leaseholders.length > 0) {
      console.log('✅ UNIFIED: Found via comprehensive search');
      
      // Find the best match
      const bestMatch = comprehensiveResults.leaseholders.find(lh => 
        lh.units && lh.units.some((u: any) => 
          u.unit_number === unit || 
          u.unit_number === `Flat ${unit}` ||
          u.unit_number === `Unit ${unit}`
        ) &&
        lh.buildings && lh.buildings.some((b: any) => 
          b.name.toLowerCase().includes(building.toLowerCase())
        )
      );
      
      if (bestMatch) {
        const unitData = bestMatch.units.find((u: any) => 
          u.unit_number === unit || 
          u.unit_number === `Flat ${unit}` ||
          u.unit_number === `Unit ${unit}`
        );
        
        const buildingData = bestMatch.buildings.find((b: any) => 
          b.name.toLowerCase().includes(building.toLowerCase())
        );
        
        return {
          success: true,
          data: {
            name: bestMatch.name,
            email: bestMatch.email,
            phone: bestMatch.phone,
            unit_number: unitData?.unit_number || unit,
            building_name: buildingData?.name || building,
            building_id: buildingData?.id || '',
            is_director: bestMatch.is_director,
            director_role: bestMatch.director_role
          }
        };
      }
    }
    
    // Step 2: Try vw_units_leaseholders view directly
    console.log('🔄 UNIFIED: Trying vw_units_leaseholders view...');
    
    const searches = [
      // Exact unit match with building name
      supabase
        .from('vw_units_leaseholders')
        .select('*')
        .eq('unit_number', unit)
        .ilike('building_name', `%${building}%`),
      
      // Alternative unit formats with building name
      supabase
        .from('vw_units_leaseholders')
        .select('*')
        .in('unit_number', [unit, `Flat ${unit}`, `Unit ${unit}`, `Apartment ${unit}`])
        .ilike('building_name', `%${building}%`)
    ];
    
    for (const search of searches) {
      const { data, error } = await search.limit(5);
      if (!error && data && data.length > 0) {
        console.log('✅ UNIFIED: Found via vw_units_leaseholders view');
        
        return {
          success: true,
          data: {
            name: data[0].leaseholder_name,
            email: data[0].leaseholder_email,
            phone: data[0].leaseholder_phone,
            unit_number: data[0].unit_number,
            building_name: data[0].building_name,
            building_id: data[0].building_id,
            is_director: data[0].is_director,
            director_role: data[0].director_role
          }
        };
      }
    }
    
    // Step 3: Try direct table queries as fallback
    console.log('🔄 UNIFIED: Trying direct table queries...');
    
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select(`
        id, unit_number, building_id,
        leaseholders(id, name, email, phone, is_director, director_role)
      `)
      .or(`unit_number.eq.${unit},unit_number.eq.Flat ${unit},unit_number.eq.Unit ${unit}`)
      .limit(5);
    
    if (!unitsError && units && units.length > 0) {
      const unitData = units[0];
      const leaseholder = unitData.leaseholders && unitData.leaseholders.length > 0 
        ? unitData.leaseholders[0] 
        : null;
      
      if (leaseholder) {
        console.log('✅ UNIFIED: Found via direct table queries');
        
        return {
          success: true,
          data: {
            name: leaseholder.name,
            email: leaseholder.email,
            phone: leaseholder.phone,
            unit_number: unitData.unit_number,
            building_name: unitData.buildings.name,
            building_id: unitData.building_id,
            is_director: leaseholder.is_director,
            director_role: leaseholder.director_role
          }
        };
      }
    }
    
    // Step 4: No data found - return helpful suggestions
    console.log('❌ UNIFIED: No leaseholder data found');
    
    // Get available units in the building for suggestions
    let suggestions: any[] = [];
    const { data: availableUnits } = await supabase
      .from('vw_units_leaseholders')
      .select('unit_number, building_name')
      .ilike('building_name', `%${building}%`)
      .limit(10);
    
    suggestions = availableUnits || [];
    
    return {
      success: false,
      error: `No leaseholder found for unit ${unit} at ${building}`,
      suggestions
    };
    
  } catch (error) {
    console.error('❌ UNIFIED: Error in findLeaseholder:', error);
    return {
      success: false,
      error: 'Database connection failed'
    };
  }
}

/**
 * UNIFIED BUILDING SEARCH
 * 
 * Single source of truth for building information queries.
 */
export async function findBuilding(
  buildingName: string, 
  userId?: string
): Promise<BuildingResult> {
  try {
    console.log(`🔍 UNIFIED: Searching for building - ${buildingName}`);
    
    // Try comprehensive search first
    const comprehensiveResults = await searchEntireDatabase(
      `building ${buildingName}`, 
      userId
    );
    
    if (comprehensiveResults.buildings.length > 0) {
      const building = comprehensiveResults.buildings[0];
      console.log('✅ UNIFIED: Found building via comprehensive search');
      
      return {
        success: true,
        data: {
          name: building.name,
          address: building.address,
          unit_count: building.unit_count,
          building_manager_name: building.building_manager_name,
          building_manager_email: building.building_manager_email,
          building_manager_phone: building.building_manager_phone,
          entry_code: building.entry_code,
          gate_code: building.gate_code,
          access_notes: building.access_notes,
          notes: building.notes
        }
      };
    }
    
    // Fallback to direct query
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        id, name, address, unit_count, notes,
        building_manager_name, building_manager_email, building_manager_phone,
        entry_code, gate_code, access_notes
      `)
      .ilike('name', `%${buildingName}%`)
      .limit(1)
      .single();
    
    if (error || !data) {
      return {
        success: false,
        error: `Building "${buildingName}" not found`
      };
    }
    
    console.log('✅ UNIFIED: Found building via direct query');
    
    return {
      success: true,
      data: {
        name: data.name,
        address: data.address,
        unit_count: data.unit_count,
        building_manager_name: data.building_manager_name,
        building_manager_email: data.building_manager_email,
        building_manager_phone: data.building_manager_phone,
        entry_code: data.entry_code,
        gate_code: data.gate_code,
        access_notes: data.access_notes,
        notes: data.notes
      }
    };
    
  } catch (error) {
    console.error('❌ UNIFIED: Error in findBuilding:', error);
    return {
      success: false,
      error: 'Database connection failed'
    };
  }
}

/**
 * UNIFIED UNITS SEARCH
 * 
 * Single source of truth for unit listing queries.
 */
export async function findUnitsInBuilding(
  buildingName: string, 
  userId?: string
): Promise<UnitsResult> {
  try {
    console.log(`🔍 UNIFIED: Searching for units in building - ${buildingName}`);
    
    // Try comprehensive search first
    const comprehensiveResults = await searchEntireDatabase(
      `units ${buildingName}`, 
      userId
    );
    
    if (comprehensiveResults.units.length > 0) {
      console.log('✅ UNIFIED: Found units via comprehensive search');
      
      const units = comprehensiveResults.units.map(unit => ({
        unit_number: unit.unit_number,
        building_name: unit.buildings?.name || buildingName,
        leaseholder_name: unit.leaseholders?.name,
        leaseholder_email: unit.leaseholders?.email,
        leaseholder_phone: unit.leaseholders?.phone
      }));
      
      return {
        success: true,
        data: units
      };
    }
    
    // Fallback to direct query - search by building name in the view
    const { data: units, error } = await supabase
      .from('vw_units_leaseholders')
      .select('unit_number, building_name, leaseholder_name, leaseholder_email, leaseholder_phone')
      .ilike('building_name', `%${buildingName}%`)
      .order('unit_number');
    
    if (error) {
      return {
        success: false,
        error: 'Failed to fetch units'
      };
    }
    
    console.log('✅ UNIFIED: Found units via direct query');
    
    return {
      success: true,
      data: units || []
    };
    
  } catch (error) {
    console.error('❌ UNIFIED: Error in findUnitsInBuilding:', error);
    return {
      success: false,
      error: 'Database connection failed'
    };
  }
}

/**
 * UNIFIED RESPONSE GENERATORS
 * 
 * These functions ensure both AI systems return identical formatted responses.
 */

export class UnifiedResponseGenerator {
  
  /**
   * Generate leaseholder response with consistent formatting
   */
  static generateLeaseholderResponse(result: LeaseholderResult): string {
    if (!result.success) {
      let response = `I couldn't find the specified unit in the specified building in your verified property database.`;
      
      if (result.suggestions && result.suggestions.length > 0) {
        const unitList = [...new Set(result.suggestions.map(s => s.unit_number))];
        response += `\n\nAvailable units in this building: ${unitList.slice(0, 5).join(', ')}`;
      } else {
        response += `\n\nThis could mean:
• The unit number might be listed differently (e.g., 'Flat X')
• The building name might vary in your records
• This property isn't in your database yet`;
      }
      
      return response + `\n\n📊 **Source:** Verified property database search`;
    }
    
    const leaseholder = result.data!;
    let response = `**${leaseholder.name}** is the leaseholder of unit ${leaseholder.unit_number}, ${leaseholder.building_name}`;
    
    if (leaseholder.email) {
      response += `\n📧 ${leaseholder.email}`;
    }
    
    if (leaseholder.phone) {
      response += `\n📞 ${leaseholder.phone}`;
    }
    
    if (leaseholder.is_director) {
      response += `\n👔 Role: ${leaseholder.director_role || 'Director'}`;
    }
    
    return response + `\n\n📊 **Source:** Verified leaseholder records`;
  }
  
  /**
   * Generate building response with consistent formatting
   */
  static generateBuildingResponse(result: BuildingResult): string {
    if (!result.success) {
      return `No information found for "${result.error?.split('"')[1] || 'the specified building'}" in your verified property database.\n\n📊 **Source:** Property database search`;
    }
    
    const building = result.data!;
    let response = `**${building.name}**`;
    
    if (building.address) {
      response += `\n📍 ${building.address}`;
    }
    
    if (building.unit_count) {
      response += `\n🏠 ${building.unit_count} units`;
    }
    
    if (building.building_manager_name) {
      response += `\n👤 Manager: ${building.building_manager_name}`;
      if (building.building_manager_phone) {
        response += ` (${building.building_manager_phone})`;
      }
    }
    
    if (building.entry_code) {
      response += `\n🚪 Entry code: ${building.entry_code}`;
    }
    
    if (building.gate_code) {
      response += `\n🚧 Gate code: ${building.gate_code}`;
    }
    
    if (building.access_notes) {
      response += `\n📝 Access notes: ${building.access_notes}`;
    }
    
    return response + `\n\n📊 **Source:** Verified building records`;
  }
  
  /**
   * Generate units response with consistent formatting
   */
  static generateUnitsResponse(result: UnitsResult): string {
    if (!result.success) {
      return `No units found for "${result.error?.split('"')[1] || 'the specified building'}" in your verified property database.\n\n📊 **Source:** Property database search`;
    }
    
    const units = result.data!;
    
    if (units.length === 0) {
      return `No units found in the specified building.\n\n📊 **Source:** Property database search`;
    }
    
    let response = `**${units[0].building_name}** has ${units.length} units:\n\n`;
    
    units.forEach(unit => {
      response += `• **Unit ${unit.unit_number}**`;
      if (unit.leaseholder_name) {
        response += ` - ${unit.leaseholder_name}`;
        if (unit.leaseholder_email) {
          response += ` (${unit.leaseholder_email})`;
        }
      } else {
        response += ` - No leaseholder assigned`;
      }
      response += '\n';
    });
    
    return response + `\n📊 **Source:** Verified property database`;
  }
}

/**
 * UNIFIED AI PROCESSOR
 * 
 * This is the main function that processes all AI queries with comprehensive
 * database access, industry knowledge, and email functionality.
 */
export class UnifiedAIProcessor {
  
  /**
   * Process any AI query with full context and capabilities
   */
  static async processQuery(
    prompt: string,
    userId?: string,
    buildingId?: string,
    contextType: string = 'general',
    emailContext?: any,
    tone: string = 'Professional'
  ): Promise<{
    success: boolean;
    response: string;
    metadata: any;
    source: string;
  }> {
    try {
      console.log('🤖 UNIFIED: Processing query with full capabilities');
      console.log('🤖 UNIFIED: Parameters:', { prompt, userId, buildingId, contextType, emailContext: !!emailContext, tone });
      
      // Step 1: Check pinned FAQs first
      const faqHit = INDUSTRY_KNOWLEDGE.faqs.find(f => f.test.test(prompt));
      if (faqHit) {
        console.log('✅ UNIFIED: FAQ hit found');
        return {
          success: true,
          response: faqHit.answer,
          metadata: { source: 'pinned_faq', confidence: 95 },
          source: 'Industry Knowledge Base'
        };
      }
      
      // Step 2: Determine context and build system prompt
      const context = AIContextHandler.determineContext(prompt);
      const systemPrompt = await AIContextHandler.buildPrompt(
        context,
        prompt,
        buildingId
      );
      
      // Step 3: Gather comprehensive building context
      let buildingContext = '';
      const contextMetadata: any = {};
      
      if (buildingId) {
        buildingContext = await this.gatherBuildingContext(buildingId);
        contextMetadata.buildingId = buildingId;
      }
      
      // Step 4: Perform comprehensive database search
      const comprehensiveResults = await searchEntireDatabase(prompt, userId);
      console.log('🔍 UNIFIED: Comprehensive search results:', {
        buildings: comprehensiveResults.buildings.length,
        units: comprehensiveResults.units.length,
        leaseholders: comprehensiveResults.leaseholders.length,
        documents: comprehensiveResults.documents.length,
        compliance: comprehensiveResults.compliance.length
      });
      
      // Step 5: Handle specific query types with database data
      const specificResult = await this.handleSpecificQuery(prompt, userId);
      if (specificResult) {
        return specificResult;
      }
      
      // Step 6: Build comprehensive context for AI
      let fullPrompt = prompt;
      
      if (buildingContext) {
        fullPrompt = `Building Context:\n${buildingContext}\n\nQuestion: ${prompt}`;
      }
      
      // Add comprehensive search results to context
      if (comprehensiveResults.buildings.length > 0 || comprehensiveResults.leaseholders.length > 0) {
        fullPrompt += `\n\nDatabase Context:\n`;
        
        if (comprehensiveResults.buildings.length > 0) {
          fullPrompt += `Buildings: ${comprehensiveResults.buildings.map(b => `${b.name} (${b.address})`).join(', ')}\n`;
        }
        
        if (comprehensiveResults.leaseholders.length > 0) {
          fullPrompt += `Leaseholders: ${comprehensiveResults.leaseholders.map(l => `${l.name} - ${l.units?.[0]?.unit_number || 'Unknown unit'}`).join(', ')}\n`;
        }
        
        if (comprehensiveResults.units.length > 0) {
          fullPrompt += `Units: ${comprehensiveResults.units.map(u => `Unit ${u.unit_number} - ${u.buildings?.name || 'Unknown building'}`).join(', ')}\n`;
        }
      }
      
      // Add email context if available
      if (emailContext) {
        fullPrompt += `\n\nEmail Context:\nSubject: ${emailContext.subject || 'No subject'}\nFrom: ${emailContext.from || 'Unknown sender'}\nBody: ${emailContext.body || 'No body'}`;
      }
      
      // Add leak policy if relevant
      const isLeakIssue = /\b(leak|water ingress|ceiling leak|dripping|escape of water|leaking|damp|stain)\b/i.test(prompt);
      if (isLeakIssue) {
        fullPrompt += `\n\n${INDUSTRY_KNOWLEDGE.leakPolicy}`;
      }
      
      // Step 7: Call OpenAI with comprehensive context
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });
      
      const aiResponse = completion.choices[0]?.message?.content || 'No response generated';
      
      // Step 8: Process response based on context
      const processedResponse = AIContextHandler.processResponse(aiResponse, context);
      const displayContent = AIContextHandler.formatResponseForDisplay(processedResponse);
      
      return {
        success: true,
        response: displayContent,
        metadata: {
          contextType,
          buildingId,
          hasEmailContext: !!emailContext,
          comprehensiveSearchUsed: true,
          searchResults: {
            buildings: comprehensiveResults.buildings.length,
            units: comprehensiveResults.units.length,
            leaseholders: comprehensiveResults.leaseholders.length,
            documents: comprehensiveResults.documents.length,
            compliance: comprehensiveResults.compliance.length
          }
        },
        source: 'Unified AI Processor'
      };
      
    } catch (error) {
      console.error('❌ UNIFIED: Error in processQuery:', error);
      console.error('❌ UNIFIED: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ UNIFIED: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        cause: error instanceof Error ? error.cause : undefined
      });
      return {
        success: false,
        response: 'I encountered an error while processing your request. Please try again.',
        metadata: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : 'Unknown',
          unified: true
        },
        source: 'Error Recovery'
      };
    }
  }
  
  /**
   * Handle specific query types that can be answered directly from database
   */
  private static async handleSpecificQuery(
    prompt: string, 
    userId?: string
  ): Promise<{ success: boolean; response: string; metadata: any; source: string } | null> {
    
    // Check for leaseholder queries
    const { unit, building } = UnifiedQueryParser.parseLeaseholderQuery(prompt);
    if (unit && building) {
      const result = await findLeaseholder(unit, building, userId);
      return {
        success: true,
        response: UnifiedResponseGenerator.generateLeaseholderResponse(result),
        metadata: { queryType: 'leaseholder', unit, building },
        source: 'Database Query'
      };
    }
    
    // Check for building queries
    const { building: buildingFromQuery } = UnifiedQueryParser.parseBuildingQuery(prompt);
    if (buildingFromQuery) {
      // Check if asking for unit count
      const isUnitCountQuery = /\b(how many|count|total|units?|flats?)\b/i.test(prompt);
      if (isUnitCountQuery) {
        const result = await findUnitsInBuilding(buildingFromQuery, userId);
        return {
          success: true,
          response: UnifiedResponseGenerator.generateUnitsResponse(result),
          metadata: { queryType: 'units', building: buildingFromQuery },
          source: 'Database Query'
        };
      } else {
        const result = await findBuilding(buildingFromQuery, userId);
        return {
          success: true,
          response: UnifiedResponseGenerator.generateBuildingResponse(result),
          metadata: { queryType: 'building', building: buildingFromQuery },
          source: 'Database Query'
        };
      }
    }
    
    return null; // Let the main AI processor handle it
  }
  
  /**
   * Gather comprehensive building context
   */
  private static async gatherBuildingContext(buildingId: string): Promise<string> {
    try {
      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .select(`
          id, name, address, unit_count, notes, is_hrb,
          building_setup (
            structure_type, client_name, client_contact, client_email, operational_notes
          )
        `)
        .eq('id', buildingId)
        .single();

      if (buildingData && !buildingError) {
        // Fetch units and leaseholders
        const { data: units, error: unitsError } = await supabase
          .from('units')
          .select(`
            id, unit_number, floor, type, leaseholder_id,
            leaseholders (id, name, email, phone)
          `)
          .eq('building_id', buildingId)
          .order('unit_number', { ascending: true });

        if (units && !unitsError) {
          return `Building Information:
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

Notes & Instructions: ${buildingData.notes || 'No notes added yet'}`;
        }
      }
    } catch (error) {
      console.warn('Could not gather building context:', error);
    }
    
    return '';
  }
}

/**
 * UNIFIED QUERY PARSER
 * 
 * Single source of truth for parsing user queries.
 */
export class UnifiedQueryParser {
  
  static parseLeaseholderQuery(prompt: string): { unit?: string; building?: string } {
    const promptLower = prompt.toLowerCase();
    
    // Extract unit number - simpler and more accurate
    const unitMatch = promptLower.match(/(?:unit|flat|apartment|apt)\s*([0-9]+[a-zA-Z]?)/);
    const unit = unitMatch ? unitMatch[1] : undefined;
    
    // Extract building name - much simpler approach
    let building: string | undefined;
    
    // Look for "at [Building Name]" pattern
    const atMatch = prompt.match(/at\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/i);
    if (atMatch) {
      building = atMatch[1].trim();
    } else {
      // Look for building name with common suffixes
      const buildingMatch = prompt.match(/([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(?:house|court|place|tower|manor|lodge|building)\b/i);
      if (buildingMatch) {
        building = buildingMatch[1].trim();
      }
    }
    
    console.log('🔍 PARSER DEBUG:', { prompt, unit, building, promptLower });
    
    return { unit, building };
  }
  
  static parseBuildingQuery(prompt: string): { building?: string } {
    const promptLower = prompt.toLowerCase();
    
    // Also try to extract building name from "how many units does [building] have" pattern
    const unitCountMatch = promptLower.match(/how many units does ([a-zA-Z0-9\s]+) have/i);
    if (unitCountMatch) {
      console.log('🔍 BUILDING PARSER DEBUG: Unit count match found:', unitCountMatch[1].trim());
      return { building: unitCountMatch[1].trim() };
    }
    
    // Look for building-related keywords
    const buildingKeywords = ['house', 'court', 'building', 'apartment', 'residence', 'manor', 'gardens', 'heights', 'view', 'plaza'];
    const words = promptLower.split(/\s+/);
    
    for (let i = 0; i < words.length - 1; i++) {
      const potentialName = words.slice(i, i + 2).join(' ');
      if (buildingKeywords.some(keyword => potentialName.includes(keyword))) {
        console.log('🔍 BUILDING PARSER DEBUG: Building keyword match found:', potentialName);
        return { building: potentialName };
      }
    }
    
    console.log('🔍 BUILDING PARSER DEBUG: No building found in:', prompt);
    return {};
  }
}
