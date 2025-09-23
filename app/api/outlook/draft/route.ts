// app/api/outlook/draft/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { EnrichmentResult } from '../enrich/route';
import { ToneLabel, getToneGuidelines } from '@/lib/addin/tone';
import { fallback, formatBuildingName, formatResidentName, ukDate } from '@/lib/addin/format';
import {
  extractSenderNameFromLatestMessage,
  generateThankYouLine,
  getClosingPhrase
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

    const guidelines = getToneGuidelines(tone);
    const templateName = `${enrichment.topic}_${tone}`;

    const draftResult = generateDraft(enrichment, tone, guidelines, originalSummary, rawEmailBody, outlookDisplayName);

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
  outlookDisplayName?: string
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
  const closingPhrase = getClosingPhrase(senderName);
  const buildingName = formatBuildingName(building?.name);
  const usedFacts: string[] = [];

  // Generate tone-specific lead
  const toneLead = generateToneLead(tone, topic);

  // Generate facts section based on topic
  const factsSection = generateFactsSection(topic, facts, usedFacts);

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
      bodyHtml = generateLeakTemplate(name, buildingName, toneLead, factsSection, nextSteps, boundaryLines, facts);
      break;

    case 'fire':
      template = 'fire_safety_response';
      bodyHtml = generateFireTemplate(name, buildingName, toneLead, factsSection, nextSteps, boundaryLines, facts);
      break;

    case 'compliance':
      template = 'compliance_response';
      bodyHtml = generateComplianceTemplate(name, buildingName, toneLead, factsSection, nextSteps, boundaryLines, facts);
      break;

    default:
      template = 'general_response';
      bodyHtml = generateGeneralTemplate(name, buildingName, toneLead, factsSection, nextSteps, boundaryLines);
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
  toneLead: string,
  factsSection: string,
  nextSteps: string,
  boundaryLines: string,
  facts: EnrichmentResult['facts']
): string {
  return `Dear ${name},

Thank you for getting in touch about the water ingress at ${buildingName}. ${toneLead}

**What we can see right now**
${factsSection}

**Next steps**
${nextSteps}${boundaryLines}

Best regards,
Building Management Team`;
}

function generateFireTemplate(
  name: string,
  buildingName: string,
  toneLead: string,
  factsSection: string,
  nextSteps: string,
  boundaryLines: string,
  facts: EnrichmentResult['facts']
): string {
  return `Dear ${name},

Thank you for raising this — I understand how important the fire doors and alarm maintenance are at ${buildingName}. ${toneLead}

**Current records**
${factsSection}

**Next steps**
${nextSteps}${boundaryLines}

Best regards,
Building Management Team`;
}

function generateComplianceTemplate(
  name: string,
  buildingName: string,
  toneLead: string,
  factsSection: string,
  nextSteps: string,
  boundaryLines: string,
  facts: EnrichmentResult['facts']
): string {
  return `Dear ${name},

Thank you for your enquiry about compliance matters at ${buildingName}. ${toneLead}

**Current compliance status**
${factsSection}

**Next steps**
${nextSteps}${boundaryLines}

Best regards,
Building Management Team`;
}

function generateGeneralTemplate(
  name: string,
  buildingName: string,
  toneLead: string,
  factsSection: string,
  nextSteps: string,
  boundaryLines: string
): string {
  return `Dear ${name},

Thank you for getting in touch about ${buildingName}. ${toneLead}

${factsSection ? `**Information available**\n${factsSection}\n` : ''}**Next steps**
${nextSteps}${boundaryLines}

Best regards,
Building Management Team`;
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