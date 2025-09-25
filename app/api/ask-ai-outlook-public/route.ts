import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getTemplateVariations,
  analyzeSenderProfile,
  getAdaptedTone,
  validateLegalCompliance,
  detectLanguagePreference,
  analyzeHistoricalPatterns,
  generateIntelligentFollowUp,
  buildEnhancedSystemMessage
} from '../../../lib/ai/phase3-intelligence';

// CORS headers for Outlook Add-in compatibility
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Helper function to create response with CORS headers
function createResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: CORS_HEADERS
  });
}

export async function OPTIONS(req: NextRequest) {
  // Handle preflight requests for Outlook Add-in
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS
  });
}

/**
 * PUBLIC OUTLOOK AI
 *
 * Advanced AI with Phase 3 intelligence but NO access to BlocIQ database.
 * Provides sophisticated email reply generation without building/agency data.
 */
async function handlePublicOutlookAI(req: NextRequest) {
  try {
    console.log('🌐 Public Outlook AI: Processing request');

    const body = await req.json();
    const {
      emailSubject = '',
      emailBody = '',
      senderEmail = '',
      senderName = '',
      requestType = 'reply',
      userEmail,
      tone = 'professional'
    } = body;

    if (!emailBody?.trim()) {
      return createResponse({
        success: false,
        error: 'Email body is required'
      }, 400);
    }

    const userEmailToUse = userEmail || req.headers.get('x-user-email') || 'anonymous@public.com';
    console.log(`📧 Processing ${requestType} for: ${userEmailToUse}`);

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // 🚀 PHASE 3: ADVANCED AI CONTEXT ENHANCEMENT
    console.log('🤖 Phase 3: Public Outlook AI contextual processing started');

    // Build message content for analysis
    const messageContent = `${emailSubject} ${emailBody}`.toLowerCase();
    let primaryIssue = 'general';
    let urgencyLevel = 'medium';
    let sentiment = 'neutral';

    // Issue detection with extensive UK property management categories
    if (messageContent.includes('leak') || messageContent.includes('water') || messageContent.includes('dripping') || messageContent.includes('flooding')) {
      primaryIssue = 'leak';
    } else if (messageContent.includes('noise') || messageContent.includes('loud') || messageContent.includes('music') || messageContent.includes('party')) {
      primaryIssue = 'noise';
    } else if (messageContent.includes('repair') || messageContent.includes('maintenance') || messageContent.includes('broken') || messageContent.includes('fix')) {
      primaryIssue = 'maintenance';
    } else if (messageContent.includes('service charge') || messageContent.includes('ground rent') || messageContent.includes('payment') || messageContent.includes('bill')) {
      primaryIssue = 'service_charges';
    } else if (messageContent.includes('parking') || messageContent.includes('car') || messageContent.includes('vehicle') || messageContent.includes('space')) {
      primaryIssue = 'parking';
    } else if (messageContent.includes('safety') || messageContent.includes('security') || messageContent.includes('dangerous') || messageContent.includes('risk')) {
      primaryIssue = 'safety';
    } else if (messageContent.includes('complaint') || messageContent.includes('dissatisfied') || messageContent.includes('unhappy') || messageContent.includes('problem')) {
      primaryIssue = 'complaint';
    }

    // Urgency detection
    if (messageContent.includes('urgent') || messageContent.includes('emergency') || messageContent.includes('immediate')) {
      urgencyLevel = 'high';
    } else if (messageContent.includes('asap') || messageContent.includes('critical') || messageContent.includes('serious')) {
      urgencyLevel = 'critical';
    }

    // Sentiment detection
    if (messageContent.includes('angry') || messageContent.includes('frustrated') || messageContent.includes('unacceptable')) {
      sentiment = 'negative';
    } else if (messageContent.includes('happy') || messageContent.includes('thank') || messageContent.includes('pleased')) {
      sentiment = 'positive';
    }

    // 🚀 PHASE 3: Apply Advanced Intelligence
    const templateVariations = getTemplateVariations(primaryIssue, urgencyLevel, sentiment);

    // Build mock sender profile for tone adaptation (no database access)
    const mockSenderProfile = {
      communicationStyle: sentiment === 'negative' ? 'direct' : 'formal',
      urgencyPattern: urgencyLevel,
      responseHistory: [],
      preferredChannels: ['email'],
      issueTypes: [primaryIssue],
      escalationTendency: sentiment === 'negative' ? 'high' : 'low'
    };

    const adaptedTone = getAdaptedTone(mockSenderProfile, primaryIssue, urgencyLevel);

    // Legal compliance validation (public version - no building-specific data)
    const legalCompliance = await validateLegalCompliance(primaryIssue, null);

    // Language detection
    const languagePreference = detectLanguagePreference(emailBody);

    // Mock historical patterns (no database access)
    const historicalPatterns = {
      commonIssues: [primaryIssue],
      responsePatterns: [],
      escalationHistory: [],
      preferredSolutions: [],
      timePatterns: [],
      seasonalTrends: []
    };

    // Build enhanced system message with Phase 3 intelligence
    const enhancedSystemMessage = buildEnhancedSystemMessage(
      templateVariations,
      adaptedTone,
      legalCompliance,
      languagePreference,
      historicalPatterns,
      primaryIssue,
      urgencyLevel,
      sentiment
    );

    // Create comprehensive prompt with Phase 3 enhancements
    const prompt = `${enhancedSystemMessage}

CONTEXT:
- Email Subject: ${emailSubject}
- Sender: ${senderName} (${senderEmail})
- Primary Issue: ${primaryIssue}
- Urgency Level: ${urgencyLevel}
- Sentiment: ${sentiment}
- Tone Preference: ${adaptedTone.primary_tone}

EMAIL TO RESPOND TO:
${emailBody}

IMPORTANT - PUBLIC VERSION GUIDELINES:
- You are a PUBLIC property management AI assistant
- You do NOT have access to specific building data, leaseholder records, or internal systems
- Provide general UK property management guidance based on industry best practices
- Use professional, helpful language appropriate for property management
- Include relevant legal frameworks and regulations when applicable
- Suggest appropriate next steps that don't require specific building data
- Be empathetic and solution-focused
- If specific building information is needed, guide them to contact their property manager directly

Generate a professional, helpful reply that follows UK property management best practices:`;

    console.log('🤖 Generating AI response with Phase 3 intelligence...');

    // Generate AI response with dynamic temperature based on urgency
    const temperature = urgencyLevel === 'critical' ? 0.3 : urgencyLevel === 'high' ? 0.5 : 0.7;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt
        }
      ],
      max_tokens: templateVariations.max_tokens || 1200,
      temperature: temperature,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response generated from AI');
    }

    // Generate intelligent follow-up suggestions
    const followUpSuggestions = generateIntelligentFollowUp(
      primaryIssue,
      urgencyLevel,
      sentiment,
      null, // No building context in public version
      aiResponse
    );

    console.log('✅ Public Outlook AI: Response generated successfully');

    // Return response with Phase 3 metadata
    return createResponse({
      success: true,
      response: aiResponse,
      metadata: {
        version: 'public-v1.0',
        source: 'Public Outlook AI with Phase 3 Intelligence',
        processing: {
          primaryIssue,
          urgencyLevel,
          sentiment,
          toneAdaptation: adaptedTone.primary_tone,
          templateUsed: templateVariations.primary_template,
          languageDetected: languagePreference.primary,
          legalComplianceChecked: true
        },
        followUpSuggestions,
        tokens: completion.usage?.total_tokens || 0,
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('❌ Public Outlook AI Error:', error);
    return createResponse({
      success: false,
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}

export const POST = handlePublicOutlookAI;