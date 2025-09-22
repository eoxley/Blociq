/**
 * Tone detection utility for analyzing email messages
 * Detects: neutral, concerned, angry, abusive tones
 */

export type ToneLabel = 'neutral' | 'concerned' | 'angry' | 'abusive';

export interface ToneResult {
  label: ToneLabel;
  reasons: string[];
  confidence: number; // 0-1 scale
  escalationRequired: boolean;
}

interface ToneKeywords {
  anger: string[];
  concern: string[];
  abuse: string[];
  threats: string[];
  frustration: string[];
}

const TONE_KEYWORDS: ToneKeywords = {
  anger: [
    'furious', 'outraged', 'livid', 'disgusted', 'appalled', 'sick of',
    'fed up', 'had enough', 'ridiculous', 'pathetic', 'useless',
    'incompetent', 'terrible', 'awful', 'shocking', 'disgraceful'
  ],
  concern: [
    'worried', 'concerned', 'anxious', 'nervous', 'bothered', 'troubled',
    'uneasy', 'alarmed', 'distressed', 'uncomfortable', 'issue', 'problem'
  ],
  abuse: [
    'idiot', 'moron', 'stupid', 'pathetic excuse', 'waste of space',
    'joke', 'scam', 'rip off', 'thieves', 'criminals', 'fraudsters'
  ],
  threats: [
    'sue', 'legal action', 'solicitor', 'lawyer', 'court', 'ombudsman',
    'expose', 'media', 'social media', 'review', 'complain to', 'report'
  ],
  frustration: [
    'frustrated', 'annoyed', 'irritated', 'disappointed', 'unhappy',
    'upset', 'angry', 'mad', 'cross', 'livid', 'irate'
  ]
};

/**
 * Detect tone from message content using multiple heuristics
 */
