/**
 * Utility functions for Outlook reply system
 * Handles topic detection, formatting, and template generation
 */

export type TopicHint = 'fire' | 'leak' | 'costs' | 'eicr' | 'compliance' | 'general';

export interface Enrichment {
  residentName: string | null;
  unitLabel: string | null;
  buildingName: string | null;
  facts: {
    fraLast?: string | null;
    fraNext?: string | null;
    fireDoorInspectLast?: string | null;
    alarmServiceLast?: string | null;
    eicrLast?: string | null;
    eicrNext?: string | null;
    gasLast?: string | null;
    gasNext?: string | null;
    asbestosLast?: string | null;
    asbestosNext?: string | null;
    openLeakTicketRef?: string | null;
    openWorkOrderRef?: string | null;
  };
}

/**
 * Detect topic from message summary using keyword matching
 */
export function detectTopic(messageSummary: string): TopicHint {
  const text = messageSummary.toLowerCase();

  // Fire safety keywords
  if (text.includes('fire') || text.includes('alarm') || text.includes('door') ||
      text.includes('emergency') || text.includes('evacuation') || text.includes('smoke')) {
    return 'fire';
  }

  // Leak/water ingress keywords
  if (text.includes('leak') || text.includes('water') || text.includes('ingress') ||
      text.includes('damp') || text.includes('wet') || text.includes('flooding') ||
      text.includes('drip') || text.includes('moisture')) {
    return 'leak';
  }

  // EICR/electrical keywords
  if (text.includes('eicr') || text.includes('electrical') || text.includes('electric') ||
      text.includes('power') || text.includes('wiring') || text.includes('socket') ||
      text.includes('fuse') || text.includes('circuit')) {
    return 'eicr';
  }

  // Gas/asbestos compliance keywords
  if (text.includes('gas') || text.includes('asbestos') || text.includes('certificate') ||
      text.includes('compliance') || text.includes('inspection') || text.includes('safety check')) {
    return 'compliance';
  }

  // Service charge/costs keywords
  if (text.includes('charge') || text.includes('cost') || text.includes('fee') ||
      text.includes('bill') || text.includes('payment') || text.includes('money') ||
      text.includes('section 20') || text.includes('major works')) {
    return 'costs';
  }

  return 'general';
}

/**
 * Format value or return fallback text
 */
export function formatOrFallback(value?: string | null): string {
  return value && value.trim() ? value : '(no data available)';
}

/**
 * Format date to UK format (DD/MM/YYYY)
 */
export function ukDate(dateString?: string | null): string {
  if (!dateString) return '(no data available)';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '(no data available)';

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '(no data available)';
  }
}

/**
 * Generate action line based on topic
 */
export function getActionLineForTopic(topic: TopicHint): string {
  switch (topic) {
    case 'fire':
      return 'We will confirm the last alarm service and arrange a door inspection if due.';
    case 'leak':
      return 'We will book a contractor to inspect the source of ingress and protect the area.';
    case 'eicr':
      return 'We will review the latest EICR certificate and confirm compliance status.';
    case 'compliance':
      return 'We will review the latest certificate and confirm status.';
    case 'costs':
      return 'We will review the charges and provide a detailed breakdown with any applicable consultation requirements.';
    default:
      return 'We will investigate this matter thoroughly and provide you with a full update.';
  }
}

/**
 * Generate empathetic opening based on topic
 */
export function getEmpathyOpening(topic: TopicHint): string {
  switch (topic) {
    case 'fire':
      return 'Thank you for raising this fire safety concern. Your safety is our absolute priority and we take all fire-related matters very seriously.';
    case 'leak':
      return 'Thank you for reporting this water ingress issue. I completely understand how concerning and disruptive this must be for you.';
    case 'eicr':
      return 'Thank you for your enquiry about electrical safety. We appreciate your diligence in ensuring compliance.';
    case 'compliance':
      return 'Thank you for your compliance enquiry. We understand the importance of maintaining all safety certificates up to date.';
    case 'costs':
      return 'Thank you for your enquiry about service charges. I appreciate you taking the time to raise this with us.';
    default:
      return 'Thank you for getting in touch about this matter. I appreciate you bringing this to our attention.';
  }
}

/**
 * Generate topic phrase for context
 */
export function getTopicPhrase(topic: TopicHint): string {
  switch (topic) {
    case 'fire':
      return 'fire safety';
    case 'leak':
      return 'water ingress';
    case 'eicr':
      return 'electrical safety';
    case 'compliance':
      return 'building compliance';
    case 'costs':
      return 'service charges';
    default:
      return 'this matter';
  }
}

