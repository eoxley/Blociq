import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getOpenAIClient } from '@/lib/openai-client';
import { insertAiLog } from '@/lib/supabase/ai_logs';
import { PropertySystemLogic } from '@/lib/ai/propertySystemLogic';
import { 
  findLeaseholder, 
  findBuilding, 
  findUnitsInBuilding,
  UnifiedResponseGenerator, 
  UnifiedQueryParser 
} from '@/lib/ai/unifiedDataAccess';

// Property database integration for authenticated queries
class PropertyDatabase {
  constructor(private supabase: any) {}

  async findLeaseholder(unit: string, building: string) {
    try {
      console.log(`🔍 Searching for leaseholder: Unit ${unit} at ${building}`);
      
      // First find the building ID by name
      const { data: buildings } = await this.supabase
        .from('buildings')
        .select('id, name')
        .ilike('name', `%${building}%`)
        .limit(5);
      
      if (!buildings || buildings.length === 0) {
        return { 
          success: false, 
          searchedUnit: unit,
          searchedBuilding: building,
          error: 'Building not found'
        };
      }
      
      const buildingIds = buildings.map(b => b.id);
      console.log(`🏢 Found building IDs:`, buildingIds);
      
      const searches = [
        // Exact unit match in found buildings
        this.supabase
          .from('vw_units_leaseholders')
          .select('*, building_id')
          .eq('unit_number', unit)
          .in('building_id', buildingIds),
        
        // Alternative unit formats
        this.supabase
          .from('vw_units_leaseholders')
          .select('*, building_id')
          .in('unit_number', [unit, `Flat ${unit}`, `Unit ${unit}`, `Apartment ${unit}`])
          .in('building_id', buildingIds),
      ];

      for (const search of searches) {
        const { data, error } = await search.limit(5);
        if (!error && data && data.length > 0) {
          // Add building name to the result
          const matchedBuilding = buildings.find(b => b.id === data[0].building_id);
          const result = { ...data[0], building_name: matchedBuilding?.name || building };
          return { success: true, data: result, allMatches: data };
        }
      }

      // If no exact matches, suggest available units in the building
      const { data: buildingUnits } = await this.supabase
        .from('vw_units_leaseholders')
        .select('unit_number, building_id')
        .in('building_id', buildingIds)
        .limit(10);

      return { 
        success: false, 
        suggestions: buildingUnits,
        searchedUnit: unit,
        searchedBuilding: building
      };

    } catch (error) {
      console.error('Database search error:', error);
      return { success: false, error: 'Database connection failed' };
    }
  }

  async findAccessCodes(building: string) {
    try {
      console.log(`🔐 Searching for access codes: ${building}`);
      
      const { data, error } = await this.supabase
        .from('buildings')
        .select(`
          id, name, address,
          entry_code, gate_code, 
          access_notes, key_access_notes, notes,
          building_manager_name, building_manager_phone
        `)
        .or(`name.ilike.%${building}%,address.ilike.%${building}%`)
        .limit(5);

      if (error) {
        console.error('Access codes query error:', error);
        return { success: false, error: 'Database query failed' };
      }

      if (!data || data.length === 0) {
        return { success: false, searchedBuilding: building };
      }

      return { success: true, data: data[0], allMatches: data };

    } catch (error) {
      console.error('Access codes search error:', error);
      return { success: false, error: 'Database connection failed' };
    }
  }

  async getUserBuildings() {
    try {
      const { data, error } = await this.supabase
        .from('buildings')
        .select('id, name, address, unit_count')
        .order('name');

      if (error) {
        console.error('User buildings query error:', error);
        return { success: false, error: 'Database query failed' };
      }

      return { success: true, data: data || [] };

    } catch (error) {
      console.error('User buildings search error:', error);
      return { success: false, error: 'Database connection failed' };
    }
  }

  async findRecentDocuments(limit = 5) {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('id, filename, created_at, extraction_status')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Recent documents query error:', error);
        return { success: false, error: 'Database query failed' };
      }

