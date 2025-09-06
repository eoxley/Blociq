/**
 * COMPREHENSIVE UNIFIED AI SYSTEM
 * 
 * This is the single source of truth for ALL AI functionality across both
 * Ask Bloc AI and Outlook Add-in AI systems. It includes every feature,
 * logic, helper, and capability from both systems.
 * 
 * Features Included:
 * - Complete database access and queries
 * - Email generation and reply logic
 * - Letter generation templates
 * - HR and compliance logic
 * - Leak triage policy
 * - Lease analysis and legal context
 * - Document management
 * - Building management
 * - Anti-hallucination safeguards
 * - Response formatting and templates
 * - Industry knowledge and FAQs
 * - Context handling (email, building, leaseholder)
 * - Advanced query parsing
 * - Error handling and fallbacks
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

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * COMPREHENSIVE INDUSTRY KNOWLEDGE BASE
 * 
 * All industry knowledge, FAQs, policies, and templates from both systems
 */
export const COMPREHENSIVE_KNOWLEDGE = {
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
      test: /\bbsr\b/i,
      answer: "The BSR (Building Safety Regulator) is a key component of the UK's building safety framework, established under the Building Safety Act 2022. It oversees the safety and standards of buildings, particularly high-rise residential buildings. The BSR's responsibilities include regulating building control, enforcing safety standards, and providing guidance to building owners, managers, and residents on building safety matters."
    },
    {
      test: /\bpib\s+box\b/i,
      answer: "A PIB (Post Indicator Box) is a crucial component of a building's fire safety system. It should be located in a position that is easily accessible to emergency services, typically near the main entrance or in a clearly marked, unobstructed location. The PIB box should be close to the main fire control systems it monitors and must comply with local fire safety regulations and building codes."
    }
  ],

  // Leak triage policy (from Ask Bloc AI)
  leakPolicy: `
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
`,

  // System prompts for different context types
  systemPrompts: {
    general: `You are BlocIQ, a UK property management AI assistant. You help property managers with building management, compliance, leaseholder relations, and operational tasks.`,
    
    email_reply: `You are BlocIQ, a UK property management AI assistant specializing in professional email communication. Generate clear, professional email responses that are appropriate for property management.`,
    
    major_works: `You are BlocIQ, a UK property management AI assistant specializing in major works projects. Help with project planning, cost analysis, leaseholder consultation, and Section 20 processes.`,
    
    public: `You are BlocIQ, a helpful AI assistant for UK property management. Provide general advice about property management, compliance, and best practices. Keep responses informative but not building-specific.`,
    
    compliance: `You are BlocIQ, a UK property management AI assistant specializing in compliance and regulatory matters. Help with health and safety, fire safety, building regulations, and compliance tracking.`,
    
    leaseholder: `You are BlocIQ, a UK property management AI assistant specializing in leaseholder relations. Help with communication, service charge queries, maintenance requests, and leaseholder support.`,

    outlook_addin: `You are BlocIQ, a UK property management AI assistant integrated with Outlook. You help with email responses, property queries, and provide comprehensive property management support directly within email workflows.`
  },

  // Email templates and generation logic
  emailTemplates: {
    leakReport: {
      subject: "Leak Report - {building} - {unit}",
      template: `Dear {leaseholder_name},

Thank you for reporting the leak issue at {building}, {unit}.

Following our leak triage policy, I need to ask you to:

1. **First step - Contact upstairs**: Please try to contact the flat above to check if they can identify and stop the source (e.g., check stop taps, appliances).

2. **If unresolved**: We will arrange for a plumber to investigate with both parties' consent.

**Important cost information:**
- If the source is within your demise (private pipework), you will be liable for costs
- If the source is communal (roof/communal stack), the block budget covers repairs
- If costs exceed the building insurance excess, we may make a block insurance claim

Please let me know the outcome of your contact with the upstairs flat, and I'll proceed accordingly.

Best regards,
Property Management Team`
    },

    section20Notice: {
      subject: "Section 20 Consultation - {works_description}",
      template: `Dear Leaseholder,

**SECTION 20 CONSULTATION NOTICE**

We are proposing to carry out the following works: {works_description}

**Estimated cost per leaseholder:** £{estimated_cost}

**Consultation process:**
1. This notice invites your observations
2. We will obtain at least 2 estimates
3. You may nominate contractors
4. We will consider all responses before proceeding

**Your rights:**
- You have 30 days to respond
- You may nominate contractors
- You may make observations about the works

Please respond by {response_deadline}.

Best regards,
Property Management Team`
    }
  },

  // Letter generation templates
  letterTemplates: {
    rentDemand: {
      template: `[Date]

Dear {leaseholder_name},

**RENT DEMAND NOTICE**

Property: {building}, {unit}
Outstanding Amount: £{amount}
Due Date: {due_date}

This is a formal demand for payment of the outstanding rent/service charges.

**Payment methods:**
- Bank transfer: {bank_details}
- Online portal: {portal_link}
- Cheque payable to: {payee}

**Important:** Failure to pay may result in legal action.

Yours sincerely,
Property Management Team`
    },

    breachNotice: {
      template: `[Date]

Dear {leaseholder_name},

**BREACH OF LEASE NOTICE**

Property: {building}, {unit}
Breach: {breach_description}

You are in breach of your lease terms regarding: {breach_details}

**Required action:**
{required_action}

**Timescale:** {timescale}

**Consequences:** Failure to remedy may result in forfeiture proceedings.

Yours sincerely,
Property Management Team`
    }
  },

  // HR and compliance logic
  complianceRules: {
    fireSafety: {
      requirements: [
        "Annual fire risk assessment",
        "Monthly fire alarm testing",
        "Quarterly emergency lighting test",
        "Annual fire door inspection",
        "Regular evacuation drill"
      ],
      penalties: "Failure to comply can result in unlimited fines and imprisonment"
    },
    
    asbestos: {
      requirements: [
        "Management survey for buildings pre-2000",
        "Asbestos register maintenance",
        "Annual review of asbestos management plan",
        "Staff training on asbestos awareness"
      ],
      penalties: "Criminal prosecution and unlimited fines"
    },

    gasSafety: {
      requirements: [
        "Annual gas safety check",
        "Gas safety certificate for each appliance",
        "Landlord gas safety record (LGSR)",
        "24-hour emergency contact"
      ],
      penalties: "Criminal prosecution and unlimited fines"
    }
  }
};