/**
 * Interpolate template with context values
 */
export function interpolateTemplate(
  template: string,
  context: {
    residentName?: string | null;
    buildingName?: string | null;
    topicPhrase?: string;
    actionLine?: string;
    facts?: Enrichment['facts'];
  }
): string {
  let result = template;

  // Replace basic placeholders
  result = result.replace(/\{\{residentName\|\|"Resident"\}\}/g,
    context.residentName || 'Resident');
  result = result.replace(/\{\{buildingName\}\}/g,
    formatOrFallback(context.buildingName));
  result = result.replace(/\{\{topicPhrase\}\}/g,
    context.topicPhrase || 'this matter');
  result = result.replace(/\{\{actionLine\}\}/g,
    context.actionLine || 'We will investigate this matter thoroughly.');

  // Replace fact placeholders with fallback handling
  if (context.facts) {
    result = result.replace(/\{\{fraLast\|fallback\}\}/g,
      ukDate(context.facts.fraLast));
    result = result.replace(/\{\{fraNext\|fallback\}\}/g,
      ukDate(context.facts.fraNext));
    result = result.replace(/\{\{fireDoorInspectLast\|fallback\}\}/g,
      ukDate(context.facts.fireDoorInspectLast));
    result = result.replace(/\{\{alarmServiceLast\|fallback\}\}/g,
      ukDate(context.facts.alarmServiceLast));
    result = result.replace(/\{\{eicrLast\|fallback\}\}/g,
      ukDate(context.facts.eicrLast));
    result = result.replace(/\{\{eicrNext\|fallback\}\}/g,
      ukDate(context.facts.eicrNext));
    result = result.replace(/\{\{gasLast\|fallback\}\}/g,
      ukDate(context.facts.gasLast));
    result = result.replace(/\{\{gasNext\|fallback\}\}/g,
      ukDate(context.facts.gasNext));
    result = result.replace(/\{\{asbestosLast\|fallback\}\}/g,
      ukDate(context.facts.asbestosLast));
    result = result.replace(/\{\{asbestosNext\|fallback\}\}/g,
      ukDate(context.facts.asbestosNext));
    result = result.replace(/\{\{openLeakTicketRef\|fallback\}\}/g,
      formatOrFallback(context.facts.openLeakTicketRef));
    result = result.replace(/\{\{openWorkOrderRef\|fallback\}\}/g,
      formatOrFallback(context.facts.openWorkOrderRef));
  }

  return result;
}

/**
 * Generate signature block
 */
export function generateSignatureBlock(): string {
  return `Kind regards,

[Your Name]
Property Manager
BlocIQ

📞 [Phone Number]
📧 [Email Address]
🌐 www.blociq.co.uk

This message was generated with AI assistance to ensure prompt and accurate responses.`;
}

/**
 * Generate full empathetic reply template
 */
export function generateReplyTemplate(
  enrichment: Enrichment,
  originalMessageSummary: string
): string {
  const topic = detectTopic(originalMessageSummary);
  const empathyOpening = getEmpathyOpening(topic);
  const topicPhrase = getTopicPhrase(topic);
  const actionLine = getActionLineForTopic(topic);
  const signatureBlock = generateSignatureBlock();

  const template = `Dear {{residentName||"Resident"}},

${empathyOpening}

What we can see right now:
• Fire Risk Assessment: last {{fraLast|fallback}}, next due {{fraNext|fallback}}
• Fire door inspection: {{fireDoorInspectLast|fallback}}
• Alarm system service: {{alarmServiceLast|fallback}}
• EICR: last {{eicrLast|fallback}}, next due {{eicrNext|fallback}}
• Gas safety: last {{gasLast|fallback}}, next due {{gasNext|fallback}}
• Asbestos survey: last {{asbestosLast|fallback}}, next due {{asbestosNext|fallback}}
• Existing work order: {{openWorkOrderRef|fallback}}
• Existing leak ticket: {{openLeakTicketRef|fallback}}

Next steps:
• {{actionLine}}
• We'll update you within 2 working days with the outcome and any actions required.

${signatureBlock}`;

  return interpolateTemplate(template, {
    residentName: enrichment.residentName,
    buildingName: enrichment.buildingName,
    topicPhrase,
    actionLine,
    facts: enrichment.facts
  });
}