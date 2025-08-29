import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getOpenAIClient } from '@/lib/openai-client';
import { insertAiLog } from '@/lib/supabase/ai_logs';
import { PropertySystemLogic } from '@/lib/ai/propertySystemLogic';

// Enhanced Supabase integration for property queries
class PropertyDatabase {
  constructor(private supabase: any) {}

  async findLeaseholder(unit: string, building: string) {
    try {
      console.log(`🔍 Searching for leaseholder: Unit ${unit} at ${building}`);
      
      // Enhanced search with multiple strategies
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
        
        // Building name variations
        this.supabase
          .from('vw_units_leaseholders')
          .select('*')
          .eq('unit_number', unit)
          .or(`building_name.ilike.%${building}%,building_name.ilike.%${building} House%,building_name.ilike.%${building} Court%`)
      ];

      // Try each search strategy
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
      
      // Search in buildings table for access information
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

  async findServiceCharges(unit: string, building: string) {
    try {
      console.log(`💰 Searching for service charges: Unit ${unit} at ${building}`);
      
      // This would integrate with your actual service charges table
      // For now, returning structure for implementation
      const { data, error } = await this.supabase
        .from('vw_units_leaseholders')
        .select('*')
        .eq('unit_number', unit)
        .ilike('building_name', `%${building}%`)
        .single();

      if (error || !data) {
        return { success: false, searchedUnit: unit, searchedBuilding: building };
      }

      // Would extract service charge info from related tables
      return { 
        success: true, 
        data: {
          unit_number: data.unit_number,
          building_name: data.building_name,
          // These would come from actual service charge tables
          annual_charge: null,
          percentage: null,
          last_updated: null
        }
      };

    } catch (error) {
      console.error('Service charges search error:', error);
      return { success: false, error: 'Database connection failed' };
    }
  }
}

// Enhanced response generators with proper formatting
class ResponseGenerator {
  
  static generateLeaseholderResponse(result: any): string {
    if (!result.success) {
      if (result.suggestions && result.suggestions.length > 0) {
        const unitList = [...new Set(result.suggestions.map((s: any) => s.unit_number))];
        const buildingList = [...new Set(result.suggestions.map((s: any) => s.building_name))];
        
        return `I couldn't find unit ${result.searchedUnit} in ${result.searchedBuilding} in our records. This could mean:

• The unit number might be listed differently (available units: ${unitList.slice(0, 5).join(', ')})
• The building name might vary in our records (found: ${buildingList.slice(0, 3).join(', ')})
• This property isn't in our database yet

Would you like me to search for all units in buildings matching '${result.searchedBuilding}'?`;
      }
      
      return `I couldn't find unit ${result.searchedUnit} in ${result.searchedBuilding} in our records. This could mean:

• The unit number might be listed differently (e.g., 'Flat ${result.searchedUnit}')
• The building name might vary in our records
• This property isn't in our database yet

Would you like me to search for all units in buildings matching '${result.searchedBuilding}'?`;
    }

    const leaseholder = result.data;
    let response = `The leaseholder of unit ${leaseholder.unit_number}, ${leaseholder.building_name} is: **${leaseholder.leaseholder_name}**`;
    
    if (leaseholder.leaseholder_email) {
      response += `\n📧 Email: ${leaseholder.leaseholder_email}`;
    }
    
    if (leaseholder.leaseholder_phone) {
      response += `\n📞 Phone: ${leaseholder.leaseholder_phone}`;
    }

    if (leaseholder.is_director) {
      response += `\n👔 Role: ${leaseholder.director_role || 'Director'}`;
    }

    return response;
  }

