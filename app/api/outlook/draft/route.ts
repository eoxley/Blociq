// app/api/outlook/draft/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { EnrichmentResult } from '../enrich/route';
import { ToneLabel, getToneGuidelines } from '@/lib/addin/tone';
import { fallback, formatBuildingName, formatResidentName, ukDate } from '@/lib/addin/format';
import {
  extractSenderNameFromLatestMessage,
  generateThankYouLine,
  getClosingPhraseWithUserName
} from '@/lib/addin/name-extraction';

export interface DraftRequest {
  enrichment: EnrichmentResult;
  tone: ToneLabel;
  originalSummary?: string;
  rawEmailBody?: string;
  outlookDisplayName?: string;
}

export interface DraftResult {
  bodyHtml: string;
  usedFacts: string[];
  template: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DraftRequest = await request.json();
    const { enrichment, tone, originalSummary, rawEmailBody, outlookDisplayName } = body;

    if (!enrichment) {
      return NextResponse.json({
        success: false,
        error: 'Enrichment data is required'
      }, { status: 400 });
    }

    // Get authenticated user and their profile
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    let userFirstName = 'BlocIQ';
    if (!userError && user) {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('first_name')
          .eq('id', user.id)
          .single();

        if (profile?.first_name) {
          userFirstName = profile.first_name;
        }
      } catch (profileError) {
        console.warn('Could not fetch user profile:', profileError);
      }
    }

    const guidelines = getToneGuidelines(tone);
    const templateName = `${enrichment.topic}_${tone}`;

    const draftResult = generateDraft(enrichment, tone, guidelines, originalSummary, rawEmailBody, outlookDisplayName, userFirstName);

    return NextResponse.json({
      success: true,
      data: draftResult
    });

  } catch (error) {
    console.error('Error generating draft:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate draft'
    }, { status: 500 });
  }
}

function generateDraft(
  enrichment: EnrichmentResult,
  tone: ToneLabel,
  guidelines: ReturnType<typeof getToneGuidelines>,
  originalSummary?: string,
  rawEmailBody?: string,
  outlookDisplayName?: string,
  userFirstName?: string
): DraftResult {
  const { residentName, unitLabel, building, facts, topic } = enrichment;

  // Extract sender name from email sign-off if available, with fallbacks
  let extractedName = residentName;

  if (rawEmailBody) {
    extractedName = extractSenderNameFromLatestMessage(rawEmailBody, outlookDisplayName);
  } else if (outlookDisplayName) {
    extractedName = outlookDisplayName;
  }

  const senderName = formatResidentName(extractedName);
  const thankYouLine = generateThankYouLine(topic);
  const closingPhrase = getClosingPhraseWithUserName(senderName, userFirstName);
  const buildingName = formatBuildingName(building?.name);
  const usedFacts: string[] = [];

  // Generate tone-specific lead
  const toneLead = generateToneLead(tone, topic);

  // Generate facts section based on topic
  const factsSection = generateFactsSection(topic, facts, usedFacts);

  // Generate industry context section
  const industryContext = generateIndustryContext(enrichment.industryKnowledge, enrichment.founderGuidance);

  // Generate next steps based on topic and tone
  const nextSteps = generateNextSteps(topic, tone);

  // Generate boundary lines for abusive tone
  const boundaryLines = tone === 'abusive' ? generateBoundaryLines(guidelines) : '';

  // Select and populate template
  let template = '';
  let bodyHtml = '';

  switch (topic) {
    case 'leak':
      template = 'leak_response';
      bodyHtml = generateLeakTemplate(senderName, buildingName, thankYouLine, toneLead, factsSection, industryContext, nextSteps, boundaryLines, closingPhrase, facts);
      break;

    case 'fire':
      template = 'fire_safety_response';
      bodyHtml = generateFireTemplate(senderName, buildingName, thankYouLine, toneLead, factsSection, industryContext, nextSteps, boundaryLines, closingPhrase, facts);
      break;

    case 'compliance':
      template = 'compliance_response';
      bodyHtml = generateComplianceTemplate(senderName, buildingName, thankYouLine, toneLead, factsSection, industryContext, nextSteps, boundaryLines, closingPhrase, facts);
      break;

    default:
      template = 'general_response';
      bodyHtml = generateGeneralTemplate(senderName, buildingName, thankYouLine, toneLead, factsSection, industryContext, nextSteps, boundaryLines, closingPhrase);
      break;
  }

  return {
    bodyHtml,
    usedFacts,
    template
  };
}

function generateToneLead(tone: ToneLabel, topic: string): string {
  switch (tone) {
    case 'concerned':
      if (topic === 'leak') return "I understand how concerning water ingress can be, and we'll address this as a priority.";
      if (topic === 'fire') return "I understand your concern about fire safety — this is absolutely a priority for us.";
      return "I understand your concern and want to help resolve this promptly.";

    case 'angry':
      return "I understand this situation is frustrating.";

    case 'abusive':
      return "I want to help resolve this matter.";

    default:
      return "";
  }
}

