/**
 * Outlook Add-in Q&A Adapter
 * 
 * Provides deterministic fact-based answers using BlocIQ data and Lease Lab summaries
 * with strict domain locking and British English requirements.
 */

import { createClient } from '@/utils/supabase/server';
import { parseAddinIntent, extractBuildingContext } from '../intent/parseAddinIntent';
import { processUserInput } from '../prompt/addinPrompt';

export interface QAAdapterResult {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
  facts: Array<{
    label: string;
    value: string;
    source: string;
    page?: number;
  }>;
  requiresReview: boolean;
  suggestions: string[];
}

export interface BuildingContext {
  buildingId?: string;
  buildingName?: string;
  unitNumber?: string;
}

/**
 * Create Q&A adapter for Outlook Add-in
 */
export function createAddinQAAdapter() {
  return {
    /**
     * Answer a question using deterministic facts from BlocIQ data
     */
    async answerQuestion(
      userInput: string,
      outlookContext?: any,
      userSettings?: any
    ): Promise<QAAdapterResult> {
      try {
        // Process input for acronyms and domain validation
        const processed = processUserInput(userInput);
        
        // Check if out of scope
        if (processed.isOutOfScope) {
          return {
            answer: "Out of scope for BlocIQ add-in. I only handle UK leasehold and building-safety topics.",
            confidence: 'high',
            sources: [],
            facts: [],
            requiresReview: false,
            suggestions: ['Ask about property management, lease terms, or building safety instead']
          };
        }
        
        // Check for clarification needs
        if (processed.needsClarification.length > 0) {
          const clarification = processed.needsClarification[0];
          return {
            answer: `In BlocIQ, ${clarification} could mean different things. Could you clarify what you mean by "${clarification}"?`,
            confidence: 'medium',
            sources: [],
            facts: [],
            requiresReview: false,
            suggestions: ['Be more specific about what you\'re asking about']
          };
        }
        
        // Extract building context
        const buildingContext = extractBuildingContext(userInput, outlookContext);
        
        // Get building ID if we have building name
        let buildingId: string | undefined;
        if (buildingContext.buildingName) {
          buildingId = await getBuildingId(buildingContext.buildingName);
        }
        
        // Check for Lease Lab summary
        let leaseSummary = null;
        if (buildingId) {
          leaseSummary = await getLeaseSummary(buildingId);
        }
        
        // Generate answer based on available data
        if (leaseSummary) {
          return generateLeaseSummaryAnswer(userInput, leaseSummary, buildingContext);
        } else if (buildingId) {
          return generateBuildingAnswer(userInput, buildingId, buildingContext);
        } else {
          return generateGenericAnswer(userInput, buildingContext);
        }
        
      } catch (error) {
        console.error('Q&A Adapter error:', error);
        return {
          answer: "I encountered an error while processing your question. Please try again.",
          confidence: 'low',
          sources: [],
          facts: [],
          requiresReview: true,
          suggestions: ['Try rephrasing your question or contact support if the issue persists']
        };
      }
    }
  };
}

/**
 * Get building ID from building name
 */
async function getBuildingId(buildingName: string): Promise<string | undefined> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('buildings')
      .select('id')
      .ilike('name', `%${buildingName}%`)
      .limit(1)
      .single();
    
    if (error || !data) return undefined;
    return data.id;
  } catch (error) {
    console.error('Error getting building ID:', error);
    return undefined;
  }
}

/**
 * Get Lease Lab summary for building
 */
async function getLeaseSummary(buildingId: string): Promise<any | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('lease_summaries_v')
      .select('*')
      .eq('linked_building_id', buildingId)
      .eq('doc_type', 'lease')
      .eq('status', 'READY')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return null;
    return data;
  } catch (error) {
    console.error('Error getting lease summary:', error);
    return null;
  }
}

/**
 * Generate answer using Lease Lab summary data
 */