/**
 * COMPREHENSIVE QUERY PARSER
 * 
 * Handles all types of queries with advanced parsing logic
 */
export class ComprehensiveQueryParser {
  
  static parseLeaseholderQuery(prompt: string): { unit?: string; building?: string } {
    const promptLower = prompt.toLowerCase();
    
    // Extract unit number - multiple formats
    const unitPatterns = [
      /(?:unit|flat|apartment|apt)\s*([0-9]+[a-zA-Z]?)/,
      /(?:^|\s)([0-9]+[a-zA-Z]?)(?:\s+(?:at|in|of))/,
      /(?:^|\s)([0-9]+[a-zA-Z]?)(?:\s|$|,|\?)/
    ];
    
    let unit: string | undefined;
    for (const pattern of unitPatterns) {
      const match = promptLower.match(pattern);
      if (match) {
        unit = match[1];
        break;
      }
    }
    
    // Extract building name - multiple patterns
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
    
    return { unit, building };
  }
  
  static parseBuildingQuery(prompt: string): { building?: string } {
    const promptLower = prompt.toLowerCase();
    
    // Look for "how many units does [building] have" pattern
    const unitCountMatch = promptLower.match(/how many units does ([a-zA-Z0-9\s]+) have/i);
    if (unitCountMatch) {
      return { building: unitCountMatch[1].trim() };
    }
    
    // Look for building-related keywords
    const buildingKeywords = ['house', 'court', 'building', 'apartment', 'residence', 'manor', 'gardens', 'heights', 'view', 'plaza'];
    const words = promptLower.split(/\s+/);
    
    for (let i = 0; i < words.length - 1; i++) {
      const potentialName = words.slice(i, i + 2).join(' ');
      if (buildingKeywords.some(keyword => potentialName.includes(keyword))) {
        return { building: potentialName };
      }
    }
    
    return {};
  }

