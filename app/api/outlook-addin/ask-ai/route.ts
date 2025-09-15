import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getOpenAIClient } from '@/lib/openai-client';
import { insertAiLog } from '@/lib/supabase/ai_logs';
import { PropertySystemLogic } from '@/lib/ai/propertySystemLogic';

// Property database integration for authenticated queries
class PropertyDatabase {
  constructor(private supabase: any) {}

  async findLeaseholder(unit: string, building: string) {
    try {
      console.log(`🔍 Searching for leaseholder: Unit ${unit} at ${building}`);
      
      const searches = [
        // Exact match
        this.supabase
          .from('vw_units_leaseholders')
          .select('*')
          .eq('unit_number', unit)
          .ilike('building_name', `%${building}%`),
        
        // Alternative unit formats
        this.supabase
          .from('vw_units_leaseholders')
          .select('*')
          .in('unit_number', [unit, `Flat ${unit}`, `Unit ${unit}`, `Apartment ${unit}`])
          .ilike('building_name', `%${building}%`),
      ];

      for (const search of searches) {
        const { data, error } = await search.limit(5);
        if (!error && data && data.length > 0) {
          return { success: true, data: data[0], allMatches: data };
        }
      }

      // If no exact matches, search for building to suggest alternatives
      const { data: buildingMatches } = await this.supabase
        .from('vw_units_leaseholders')
        .select('unit_number, building_name')
        .ilike('building_name', `%${building}%`)
        .limit(10);

      return { 
        success: false, 
        suggestions: buildingMatches,
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
          access_notes, key_access_notes,
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
        .select('id, name, address, total_units')
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

// Response generators with proper formatting
class ResponseGenerator {
  
  static generateLeaseholderResponse(result: any): string {
    if (!result.success) {
      if (result.suggestions && result.suggestions.length > 0) {
        const unitList = [...new Set(result.suggestions.map((s: any) => s.unit_number))];
        const buildingList = [...new Set(result.suggestions.map((s: any) => s.building_name))];
        
        return `I couldn't find unit ${result.searchedUnit} in ${result.searchedBuilding} in your portfolio. This could mean:

• The unit number might be listed differently (available units: ${unitList.slice(0, 5).join(', ')})
• The building name might vary in your records (found: ${buildingList.slice(0, 3).join(', ')})
• This property isn't in your database yet

Would you like me to search for all units in buildings matching '${result.searchedBuilding}'?`;
      }
      
      return `I couldn't find unit ${result.searchedUnit} in ${result.searchedBuilding} in your portfolio. This could mean:

• The unit number might be listed differently (e.g., 'Flat ${result.searchedUnit}')
• The building name might vary in your records
• This property isn't in your database yet

Would you like me to search for all units in buildings matching '${result.searchedBuilding}'?`;
    }

    const leaseholder = result.data;
    let response = `**${leaseholder.leaseholder_name}** is the leaseholder of unit ${leaseholder.unit_number}, ${leaseholder.building_name}`;
    
    if (leaseholder.leaseholder_email) {
      response += `\n📧 ${leaseholder.leaseholder_email}`;
    }
    
    if (leaseholder.leaseholder_phone) {
      response += `\n📞 ${leaseholder.leaseholder_phone}`;
    }

    if (leaseholder.is_director) {
      response += `\n👔 Role: ${leaseholder.director_role || 'Director'}`;
    }

    return response;
  }

  static generateAccessCodesResponse(result: any): string {
    if (!result.success) {
      return `No access codes found for ${result.searchedBuilding} in your portfolio. You may need to:

• Add this building to your database first
• Check if the building name is spelled correctly  
• Update the property record with current access codes

Would you like me to search for similar building names or help you add this property?`;
    }

    const building = result.data;
    let response = `🔐 **Access codes for ${building.name}**\n📍 ${building.address}\n`;
    
    let hasAccessInfo = false;
    
    if (building.entry_code) {
      response += `\n🚪 **Main entrance:** ${building.entry_code}`;
      hasAccessInfo = true;
    }
    
    if (building.gate_code) {
      response += `\n🚧 **Gate:** ${building.gate_code}`;
      hasAccessInfo = true;
    }
    
    if (building.access_notes) {
      response += `\n📝 **Notes:** ${building.access_notes}`;
      hasAccessInfo = true;
    }
    
    if (building.key_access_notes) {
      response += `\n🗝️ **Key access:** ${building.key_access_notes}`;
      hasAccessInfo = true;
    }

    if (building.building_manager_name || building.building_manager_phone) {
      response += `\n\n👤 **Building management:**`;
      if (building.building_manager_name) {
        response += `\n• ${building.building_manager_name}`;
      }
      if (building.building_manager_phone) {
        response += `\n• ${building.building_manager_phone}`;
      }
    }
    
    if (!hasAccessInfo) {
      response += `\nNo access codes are currently stored for ${building.name}.\n\nYou may need to update the building record with current entry codes.`;
    }
    
    return response;
  }

  static generateBuildingsResponse(result: any): string {
    if (!result.success || !result.data || result.data.length === 0) {
      return `You don't have any buildings in your portfolio yet. Would you like me to help you add a building?`;
    }

    let response = `🏢 **Your property portfolio:**\n`;
    
    result.data.forEach((building: any) => {
      response += `\n• **${building.name}** (${building.total_units || 0} units)`;
      if (building.address) {
        response += `\n  📍 ${building.address}`;
      }
    });

    response += `\n\nI can help you with specific buildings by asking about access codes, leaseholders, or other property details.`;
    
    return response;
  }

  static generateDocumentsResponse(result: any): string {
    if (!result.success || !result.data || result.data.length === 0) {
      return `You don't have any recent documents uploaded. You can upload documents through the main BlocIQ platform for analysis.`;
    }

    let response = `📄 **Your recent documents:**\n`;
    
    result.data.forEach((doc: any) => {
      const date = new Date(doc.created_at).toLocaleDateString();
      const status = doc.extraction_status === 'completed' ? '✅' : 
                   doc.extraction_status === 'processing' ? '🔄' : 
                   doc.extraction_status === 'failed' ? '❌' : '⏳';
      
      response += `\n${status} **${doc.filename}**`;
      response += `\n   Uploaded: ${date}`;
    });

    response += `\n\nI can analyze documents if you upload them through the main platform or via email.`;
    
    return response;
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
          const result = await propertyDB.findLeaseholder(queryType.unit, queryType.building);
          response = ResponseGenerator.generateLeaseholderResponse(result);
        } else {
          response = `I need both a unit number and building name to find leaseholder information. Try: "Who is the leaseholder of unit 5 at Ashwood House?"`;
        }
        break;

      case 'access_codes':
        if (queryType.building) {
          const result = await propertyDB.findAccessCodes(queryType.building);
          response = ResponseGenerator.generateAccessCodesResponse(result);
        } else {
          response = `I need a building name to find access codes. Try: "What are the access codes for Ashwood House?"`;
        }
        break;

      case 'buildings':
        const buildingsResult = await propertyDB.getUserBuildings();
        response = ResponseGenerator.generateBuildingsResponse(buildingsResult);
        break;

      case 'documents':
        const docsResult = await propertyDB.findRecentDocuments();
        response = ResponseGenerator.generateDocumentsResponse(docsResult);
        break;

      default:
        // Enhanced general property management queries with user context
        try {
          const openai = getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
              role: 'system',
              content: `You are BlocIQ, a comprehensive UK property management assistant integrated into Outlook. You have access to the user's property portfolio and can provide specific information about their buildings, leaseholders, and documents. 

You can help with:
- Property-specific questions about buildings, units, and leaseholders
- Access codes and building information
- Document analysis and lease reviews
- General property management advice
- Email response drafting based on current email context
- UK property law and compliance guidance

Always provide professional, legally appropriate responses using British English. If asked about specific buildings or units that aren't found, offer to search the user's portfolio or suggest adding the property to their database.

The user is currently in Outlook, so consider the email context when relevant.`
            }, {
              role: 'user',
              content: contextualPrompt
            }],
            temperature: 0.3,
            max_tokens: 1500
          });

          response = completion.choices[0].message?.content || `I can help you with your property management questions. For specific information about your properties, try asking:

• "Who is the leaseholder of unit 5 at Ashwood House?"
• "What are the access codes for [building name]?"  
• "Show me my buildings" or "What documents have I uploaded recently?"

What would you like to know?`;

        } catch (openaiError) {
          console.error('OpenAI error:', openaiError);
          response = `I can help with your property management questions. For specific information about your properties, try asking:

• "Who is the leaseholder of unit 5 at Ashwood House?"
• "What are the access codes for [building name]?"
• "Show me my buildings" or "What documents have I uploaded recently?"

What would you like to know?`;
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