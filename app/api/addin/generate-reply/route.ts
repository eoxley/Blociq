/**
 * Outlook Add-in Generate Reply API Route
 * 
 * Dedicated endpoint for generating email replies with strict domain locking
 * and deterministic fact-based responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAddinReplyAdapter } from '@/ai/adapters/addinReplyAdapter';
import { processUserInput } from '@/ai/prompt/addinPrompt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userInput, 
      outlookContext, 
      userSettings,
      buildingContext 
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

    // Validate Outlook context for reply generation
    if (!outlookContext || !outlookContext.from) {
      return NextResponse.json({
        success: false,
        error: 'Missing context',
        message: 'Outlook message context is required for reply generation'
      }, { status: 400 });
    }

    // Create reply adapter
    const replyAdapter = createAddinReplyAdapter();
    
    // Generate reply
    const result = await replyAdapter.generateReply({
      userInput: processed.processedInput,
      outlookContext,
      buildingContext,
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
    console.error('Generate Reply API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while generating the reply'
    }, { status: 500 });
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Generate Reply API is healthy',
    timestamp: new Date().toISOString()
  });
}
