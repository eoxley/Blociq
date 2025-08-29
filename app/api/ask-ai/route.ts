import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getOpenAIClient } from '@/lib/openai-client';
import { insertAiLog } from '@/lib/supabase/ai_logs';

// Natural language query processing
interface QueryIntent {
  type: 'leaseholder_lookup' | 'unit_details' | 'building_info' | 'document_query' | 'buildings_list' | 'general';
  buildingIdentifier?: string;
  unitIdentifier?: string;
  personName?: string;
  confidence: number;
}

class QueryProcessor {
  parseQuery(query: string): QueryIntent {
    const queryLower = query.toLowerCase();
    
    // Enhanced building identifiers with better pattern matching (NO 'g' flags - added by extractBestMatch)
    const buildingPatterns = [
      /(\d+\s+\w+(?:\s+\w+)*?)(?:\s+building|$|\s+house|\s+court|\s+place)/, // "5 ashwood", "123 main street"
      /building\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/,       // "building ashwood"
      /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+building/,         // "ashwood building"
      /at\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/,             // "at ashwood"
      /property\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/,       // "property name"
      /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(?:house|court|place|tower|manor|lodge)/i // Common building types
    ];
    
    // Enhanced unit identifiers with better extraction (NO 'g' flags - added by extractBestMatch)
    const unitPatterns = [
      /(?:unit|flat|apartment|apt)\s*([0-9]+[a-zA-Z]?)/i,
      /(?:^|\s|of\s+|in\s+)([0-9]+[a-zA-Z]?)(?:\s+(?:ashwood|at|building)|$|\s)/, // "5 ashwood", "3A"
      /number\s+([0-9]+[a-zA-Z]?)/i,                     // "number 5"
      /([0-9]+[a-zA-Z]?)\s+(?:ashwood|at)/i              // "5 ashwood"
    ];
    
    // Enhanced person name patterns
    const namePatterns = [
      /(?:who is|who's)\s+(?:the\s+)?(?:leaseholder|tenant|resident)(?:\s+(?:of|in|for))?\s+(.+?)(?:\?|$)/i,
      /leaseholder\s+(?:of|in|for)\s+(.+?)(?:\?|$)/i,
      /(?:tenant|resident)\s+(?:of|in|at)\s+(.+?)(?:\?|$)/i
    ];

    // Enhanced intent detection with more patterns
    let intent: QueryIntent = { type: 'general', confidence: 0.3 };
    
    // Leaseholder lookup patterns
    if (queryLower.includes('leaseholder') || queryLower.includes('who is') || 
        queryLower.includes('tenant') || queryLower.includes('resident')) {
      intent = {
        type: 'leaseholder_lookup',
        buildingIdentifier: this.extractBestMatch(query, buildingPatterns),
        unitIdentifier: this.extractBestMatch(query, unitPatterns),
        confidence: 0.9
      };
    }
    // Unit details patterns
    else if (queryLower.includes('unit') || queryLower.includes('flat') || 
             queryLower.includes('apartment') || queryLower.includes('property details')) {
      intent = {
        type: 'unit_details',
        buildingIdentifier: this.extractBestMatch(query, buildingPatterns),
        unitIdentifier: this.extractBestMatch(query, unitPatterns),
        confidence: 0.8
      };
    }
    // Building info patterns
    else if (queryLower.includes('building') || queryLower.includes('address') ||
             queryLower.includes('property') || queryLower.includes('information about')) {
      intent = {
        type: 'building_info',
        buildingIdentifier: this.extractBestMatch(query, buildingPatterns),
        confidence: 0.7
      };
    }
    // Document queries
    else if (queryLower.includes('document') || queryLower.includes('lease') ||
             queryLower.includes('contract') || queryLower.includes('agreement')) {
      intent = {
        type: 'document_query',
        buildingIdentifier: this.extractBestMatch(query, buildingPatterns),
        unitIdentifier: this.extractBestMatch(query, unitPatterns),
        confidence: 0.6
      };
    }
    // Building management queries
    else if (queryLower.includes('what buildings') || queryLower.includes('list buildings') ||
             queryLower.includes('buildings do i manage') || queryLower.includes('my buildings') ||
             queryLower.includes('show buildings') || queryLower.includes('all buildings')) {
      intent = {
        type: 'buildings_list',
        confidence: 0.8
      };
    }
    
    return intent;
  }
  
  private extractBestMatch(text: string, patterns: RegExp[]): string | undefined {
    const matches: { match: string; confidence: number }[] = [];
    
    for (const pattern of patterns) {
      try {
        // FIX: Prevent duplicate 'g' flags that cause RegExp constructor error
        const existingFlags = pattern.flags || '';
        const flags = existingFlags.includes('g') ? existingFlags : existingFlags + 'g';
        const regex = new RegExp(pattern.source, flags);
        const regexMatches = [...text.matchAll(regex)];
        
        for (const regexMatch of regexMatches) {
          const extractedMatch = regexMatch[1] || regexMatch[0];
          if (extractedMatch && extractedMatch.trim()) {
            // Calculate confidence based on pattern specificity and match quality
            let confidence = 0.5;
            
            // Higher confidence for more specific patterns
            if (pattern.source.includes('building|house|court|place')) confidence += 0.3;
            if (pattern.source.includes('unit|flat|apartment')) confidence += 0.3;
            if (pattern.source.includes('at\\s+')) confidence += 0.2;
            
            // Higher confidence for longer matches
            if (extractedMatch.length > 5) confidence += 0.1;
            if (extractedMatch.length > 10) confidence += 0.1;
            
            matches.push({ 
              match: extractedMatch.trim(), 
              confidence: Math.min(confidence, 1.0)
            });
          }
        }
      } catch (regexError) {
        console.warn('RegExp error with pattern:', pattern.source, regexError);
        continue;
      }
    }
    
    if (matches.length === 0) return undefined;
    
    // Return the match with highest confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches[0].match;
  }
}

class BuildingContextService {
  constructor(private supabase: any) {}
  