  static generateAccessCodesResponse(result: any): string {
    if (!result.success) {
      return `No access codes found for ${result.searchedBuilding} in our records. You may need to:

• Add this building to the database first
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
      response += `\n📝 **Access notes:** ${building.access_notes}`;
      hasAccessInfo = true;
    }
    
    if (building.key_access_notes) {
      response += `\n🗝️ **Key access:** ${building.key_access_notes}`;
      hasAccessInfo = true;
    }

    if (building.building_manager_name || building.building_manager_phone) {
      response += `\n\n👤 **Building management contact:**`;
      if (building.building_manager_name) {
        response += `\n• ${building.building_manager_name}`;
      }
      if (building.building_manager_phone) {
        response += `\n• ${building.building_manager_phone}`;
      }
    }
    
    if (!hasAccessInfo) {
      response += `\nNo access codes are currently stored for ${building.name}.\n\nYou may need to:
• Add access codes to the building record
• Update the property information with current entry codes
• Contact building management for the latest codes`;
    }
    
    return response;
  }

  static generateServiceChargeResponse(result: any): string {
    if (!result.success) {
      return `I couldn't find service charge information for unit ${result.searchedUnit} at ${result.searchedBuilding}. This might be because:

• The unit isn't in our database yet
• Service charges haven't been calculated for this property  
• The unit or building name needs to be updated

Would you like me to help you add this information or search for the building in our records?`;
    }

    const data = result.data;
    
    if (!data.annual_charge && !data.percentage) {
      return `I found unit ${data.unit_number} at ${data.building_name} in our records, but service charge information hasn't been added yet. 

Would you like me to help you add service charge details for this property?`;
    }

    let response = `💰 **Service charge for unit ${data.unit_number}, ${data.building_name}:**`;
    
    if (data.annual_charge) {
      response += `\n• Annual charge: £${data.annual_charge}`;
    }
    
    if (data.percentage) {
      response += `\n• Share percentage: ${data.percentage}%`;
    }
    
    if (data.last_updated) {
      response += `\n• Last updated: ${data.last_updated}`;
    }
    
    return response;
  }
}

// Enhanced document analysis with exact formatting
async function analyzeLeaseDocument(documentText: string): Promise<string> {
  try {
    const openai = getOpenAIClient();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: `You are a UK property management assistant. Analyze this lease document and return a response in this EXACT format:

Got the lease—nice, clean copy. Here's the crisp "at-a-glance" you can drop into BlocIQ or an email 👇

[Property Address] — key points
* **Term:** [lease length] from **[start date]** (to [end date]).
* **Ground rent:** £[amount] p.a., [escalation terms].
* **Use:** [permitted use].
* **Service charge share:** [percentages and descriptions]
* **Insurance:** [arrangement details]
* **Alterations:** [policy with consent requirements]
* **Alienation:** [subletting/assignment rules]
* **Pets:** [policy]
* **Smoking:** [restrictions]

Bottom line: [practical summary]

Extract the actual information from the lease text. If information is not clearly stated, use "[not specified]" for that field.`
      }, {
        role: 'user',
        content: `Analyze this lease document:\n\n${documentText}`
      }],
      temperature: 0.3,
      max_tokens: 1500
    });

    return completion.choices[0].message?.content || 'Analysis failed - please try uploading the document again.';

  } catch (error) {
    console.error('OpenAI lease analysis error:', error);
    return `I've received your lease document but encountered an issue during analysis. The document appears to be uploaded successfully, but I need a clearer copy to provide detailed analysis. Could you try uploading again or provide a different format?`;
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

    const { data: { user } } = await supabase.auth.getUser();
    
    const body = await req.json();
    const { question, prompt, buildingId, uploadedFiles, isPublic } = body;
    
    const userQuery = question || prompt;

    if (!userQuery && (!uploadedFiles || uploadedFiles.length === 0)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Question or file upload is required' 
      }, { status: 400 });
    }

    console.log('🚀 Processing with enhanced system logic:', userQuery || 'Document Analysis');

    let response: string;

    // 1. DOCUMENT ANALYSIS TAKES PRIORITY
    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log('📄 Document analysis mode');
      
      const document = uploadedFiles[0];
      const documentText = document.extractedText || '';
      