      return { success: true, data: data || [] };

    } catch (error) {
      console.error('Recent documents search error:', error);
      return { success: false, error: 'Database connection failed' };
    }
  }
}

// Response generators with anti-hallucination safeguards
class ResponseGenerator {
  
  // Safety responses for uncertain information
  static readonly SAFETY_RESPONSES = {
    legal: "For specific legal advice, please consult your property law solicitor.",
    emergency: "For emergencies, contact emergency services on 999.",
    compliance: "For compliance questions, check with your building control officer.",
    financial: "For financial advice, consult your property accountant.",
    unknown: "I don't have reliable information about this. Please check your records or contact the relevant authority."
  };

  // Add data quality warning based on confidence and completeness
  static addDataQualityWarning(response: string, hasData: boolean, source: string): string {
    const sourceNote = `\n\n📊 **Source:** ${source}`;
    
    if (!hasData) {
      return response + sourceNote + "\n\n💡 **Note:** If you believe this information should be available, please check your data entry or contact support.";
    }
    
    return response + sourceNote;
  }

  static generateLeaseholderResponse(result: any): string {
    if (!result.success) {
      let response = `I couldn't find unit ${result.searchedUnit} in ${result.searchedBuilding} in your portfolio.`;
      
      if (result.suggestions && result.suggestions.length > 0) {
        const unitList = [...new Set(result.suggestions.map((s: any) => s.unit_number))];
        
        response += ` Available units in this building: ${unitList.slice(0, 5).join(', ')}`;
      } else {
        response += ` This could mean:

• The unit number might be listed differently (e.g., 'Flat ${result.searchedUnit}')
• The building name might vary in your records
• This property isn't in your database yet`;
      }

      return this.addDataQualityWarning(response, false, "Leaseholder database search");
    }

    const leaseholder = result.data;
    let response = `**${leaseholder.leaseholder_name}** is the leaseholder of unit ${leaseholder.unit_number}, ${leaseholder.building_name}`;
    
    // Only include verified contact information from database
    if (leaseholder.leaseholder_email) {
      response += `\n📧 ${leaseholder.leaseholder_email}`;
    }
    
    if (leaseholder.leaseholder_phone) {
      response += `\n📞 ${leaseholder.leaseholder_phone}`;
    }

    if (leaseholder.is_director) {
      response += `\n👔 Role: ${leaseholder.director_role || 'Director'}`;
    }

    return this.addDataQualityWarning(response, true, "Verified leaseholder records");
  }

  static generateAccessCodesResponse(result: any): string {
    if (!result.success) {
      const response = `No access codes found for "${result.searchedBuilding}" in your verified records.`;
      return this.addDataQualityWarning(response, false, "Building access database");
    }

    const building = result.data;
    let response = `🔐 **Access information for ${building.name}**\n📍 ${building.address}`;
    
    let hasAccessInfo = false;
    
    // CRITICAL: Only show access codes that are actually recorded in database
    if (building.entry_code) {
      response += `\n🚪 **Main entrance:** ${building.entry_code}`;
      hasAccessInfo = true;
    }
    
    if (building.gate_code) {
      response += `\n🚧 **Gate:** ${building.gate_code}`;
      hasAccessInfo = true;
    }
    
    if (building.access_notes) {
      response += `\n📝 **Access notes:** ${building.access_notes}`;
      hasAccessInfo = true;
    }
    
    if (building.notes) {
      response += `\n📝 **Building notes:** ${building.notes}`;
      hasAccessInfo = true;
    }
    
    if (building.key_access_notes) {
      response += `\n🗝️ **Key access:** ${building.key_access_notes}`;
      hasAccessInfo = true;
    }

    // Only show building management if recorded
    if (building.building_manager_name || building.building_manager_phone) {
      response += `\n\n👤 **Building management:**`;
      if (building.building_manager_name) {
        response += `\n• ${building.building_manager_name}`;
      }
      if (building.building_manager_phone) {
        response += `\n• ${building.building_manager_phone}`;
      }
    }
    
    // SAFETY: Never generate fake codes - explicitly state when none available
    if (!hasAccessInfo) {
      response += `\n\n⚠️ **No access codes recorded**\nPlease update the building record with current entry codes.`;
      
      // Add emergency guidance for safety-critical access
      response += `\n\n🚨 **For emergencies:** Contact emergency services on 999`;
      response += `\n💡 **Tip:** Check physical key safes or contact building management directly`;
    }
    
    return this.addDataQualityWarning(response, hasAccessInfo, "Building access records database");
  }