export function detectTone(
  message: string,
  subject?: string,
  priorUnresolvedComplaints = false
): ToneResult {
  const fullText = `${subject || ''} ${message}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0;
  let escalationRequired = false;

  // 1. Keyword analysis
  const keywordAnalysis = analyzeKeywords(fullText);
  score += keywordAnalysis.score;
  reasons.push(...keywordAnalysis.reasons);

  // 2. Lexical intensity analysis
  const intensityAnalysis = analyzeLexicalIntensity(message);
  score += intensityAnalysis.score;
  reasons.push(...intensityAnalysis.reasons);

  // 3. Structural patterns
  const structuralAnalysis = analyzeStructuralPatterns(message);
  score += structuralAnalysis.score;
  reasons.push(...structuralAnalysis.reasons);

  // 4. Escalation indicators
  const escalationAnalysis = analyzeEscalationIndicators(fullText);
  if (escalationAnalysis.hasEscalation) {
    escalationRequired = true;
    score += 2;
    reasons.push(...escalationAnalysis.reasons);
  }

  // 5. Prior context modifier
  if (priorUnresolvedComplaints) {
    score += 1;
    reasons.push('prior unresolved complaints');
  }

  // Determine tone label
  const label = scoresToTone(score, escalationRequired);
  const confidence = Math.min(score / 5, 1); // Normalize to 0-1

  return {
    label,
    reasons: reasons.slice(0, 5), // Limit to top 5 reasons for brevity
    confidence,
    escalationRequired
  };
}

/**
 * Analyze keywords for tone indicators
 */
function analyzeKeywords(text: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Check abuse keywords (highest severity)
  const abuseMatches = TONE_KEYWORDS.abuse.filter(word => text.includes(word));
  if (abuseMatches.length > 0) {
    score += 4;
    reasons.push(`abusive language detected`);
  }

  // Check threat keywords
  const threatMatches = TONE_KEYWORDS.threats.filter(word => text.includes(word));
  if (threatMatches.length > 0) {
    score += 2;
    reasons.push(`legal/escalation threats`);
  }

  // Check anger keywords
  const angerMatches = TONE_KEYWORDS.anger.filter(word => text.includes(word));
  if (angerMatches.length > 0) {
    score += Math.min(angerMatches.length, 2);
    reasons.push(`anger indicators (${angerMatches.length})`);
  }

  // Check frustration keywords
  const frustrationMatches = TONE_KEYWORDS.frustration.filter(word => text.includes(word));
  if (frustrationMatches.length > 0) {
    score += Math.min(frustrationMatches.length * 0.5, 1.5);
    reasons.push(`frustration indicators (${frustrationMatches.length})`);
  }

  // Check concern keywords (positive indicator, lowers anger score)
  const concernMatches = TONE_KEYWORDS.concern.filter(word => text.includes(word));
  if (concernMatches.length > 0 && score > 0) {
    score = Math.max(score - 0.5, 0);
    reasons.push(`constructive concern language`);
  }

  return { score, reasons };
}

/**
 * Analyze lexical intensity (caps, punctuation, repetition)
 */
function analyzeLexicalIntensity(text: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Count exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    score += Math.min(exclamationCount * 0.3, 2);
    reasons.push(`excessive exclamation marks (${exclamationCount})`);
  }

  // Check for shouting (all caps words)
  const words = text.split(/\s+/);
  const capsWords = words.filter(word =>
    word.length > 2 && word === word.toUpperCase() && /[A-Z]/.test(word)
  );
  const shoutingRatio = capsWords.length / Math.max(words.length, 1);

  if (shoutingRatio > 0.1) {
    score += Math.min(shoutingRatio * 8, 3);
    reasons.push(`shouting detected (${Math.round(shoutingRatio * 100)}% caps)`);
  }

  // Check for repeated punctuation
  const repeatedPunct = text.match(/[!?]{2,}|\.{3,}/g);
  if (repeatedPunct && repeatedPunct.length > 0) {
    score += Math.min(repeatedPunct.length * 0.5, 1.5);
    reasons.push(`repeated punctuation`);
  }

  // Check for repeated characters (e.g., "sooooo")
  const repeatedChars = text.match(/(.)\1{3,}/g);
  if (repeatedChars && repeatedChars.length > 0) {
    score += 0.5;
    reasons.push(`character repetition`);
  }

  return { score, reasons };
}

/**
 * Analyze structural patterns that indicate tone
 */
function analyzeStructuralPatterns(text: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Very short, curt messages can indicate anger
  if (text.trim().length < 50 && text.includes('!')) {
    score += 1;
    reasons.push(`short, emphatic message`);
  }

  // Multiple negative sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const negativeWords = ['not', 'no', 'never', 'nothing', 'none', 'fail', 'wrong', 'bad'];
  const negativeSentences = sentences.filter(sentence =>
    negativeWords.some(word => sentence.toLowerCase().includes(word))
  );

  if (negativeSentences.length > 2) {
    score += 1;
    reasons.push(`multiple negative statements`);
  }

  // Questions in angry tone (often rhetorical)
  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount > 2 && text.includes('!')) {
    score += 0.5;
    reasons.push(`aggressive questioning`);
  }

  return { score, reasons };
}

/**
 * Check for escalation indicators that require special handling
 */
function analyzeEscalationIndicators(text: string): {
  hasEscalation: boolean;
  reasons: string[]
} {
  const reasons: string[] = [];
  let hasEscalation = false;

  // Direct threats or legal language
  const escalationKeywords = [
    'sue', 'legal action', 'solicitor', 'lawyer', 'court', 'ombudsman',
    'trading standards', 'environmental health', 'council', 'mp',
    'expose', 'social media', 'review site', 'local news'
  ];

  const foundEscalation = escalationKeywords.filter(word => text.includes(word));
  if (foundEscalation.length > 0) {
    hasEscalation = true;
    reasons.push(`escalation threats: ${foundEscalation.slice(0, 3).join(', ')}`);
  }

  // Abusive language targeting individuals
  const personalAttacks = [
    'you are', 'you\'re useless', 'incompetent', 'pathetic excuse',
    'waste of space', 'should be fired', 'shouldn\'t have a job'
  ];

  const foundAttacks = personalAttacks.filter(phrase => text.includes(phrase));
  if (foundAttacks.length > 0) {
    hasEscalation = true;
    reasons.push(`personal attacks detected`);
  }

  return { hasEscalation, reasons };
}

/**
 * Convert numerical score to tone label
 */
function scoresToTone(score: number, escalationRequired: boolean): ToneLabel {
  if (escalationRequired || score >= 4) {
    return 'abusive';
  }
  if (score >= 2.5) {
    return 'angry';
  }
  if (score >= 1) {
    return 'concerned';
  }
  return 'neutral';
}

/**
 * Get tone-specific styling rules for draft generation
 */
export function getToneProfile(tone: ToneLabel) {
  const profiles = {
    neutral: {
      empathyLevel: 'warm',
      useExclamation: true,
      useSofteners: true,
      sentenceStyle: 'conversational',
      closingStyle: 'warm'
    },
    concerned: {
      empathyLevel: 'clear',
      useExclamation: false,
      useSofteners: true,
      sentenceStyle: 'reassuring',
      closingStyle: 'professional'
    },
    angry: {
      empathyLevel: 'concise',
      useExclamation: false,
      useSofteners: false,
      sentenceStyle: 'factual',
      closingStyle: 'professional'
    },
    abusive: {
      empathyLevel: 'minimal',
      useExclamation: false,
      useSofteners: false,
      sentenceStyle: 'boundary',
      closingStyle: 'firm'
    }
  };

  return profiles[tone];
}

/**
 * Generate tone-appropriate opening line
 */
export function getToneOpening(tone: ToneLabel, topicPhrase: string, residentName?: string): string {
  const name = residentName || 'there';

  switch (tone) {
    case 'neutral':
      return `Thank you for getting in touch about ${topicPhrase}. I understand your concern and we'll make sure this is handled promptly.`;

    case 'concerned':
      return `Thank you for raising this with us. I understand your concern about ${topicPhrase} and we'll address this as a priority.`;

    case 'angry':
      return `I understand your frustration about ${topicPhrase}. We'll address this promptly.`;

    case 'abusive':
      return `I recognise you're upset. I'll set out what we'll do next regarding ${topicPhrase}.`;
  }
}

/**
 * Generate boundary text for abusive tone
 */
export function getBoundaryText(escalationRequired: boolean): string {
  let boundary = "We're here to help and will continue to do so, but we can only engage through respectful communication.";

  if (escalationRequired) {
    boundary += "\n\nFor everyone's safety, I'm escalating this to a senior manager. We'll update you within 1 working day.";
  }

  return boundary;
}