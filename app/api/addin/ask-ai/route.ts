import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getOpenAIClient } from '@/lib/openai-client';

export async function POST(req: NextRequest) {
  try {
    console.log('🔌 Outlook Add-in API endpoint hit');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.log('❌ Authentication failed for add-in request');
      return NextResponse.json({ 
        action: 'login_required',
        message: 'Authentication required. Please log into your BlocIQ account.',
        error: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', session.user.id);

    const body = await req.json();
    const { prompt, contextType, building_id, emailContext, is_outlook_addin } = body;

    if (!prompt) {
      return NextResponse.json({ 
        error: 'Prompt is required',
        message: 'Please provide a question or prompt.'
      }, { status: 400 });
    }

    console.log('📝 Processing add-in request:', {
      prompt: prompt.substring(0, 100) + '...',
      contextType,
      building_id: building_id || 'none',
      hasEmailContext: !!emailContext,
      is_outlook_addin
    });

    // Instead of calling OpenAI directly, use the full Ask BlocIQ system
    const enhancedPrompt = buildEnhancedPrompt(prompt, emailContext, building_id);
    
    console.log('🔄 Calling enhanced Ask BlocIQ system...');
    
    // Call the main Ask AI route internally to get full functionality
    const askAIResponse = await callEnhancedAskBlocIQ(enhancedPrompt, supabase, session.user.id);

    console.log('✅ Enhanced AI response generated successfully');

    return NextResponse.json({
      success: true,
      response: askAIResponse.answer,
      confidence: askAIResponse.confidence,
      sources: askAIResponse.sources,
      contextType,
      building_id,
      databaseRecordsSearched: askAIResponse.databaseRecordsSearched,
      timestamp: new Date().toISOString(),
      metadata: askAIResponse.metadata
    });

  } catch (error) {
    console.error('❌ Add-in API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  // Handle preflight request for CORS
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://outlook.office.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

/**
 * BUILD ENHANCED PROMPT WITH EMAIL CONTEXT
 */
function buildEnhancedPrompt(prompt: string, emailContext: any, building_id?: string): string {
  let enhancedPrompt = prompt;
  
  // Add email context if available
  if (emailContext) {
    enhancedPrompt += `\n\n[Email Context]
Subject: ${emailContext.subject}
From: ${emailContext.from}
To: ${emailContext.to}
Body: ${emailContext.body.substring(0, 1000)}...
[End Email Context]`;
  }
  
  // Add building context if available
  if (building_id) {
    enhancedPrompt += `\n\n[Building ID: ${building_id}]`;
  }
  
  // Add add-in specific context
  enhancedPrompt += `\n\n[Context: This query is from BlocIQ Outlook Add-in. Provide professional property management responses.]`;
  
  return enhancedPrompt;
}

/**
 * CALL ENHANCED ASK BLOCIQ SYSTEM WITH FULL CAPABILITIES
 */
async function callEnhancedAskBlocIQ(prompt: string, supabase: any, userId: string) {
  try {
    console.log('🔍 Enhanced Ask BlocIQ processing:', prompt.substring(0, 100) + '...');
    
    // Import the enhanced ask AI system
    const { processEnhancedAskBlocIQ } = await import('@/lib/ai/enhanced-ask-ai');
    
    // Use the full system with database access, smart matching, etc.
    const result = await processEnhancedAskBlocIQ({
      prompt,
      userId,
      supabase,
      context: {
        source: 'outlook_addin',
        hasEmailContext: prompt.includes('[Email Context]'),
        hasBuildingContext: prompt.includes('[Building ID:')
      }
    });
    
    return {
      answer: result.response || result.answer || 'I apologize, but I couldn\'t generate a response.',
      confidence: result.confidence || 75,
      sources: result.sources || [],
      databaseRecordsSearched: result.databaseRecordsSearched || 0,
      metadata: {
        processingTime: result.processingTime || 0,
        aiModel: 'enhanced-blociq-system',
        timestamp: new Date().toISOString(),
        source: 'outlook_addin'
      }
    };
    
  } catch (error) {
    console.error('❌ Enhanced Ask BlocIQ failed, using fallback:', error);
    
    // Fallback to the original Ask AI system
    return await callFallbackAskBlocIQ(prompt, supabase, userId);
  }
}

/**
 * FALLBACK TO MAIN ASK AI SYSTEM
 */
async function callFallbackAskBlocIQ(prompt: string, supabase: any, userId: string) {
  try {
    console.log('🔄 Using fallback Ask AI system...');
    
    // Categorize the query
    const queryType = categorizeQuery(prompt);
    console.log(`🏷️ Query type: ${queryType}`);
    
    let answer = '';
    let databaseRecordsSearched = 0;
    let sources: string[] = [];
    let confidence = 70;
    
    if (queryType === 'property') {
      console.log('🏠 Property query - searching database...');
      
      // Enhanced Supabase search with smart matching
      const searchQuery = extractSearchTerms(prompt);
      const { data: allData, error } = await supabase
        .from('vw_units_leaseholders')
        .select('*')
        .or(`unit_number.ilike.%${searchQuery}%,leaseholder_name.ilike.%${searchQuery}%,correspondence_address.ilike.%${searchQuery}%,building_name.ilike.%${searchQuery}%,property_name.ilike.%${searchQuery}%`)
        .limit(50);
      
      if (!error && allData) {
        // Use smart matching
        const { searchWithSmartMatching } = await import('@/lib/search/smart-unit-matcher');
        const smartResults = await searchWithSmartMatching(allData, prompt);
        
        databaseRecordsSearched = allData.length;
        sources = ['vw_units_leaseholders'];
        
        if (smartResults.matches.length > 0) {
          confidence = smartResults.type === 'unit_match' ? 95 : 85;
          
          // Format response for add-in
          const matches = smartResults.matches.slice(0, 3); // Limit for add-in
          answer = formatPropertyResponseForAddin(matches, prompt);
          
        } else {
          // No matches - provide suggestions
          const availableUnits = allData.map(d => d.unit_number).sort().slice(0, 10);
          const suggestions = smartResults.suggestions;
          
          answer = `I couldn't find an exact match for "${prompt}" in your property database.

**Available Units:** ${availableUnits.join(', ')}

${suggestions.length > 0 ? `**Did you mean:** ${suggestions.join(', ')}?` : ''}

**Tip:** Try searching for specific unit numbers, tenant names, or building addresses.`;
          confidence = 60;
        }
      } else {
        answer = 'I apologize, but I couldn\'t access the property database right now. Please try again.';
        confidence = 20;
      }
      
    } else {
      // General or legal queries - use OpenAI with enhanced context
      const openai = getOpenAIClient();
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'system',
          content: `You are BlocIQ Assistant, an AI property management expert. Provide professional, helpful responses for property managers and landlords. Focus on UK property law and best practices.`
        }, {
          role: 'user',
          content: prompt
        }],
        max_tokens: 800,
        temperature: 0.3,
      });

      answer = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';
      confidence = 80;
    }
    
    return {
      answer,
      confidence,
      sources,
      databaseRecordsSearched,
      metadata: {
        processingTime: 0,
        aiModel: 'fallback-system',
        timestamp: new Date().toISOString(),
        source: 'outlook_addin_fallback'
      }
    };
    
  } catch (error) {
    console.error('❌ Fallback Ask BlocIQ failed:', error);
    
    return {
      answer: 'I apologize, but I\'m experiencing technical difficulties. Please try again or check the main BlocIQ dashboard.',
      confidence: 10,
      sources: [],
      databaseRecordsSearched: 0,
      metadata: {
        processingTime: 0,
        aiModel: 'error-fallback',
        timestamp: new Date().toISOString(),
        source: 'outlook_addin_error'
      }
    };
  }
}

/**
 * HELPER FUNCTIONS
 */
function categorizeQuery(query: string): 'property' | 'legal' | 'general' {
  const lower = query.toLowerCase();
  
  if (lower.includes('section 20') || lower.includes('section 21') || lower.includes('legal') || 
      lower.includes('compliance') || lower.includes('regulation')) {
    return 'legal';
  }
  
  if (lower.includes('leaseholder') || lower.includes('tenant') || lower.includes('property') ||
      lower.includes('house') || lower.includes('unit') || lower.includes('flat') ||
      lower.includes('apartment') || /\b\d+\b/.test(lower)) {
    return 'property';
  }
  
  return 'general';
}

function extractSearchTerms(query: string): string {
  const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const words = query.toLowerCase().split(/\s+/).filter(word => 
    word.length > 1 && !stopWords.includes(word)
  );
  
  const numbers = query.match(/\d+/g);
  if (numbers) return numbers[0];
  
  return words[0] || query;
}

function formatPropertyResponseForAddin(matches: any[], query: string): string {
  if (matches.length === 0) return 'No matching properties found.';
  
  let response = `## 🏠 Found ${matches.length} matching propert${matches.length === 1 ? 'y' : 'ies'}:\n\n`;
  
  matches.forEach((match, index) => {
    response += `**${match.unit_number}**\n`;
    response += `• **Leaseholder:** ${match.leaseholder_name}\n`;
    response += `• **Email:** ${match.leaseholder_email}\n`;
    response += `• **Phone:** ${match.leaseholder_phone}\n`;
    if (match.is_director) {
      response += `• **Role:** ${match.director_role || 'Director'}\n`;
    }
    response += `• **Address:** ${match.correspondence_address}\n`;
    
    if (index < matches.length - 1) response += '\n';
  });
  
  return response;
}