  static generateBuildingsResponse(result: any): string {
    if (!result.success || !result.data || result.data.length === 0) {
      const response = `No buildings found in your property portfolio database.`;
      return this.addDataQualityWarning(response, false, "Property portfolio database");
    }

    let response = `🏢 **Your verified property portfolio:**\n`;
    
    result.data.forEach((building: any) => {
      response += `\n• **${building.name}** (${building.unit_count || 0} units)`;
      if (building.address) {
        response += `\n  📍 ${building.address}`;
      }
    });

    response += `\n\nI can help you with specific buildings using verified data from your records.`;
    
    return this.addDataQualityWarning(response, true, "Property portfolio database");
  }

  static generateDocumentsResponse(result: any): string {
    if (!result.success || !result.data || result.data.length === 0) {
      const response = `No recent documents found in your document database.`;
      return this.addDataQualityWarning(response, false, "Document management database");
    }

    let response = `📄 **Your recent documents (verified records):**\n`;
    
    result.data.forEach((doc: any) => {
      const date = new Date(doc.created_at).toLocaleDateString();
      const status = doc.extraction_status === 'completed' ? '✅' : 
                   doc.extraction_status === 'processing' ? '🔄' : 
                   doc.extraction_status === 'failed' ? '❌' : '⏳';
      
      response += `\n${status} **${doc.filename}**`;
      response += `\n   Uploaded: ${date}`;
    });

    response += `\n\nAll document information comes from your verified upload records.`;
    
    return this.addDataQualityWarning(response, true, "Document management database");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, token, emailContext, is_outlook_addin } = body;
    
