import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 AI Email Reply: Processing email analysis request...');

    const supabase = createClient(cookies());
    
    // Get the current user (optional for Outlook add-in)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Parse the request body
    const body = await req.json();
    const { 
      subject, 
      body: emailBody, 
      sender, 
      senderName, 
      context = 'outlook_addin_reply',
      conversationId,
      regenerate = false,
      previous_reply
    } = body;

    if (!subject && !emailBody) {
      return NextResponse.json({
        success: false,
        error: 'Email subject or body is required'
      }, { status: 400 });
    }

    console.log('📧 Email Analysis Request:', {
      subject: subject?.substring(0, 50) + '...',
      sender: senderName || sender,
      hasBody: !!emailBody,
      bodyLength: emailBody?.length || 0,
      context,
      regenerate
    });

    // Determine if this is a property management related email
    const isPropertyRelated = isPropertyManagementEmail(subject, emailBody);
    
    // Build the AI prompt for email analysis and reply generation
    const analysisPrompt = buildEmailAnalysisPrompt({
      subject,
      emailBody,
      sender,
      senderName,
      isPropertyRelated,
      regenerate,
      previous_reply
    });

    console.log('🤖 Sending request to AI service...');

    // Call the existing Ask AI endpoint
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ask-ai-public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: analysisPrompt,
        is_public: false, // Use full functionality
        context: context
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const aiResult = await aiResponse.json();
    
    if (!aiResult.success) {
      throw new Error(aiResult.error || 'AI analysis failed');
    }

    const aiResponseText = aiResult.response || aiResult.result || '';
    
    // Parse the AI response to extract analysis and suggested reply
    const parsedResponse = parseAIResponse(aiResponseText);
    
    // Log the interaction if user is authenticated
    if (user) {
      try {
        await supabase
          .from('ai_interactions')
          .insert({
            user_id: user.id,
            interaction_type: 'email_reply_generation',
            input_data: {
              subject,
              sender: senderName || sender,
              context,
              regenerate
            },
            output_data: parsedResponse,
            success: true
          });
      } catch (logError) {
        console.error('Failed to log interaction:', logError);
        // Don't fail the request if logging fails
      }
    }

    console.log('✅ Email analysis completed successfully');

    return NextResponse.json({
      success: true,
      analysis: parsedResponse.analysis,
      suggested_reply: parsedResponse.suggested_reply,
      confidence: parsedResponse.confidence,
      is_property_related: isPropertyRelated,
      context: context
    });

  } catch (error) {
    console.error('❌ AI Email Reply error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze email',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

function isPropertyManagementEmail(subject: string, emailBody: string): boolean {
  const propertyKeywords = [
    'lease', 'rent', 'tenant', 'landlord', 'property', 'building', 'maintenance',
    'repair', 'service charge', 'ground rent', 'flat', 'apartment', 'unit',
    'inspection', 'deposit', 'notice', 'eviction', 'compliance', 'safety',
    'fire safety', 'gas safety', 'electrical', 'plumbing', 'heating',
    'managing agent', 'freeholder', 'leaseholder', 'block', 'estate'
  ];

  const text = `${subject} ${emailBody}`.toLowerCase();
  
  return propertyKeywords.some(keyword => text.includes(keyword));
}

function buildEmailAnalysisPrompt({
  subject,
  emailBody,
  sender,
  senderName,
  isPropertyRelated,
  regenerate,
  previous_reply
}: {
  subject: string;
  emailBody: string;
  sender: string;
  senderName?: string;
  isPropertyRelated: boolean;
  regenerate: boolean;
  previous_reply?: string;
}): string {
  const contextNote = isPropertyRelated 
    ? "This appears to be a property management related email. Please provide responses that are professional, compliant with UK property law, and appropriate for a property management context."
    : "This appears to be a general business email. Please provide a professional response.";

  const regenerateNote = regenerate 
    ? `\n\nPREVIOUS REPLY (please generate a different response):\n${previous_reply}\n\n`
    : '';

  return `You are BlocIQ, an AI assistant specializing in property management. Please analyze the following email and provide a professional reply.

EMAIL TO ANALYZE:
Subject: ${subject}
From: ${senderName || sender}
Content: ${emailBody}

${contextNote}${regenerateNote}

Please provide your response in this exact format:

ANALYSIS:
[Provide a brief analysis of the email content, key points, and any important considerations]

SUGGESTED REPLY:
[Provide a professional, well-structured reply that addresses the sender's concerns or requests. The reply should be:
- Professional and courteous in tone
- Clear and concise
- Actionable where appropriate
- Compliant with relevant regulations if property-related
- Appropriately formatted for email]

CONFIDENCE: [A number from 1-100 indicating your confidence in the analysis and suggested reply]`;
}

function parseAIResponse(aiResponse: string): {
  analysis: string;
  suggested_reply: string;
  confidence: number;
} {
  // Default values
  let analysis = 'Email analyzed successfully';
  let suggested_reply = '';
  let confidence = 85;

  try {
    // Extract analysis section
    const analysisMatch = aiResponse.match(/ANALYSIS:\s*([\s\S]*?)(?=SUGGESTED REPLY:|CONFIDENCE:|$)/i);
    if (analysisMatch) {
      analysis = analysisMatch[1].trim();
    }

    // Extract suggested reply section
    const replyMatch = aiResponse.match(/SUGGESTED REPLY:\s*([\s\S]*?)(?=CONFIDENCE:|$)/i);
    if (replyMatch) {
      suggested_reply = replyMatch[1].trim();
    }

    // Extract confidence score
    const confidenceMatch = aiResponse.match(/CONFIDENCE:\s*(\d+)/i);
    if (confidenceMatch) {
      confidence = parseInt(confidenceMatch[1], 10);
    }

    // Fallback: if structured parsing fails, try to extract reply from response
    if (!suggested_reply && aiResponse) {
      // Look for common reply indicators
      const replyIndicators = [
        /(?:reply|response):\s*([\s\S]*?)(?:\n\n|$)/i,
        /dear.*?(?:\n\n|$)([\s\S]*?)(?:best regards|kind regards|sincerely|$)/i
      ];

      for (const indicator of replyIndicators) {
        const match = aiResponse.match(indicator);
        if (match) {
          suggested_reply = match[1].trim();
          break;
        }
      }

      // If still no reply found, use the latter part of the response
      if (!suggested_reply) {
        const lines = aiResponse.split('\n').filter(line => line.trim());
        if (lines.length > 2) {
          suggested_reply = lines.slice(Math.floor(lines.length / 2)).join('\n').trim();
        } else {
          suggested_reply = aiResponse;
        }
      }
    }

    // If analysis is still default, try to extract from the first part
    if (analysis === 'Email analyzed successfully' && aiResponse) {
      const firstPart = aiResponse.split(/SUGGESTED REPLY:|CONFIDENCE:/i)[0];
      if (firstPart && firstPart.trim() !== aiResponse) {
        analysis = firstPart.replace(/ANALYSIS:\s*/i, '').trim();
      }
    }

  } catch (parseError) {
    console.error('Error parsing AI response:', parseError);
    // Use the full response as the suggested reply if parsing fails
    suggested_reply = aiResponse;
  }

  return {
    analysis,
    suggested_reply,
    confidence: Math.max(1, Math.min(100, confidence)) // Ensure confidence is between 1-100
  };
}