  async findLeaseholder(intent: QueryIntent): Promise<any> {
    try {
      // 1. Find building by address/name with comprehensive data
      let buildingQuery = this.supabase
        .from('buildings')
        .select(`
          id, name, address, postcode, unit_count,
          building_manager_name, building_manager_email, building_manager_phone,
          emergency_contact_name, emergency_contact_phone,
          access_notes, key_access_notes, parking_info,
          building_age, construction_type, total_floors, lift_available
        `);
        
      if (intent.buildingIdentifier) {
        // Clean building identifier for better matching
        const cleanIdentifier = intent.buildingIdentifier.trim().toLowerCase();
        
        // Enhanced search with fuzzy matching
        buildingQuery = buildingQuery.or(
          `address.ilike.%${cleanIdentifier}%,name.ilike.%${cleanIdentifier}%,postcode.ilike.%${cleanIdentifier}%`
        );
      }
      
      const { data: buildings, error: buildingError } = await buildingQuery.limit(10);
      
      if (buildingError) {
        console.error('Building query error:', buildingError);
        return { 
          success: false,
          error: 'Database error while searching for building',
          details: buildingError.message
        };
      }

      if (!buildings?.length) {
        // Try to find similar building names for suggestions
        const suggestionQuery = await this.supabase
          .from('buildings')
          .select('name, address')
          .limit(5);
          
        const suggestions = suggestionQuery.data?.map(b => `${b.name} (${b.address})`).join(', ') || '';
        
        return { 
          success: false,
          error: `Building "${intent.buildingIdentifier}" not found`,
          suggestion: suggestions ? `Try one of these buildings: ${suggestions}` : 'Please check the building name or address'
        };
      }
      
      // Use first building match for comprehensive data
      const building = buildings[0];
      
      // 2. Find units and leaseholders using the optimized view
      let unitQuery = this.supabase
        .from('vw_units_leaseholders')
        .select('*')
        .eq('building_id', building.id)
        .order('unit_number');
        
      if (intent.unitIdentifier) {
        // Clean unit identifier for better matching
        const cleanUnit = intent.unitIdentifier.trim();
        
        // Try multiple matching strategies for units
        unitQuery = unitQuery.or(
          `unit_number.eq.${cleanUnit},unit_number.ilike.%${cleanUnit}%`
        );
      }
      
      const { data: units, error: unitError } = await unitQuery;
      
      if (unitError) {
        console.error('Units query error:', unitError);
        return { 
          success: false,
          error: 'Database error while searching for units',
          details: unitError.message
        };
      }
      
      // Return comprehensive building and unit data even if no specific unit found
      return {
        success: true,
        building: {
          ...building,
          totalUnits: building.unit_count || units?.length || 0
        },
        units: units || [],
        totalUnits: units?.length || 0,
        hasLeaseholders: units?.some(unit => 
          // Handle both view structure and old nested structure
          unit.leaseholder_name || unit.leaseholder_id || 
          (unit.leaseholders && unit.leaseholders.length > 0)
        ) || false,
        searchedFor: {
          building: intent.buildingIdentifier,
          unit: intent.unitIdentifier
        }
      };
      
    } catch (error) {
      console.error('Error in findLeaseholder:', error);
      return {
        success: false,
        error: 'Failed to search for leaseholder information',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async getBuildingInfo(intent: QueryIntent): Promise<any> {
    try {
      let query = this.supabase
        .from('buildings')
        .select(`
          id, name, address, postcode, building_type,
          created_at, updated_at,
          units(count),
          building_compliance_assets(
            id, status,
            compliance_assets(category, title)
          )
        `);
        
      if (intent.buildingIdentifier) {
        query = query.or(
          `address.ilike.%${intent.buildingIdentifier}%,name.ilike.%${intent.buildingIdentifier}%`
        );
      }
      
      const { data: buildings, error } = await query.limit(5);
      
      if (error || !buildings?.length) {
        return {
          success: false,
          error: `Building "${intent.buildingIdentifier}" not found`
        };
      }
      
      return {
        success: true,
        buildings
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve building information',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async getBuildingsList(): Promise<any> {
    try {
      const query = this.supabase
        .from('buildings')
        .select(`
          id, name, address, postcode, unit_count,
          building_manager_name, building_manager_email,
          emergency_contact_name, emergency_contact_phone,
          created_at, updated_at,
          units:units(count)
        `)
        .order('name');
      
      const { data: buildings, error } = await query;
      
      if (error) {
        console.error('Buildings list query error:', error);
        return {
          success: false,
          error: 'Failed to retrieve buildings list',
          details: error.message
        };
      }
      
      if (!buildings?.length) {
        return {
          success: false,
          error: 'No buildings found in the system',
          suggestion: 'You may need to add buildings to your property portfolio first'
        };
      }
      
      // Get additional stats for each building
      const buildingsWithStats = await Promise.all(
        buildings.map(async (building) => {
          try {
            // Get leaseholder count
            const leaseholdersQuery = await this.supabase
              .from('leaseholders')
              .select('id', { count: 'exact' })
              .eq('unit_id', building.id);
              
            const leaseholderCount = leaseholdersQuery.count || 0;
            
            return {
              ...building,
              leaseholderCount,
              occupancyRate: building.unit_count ? Math.round((leaseholderCount / building.unit_count) * 100) : 0
            };
          } catch (error) {
            console.error(`Error getting stats for building ${building.id}:`, error);
            return {
              ...building,
              leaseholderCount: 0,
              occupancyRate: 0
            };
          }
        })
      );
      
      return {
        success: true,
        buildings: buildingsWithStats,
        totalBuildings: buildings.length,
        totalUnits: buildings.reduce((sum, b) => sum + (b.unit_count || 0), 0)
      };
      
    } catch (error) {
      console.error('Error in getBuildingsList:', error);
      return {
        success: false,
        error: 'Failed to retrieve buildings list',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

class ResponseGenerator {
  generateLeaseholderResponse(contextData: any, originalQuery: string): string {
    if (!contextData.success) {
      return `I couldn't find the information you're looking for. ${contextData.error}${contextData.suggestion ? '\n\n' + contextData.suggestion : ''}`;
    }
    
    const { building, units, searchedFor } = contextData;
    const query = originalQuery.toLowerCase();
    
    // Check if this is an access codes query
    if (query.includes('access code') || query.includes('entry code') || query.includes('door code')) {
      return this.generateAccessCodesResponse(building);
    }
    
    // Format comprehensive leaseholder response
    let response = `# 🏠 **Building Information: ${building.name}**\n\n`;
    
    // Building details section
    response += `## 📍 **Property Details**\n`;
    response += `**Address:** ${building.address}${building.postcode ? ', ' + building.postcode : ''}\n`;
    response += `**Total Units:** ${building.totalUnits || 'Not specified'}\n`;
    
    if (building.building_manager_name) {
      response += `**Building Manager:** ${building.building_manager_name}\n`;
      if (building.building_manager_email) {
        response += `**Manager Email:** ${building.building_manager_email}\n`;
      }
      if (building.building_manager_phone) {
        response += `**Manager Phone:** ${building.building_manager_phone}\n`;
      }
    }
    
    if (building.emergency_contact_name) {
      response += `**Emergency Contact:** ${building.emergency_contact_name}`;
      if (building.emergency_contact_phone) {
        response += ` (${building.emergency_contact_phone})`;
      }
      response += '\n';
    }
    
    // Property specifications
    if (building.building_age || building.construction_type || building.total_floors || building.lift_available) {
      response += `\n## 🏗️ **Building Specifications**\n`;
      if (building.building_age) response += `**Age:** ${building.building_age}\n`;
      if (building.construction_type) response += `**Construction:** ${building.construction_type}\n`;
      if (building.total_floors) response += `**Floors:** ${building.total_floors}\n`;
      if (building.lift_available) response += `**Lift Available:** ${building.lift_available}\n`;
    }
    
    // Leaseholder information section
    if (units && units.length > 0) {
      response += `\n## 👥 **Leaseholder Information**\n\n`;
      
      // Handle both view structure and old nested structure
      const unitsWithLeaseholders = units.filter((unit: any) => 
        unit.leaseholder_name || unit.leaseholder_id || 
        (unit.leaseholders && unit.leaseholders.length > 0)
      );
      const unitsWithoutLeaseholders = units.filter((unit: any) => 
        !unit.leaseholder_name && !unit.leaseholder_id && 
        (!unit.leaseholders || unit.leaseholders.length === 0)
      );
      
      if (searchedFor.unit) {
        // Specific unit search
        const targetUnit = units.find((unit: any) => 
          unit.unit_number?.toString() === searchedFor.unit ||
          unit.unit_number?.toString().includes(searchedFor.unit)
        );
        
        if (targetUnit) {
          response += `### **Unit ${targetUnit.unit_number}${targetUnit.floor ? ` (Floor ${targetUnit.floor})` : ''}**\n`;
          
          // Handle view structure (flattened) or old nested structure
          if (targetUnit.leaseholder_name || targetUnit.leaseholder_id) {
            // View structure - leaseholder data is flattened in the unit record
            response += `**👤 Leaseholder:** ${targetUnit.leaseholder_name || 'Name not available'}\n`;
            if (targetUnit.leaseholder_email) response += `**📧 Email:** ${targetUnit.leaseholder_email}\n`;
            if (targetUnit.leaseholder_phone) response += `**📞 Phone:** ${targetUnit.leaseholder_phone}\n`;
            if (targetUnit.leaseholder_created_at) response += `**📅 Registered:** ${new Date(targetUnit.leaseholder_created_at).toLocaleDateString()}\n`;
            response += `\n`;
          } else if (targetUnit.leaseholders && targetUnit.leaseholders.length > 0) {
            // Old nested structure
            targetUnit.leaseholders.forEach((lh: any) => {
              response += `**👤 Leaseholder:** ${lh.name || 'Name not available'}\n`;
              if (lh.email) response += `**📧 Email:** ${lh.email}\n`;
              if (lh.phone) response += `**📞 Phone:** ${lh.phone}\n`;
              if (lh.created_at) response += `**📅 Registered:** ${new Date(lh.created_at).toLocaleDateString()}\n`;
              response += `\n`;
            });
          } else {
            response += `*No leaseholder currently registered for this unit*\n\n`;
          }
        } else {
          response += `*Unit ${searchedFor.unit} not found in this building*\n\n`;
        }
      } else {
        // All units overview
        if (unitsWithLeaseholders.length > 0) {
          response += `**📊 Occupied Units (${unitsWithLeaseholders.length}/${units.length}):**\n\n`;
          unitsWithLeaseholders.slice(0, 10).forEach((unit: any) => {
            // Handle view structure or old nested structure
            let leaseholderNames = '';
            let contactEmail = '';
            let contactPhone = '';
            
            if (unit.leaseholder_name || unit.leaseholder_id) {
              // View structure - leaseholder data is flattened
              leaseholderNames = unit.leaseholder_name || 'Name not available';
              contactEmail = unit.leaseholder_email;
              contactPhone = unit.leaseholder_phone;
            } else if (unit.leaseholders && unit.leaseholders.length > 0) {
              // Old nested structure
              leaseholderNames = unit.leaseholders.map((lh: any) => lh.name || 'Name not available').join(', ');
              const firstLH = unit.leaseholders[0];
              contactEmail = firstLH.email;
              contactPhone = firstLH.phone;
            }
            
            response += `• **Unit ${unit.unit_number}:** ${leaseholderNames}\n`;
            
            // Show contact details
            if (contactEmail || contactPhone) {
              response += `  `;
              if (contactEmail) response += `📧 ${contactEmail} `;
              if (contactPhone) response += `📞 ${contactPhone}`;
              response += `\n`;
            }
          });
          
          if (unitsWithLeaseholders.length > 10) {
            response += `  *...and ${unitsWithLeaseholders.length - 10} more occupied units*\n`;
          }
        }
        
        if (unitsWithoutLeaseholders.length > 0) {
          response += `\n**🏠 Vacant Units (${unitsWithoutLeaseholders.length}):**\n`;
          const vacantNumbers = unitsWithoutLeaseholders.slice(0, 15).map((unit: any) => unit.unit_number).join(', ');
          response += `Units: ${vacantNumbers}`;
          if (unitsWithoutLeaseholders.length > 15) {
            response += ` *...and ${unitsWithoutLeaseholders.length - 15} more*`;
          }
          response += '\n';
        }
      }
    } else {
      response += `\n*No unit information available for this building*\n`;
    }
    
    // Access information
    if (building.access_notes || building.key_access_notes || building.parking_info) {
      response += `\n## 🔐 **Access Information**\n`;
      if (building.access_notes) response += `**Access Notes:** ${building.access_notes}\n`;
      if (building.key_access_notes) response += `**Key Access:** ${building.key_access_notes}\n`;
      if (building.parking_info) response += `**Parking:** ${building.parking_info}\n`;
    }
    
    return response;
  }
  
  generateAccessCodesResponse(building: any): string {
    let response = `# 🔐 **Access Codes - ${building.name}**\n\n`;
    
    response += `## 📍 **Property:** ${building.address}\n\n`;
    
    if (building.access_notes || building.key_access_notes) {
      response += `## 🚪 **Access Information**\n`;
      
      if (building.access_notes) {
        response += `**General Access:** ${building.access_notes}\n`;
      }
      
      if (building.key_access_notes) {
        response += `**Key Access Details:** ${building.key_access_notes}\n`;
      }
      
      response += `\n`;
    } else {
      response += `## ⚠️ **Access Information Not Available**\n\n`;
      response += `Access codes for ${building.name} are not currently stored in the system or may be restricted for security reasons.\n\n`;
      response += `**For access codes, please contact:**\n`;
      
      if (building.building_manager_name) {
        response += `• **Building Manager:** ${building.building_manager_name}`;
        if (building.building_manager_phone) response += ` - ${building.building_manager_phone}`;
        if (building.building_manager_email) response += ` - ${building.building_manager_email}`;
        response += `\n`;
      }
      
      if (building.emergency_contact_name) {
        response += `• **Emergency Contact:** ${building.emergency_contact_name}`;
        if (building.emergency_contact_phone) response += ` - ${building.emergency_contact_phone}`;
        response += `\n`;
      }
    }
    
    response += `\n💡 **Security Note:** Access codes are sensitive information and may be restricted to authorized personnel only.`;
    
    return response;
  }
  
  generateBuildingsListResponse(contextData: any): string {
    if (!contextData.success) {
      return `I couldn't retrieve your buildings list. ${contextData.error}${contextData.suggestion ? '\n\n' + contextData.suggestion : ''}`;
    }
    
    const { buildings, totalBuildings, totalUnits } = contextData;
    
    let response = `# 🏢 **Property Portfolio Overview**\n\n`;
    
    response += `## 📊 **Portfolio Summary**\n`;
    response += `**Total Buildings:** ${totalBuildings}\n`;
    response += `**Total Units:** ${totalUnits}\n`;
    response += `**Average Units per Building:** ${totalBuildings > 0 ? Math.round(totalUnits / totalBuildings) : 0}\n\n`;
    
    response += `## 🏠 **Buildings Under Management**\n\n`;
    
    buildings.forEach((building: any, index: number) => {
      response += `### **${index + 1}. ${building.name}**\n`;
      response += `**📍 Address:** ${building.address}${building.postcode ? ', ' + building.postcode : ''}\n`;
      response += `**🏠 Units:** ${building.unit_count || 'Not specified'}\n`;
      
      if (building.leaseholderCount !== undefined) {
        response += `**👥 Leaseholders:** ${building.leaseholderCount}\n`;
        if (building.occupancyRate !== undefined) {
          response += `**📊 Occupancy Rate:** ${building.occupancyRate}%\n`;
        }
      }
      
      if (building.building_manager_name) {
        response += `**👨‍💼 Property Manager:** ${building.building_manager_name}`;
        if (building.building_manager_email) {
          response += ` (${building.building_manager_email})`;
        }
        response += `\n`;
      }
      
      if (building.emergency_contact_name) {
        response += `**🚨 Emergency Contact:** ${building.emergency_contact_name}`;
        if (building.emergency_contact_phone) {
          response += ` (${building.emergency_contact_phone})`;
        }
        response += `\n`;
      }
      
      if (building.created_at) {
        const addedDate = new Date(building.created_at).toLocaleDateString();
        response += `**📅 Added to System:** ${addedDate}\n`;
      }
      
      response += `\n`;
    });
    
    response += `---\n\n💡 **Quick Actions:**\n`;
    response += `• To get detailed information about a specific building, ask: "Tell me about [building name]"\n`;
    response += `• To find leaseholder information, ask: "Who is the leaseholder of unit [number] at [building name]"\n`;
    response += `• To get access codes, ask: "What are the access codes for [building name]"\n`;
    
    return response;
  }
  
  generateBuildingInfoResponse(contextData: any): string {
    if (!contextData.success) {
      return `I couldn't find building information. ${contextData.error}`;
    }
    
    const buildings = contextData.buildings;
    
    if (buildings.length === 1) {
      const building = buildings[0];
      return `${building.name} is located at ${building.address}${building.postcode ? ', ' + building.postcode : ''}. It's a ${building.building_type || 'residential'} building with ${building.units?.length || 0} units.`;
    }
    
    let response = `I found ${buildings.length} buildings:\n\n`;
    for (const building of buildings) {
      response += `• ${building.name}: ${building.address}${building.postcode ? ', ' + building.postcode : ''}\n`;
    }
    
    return response;
  }
  
  generateDocumentQueryResponse(contextData: any, originalQuery: string): string {
    if (!contextData.success) {
      return `I couldn't find specific property information for your document query. ${contextData.error}${contextData.suggestion ? ' ' + contextData.suggestion : ''}`;
    }
    
    const { building, units } = contextData;
    
    let response = `Document information for ${building.name} (${building.address}):\n\n`;
    
    if (units && units.length > 0) {
      response += `Units with leaseholder information:\n`;
      for (const unit of units) {
        const leaseholders = unit.leaseholders;
        const leaseholderNames = leaseholders?.length 
          ? leaseholders.map((lh: any) => lh.full_name || lh.name).join(', ')
          : 'No leaseholder registered';
          
        response += `• Unit ${unit.unit_number || unit.unit_label}: ${leaseholderNames}\n`;
      }
    }
    
    response += `\nFor specific lease documents or contracts, please upload the documents using the file upload feature for detailed analysis.`;
    
    return response;
  }

  generateGeneralResponse(query: string, contextData?: any): string {
    return `I can help you with property management questions. For specific information about leaseholders, units, or buildings, try asking something like:
    
• "Who is the leaseholder of unit 5 at Ashwood?"
• "Show me information about 123 High Street building"
• "What units are in the Ashwood building?"

What would you like to know?`;
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get user (optional for some queries)
    const { data: { user } } = await supabase.auth.getUser();
    
    const body = await req.json();
    const { prompt, question, buildingId, fileUploads, buildingContext, contextType, uploadedFiles } = body;
    
    // Support both 'prompt' and 'question' for compatibility
    const userQuery = prompt || question;

    // Check if this is a file upload with comprehensive analysis
    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log('🔄 Processing file upload response with comprehensive analysis');
      return handleFileUploadResponse(uploadedFiles, userQuery, buildingId);
    }

    if (!userQuery) {
      return NextResponse.json({ 
        success: false, 
        error: 'Question or prompt is required' 
      }, { status: 400 });
    }

    console.log('Processing AI query:', userQuery);

    // Parse the natural language query
    const processor = new QueryProcessor();
    const intent = processor.parseQuery(userQuery);
    
    console.log('Query intent:', intent);

    // Handle different query types
    const contextService = new BuildingContextService(supabase);
    const responseGenerator = new ResponseGenerator();
    
    let contextData;
    let response;
    
    switch (intent.type) {
      case 'leaseholder_lookup':
        contextData = await contextService.findLeaseholder(intent);
        response = responseGenerator.generateLeaseholderResponse(contextData, userQuery);
        break;
        
      case 'building_info':
        contextData = await contextService.getBuildingInfo(intent);
        response = responseGenerator.generateBuildingInfoResponse(contextData);
        break;
        
      case 'unit_details':
        contextData = await contextService.findLeaseholder(intent);
        response = responseGenerator.generateLeaseholderResponse(contextData, userQuery);
        break;
        
      case 'document_query':
        contextData = await contextService.findLeaseholder(intent);
        response = responseGenerator.generateDocumentQueryResponse(contextData, userQuery);
        break;
        
      case 'buildings_list':
        contextData = await contextService.getBuildingsList();
        response = responseGenerator.generateBuildingsListResponse(contextData);
        break;
        
      default:
        // For general queries, use comprehensive property management AI
        try {
          const { detectPropertyManagementContext, buildPropertyManagementPrompt } = await import('@/lib/ai/propertyManagementPrompts');
          
          // Detect the type of property management query
          const pmContext = detectPropertyManagementContext(userQuery);
          console.log('Property management context detected:', pmContext);
          
          // Build comprehensive system prompt based on context
          const systemPrompt = buildPropertyManagementPrompt(pmContext, userQuery, contextData?.building);
          
          const openai = getOpenAIClient();
          
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
              role: 'system',
              content: systemPrompt
            }, {
              role: 'user',
              content: userQuery
            }],
            temperature: 0.3,
            max_tokens: 2000
          });
          
          response = completion.choices[0].message?.content || 'I apologize, but I couldn\'t generate a response.';
          
        } catch (openaiError) {
          console.error('OpenAI error:', openaiError);
          // Fallback to basic response
          const openai = getOpenAIClient();
          
          const fallbackCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'system',
              content: 'You are BlocIQ, a comprehensive UK property management assistant. You can help with notice generation, letter drafting, compliance documents, calculations, email responses, and UK property law guidance. Always provide professional, legally appropriate responses using British English and current UK property management regulations.'
            }, {
              role: 'user',
              content: userQuery
            }],
            temperature: 0.3,
            max_tokens: 1500
          });
          
          response = fallbackCompletion.choices[0].message?.content || responseGenerator.generateGeneralResponse(userQuery);
        }
    }

    // Log the interaction if user is authenticated
    let logId = null;
    if (user) {
      try {
        logId = await insertAiLog({
          user_id: user.id,
          question: userQuery,
          response,
          context_type: 'main_assistant',
          building_id: buildingId || (contextData?.building?.id),
          document_ids: [],
        });
      } catch (logError) {
        console.error('Failed to log AI interaction:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      response: response, // Fixed: frontend expects 'response' not 'answer'
      intent: {
        type: intent.type,
        confidence: intent.confidence,
        extracted: {
          building: intent.buildingIdentifier,
          unit: intent.unitIdentifier
        }
      },
      contextData: intent.type !== 'general' ? contextData : undefined,
      ai_log_id: logId,
      metadata: {
        queryType: intent.type,
        processingTime: Date.now(),
        hasUser: !!user
      }
    });

  } catch (error: any) {
    console.error('AI route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process your request',
      details: error.message
    }, { status: 500 });
  }
}

// Handle file upload response with comprehensive lease analysis
async function handleFileUploadResponse(uploadedFiles: any[], userQuery: string, buildingId?: string) {
  try {
    console.log('📋 Generating comprehensive file analysis response for', uploadedFiles.length, 'files');
    
    let response = '';
    
    for (const fileAnalysis of uploadedFiles) {
      const filename = fileAnalysis.filename || 'Document';
      const documentType = fileAnalysis.documentType || 'unknown';
      
      if (documentType === 'lease' && fileAnalysis.leaseDetails) {
        // Generate comprehensive lease analysis response
        response += generateLeaseAnalysisResponse(fileAnalysis, filename);
      } else {
        // Generate general document analysis response
        response += generateDocumentAnalysisResponse(fileAnalysis, filename);
      }
      
      response += '\n\n---\n\n';
    }
    
    // Add closing message
    response += '💬 **What would you like to know?**\n\nI can answer specific questions about any details from the documents above, help you understand specific clauses, or provide guidance on property management matters.';
    
    console.log('✅ Generated comprehensive analysis response');
    
    return NextResponse.json({
      success: true,
      response: response.trim(),
      documentAnalysis: true,
      filesProcessed: uploadedFiles.length
    });
    
  } catch (error) {
    console.error('❌ Error generating file upload response:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate analysis response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Generate comprehensive lease analysis response
function generateLeaseAnalysisResponse(analysis: any, filename: string): string {
  const details = analysis.leaseDetails || {};
  const compliance = analysis.complianceChecklist || [];
  const rights = analysis.keyRights || [];
  const restrictions = analysis.restrictions || [];
  const actions = analysis.suggestedActions || [];
  
  let response = `# 📋 **Comprehensive Lease Analysis - ${filename}**\n\n`;
  
  if (analysis.summary) {
    response += `**📄 Document Summary:**\n${analysis.summary}\n\n`;
  }
  
  // 1. LEASE SUMMARY SECTION
  response += `## 🏠 **Lease Summary**\n\n`;
  
  if (details.propertyAddress) {
    response += `**🏢 Property Address:** ${details.propertyAddress}\n`;
  }
  
  if (details.leaseStartDate || details.leaseEndDate) {
    if (details.leaseStartDate) {
      response += `**📅 Lease Start Date:** ${details.leaseStartDate}\n`;
    }
    if (details.leaseEndDate) {
      response += `**📅 Lease End Date:** ${details.leaseEndDate}\n`;
    }
  }
  
  if (details.initialRent) {
    response += `**💰 Annual Rent:** ${details.initialRent}\n`;
  }
  
  if (details.serviceCharge) {
    response += `**🔧 Service Charge:** ${details.serviceCharge}\n`;
  }
  
  if (details.premium) {
    response += `**💎 Premium/Ground Rent:** ${details.premium}\n`;
  }
  
  if (details.landlord || details.tenant) {
    if (details.landlord) {
      response += `**👤 Landlord/Lessor:** ${details.landlord}\n`;
    }
    if (details.tenant) {
      response += `**🏠 Tenant/Lessee:** ${details.tenant}\n`;
    }
  }
  
  // 2. KEY TERMS SECTION
  response += `\n## 📋 **Key Terms**\n\n`;
  
  if (details.leaseTerm) {
    response += `**⏳ Lease Length:** ${details.leaseTerm}\n`;
  }
  
  if (details.buildingType) {
    response += `**🏗️ Property Type:** ${details.buildingType}\n`;
  }
  
  // Show key rights if found
  if (rights.length > 0) {
    response += `**✅ Key Rights Found:**\n`;
    rights.slice(0, 5).forEach((right: string) => {
      response += `  • ${right}\n`;
    });
    if (rights.length > 5) {
      response += `  • *...and ${rights.length - 5} more rights*\n`;
    }
  }
  
  // Show restrictions if found  
  if (restrictions.length > 0) {
    response += `**⚠️ Key Restrictions:**\n`;
    restrictions.slice(0, 5).forEach((restriction: string) => {
      response += `  • ${restriction}\n`;
    });
    if (restrictions.length > 5) {
      response += `  • *...and ${restrictions.length - 5} more restrictions*\n`;
    }
  }
  
  // 3. COMPLIANCE NOTES SECTION
  if (compliance.length > 0) {
    response += `\n## ⚖️ **Compliance Notes**\n\n`;
    
    const importantCompliance = compliance.filter((item: any) => 
      item.status === 'Y' || item.status === 'N' || 
      item.item.toLowerCase().includes('section 20') ||
      item.item.toLowerCase().includes('right to manage') ||
      item.item.toLowerCase().includes('enfranchisement') ||
      item.item.toLowerCase().includes('building safety')
    );
    
    if (importantCompliance.length > 0) {
      importantCompliance.slice(0, 8).forEach((item: any) => {
        const status = item.status === 'Y' ? '✅' : item.status === 'N' ? '❌' : '❓';
        response += `**${status} ${item.item}:** ${item.status}`;
        if (item.details && item.details !== 'Analysis failed') {
          response += ` - ${item.details}`;
        }
        response += '\n';
      });
    } else {
      response += '*Compliance analysis in progress - specific clauses being reviewed*\n';
    }
  }
  
  // 4. SUGGESTED ACTIONS
  if (actions.length > 0) {
    response += `\n## 🎯 **Recommended Actions**\n\n`;
    actions.slice(0, 6).forEach((action: any) => {
      const label = typeof action === 'string' ? action : action.label || action.title || 'Review required';
      response += `• ${label}\n`;
    });
  }
  
  // Add confidence indicator
  if (analysis.confidence) {
    const confidenceLevel = analysis.confidence > 0.7 ? 'High' : analysis.confidence > 0.4 ? 'Medium' : 'Low';
    response += `\n*Analysis Confidence: ${confidenceLevel} (${Math.round(analysis.confidence * 100)}%)*\n`;
  }
  
  return response;
}

// Generate general document analysis response
function generateDocumentAnalysisResponse(analysis: any, filename: string): string {
  let response = `# 📄 **Document Analysis - ${filename}**\n\n`;
  
  if (analysis.summary) {
    response += `**Summary:** ${analysis.summary}\n\n`;
  }
  
  if (analysis.documentType) {
    response += `**Document Type:** ${analysis.documentType}\n\n`;
  }
  
  if (analysis.suggestedActions && analysis.suggestedActions.length > 0) {
    response += `**Recommended Actions:**\n`;
    analysis.suggestedActions.slice(0, 5).forEach((action: any) => {
      const label = typeof action === 'string' ? action : action.label || action.title || 'Review required';
      response += `• ${label}\n`;
    });
  }
  
  return response;
}