function generateFactsSection(topic: string, facts: EnrichmentResult['facts'], usedFacts: string[]): string {
  let section = '';

  switch (topic) {
    case 'leak':
      if (facts.openLeakTicketRef) {
        section += `• Existing ticket: ${facts.openLeakTicketRef}\n`;
        usedFacts.push('open_leak_ticket');
      } else {
        section += `• Existing ticket: ${fallback(null)}\n`;
      }

      if (facts.emergencyContact) {
        section += `• Emergency contact: ${facts.emergencyContact}\n`;
        usedFacts.push('emergency_contact');
      }
      break;

    case 'fire':
      section += `• Fire Risk Assessment: last ${ukDate(facts.fraLast)}, next due ${ukDate(facts.fraNext)}\n`;
      section += `• Fire door inspection: ${ukDate(facts.fireDoorLast)}\n`;
      section += `• Alarm service: ${ukDate(facts.alarmServiceLast)}\n`;

      if (facts.fraLast) usedFacts.push('fra_last');
      if (facts.fraNext) usedFacts.push('fra_next');
      if (facts.fireDoorLast) usedFacts.push('fire_door_last');
      if (facts.alarmServiceLast) usedFacts.push('alarm_service_last');
      break;

    case 'compliance':
      if (facts.eicrLast || facts.eicrNext) {
        section += `• EICR: last ${ukDate(facts.eicrLast)}, next due ${ukDate(facts.eicrNext)}\n`;
        if (facts.eicrLast) usedFacts.push('eicr_last');
        if (facts.eicrNext) usedFacts.push('eicr_next');
      }

      if (facts.gasLast || facts.gasNext) {
        section += `• Gas safety: last ${ukDate(facts.gasLast)}, next due ${ukDate(facts.gasNext)}\n`;
        if (facts.gasLast) usedFacts.push('gas_last');
        if (facts.gasNext) usedFacts.push('gas_next');
      }

      if (facts.asbestosLast) {
        section += `• Asbestos survey: ${ukDate(facts.asbestosLast)}\n`;
        usedFacts.push('asbestos_last');
      }
      break;
  }

  return section;
}

function generateIndustryContext(industryKnowledge: EnrichmentResult['industryKnowledge'], founderGuidance: EnrichmentResult['founderGuidance']): string {
  let context = '';

  // Add industry knowledge if available
  if (industryKnowledge && industryKnowledge.length > 0) {
    const topKnowledge = industryKnowledge.slice(0, 2); // Limit to 2 most relevant items
    context += topKnowledge.map(item => `• ${item.text}`).join('\n');
  }

  // Add founder guidance if available
  if (founderGuidance && founderGuidance.length > 0) {
    const topGuidance = founderGuidance.slice(0, 1); // Limit to 1 most relevant item
    if (context) context += '\n';
    context += topGuidance.map(item => `• ${item.content}`).join('\n');
  }

  return context;
}

function generateNextSteps(topic: string, tone: ToneLabel): string {
  const timeframe = tone === 'angry' || tone === 'abusive' ? '24 hours' :
                   tone === 'concerned' ? '1 working day' : '2 working days';

  switch (topic) {
    case 'leak':
      return `• We will book a contractor to inspect within 24 hours and protect the area.\n• We will update you within ${timeframe} with findings and the plan.`;

    case 'fire':
      return `• We will confirm the last alarm service and schedule a door inspection if due.\n• We will update you within ${timeframe}.`;

    case 'compliance':
      return `• We will review the compliance status and arrange any overdue inspections.\n• We will update you within ${timeframe} with the current position.`;

    default:
      return `• We will investigate this matter and respond within ${timeframe}.`;
  }
}

function generateBoundaryLines(guidelines: ReturnType<typeof getToneGuidelines>): string {
  if (!guidelines.boundaryLine && !guidelines.escalationLine) return '';

  let lines = '';
  if (guidelines.boundaryLine) {
    lines += `\n${guidelines.boundaryLine}\n`;
  }
  if (guidelines.escalationLine) {
    lines += `\n${guidelines.escalationLine}\n`;
  }
  return lines;
}

function generateLeakTemplate(
  name: string,
  buildingName: string,
  thankYouLine: string,
  toneLead: string,
  factsSection: string,
  industryContext: string,
  nextSteps: string,
  boundaryLines: string,
  closingPhrase: string,
  facts: EnrichmentResult['facts']
): string {
  // 7-step structure implementation
  return `Dear ${name},

${thankYouLine}

${toneLead}${factsSection ? `\n\n${factsSection}` : ''}${industryContext ? `\n\n${industryContext}` : ''}

${nextSteps}${boundaryLines}

${closingPhrase}`;
}

function generateFireTemplate(
  name: string,
  buildingName: string,
  thankYouLine: string,
  toneLead: string,
  factsSection: string,
  industryContext: string,
  nextSteps: string,
  boundaryLines: string,
  closingPhrase: string,
  facts: EnrichmentResult['facts']
): string {
  // 7-step structure implementation
  return `Dear ${name},

${thankYouLine}

${toneLead}${factsSection ? `\n\n${factsSection}` : ''}${industryContext ? `\n\n${industryContext}` : ''}

${nextSteps}${boundaryLines}

${closingPhrase}`;
}

function generateComplianceTemplate(
  name: string,
  buildingName: string,
  thankYouLine: string,
  toneLead: string,
  factsSection: string,
  industryContext: string,
  nextSteps: string,
  boundaryLines: string,
  closingPhrase: string,
  facts: EnrichmentResult['facts']
): string {
  // 7-step structure implementation
  return `Dear ${name},

${thankYouLine}

${toneLead}${factsSection ? `\n\n${factsSection}` : ''}${industryContext ? `\n\n${industryContext}` : ''}

${nextSteps}${boundaryLines}

${closingPhrase}`;
}

function generateGeneralTemplate(
  name: string,
  buildingName: string,
  thankYouLine: string,
  toneLead: string,
  factsSection: string,
  industryContext: string,
  nextSteps: string,
  boundaryLines: string,
  closingPhrase: string
): string {
  // 7-step structure implementation
  return `Dear ${name},

${thankYouLine}

${toneLead}${factsSection ? `\n\n${factsSection}` : ''}${industryContext ? `\n\n${industryContext}` : ''}

${nextSteps}${boundaryLines}

${closingPhrase}`;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}