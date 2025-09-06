/**
 * Outlook Add-in Ask API Route
 * 
 * Handles Q&A and reply generation with strict domain locking
 * and deterministic fact-based responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseAddinIntent } from '@/ai/intent/parseAddinIntent';
import { createAddinQAAdapter } from '@/ai/adapters/addinQAAdapter';
import { createAddinReplyAdapter } from '@/ai/adapters/addinReplyAdapter';
import { processUserInput } from '@/ai/prompt/addinPrompt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userInput, 
      outlookContext, 
      userSettings 
    } = body;

    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid input',
        message: 'User input is required'
      }, { status: 400 });
    }

    // Process user input for acronyms and domain validation
    const processed = processUserInput(userInput);
    
    // Check if out of scope
    if (processed.isOutOfScope) {
      return NextResponse.json({
        success: true,
        type: 'out_of_scope',
        response: "Out of scope for BlocIQ add-in. I only handle UK leasehold and building-safety topics.",
        confidence: 'high',
        sources: [],
        facts: [],
        suggestions: ['Ask about property management, lease terms, or building safety instead']
      });
    }
    
    // Check for clarification needs
    if (processed.needsClarification.length > 0) {
      const clarification = processed.needsClarification[0];
      return NextResponse.json({
        success: true,
        type: 'clarification_needed',
        response: `In BlocIQ, ${clarification} could mean different things. Could you clarify what you mean by "${clarification}"?`,
        confidence: 'medium',
        sources: [],
        facts: [],
        suggestions: ['Be more specific about what you\'re asking about']
      });
    }

    // Parse intent
    const intent = parseAddinIntent(processed.processedInput, outlookContext);
    
    // Validate intent
    const validation = validateIntent(intent);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid intent',
        message: 'Unable to determine intent',
        suggestions: validation.suggestions
      }, { status: 400 });
    }

    // Route to appropriate handler
    if (intent.intent === 'reply') {
      return await handleReplyIntent(processed.processedInput, outlookContext, userSettings);
    } else {
      return await handleQAIntent(processed.processedInput, outlookContext, userSettings);
    }

  } catch (error) {
    console.error('Add-in Ask API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    }, { status: 500 });
  }
}

/**
 * Handle Q&A intent
 */
async function handleQAIntent(
  userInput: string,
  outlookContext?: any,
  userSettings?: any
): Promise<NextResponse> {
  try {
    // Create Q&A adapter
    const qaAdapter = createAddinQAAdapter();
    
    // Get answer
    const result = await qaAdapter.answerQuestion(userInput, outlookContext, userSettings);
    
    return NextResponse.json({
      success: true,
      type: 'qa',
      response: result.answer,
      confidence: result.confidence,
      sources: result.sources,
      facts: result.facts,
      requiresReview: result.requiresReview,
      suggestions: result.suggestions,
      metadata: {
        generatedAt: new Date().toISOString(),
        factCount: result.facts.length,
        sourceCount: result.sources.length
      }
    });
    
  } catch (error) {
    console.error('Q&A handler error:', error);
    return NextResponse.json({
      success: false,
      error: 'Q&A processing failed',
      message: 'Unable to process your question'
    }, { status: 500 });
  }
}

/**
 * Handle reply intent
 */
async function handleReplyIntent(
  userInput: string,
  outlookContext?: any,
  userSettings?: any
): Promise<NextResponse> {
  try {
    // Extract building context
    const buildingContext = extractBuildingContext(userInput, outlookContext);
    
    // Get building ID if we have building name
    let buildingId: string | undefined;
    if (buildingContext.buildingName) {
      buildingId = await getBuildingId(buildingContext.buildingName);
    }
    
    // Get lease summary if available
    let leaseSummary = null;
    if (buildingId) {
      leaseSummary = await getLeaseSummary(buildingId);
    }
    
    // Create reply adapter
    const replyAdapter = createAddinReplyAdapter();
    
    // Generate reply
    const result = await replyAdapter.generateReply({
      userInput,
      outlookContext,
      buildingContext: {
        ...buildingContext,
        buildingId
      },
      leaseSummary,
      userSettings
    });
    
    return NextResponse.json({
      success: true,
      type: 'reply',
      subjectSuggestion: result.subjectSuggestion,
      bodyHtml: result.bodyHtml,
      usedFacts: result.usedFacts,
      sources: result.sources,
      metadata: result.metadata
    });
    
  } catch (error) {
    console.error('Reply handler error:', error);
    return NextResponse.json({
      success: false,
      error: 'Reply generation failed',
      message: 'Unable to generate reply'
    }, { status: 500 });
  }
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
 * Get lease summary for building
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
 * Extract building context from input or Outlook context
 */
function extractBuildingContext(input: string, outlookContext?: any): {
  buildingName?: string;
  unitNumber?: string;
  source: 'input' | 'outlook' | 'none';
} {
  // Try to extract from input first
  const buildingRegex = /(?:building|property|block)\s+(?:called\s+)?([A-Za-z\s]+?)(?:\s|$|,|\.)/i;
  const unitRegex = /(?:flat|unit|apartment)\s+(\d+[a-z]?)/i;
  
  const buildingMatch = input.match(buildingRegex);
  const unitMatch = input.match(unitRegex);
  
  if (buildingMatch || unitMatch) {
    return {
      buildingName: buildingMatch?.[1]?.trim(),
      unitNumber: unitMatch?.[1]?.trim(),
      source: 'input'
    };
  }
  
  // Try to extract from Outlook context
  if (outlookContext?.subject) {
    const subjectBuildingMatch = outlookContext.subject.match(buildingRegex);
    const subjectUnitMatch = outlookContext.subject.match(unitRegex);
    
    if (subjectBuildingMatch || subjectUnitMatch) {
      return {
        buildingName: subjectBuildingMatch?.[1]?.trim(),
        unitNumber: subjectUnitMatch?.[1]?.trim(),
        source: 'outlook'
      };
    }
  }
  
  return {
    source: 'none'
  };
}

/**
 * Validate intent result
 */
function validateIntent(intent: any): {
  isValid: boolean;
  suggestions?: string[];
  warnings?: string[];
} {
  const { confidence } = intent;
  
  const suggestions: string[] = [];
  const warnings: string[] = [];
  
  if (confidence < 0.5) {
    warnings.push('Low confidence intent detected');
    suggestions.push('Try being more specific about what you want to do');
  }
  
  return {
    isValid: confidence >= 0.5,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}