  static parseEmailQuery(prompt: string): { 
    isEmailGeneration: boolean; 
    isReplyGeneration: boolean; 
    template?: string; 
    context?: any 
  } {
    const promptLower = prompt.toLowerCase();
    
    const emailKeywords = ['email', 'reply', 'respond', 'send', 'draft', 'write'];
    const isEmailRelated = emailKeywords.some(keyword => promptLower.includes(keyword));
    
    if (!isEmailRelated) {
      return { isEmailGeneration: false, isReplyGeneration: false };
    }
    
    // Check for specific email templates
    const leakKeywords = ['leak', 'water', 'dripping', 'ingress'];
    const section20Keywords = ['section 20', 'consultation', 'works'];
    const rentKeywords = ['rent', 'payment', 'demand'];
    const breachKeywords = ['breach', 'violation', 'complaint'];
    
    let template: string | undefined;
    if (leakKeywords.some(keyword => promptLower.includes(keyword))) {
      template = 'leakReport';
    } else if (section20Keywords.some(keyword => promptLower.includes(keyword))) {
      template = 'section20Notice';
    } else if (rentKeywords.some(keyword => promptLower.includes(keyword))) {
      template = 'rentDemand';
    } else if (breachKeywords.some(keyword => promptLower.includes(keyword))) {
      template = 'breachNotice';
    }
    
    return {
      isEmailGeneration: true,
      isReplyGeneration: promptLower.includes('reply') || promptLower.includes('respond'),
      template,
      context: {}
    };
  }
}

/**
 * COMPREHENSIVE RESPONSE GENERATOR
 * 
 * Generates all types of responses with consistent formatting
 */
export class ComprehensiveResponseGenerator {
  
