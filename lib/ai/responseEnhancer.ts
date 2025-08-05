import { improvedResponses, ImprovedResponse } from './improvedResponses';

export interface EnhancedResponse {
  response: string;
  legalContext?: string;
  nextSteps?: string[];
  keyPoints?: string[];
  tone: 'default' | 'formal' | 'friendly' | 'warning';
}

export function enhanceAIResponse(
  originalResponse: string,
  topic?: string,
  tone: 'default' | 'formal' | 'friendly' | 'warning' = 'default'
): EnhancedResponse {
  // Check if we have a pre-defined improved response for this topic
  if (topic) {
    const improvedResponse = improvedResponses.find(r => 
      r.topic.toLowerCase().includes(topic.toLowerCase()) ||
      topic.toLowerCase().includes(r.topic.toLowerCase())
    );
    
    if (improvedResponse) {
      return {
        response: improvedResponse.response,
        legalContext: improvedResponse.legalContext,
        nextSteps: improvedResponse.nextSteps,
        keyPoints: improvedResponse.keyPoints,
        tone
      };
    }
  }

  // Enhance the original response with property manager tone
  const enhancedResponse = enhanceResponseWithTone(originalResponse, tone);
  
  return {
    response: enhancedResponse,
    tone,
    nextSteps: extractNextSteps(enhancedResponse),
    keyPoints: extractKeyPoints(enhancedResponse)
  };
}

function enhanceResponseWithTone(response: string, tone: string): string {
  let enhanced = response;

  // Add British English corrections
  enhanced = enhanced
    .replace(/\b(analyze|summarize|organize|recognize|apologize|customize)\b/gi, (match) => {
      const corrections: { [key: string]: string } = {
        'analyze': 'analyse',
        'summarize': 'summarise', 
        'organize': 'organise',
        'recognize': 'recognise',
        'apologize': 'apologise',
        'customize': 'customise'
      };
      return corrections[match.toLowerCase()] || match;
    })
    .replace(/\b(center|defense)\b/gi, (match) => {
      const corrections: { [key: string]: string } = {
        'center': 'centre',
        'defense': 'defence'
      };
      return corrections[match.toLowerCase()] || match;
    });

  // Add tone-specific enhancements
  switch (tone) {
    case 'formal':
      enhanced = addFormalEnhancements(enhanced);
      break;
    case 'friendly':
      enhanced = addFriendlyEnhancements(enhanced);
      break;
    case 'warning':
      enhanced = addWarningEnhancements(enhanced);
      break;
    default:
      enhanced = addDefaultEnhancements(enhanced);
  }

  return enhanced;
}

function addDefaultEnhancements(response: string): string {
  if (!response.includes('**')) {
    // Add structure if not already present
    response = `**Response:**\n\n${response}\n\n**Next Steps:**\n- Review the information provided\n- Consider legal implications\n- Document any decisions made\n- Communicate with relevant parties`;
  }
  
  return response;
}

function addFormalEnhancements(response: string): string {
  return `**Legal and Technical Guidance:**\n\n${response}\n\n**Statutory Requirements:**\n- Ensure compliance with relevant UK legislation\n- Document all actions and decisions\n- Consider tribunal implications where applicable\n- Maintain detailed records for audit purposes`;
}

function addFriendlyEnhancements(response: string): string {
  return `**Supportive Guidance:**\n\n${response}\n\n**Additional Support:**\n- We're here to help with any questions you may have\n- Consider reaching out to specialist advisors if needed\n- Don't hesitate to ask for clarification on any points\n- We can assist with implementing the suggested actions`;
}

function addWarningEnhancements(response: string): string {
  return `**⚠️ URGENT ATTENTION REQUIRED:**\n\n${response}\n\n**IMMEDIATE ACTIONS NEEDED:**\n- Address this matter without delay\n- Consider potential legal consequences\n- Document all communications and actions\n- Seek specialist advice if uncertain\n- Monitor the situation closely`;
}

function extractNextSteps(response: string): string[] {
  const nextStepsMatch = response.match(/\*\*Next Steps:\*\*([\s\S]*?)(?=\*\*|$)/i);
  if (nextStepsMatch) {
    return nextStepsMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(line => line.length > 0);
  }
  return [];
}

function extractKeyPoints(response: string): string[] {
  const keyPointsMatch = response.match(/\*\*Key Points:\*\*([\s\S]*?)(?=\*\*|$)/i);
  if (keyPointsMatch) {
    return keyPointsMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(line => line.length > 0);
  }
  return [];
}

export function getResponseByTopic(topic: string): ImprovedResponse | null {
  return improvedResponses.find(r => 
    r.topic.toLowerCase().includes(topic.toLowerCase()) ||
    topic.toLowerCase().includes(r.topic.toLowerCase())
  ) || null;
}

export function getAllTopics(): string[] {
  return improvedResponses.map(r => r.topic);
}

export function getLegalContext(topic: string): string | null {
  const response = getResponseByTopic(topic);
  return response?.legalContext || null;
} 