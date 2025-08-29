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
    
    // Enhanced building identifiers with better pattern matching
    const buildingPatterns = [
      /(\d+\s+\w+(?:\s+\w+)*?)(?:\s+building|$|\s+house|\s+court|\s+place)/g, // "5 ashwood", "123 main street"
      /building\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/g,       // "building ashwood"
      /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+building/g,         // "ashwood building"
      /at\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/g,             // "at ashwood"
      /property\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/g,       // "property name"
      /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(?:house|court|place|tower|manor|lodge)/gi // Common building types
    ];
    
    // Enhanced unit identifiers with better extraction
    const unitPatterns = [
      /(?:unit|flat|apartment|apt)\s*([0-9]+[a-zA-Z]?)/gi,
      /(?:^|\s|of\s+|in\s+)([0-9]+[a-zA-Z]?)(?:\s+(?:ashwood|at|building)|$|\s)/g, // "5 ashwood", "3A"
      /number\s+([0-9]+[a-zA-Z]?)/gi,                     // "number 5"
      /([0-9]+[a-zA-Z]?)\s+(?:ashwood|at)/gi              // "5 ashwood"
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
    
    return intent;
  }
  
  private extractBestMatch(text: string, patterns: RegExp[]): string | undefined {
    const matches: { match: string; confidence: number }[] = [];
    
    for (const pattern of patterns) {
      const regexMatches = [...text.matchAll(new RegExp(pattern.source, pattern.flags + 'g'))];
      
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
      // 1. Find building by address/name
      let buildingQuery = this.supabase
        .from('buildings')
        .select('id, name, address, postcode');
        
      if (intent.buildingIdentifier) {
        // Clean building identifier for better matching
        const cleanIdentifier = intent.buildingIdentifier.trim().toLowerCase();
        
        // Enhanced search with multiple strategies
        buildingQuery = buildingQuery.or(
          `address.ilike.%${cleanIdentifier}%,name.ilike.%${cleanIdentifier}%,postcode.ilike.%${cleanIdentifier}%`
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
        // Clean unit identifier for better matching
        const cleanUnit = intent.unitIdentifier.trim();
        
        // Try multiple matching strategies for units
        unitQuery = unitQuery.or(
          `unit_number.eq.${cleanUnit},unit_label.ilike.%${cleanUnit}%,unit_number.eq.${cleanUnit.replace(/^0+/, '')}`
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
        
      default:
        // For general queries, use OpenAI
        try {
          const openai = getOpenAIClient();
          
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'system',
              content: 'You are BlocIQ, a UK property management assistant. Help with leasehold property questions, compliance, and building management.'
            }, {
              role: 'user',
              content: userQuery
            }],
            temperature: 0.3,
            max_tokens: 1000
          });
          
          response = completion.choices[0].message?.content || 'I apologize, but I couldn\'t generate a response.';
          
        } catch (openaiError) {
          console.error('OpenAI error:', openaiError);
          response = responseGenerator.generateGeneralResponse(userQuery);
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