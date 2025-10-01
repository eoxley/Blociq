/**
 * BlocIQ Response Parser
 * Handles parsing and validation of structured BlocIQ responses
 */

export interface BlocIQResponse {
  context_reasoning: {
    legal_context: string;
    why_this_matters: string;
    agency_obligations: string[];
    tone: string;
    routing?: string;
    escalation_required?: boolean;
    deadlines?: string[];
    compliance_notes?: string[];
  };
  formatted_output: {
    subject: string;
    body: string;
  };
}

export interface ParsedBlocIQResponse {
  isValid: boolean;
  response?: BlocIQResponse;
  error?: string;
  rawText?: string;
}

/**
 * Parse AI response text to extract structured BlocIQ response
 */
export function parseBlocIQResponse(text: string): ParsedBlocIQResponse {
  try {
    // Try to parse as JSON first
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const jsonText = jsonMatch[1];
      const parsed = JSON.parse(jsonText);
      
      // Validate structure
      if (isValidBlocIQResponse(parsed)) {
        return {
          isValid: true,
          response: parsed,
          rawText: text
        };
      }
    }

    // Try to find JSON without code blocks
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonText = text.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonText);
      
      if (isValidBlocIQResponse(parsed)) {
        return {
          isValid: true,
          response: parsed,
          rawText: text
        };
      }
    }

    // Fallback: try to extract from text format
    return parseTextFormatResponse(text);

  } catch (error) {
    console.error('Error parsing BlocIQ response:', error);
    return {
      isValid: false,
      error: `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      rawText: text
    };
  }
}

/**
 * Validate if parsed object matches BlocIQ response structure
 */
function isValidBlocIQResponse(obj: any): obj is BlocIQResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.context_reasoning &&
    typeof obj.context_reasoning === 'object' &&
    typeof obj.context_reasoning.legal_context === 'string' &&
    typeof obj.context_reasoning.why_this_matters === 'string' &&
    Array.isArray(obj.context_reasoning.agency_obligations) &&
    typeof obj.context_reasoning.tone === 'string' &&
    obj.formatted_output &&
    typeof obj.formatted_output === 'object' &&
    typeof obj.formatted_output.subject === 'string' &&
    typeof obj.formatted_output.body === 'string'
  );
}

/**
 * Parse text format response (fallback when JSON parsing fails)
 */
function parseTextFormatResponse(text: string): ParsedBlocIQResponse {
  try {
    // Look for Part 1 and Part 2 sections
    const part1Match = text.match(/\*\*Part 1: Context & Reasoning\*\*([\s\S]*?)(?=\*\*Part 2|\*\*Subject:|$)/i);
    const part2Match = text.match(/\*\*Part 2: Formatted Output\*\*([\s\S]*?)$/i);
    
    if (!part1Match || !part2Match) {
      return {
        isValid: false,
        error: 'Could not find Part 1 and Part 2 sections in response',
        rawText: text
      };
    }

    const part1Content = part1Match[1].trim();
    const part2Content = part2Match[1].trim();

    // Extract subject line
    const subjectMatch = part2Content.match(/\*\*Subject:\*\*\s*(.+?)(?:\n|$)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : '';

    // Extract body (everything after subject)
    const bodyMatch = part2Content.match(/\*\*Subject:\*\*\s*.+?\n\n([\s\S]*)/i);
    const body = bodyMatch ? bodyMatch[1].trim() : part2Content.replace(/\*\*Subject:\*\*\s*.+?\n?/i, '').trim();

    // Extract legal context
    const legalContextMatch = part1Content.match(/legal[^:]*:?\s*([^\n]+)/i);
    const legalContext = legalContextMatch ? legalContextMatch[1].trim() : 'UK Property Law';

    // Extract why this matters
    const whyMattersMatch = part1Content.match(/why[^:]*:?\s*([^\n]+)/i);
    const whyThisMatters = whyMattersMatch ? whyMattersMatch[1].trim() : 'Professional property management response';

    // Extract agency obligations (look for bullet points)
    const obligationsMatch = part1Content.match(/(?:obligations?|requirements?|actions?)[\s\S]*?(-[^\n]+(?:\n-[^\n]+)*)/i);
    const obligations = obligationsMatch 
      ? obligationsMatch[1].split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(line => line)
      : ['Provide professional response'];

    // Extract tone
    const toneMatch = part1Content.match(/tone[^:]*:?\s*([^\n]+)/i);
    const tone = toneMatch ? toneMatch[1].trim() : 'Professional and helpful';

    const response: BlocIQResponse = {
      context_reasoning: {
        legal_context: legalContext,
        why_this_matters: whyThisMatters,
        agency_obligations: obligations,
        tone: tone
      },
      formatted_output: {
        subject: subject,
        body: body
      }
    };

    return {
      isValid: true,
      response,
      rawText: text
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Failed to parse text format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      rawText: text
    };
  }
}

/**
 * Create a fallback response when parsing fails
 */
export function createFallbackResponse(originalText: string): BlocIQResponse {
  return {
    context_reasoning: {
      legal_context: 'UK Property Law',
      why_this_matters: 'Professional property management response required',
      agency_obligations: ['Provide accurate and helpful response'],
      tone: 'Professional and helpful'
    },
    formatted_output: {
      subject: 'Property Management Response',
      body: originalText || 'Thank you for your query. I will review this and provide a detailed response shortly.\n\nKind regards,\nProperty Manager'
    }
  };
}

/**
 * Format response for display
 */
export function formatResponseForDisplay(response: BlocIQResponse): string {
  return `**Part 1: Context & Reasoning**
Legal Context: ${response.context_reasoning.legal_context}
Why This Matters: ${response.context_reasoning.why_this_matters}
Agency Obligations: ${response.context_reasoning.agency_obligations.join(', ')}
Tone: ${response.context_reasoning.tone}

**Part 2: Formatted Output**
Subject: ${response.formatted_output.subject}

${response.formatted_output.body}`;
}
