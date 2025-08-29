import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getOpenAIClient } from '@/lib/openai-client';
import { insertAiLog } from '@/lib/supabase/ai_logs';

// Natural language query processing
interface QueryIntent {
  type: 'leaseholder_lookup' | 'unit_details' | 'building_info' | 'document_query' | 'general';
  buildingIdentifier?: string;
  unitIdentifier?: string;
  personName?: string;
  confidence: number;
}

class QueryProcessor {
  parseQuery(query: string): QueryIntent {
    const queryLower = query.toLowerCase();
    
    // Extract building identifiers (NO 'g' flags to prevent RegExp constructor errors)
    const buildingPatterns = [
      /(\d+\s+\w+(?:\s+\w+)*)/, // "5 ashwood", "123 main street"
      /building\s+(\w+)/,       // "building ashwood"
      /(\w+\s+building)/        // "ashwood building"
    ];
    
    // Extract unit identifiers (NO 'g' flags to prevent RegExp constructor errors)
    const unitPatterns = [
      /(?:unit|flat|apartment|apt)\s*(\d+[a-z]?)/i,
      /(?:^|\s)(\d+[a-z]?)(?:\s|$)/ // standalone numbers like "5", "3A"
    ];
    
    // Extract person names
    const namePatterns = [
      /(?:who is|who's)\s+(?:the\s+)?(?:leaseholder|tenant|resident)(?:\s+(?:of|in|for))?\s+(.+?)(?:\?|$)/i,
      /leaseholder\s+(?:of|in|for)\s+(.+?)(?:\?|$)/i
    ];
    
    // Determine intent
    if (queryLower.includes('leaseholder') || queryLower.includes('who')) {
      return {
        type: 'leaseholder_lookup',
        buildingIdentifier: this.extractFirst(query, buildingPatterns),
        unitIdentifier: this.extractFirst(query, unitPatterns),
        confidence: 0.9
      };
    }
    
    if (queryLower.includes('unit') || queryLower.includes('flat') || queryLower.includes('apartment')) {
      return {
        type: 'unit_details',
        buildingIdentifier: this.extractFirst(query, buildingPatterns),
        unitIdentifier: this.extractFirst(query, unitPatterns),
        confidence: 0.8
      };
    }
    
    if (queryLower.includes('building') || queryLower.includes('address')) {
      return {
        type: 'building_info',
        buildingIdentifier: this.extractFirst(query, buildingPatterns),
        confidence: 0.7
      };
    }
    
    return { type: 'general', confidence: 0.3 };
  }
  
  private extractFirst(text: string, patterns: RegExp[]): string | undefined {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1] || match[0];
    }
    return undefined;
  }
}

class BuildingContextService {
  constructor(private supabase: any) {}
  
  async findLeaseholder(intent: QueryIntent): Promise<any> {
    try {
      // 1. Find building by address/name
      let buildingQuery = this.supabase
        .from('buildings')
        .select('id, name, address, postcode');
        
      if (intent.buildingIdentifier) {
        buildingQuery = buildingQuery.or(
          `address.ilike.%${intent.buildingIdentifier}%,name.ilike.%${intent.buildingIdentifier}%`
        );
      }
      
      const { data: buildings, error: buildingError } = await buildingQuery.limit(5);
      
      if (buildingError || !buildings?.length) {
        return { 
          success: false,
          error: `Building "${intent.buildingIdentifier}" not found`,
          suggestion: 'Please check the building name or address'
        };
      }
      
      // If multiple buildings found, try to narrow down
      const building = buildings[0];
      
      // 2. Find unit and leaseholder
      let unitQuery = this.supabase
        .from('units')
        .select(`
          id, unit_number, unit_label, floor,
          buildings!inner(id, name, address),
          leaseholders(id, name, full_name, email, phone)
        `)
        .eq('building_id', building.id);
        
      if (intent.unitIdentifier) {
        unitQuery = unitQuery.or(
          `unit_number.eq.${intent.unitIdentifier},unit_label.ilike.%${intent.unitIdentifier}%`
        );
      }
      
      const { data: units, error: unitError } = await unitQuery;
      
      if (unitError) {
        return { 
          success: false,
          error: 'Database error while searching for units',
          details: unitError.message
        };
      }
      
      if (!units?.length) {
        return {
          success: false,
          error: intent.unitIdentifier 
            ? `Unit "${intent.unitIdentifier}" not found in ${building.name}`
            : `No units found in ${building.name}`,
          suggestion: 'Try checking the unit number or building name',
          buildingInfo: building
        };
      }
      
      return {
        success: true,
        building,
        units,
        totalUnits: units.length
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
}

class ResponseGenerator {
  generateLeaseholderResponse(contextData: any, originalQuery: string): string {
    if (!contextData.success) {
      return `I couldn't find the information you're looking for. ${contextData.error}${contextData.suggestion ? ' ' + contextData.suggestion : ''}`;
    }
    
    const { building, units } = contextData;
    
    if (units.length === 1) {
      const unit = units[0];
      const leaseholders = unit.leaseholders;
      
      if (!leaseholders || leaseholders.length === 0) {
        return `Unit ${unit.unit_number || unit.unit_label} at ${building.name} (${building.address}) currently has no registered leaseholder.`;
      }
      
      const leaseholderNames = leaseholders.map((lh: any) => lh.full_name || lh.name).join(', ');
      return `The leaseholder${leaseholders.length > 1 ? 's' : ''} for unit ${unit.unit_number || unit.unit_label} at ${building.name} (${building.address}) ${leaseholders.length > 1 ? 'are' : 'is'}: ${leaseholderNames}`;
    }
    
    // Multiple units found
    let response = `I found ${units.length} units at ${building.name} (${building.address}):\n\n`;
    
    for (const unit of units) {
      const leaseholders = unit.leaseholders;
      const leaseholderNames = leaseholders?.length 
        ? leaseholders.map((lh: any) => lh.full_name || lh.name).join(', ')
        : 'No leaseholder registered';
        
      response += `• Unit ${unit.unit_number || unit.unit_label}: ${leaseholderNames}\n`;
    }
    
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
    const { buildingId } = body;

    if (!buildingId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Building ID is required' 
      }, { status: 400 });
    }

    console.log('Fetching building context for building ID:', buildingId);

    // Get building context by ID
    try {
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select(`
          id, name, address, postcode, building_type,
          units(
            id, unit_number, unit_label, floor,
            leaseholders(id, name, full_name, email, phone)
          ),
          building_compliance_assets(
            id, status,
            compliance_assets(category, title)
          )
        `)
        .eq('id', buildingId)
        .single();

      if (buildingError || !building) {
        return NextResponse.json({
          success: false,
          error: 'Building not found'
        }, { status: 404 });
      }

      const contextData = {
        success: true,
        building,
        metadata: {
          totalUnits: building.units?.length || 0,
          complianceAssets: building.building_compliance_assets?.length || 0
        }
      };

      return NextResponse.json(contextData);

    } catch (error: any) {
      console.error('Building context error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch building context',
        details: error.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('AI route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process your request',
      details: error.message
    }, { status: 500 });
  }
}