function generateLeaseSummaryAnswer(
  userInput: string,
  leaseSummary: any,
  buildingContext: BuildingContext
): QAAdapterResult {
  const input = userInput.toLowerCase();
  const facts: Array<{ label: string; value: string; source: string; page?: number }> = [];
  const sources: string[] = ['Lease Lab Analysis'];
  
  // Extract relevant facts based on query
  if (input.includes('leaseholder') || input.includes('tenant')) {
    if (leaseSummary.parties?.leaseholder) {
      facts.push({
        label: 'Leaseholder',
        value: leaseSummary.parties.leaseholder.name,
        source: 'Lease Lab',
        page: leaseSummary.parties.leaseholder.source_page
      });
    }
  }
  
  if (input.includes('landlord') || input.includes('freeholder')) {
    if (leaseSummary.parties?.landlord) {
      facts.push({
        label: 'Landlord',
        value: leaseSummary.parties.landlord.name,
        source: 'Lease Lab',
        page: leaseSummary.parties.landlord.source_page
      });
    }
  }
  
  if (input.includes('term') || input.includes('duration') || input.includes('years')) {
    if (leaseSummary.term) {
      if (leaseSummary.term.start_date) {
        facts.push({
          label: 'Lease Start',
          value: leaseSummary.term.start_date,
          source: 'Lease Lab',
          page: leaseSummary.term.source_page
        });
      }
      if (leaseSummary.term.end_date) {
        facts.push({
          label: 'Lease End',
          value: leaseSummary.term.end_date,
          source: 'Lease Lab',
          page: leaseSummary.term.source_page
        });
      }
    }
  }
  
  if (input.includes('repair') || input.includes('maintenance') || input.includes('windows')) {
    if (leaseSummary.repair_matrix) {
      const repairInfo = leaseSummary.repair_matrix.find((r: any) => 
        r.item?.toLowerCase().includes('window') || 
        r.item?.toLowerCase().includes('repair')
      );
      if (repairInfo) {
        facts.push({
          label: 'Repair Obligation',
          value: `${repairInfo.item}: ${repairInfo.responsible_party}`,
          source: 'Lease Lab',
          page: repairInfo.source_page
        });
      }
    }
  }
  
  if (input.includes('service charge') || input.includes('charge')) {
    if (leaseSummary.financials?.service_charge) {
      facts.push({
        label: 'Service Charge',
        value: `£${leaseSummary.financials.service_charge.annual_amount} per annum`,
        source: 'Lease Lab',
        page: leaseSummary.financials.service_charge.source_page
      });
    }
  }
  
  if (input.includes('section 20') || input.includes('s20')) {
    if (leaseSummary.section20) {
      facts.push({
        label: 'Section 20 Threshold',
        value: `£${leaseSummary.section20.threshold_amount} per leaseholder`,
        source: 'Lease Lab',
        page: leaseSummary.section20.source_page
      });
    }
  }
  
  // Generate answer
  let answer = '';
  if (facts.length > 0) {
    answer = `Based on the lease analysis for ${buildingContext.buildingName || 'this building'}:\n\n`;
    facts.forEach(fact => {
      answer += `• ${fact.label}: ${fact.value}`;
      if (fact.page) {
        answer += ` (Lease Lab, p.${fact.page})`;
      }
      answer += '\n';
    });
  } else {
    answer = `The lease analysis for ${buildingContext.buildingName || 'this building'} doesn't specify this information. Upload the document in Lease Lab for a verified analysis.`;
  }
  
  return {
    answer,
    confidence: facts.length > 0 ? 'high' : 'medium',
    sources,
    facts,
    requiresReview: false,
    suggestions: facts.length === 0 ? ['Upload the lease document to Lease Lab for detailed analysis'] : []
  };
}

/**
 * Generate answer using building data (no lease summary)
 */
async function generateBuildingAnswer(
  userInput: string,
  buildingId: string,
  buildingContext: BuildingContext
): Promise<QAAdapterResult> {
  try {
    const supabase = await createClient();
    
    // Get building information
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single();
    
    if (buildingError || !building) {
      return generateGenericAnswer(userInput, buildingContext);
    }
    
    // Get units if asking about units
    const input = userInput.toLowerCase();
    let unitsData = null;
    if (input.includes('unit') || input.includes('flat') || input.includes('apartment')) {
      const { data: units } = await supabase
        .from('vw_units_leaseholders')
        .select('*')
        .eq('building_id', buildingId);
      unitsData = units;
    }
    
    const facts: Array<{ label: string; value: string; source: string; page?: number }> = [];
    const sources: string[] = ['Building Records'];
    
    // Extract building facts
    if (input.includes('address')) {
      if (building.address) {
        facts.push({
          label: 'Address',
          value: building.address,
          source: 'Building Records'
        });
      }
    }
    
    if (input.includes('unit') || input.includes('flat')) {
      if (unitsData && unitsData.length > 0) {
        facts.push({
          label: 'Total Units',
          value: unitsData.length.toString(),
          source: 'Building Records'
        });
      }
    }
    
    if (input.includes('manager') || input.includes('contact')) {
      if (building.building_manager_name) {
        facts.push({
          label: 'Building Manager',
          value: building.building_manager_name,
          source: 'Building Records'
        });
      }
    }
    
    let answer = '';
    if (facts.length > 0) {
      answer = `Building information for ${building.name}:\n\n`;
      facts.forEach(fact => {
        answer += `• ${fact.label}: ${fact.value}\n`;
      });
    } else {
      answer = `The building records for ${building.name} don't specify this information. Upload the lease document in Lease Lab for detailed analysis.`;
    }
    
    return {
      answer,
      confidence: facts.length > 0 ? 'medium' : 'low',
      sources,
      facts,
      requiresReview: false,
      suggestions: ['Upload the lease document to Lease Lab for detailed analysis']
    };
    
  } catch (error) {
    console.error('Error generating building answer:', error);
    return generateGenericAnswer(userInput, buildingContext);
  }
}

/**
 * Generate generic answer when no specific data is available
 */
function generateGenericAnswer(
  userInput: string,
  buildingContext: BuildingContext
): QAAdapterResult {
  const input = userInput.toLowerCase();
  
  let answer = '';
  if (input.includes('section 20') || input.includes('s20')) {
    answer = 'Section 20 refers to the Landlord and Tenant Act 1985 consultation requirements. Works costing more than £250 per leaseholder or long-term agreements over £100 per leaseholder per year require consultation. Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis.';
  } else if (input.includes('repair') || input.includes('maintenance')) {
    answer = 'Repair obligations depend on the specific lease terms and whether the item is demised or common parts. Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis.';
  } else if (input.includes('service charge')) {
    answer = 'Service charge details vary by lease and building. Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis.';
  } else {
    answer = 'Not specified in the lease/building records. Upload the document in Lease Lab for a verified analysis.';
  }
  
  return {
    answer,
    confidence: 'low',
    sources: [],
    facts: [],
    requiresReview: false,
    suggestions: ['Upload the lease document to Lease Lab for detailed analysis']
  };
}