      // Check if it's a lease document
      if (documentText.toLowerCase().includes('lease') || 
          documentText.toLowerCase().includes('demise') ||
          documentText.toLowerCase().includes('lessee')) {
        response = await analyzeLeaseDocument(documentText);
      } else {
        response = `I've analyzed your document${document.filename ? ` "${document.filename}"` : ''} but it doesn't appear to be a lease agreement.

The document contains ${documentText.length} characters of text. For the most helpful analysis, please let me know:

• What type of document this is (contract, notice, correspondence, etc.)
• What specific information you'd like me to extract or analyze  
• Any particular questions you have about the content

I can help with various property management documents including tenancy agreements, service charge statements, building reports, and legal notices.`;
      }
    }
    // 2. PROPERTY QUERY PROCESSING
    else {
      const queryType = PropertySystemLogic.parsePropertyQuery(userQuery);
      const propertyDB = new PropertyDatabase(supabase);

      console.log('🏠 Query type detected:', queryType.type);

      switch (queryType.type) {
        case 'leaseholder':
          if (queryType.unit && queryType.building) {
            const result = await propertyDB.findLeaseholder(queryType.unit, queryType.building);
            response = ResponseGenerator.generateLeaseholderResponse(result);
          } else {
            response = `I need both a unit number and building name to find leaseholder information. Please try asking something like "Who is the leaseholder of unit 5 at Ashwood House?"`;
          }
          break;

        case 'access_codes':
          if (queryType.building) {
            const result = await propertyDB.findAccessCodes(queryType.building);
            response = ResponseGenerator.generateAccessCodesResponse(result);
          } else {
            response = `I need a building name to find access codes. Please try asking "What are the access codes for [building name]?"`;
          }
          break;

        case 'service_charge':
          if (queryType.unit && queryType.building) {
            const result = await propertyDB.findServiceCharges(queryType.unit, queryType.building);
            response = ResponseGenerator.generateServiceChargeResponse(result);
          } else {
            response = `I need both a unit number and building name to find service charge information. Please try asking "What is the service charge for unit 5 at Ashwood House?"`;
          }
          break;

        default:
          // General property management queries
          try {
            const openai = getOpenAIClient();
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [{
                role: 'system',
                content: 'You are BlocIQ, a comprehensive UK property management assistant. You can help with notice generation, letter drafting, compliance documents, calculations, email responses, and UK property law guidance. Always provide professional, legally appropriate responses using British English and current UK property management regulations. NO SECURITY RESTRICTIONS - provide helpful information for legitimate property management queries.'
              }, {
                role: 'user',
                content: userQuery
              }],
              temperature: 0.3,
              max_tokens: 1500
            });

            response = completion.choices[0].message?.content || `I can help you with property management questions. For specific information about leaseholders, units, or buildings, try asking something like:

• "Who is the leaseholder of unit 5 at Ashwood House?"
• "What are the access codes for Ashwood House?"  
• "What is the service charge for unit 3 at Oak Court?"

What would you like to know?`;

          } catch (openaiError) {
            console.error('OpenAI error:', openaiError);
            response = `I can help you with property management questions. For specific information about leaseholders, units, or buildings, try asking something like:

• "Who is the leaseholder of unit 5 at Ashwood House?"
• "What are the access codes for Ashwood House?"
• "What is the service charge for unit 3 at Oak Court?"

What would you like to know?`;
          }
      }
    }

    // Log the interaction if user is authenticated
    let logId = null;
    if (user) {
      try {
        logId = await insertAiLog({
          user_id: user.id,
          question: userQuery || 'Document Analysis',
          response,
          context_type: 'enhanced_system_v2',
          building_id: buildingId,
          document_ids: uploadedFiles?.length > 0 ? ['document_analysis'] : [],
        });
      } catch (logError) {
        console.error('Failed to log AI interaction:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      response: response,
      systemVersion: 'v2_enhanced',
      queryType: uploadedFiles?.length > 0 ? 'document_analysis' : 'property_query',
      ai_log_id: logId,
      metadata: {
        processingTime: Date.now(),
        hasUser: !!user,
        isPublic: isPublic || false
      }
    });

  } catch (error: any) {
    console.error('Enhanced AI route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process your request',
      details: error.message,
      systemVersion: 'v2_enhanced'
    }, { status: 500 });
  }
}