    if (!prompt) {
      return NextResponse.json({ 
        success: false, 
        error: 'Prompt is required' 
      }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication token is required' 
      }, { status: 401 });
    }

    // Create authenticated Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined },
        },
      }
    );

    // Validate token and get user
    let user: any;
    let authError: any;
    
    // Check if it's a temporary email-based token
    if (token.length > 100) { // Base64 encoded token
      try {
        const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
        
        if (tokenData.context === 'outlook_email_auth' && tokenData.timestamp) {
          // Check if token is not too old (24 hours)
          const tokenAge = Date.now() - tokenData.timestamp;
          if (tokenAge > 24 * 60 * 60 * 1000) {
            return NextResponse.json({ 
              success: false, 
              error: 'Email authentication token expired' 
            }, { status: 401 });
          }
          
          // Create a user object for temporary email authentication
          user = {
            id: tokenData.user_id,
            email: tokenData.email,
            user_metadata: {
              full_name: tokenData.email.split('@')[0]
            }
          };
          authError = null;
        } else {
          authError = new Error('Invalid email token format');
        }
      } catch (e) {
        console.warn('Invalid temporary token:', e);
        authError = new Error('Invalid token format');
      }
    } else {
      // Standard Supabase token validation
      const { data, error } = await supabase.auth.getUser(token);
      user = data?.user;
      authError = error;
    }
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }

    console.log('🚀 Processing Outlook add-in query for user:', user.email);

    // Create user-scoped Supabase client
    let userSupabase;
    
    // For email-based authentication, use service role key with RLS context
    if (token.length > 100 && user.email) {
      userSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            get() { return undefined },
          },
          global: {
            headers: {
              'x-user-email': user.email, // Pass user email for RLS context
              'x-user-id': user.id
            }
          }
        }
      );
    } else {
      // Standard authenticated client
      userSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get() { return undefined },
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );
    }

    // 🔍 COMPREHENSIVE UNIFIED AI PROCESSING
    console.log('🤖 COMPREHENSIVE: Processing Outlook Add-in query with complete system capabilities...');
    
    try {
      // Import synchronized AI processor
      const { SynchronizedAIProcessor } = await import('../../../lib/ai/systemSynchronizer');
      
      // Process the query with full capabilities using synchronized processor
      const unifiedResult = await SynchronizedAIProcessor.processOutlookQuery(
        prompt,
        user.id,
        undefined, // buildingId - not available in Outlook context
        'outlook_addin',
        emailContext,
        'Professional'
      );
      
      if (unifiedResult.success) {
        console.log('✅ COMPREHENSIVE: Outlook query processed successfully');
        
        // Log the interaction
        let logId = null;
        try {
          logId = await insertAiLog({
            user_id: user.id,
            question: prompt,
            response: unifiedResult.response,
            context_type: 'outlook_addin',
            building_id: null,
            document_ids: [],
          });
        } catch (logError) {
          console.error('Failed to log AI interaction:', logError);
        }
        
        return NextResponse.json({
          success: true,
          response: unifiedResult.response,
          systemVersion: 'outlook_addin_comprehensive_v1',
          queryType: 'comprehensive',
          ai_log_id: logId,
          user: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email
          },
          metadata: {
            processingTime: Date.now(),
            hasEmailContext: !!emailContext,
            isOutlookAddin: true,
            source: unifiedResult.source,
            comprehensive: true
          }
        });
      } else {
        console.log('❌ COMPREHENSIVE: Query processing failed, falling back to legacy system');
        // Fall through to legacy processing
      }
      
    } catch (unifiedError) {
      console.error('❌ COMPREHENSIVE: Error in unified processing:', unifiedError);
      // Fall through to legacy processing
    }

    // LEGACY FALLBACK PROCESSING
    console.log('🔄 LEGACY: Falling back to legacy processing...');
    
    let response: string;

    // Enhanced query parsing with building/portfolio context
    const queryType = PropertySystemLogic.parsePropertyQuery(prompt);
    const propertyDB = new PropertyDatabase(userSupabase);

    console.log('🏠 Query type detected:', queryType.type);

    // Add email context if available
    let contextualPrompt = prompt;
    if (emailContext && emailContext.subject) {
      contextualPrompt = `Email context: "${emailContext.subject}"\n\nUser question: ${prompt}`;
    }

    switch (queryType.type) {
      case 'leaseholder':
        if (queryType.unit && queryType.building) {
          // Use unified data access for consistent results
          const result = await findLeaseholder(queryType.unit, queryType.building, user.id);
          response = UnifiedResponseGenerator.generateLeaseholderResponse(result);
        } else {
          response = `I need both a unit number and building name to find leaseholder information. Try: "Who is the leaseholder of unit 5 at Ashwood House?"`;
        }
        break;

      case 'access_codes':
        if (queryType.building) {
          // Use unified data access for consistent results
          const result = await findBuilding(queryType.building, user.id);
          response = UnifiedResponseGenerator.generateBuildingResponse(result);
        } else {
          response = `I need a building name to find access codes. Try: "What are the access codes for Ashwood House?"`;
        }
        break;

      case 'buildings':
        // Use unified data access for consistent results
        const buildingsResult = await findBuilding('', user.id);
        response = UnifiedResponseGenerator.generateBuildingResponse(buildingsResult);
        break;

      case 'units':
        if (queryType.building) {
          // Use unified data access for consistent results
          const result = await findUnitsInBuilding(queryType.building, user.id);
          response = UnifiedResponseGenerator.generateUnitsResponse(result);
        } else {
          response = `I need a building name to find units. Try: "How many units does Ashwood House have?"`;
        }
        break;

      case 'documents':
        const docsResult = await propertyDB.findRecentDocuments();
        response = ResponseGenerator.generateDocumentsResponse(docsResult);
        break;

      default:
        // LEGACY GENERAL QUERY HANDLING
        console.log('🔍 General query detected - using legacy processing...');
        
        // Try to parse the query for any property-specific information
        const { unit, building } = UnifiedQueryParser.parseLeaseholderQuery(prompt);
        const { building: buildingFromQuery } = UnifiedQueryParser.parseBuildingQuery(prompt);
        
        // Check if this is asking for unit count
        const isUnitCountQuery = /\b(how many|count|total|units?|flats?)\b/i.test(prompt) && 
                                 (building || buildingFromQuery);
        
        if (isUnitCountQuery) {
          const targetBuilding = building || buildingFromQuery;
          if (targetBuilding) {
            const result = await findUnitsInBuilding(targetBuilding, user.id);
            response = UnifiedResponseGenerator.generateUnitsResponse(result);
          } else {
            response = `I need a building name to find unit count. Try: "How many units does Ashwood House have?"`;
          }
        } else if (unit && building) {
          // This is actually a leaseholder query that wasn't caught by the parser
          const result = await findLeaseholder(unit, building, user.id);
          response = UnifiedResponseGenerator.generateLeaseholderResponse(result);
        } else if (buildingFromQuery) {
          // This is a building query
          const result = await findBuilding(buildingFromQuery, user.id);
          response = UnifiedResponseGenerator.generateBuildingResponse(result);
        } else {
          // Safe general property management advice only
          try {
            const openai = getOpenAIClient();
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [{
                role: 'system',
                content: `You are BlocIQ, a UK property management assistant. 

CRITICAL RESTRICTIONS - NEVER generate:
- Fake access codes, passwords, or security information
- Imaginary contact details (names, phones, emails)
- Made-up building names or addresses
- Fictional leaseholder information
- Unverified compliance dates or certificates

You can only provide:
- General property management advice
- UK property law guidance (with disclaimers)
- Email drafting assistance
- Process explanations

For ANY specific property data (buildings, units, leaseholders, access codes), you MUST direct users to use the specific database query functions.

Always include: "For specific legal advice, please consult your property law solicitor." for legal matters.`
              }, {
                role: 'user',
                content: `General property management question: ${contextualPrompt}`
              }],
              temperature: 0.1, // Lower temperature to reduce creativity/hallucination
              max_tokens: 800  // Shorter responses to limit hallucination risk
            });

            const aiResponse = completion.choices[0].message?.content || 'I can help with general property management questions, but for specific information about your properties, buildings, or leaseholders, please use the database query functions.';
            
            response = aiResponse + `\n\n⚠️ **Note:** This is general guidance only. For specific property data, use the database query functions.\n\n📊 **Source:** General property management AI (no specific property data)`;

          } catch (openaiError) {
            console.error('OpenAI error:', openaiError);
            response = `I can help with general property management questions, but for specific information about your properties, buildings, or leaseholders, please use the database query functions.\n\n📊 **Source:** Error recovery system`;
          }
        }
    }

    // Log the interaction
    let logId = null;
    try {
      logId = await insertAiLog({
        user_id: user.id,
        question: prompt,
        response,
        context_type: 'outlook_addin',
        building_id: null,
        document_ids: [],
      });
    } catch (logError) {
      console.error('Failed to log AI interaction:', logError);
    }

    return NextResponse.json({
      success: true,
      response: response,
      systemVersion: 'outlook_addin_v1',
      queryType: queryType.type,
      ai_log_id: logId,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email
      },
      metadata: {
        processingTime: Date.now(),
        hasEmailContext: !!emailContext,
        isOutlookAddin: is_outlook_addin
      }
    });

  } catch (error: any) {
    console.error('Outlook add-in API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process your request',
      details: error.message,
      systemVersion: 'outlook_addin_v1',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}