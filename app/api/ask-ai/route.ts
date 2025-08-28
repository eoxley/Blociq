import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import OpenAI from 'openai';
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
    
    // Extract building identifiers
    const buildingPatterns = [
      /(\d+\s+\w+(?:\s+\w+)*)/g, // "5 ashwood", "123 main street"
      /building\s+(\w+)/g,       // "building ashwood"
      /(\w+\s+building)/g        // "ashwood building"
    ];
    
    // Extract unit identifiers  
    const unitPatterns = [
      /(?:unit|flat|apartment|apt)\s*(\d+[a-z]?)/gi,
      /(?:^|\s)(\d+[a-z]?)(?:\s|$)/g // standalone numbers like "5", "3A"
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
    const { question, buildingId, fileUploads } = body;

    if (!question) {
      return NextResponse.json({ 
        success: false, 
        error: 'Question is required' 
      }, { status: 400 });
    }

    console.log('Processing AI query:', question);

    // Parse the natural language query
    const processor = new QueryProcessor();
    const intent = processor.parseQuery(question);
    
    console.log('Query intent:', intent);

    // Handle different query types
    const contextService = new BuildingContextService(supabase);
    const responseGenerator = new ResponseGenerator();
    
    let contextData;
    let response;
    
    switch (intent.type) {
      case 'leaseholder_lookup':
        contextData = await contextService.findLeaseholder(intent);
        response = responseGenerator.generateLeaseholderResponse(contextData, question);
        break;
        
      case 'building_info':
        contextData = await contextService.getBuildingInfo(intent);
        response = responseGenerator.generateBuildingInfoResponse(contextData);
        break;
        
      case 'unit_details':
        contextData = await contextService.findLeaseholder(intent);
        response = responseGenerator.generateLeaseholderResponse(contextData, question);
        break;
        
      default:
        // For general queries, use OpenAI
        try {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'system',
              content: 'You are BlocIQ, a UK property management assistant. Help with leasehold property questions, compliance, and building management.'
            }, {
              role: 'user',
              content: question
            }],
            temperature: 0.3,
            max_tokens: 1000
          });
          
          response = completion.choices[0].message?.content || 'I apologize, but I couldn\'t generate a response.';
          
        } catch (openaiError) {
          console.error('OpenAI error:', openaiError);
          response = responseGenerator.generateGeneralResponse(question);
        }
    }

    // Log the interaction if user is authenticated
    let logId = null;
    if (user) {
      try {
        logId = await insertAiLog({
          user_id: user.id,
          question,
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
      answer: response,
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