  static generateLeaseholderResponse(result: any): string {
    if (!result.success) {
      let response = `I couldn't find the specified unit in the specified building in your verified property database.`;
      
      if (result.suggestions && result.suggestions.length > 0) {
        const unitList = [...new Set(result.suggestions.map((s: any) => s.unit_number))];
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

  static generateUnitsResponse(result: any): string {
    if (!result.success) {
      return `No units found for "the specified building" in your verified property database.\n\n📊 **Source:** Property database search`;
    }
    
    const units = result.data || [];
    const unitCount = units.length;
    
    if (unitCount === 0) {
      return `No units found for "the specified building" in your verified property database.\n\n📊 **Source:** Property database search`;
    }
    
    let response = `The building has ${unitCount} units.`;
    
    if (unitCount <= 10) {
      const unitNumbers = units.map((u: any) => u.unit_number).join(', ');
      response += `\n\nUnits: ${unitNumbers}`;
    }
    
    return response + `\n\n📊 **Source:** Property database search`;
  }

  static generateBuildingResponse(result: any): string {
    if (!result.success) {
      return `Building information not found in your verified property database.\n\n📊 **Source:** Property database search`;
    }
    
    const building = result.data!;
    let response = `**${building.name}**\n📍 ${building.address}`;
    
    if (building.unit_count) {
      response += `\n🏠 ${building.unit_count} units`;
    }
    
    if (building.building_manager_name) {
      response += `\n👤 Manager: ${building.building_manager_name}`;
    }
    
    if (building.entry_code) {
      response += `\n🚪 Entry code: ${building.entry_code}`;
    }
    
    return response + `\n\n📊 **Source:** Property database search`;
  }

  static generateEmailResponse(template: string, context: any, emailContext?: any): string {
    const templateData = COMPREHENSIVE_KNOWLEDGE.emailTemplates[template as keyof typeof COMPREHENSIVE_KNOWLEDGE.emailTemplates];
    
    if (!templateData) {
      return "I can help you draft an email, but I need more specific information about what type of email you'd like to send.";
    }
    
    let response = `**Email Template: ${template}**\n\n`;
    response += `**Subject:** ${templateData.subject}\n\n`;
    response += `**Body:**\n${templateData.template}`;
    
    if (emailContext) {
      response += `\n\n**Email Context:**\n`;
      response += `From: ${emailContext.from || 'Unknown'}\n`;
      response += `Subject: ${emailContext.subject || 'No subject'}\n`;
      response += `Date: ${emailContext.date || 'Unknown'}\n`;
    }
    
    return response;
  }
}

/**
 * COMPREHENSIVE UNIFIED AI PROCESSOR
 * 
 * Main processor that handles all queries with complete functionality
 */
export class ComprehensiveUnifiedAIProcessor {
  
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
      console.log('🤖 COMPREHENSIVE: Processing query with full capabilities');
      console.log('🤖 COMPREHENSIVE: Parameters:', { prompt, userId, buildingId, contextType, emailContext: !!emailContext, tone });
      
      // Step 1: Check pinned FAQs first
      const faqHit = COMPREHENSIVE_KNOWLEDGE.faqs.find(f => f.test.test(prompt));
      if (faqHit) {
        console.log('✅ COMPREHENSIVE: FAQ hit found');
        return {
          success: true,
          response: faqHit.answer,
          metadata: { source: 'pinned_faq', confidence: 95 },
          source: 'Industry Knowledge Base'
        };
      }
      
      // Step 2: Check for email generation requests
      const emailQuery = ComprehensiveQueryParser.parseEmailQuery(prompt);
      if (emailQuery.isEmailGeneration) {
        console.log('✅ COMPREHENSIVE: Email generation request');
        const response = ComprehensiveResponseGenerator.generateEmailResponse(
          emailQuery.template || 'general',
          emailQuery.context,
          emailContext
        );
        return {
          success: true,
          response,
          metadata: { queryType: 'email_generation', template: emailQuery.template },
          source: 'Email Template System'
        };
      }
      
      // Step 3: Handle specific database queries
      const specificResult = await this.handleSpecificQuery(prompt, userId);
      if (specificResult) {
        console.log('✅ COMPREHENSIVE: Specific query handled successfully');
        return specificResult;
      }
      
      // Step 4: Comprehensive database search
      console.log('🔍 COMPREHENSIVE: Performing comprehensive database search...');
      const comprehensiveResults = await searchEntireDatabase(prompt, userId);
      
      console.log('🔍 COMPREHENSIVE: Search results:', {
        buildings: comprehensiveResults.buildings.length,
        units: comprehensiveResults.units.length,
        leaseholders: comprehensiveResults.leaseholders.length,
        documents: comprehensiveResults.documents.length,
        compliance: comprehensiveResults.compliance.length
      });
      
      // Step 5: Build comprehensive context for AI
      let fullPrompt = prompt;
      
      // Add building context if available
      if (buildingId) {
        const buildingContext = await this.gatherBuildingContext(buildingId);
        if (buildingContext) {
          fullPrompt = `Building Context:\n${buildingContext}\n\nQuestion: ${prompt}`;
        }
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
        fullPrompt += `\n\n${COMPREHENSIVE_KNOWLEDGE.leakPolicy}`;
      }
      
      // Step 6: Call OpenAI with comprehensive context
      const systemPrompt = COMPREHENSIVE_KNOWLEDGE.systemPrompts[contextType as keyof typeof COMPREHENSIVE_KNOWLEDGE.systemPrompts] || 
                          COMPREHENSIVE_KNOWLEDGE.systemPrompts.general;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });
      
      const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
      
      console.log('✅ COMPREHENSIVE: AI response generated successfully');
      
      return {
        success: true,
        response,
        metadata: {
          context: contextType,
          wordCount: response.split(' ').length,
          comprehensiveSearchUsed: true,
          searchMetadata: {
            buildings: comprehensiveResults.buildings.length,
            units: comprehensiveResults.units.length,
            leaseholders: comprehensiveResults.leaseholders.length,
            documents: comprehensiveResults.documents.length,
            compliance: comprehensiveResults.compliance.length
          }
        },
        source: 'Comprehensive AI Processor'
      };
      
    } catch (error) {
      console.error('❌ COMPREHENSIVE: Error in processQuery:', error);
      return {
        success: false,
        response: 'I encountered an error while processing your request. Please try again.',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
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
    const { unit, building } = ComprehensiveQueryParser.parseLeaseholderQuery(prompt);
    if (unit && building) {
      const result = await this.findLeaseholder(unit, building, userId);
      return {
        success: true,
        response: ComprehensiveResponseGenerator.generateLeaseholderResponse(result),
        metadata: { queryType: 'leaseholder', unit, building },
        source: 'Database Query'
      };
    }
    
    // Check for building queries
    const { building: buildingFromQuery } = ComprehensiveQueryParser.parseBuildingQuery(prompt);
    if (buildingFromQuery) {
      // Check if asking for unit count
      const isUnitCountQuery = /\b(how many|count|total|units?|flats?)\b/i.test(prompt);
      if (isUnitCountQuery) {
        const result = await this.findUnitsInBuilding(buildingFromQuery, userId);
        return {
          success: true,
          response: ComprehensiveResponseGenerator.generateUnitsResponse(result),
          metadata: { queryType: 'units', building: buildingFromQuery },
          source: 'Database Query'
        };
      } else {
        const result = await this.findBuilding(buildingFromQuery, userId);
        return {
          success: true,
          response: ComprehensiveResponseGenerator.generateBuildingResponse(result),
          metadata: { queryType: 'building', building: buildingFromQuery },
          source: 'Database Query'
        };
      }
    }
    
    return null; // Let the main AI processor handle it
  }
  
  /**
   * Find leaseholder in database
   */
  private static async findLeaseholder(unit: string, building: string, userId?: string): Promise<any> {
    try {
      console.log(`🔍 COMPREHENSIVE: Searching for leaseholder - Unit ${unit} at ${building}`);
      
      // Try comprehensive search first
      const comprehensiveResults = await searchEntireDatabase(
        `leaseholder unit ${unit} ${building}`, 
        userId
      );
      
      if (comprehensiveResults.leaseholders.length > 0) {
        console.log('✅ COMPREHENSIVE: Found via comprehensive search');
        
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
      
      // Try vw_units_leaseholders view directly
      console.log('🔄 COMPREHENSIVE: Trying vw_units_leaseholders view...');
      
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
          console.log('✅ COMPREHENSIVE: Found via vw_units_leaseholders view');
          
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
      
      // No data found
      console.log('❌ COMPREHENSIVE: No leaseholder data found');
      
      return {
        success: false,
        error: `No leaseholder found for unit ${unit} at ${building}`,
        suggestions: []
      };
      
    } catch (error) {
      console.error('❌ COMPREHENSIVE: Error in findLeaseholder:', error);
      return {
        success: false,
        error: 'Database error occurred',
        suggestions: []
      };
    }
  }
  
  /**
   * Find units in building
   */
  private static async findUnitsInBuilding(buildingName: string, userId?: string): Promise<any> {
    try {
      console.log(`🔍 COMPREHENSIVE: Searching for units in building - ${buildingName}`);
      
      // Try comprehensive search first
      const comprehensiveResults = await searchEntireDatabase(
        `units ${buildingName}`, 
        userId
      );
      
      if (comprehensiveResults.units.length > 0) {
        console.log('✅ COMPREHENSIVE: Found units via comprehensive search');
        
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
      
      if (!units || units.length === 0) {
        return {
          success: false,
          error: `Building "${buildingName}" not found`
        };
      }
      
      console.log('✅ COMPREHENSIVE: Found units via direct query');
      
      return {
        success: true,
        data: units
      };
      
    } catch (error) {
      console.error('❌ COMPREHENSIVE: Error in findUnitsInBuilding:', error);
      return {
        success: false,
        error: 'Database error occurred'
      };
    }
  }
  
  /**
   * Find building information
   */
  private static async findBuilding(buildingName: string, userId?: string): Promise<any> {
    try {
      console.log(`🔍 COMPREHENSIVE: Searching for building - ${buildingName}`);
      
      // Try comprehensive search first
      const comprehensiveResults = await searchEntireDatabase(
        `building ${buildingName}`, 
        userId
      );
      
      if (comprehensiveResults.buildings.length > 0) {
        const building = comprehensiveResults.buildings[0];
        console.log('✅ COMPREHENSIVE: Found building via comprehensive search');
        
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
      
      return {
        success: false,
        error: `Building "${buildingName}" not found`
      };
      
    } catch (error) {
      console.error('❌ COMPREHENSIVE: Error in findBuilding:', error);
      return {
        success: false,
        error: 'Database error occurred'
      };
    }
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
        let context = `Building: ${buildingData.name}\nAddress: ${buildingData.address}\nUnits: ${buildingData.unit_count || 'Unknown'}`;
        
        if (buildingData.building_setup) {
          context += `\nStructure: ${buildingData.building_setup.structure_type || 'Unknown'}`;
          context += `\nClient: ${buildingData.building_setup.client_name || 'Unknown'}`;
        }
        
        if (buildingData.notes) {
          context += `\nNotes: ${buildingData.notes}`;
        }
        
        return context;
      }
      
      return '';
    } catch (error) {
      console.error('Error gathering building context:', error);
      return '';
    }
  }
}

/**
 * AUTOMATIC SYNCHRONIZATION SYSTEM
 * 
 * Ensures both systems stay in sync automatically
 */
export class SystemSynchronizer {
  
  static async syncBothSystems(prompt: string, userId?: string, buildingId?: string, contextType: string = 'general', emailContext?: any, tone: string = 'Professional') {
    // Process with comprehensive system
    const result = await ComprehensiveUnifiedAIProcessor.processQuery(
      prompt, userId, buildingId, contextType, emailContext, tone
    );
    
    // Both systems will use this same result
    return result;
  }
}
