// lib/addin/tone.ts
// Tone detection utilities for analyzing email sentiment

export type ToneLabel = 'neutral' | 'concerned' | 'angry' | 'abusive';

export interface ToneDetectionResult {
  label: ToneLabel;
  reasons: string[];
  confidence: number; // 0-1 score
}

/**
 * Detects the tone of an email based on text analysis
 */
export function detectTone(text: string): ToneDetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      label: 'neutral',
      reasons: [],
      confidence: 0.5
    };
  }

  const normalizedText = text.toLowerCase();
  const reasons: string[] = [];
  let angerScore = 0;
  let concernScore = 0;
  let abuseScore = 0;

  // Calculate all-caps ratio
  const capsWords = text.match(/[A-Z]{2,}/g) || [];
  const totalWords = text.split(/\s+/).length;
  const capsRatio = capsWords.length / Math.max(totalWords, 1);

  if (capsRatio > 0.3) {
    angerScore += 0.4;
    reasons.push('excessive capitals');
  }

  // Check for repeated punctuation
  const repeatedPunctuation = /[!?]{2,}|\.{3,}/g.test(text);
  if (repeatedPunctuation) {
    angerScore += 0.2;
    reasons.push('repeated punctuation');
  }

  // Anger keywords
  const angerKeywords = [
    'furious', 'outraged', 'disgusted', 'appalled', 'livid', 'ridiculous',
    'unacceptable', 'disgraceful', 'pathetic', 'terrible', 'awful',
    'demand', 'insist', 'immediately', 'fed up', 'sick of', 'had enough'
  ];

  let angerKeywordCount = 0;
  angerKeywords.forEach(keyword => {
    if (normalizedText.includes(keyword)) {
      angerKeywordCount++;
    }
  });

  if (angerKeywordCount > 0) {
    angerScore += Math.min(angerKeywordCount * 0.15, 0.6);
    reasons.push(`anger indicators (${angerKeywordCount})`);
  }

  // Concern keywords
  const concernKeywords = [
    'worried', 'concerned', 'anxious', 'nervous', 'afraid', 'scared',
    'urgent', 'important', 'please help', 'need assistance', 'problem',
    'issue', 'trouble', 'difficulty', 'struggling'
  ];

  let concernKeywordCount = 0;
  concernKeywords.forEach(keyword => {
    if (normalizedText.includes(keyword)) {
      concernKeywordCount++;
    }
  });

  if (concernKeywordCount > 0) {
    concernScore += Math.min(concernKeywordCount * 0.2, 0.7);
    reasons.push(`concern indicators (${concernKeywordCount})`);
  }

  // Abusive language detection (high-level patterns only)
  const threatsPatterns = [
    /\b(sue|lawsuit|legal action|solicitor|lawyer)\b/i,
    /\b(report you|complain|complaint|ombudsman)\b/i,
    /\b(useless|incompetent|pathetic|disgraceful)\s+(staff|service|company)/i
  ];

  let threatCount = 0;
  threatsPatterns.forEach(pattern => {
    if (pattern.test(text)) {
      threatCount++;
    }
  });

  if (threatCount > 0) {
    abuseScore += Math.min(threatCount * 0.3, 0.8);
    reasons.push('threatening language');
  }

  // Personal attacks (generalized patterns)
  const personalAttackPatterns = [
    /\b(you people|you lot)\b/i,
    /\b(useless|incompetent|pathetic)\s+(you|staff|people)/i,
    /\b(don't care|couldn't care less)\b/i
  ];

  let attackCount = 0;
  personalAttackPatterns.forEach(pattern => {
    if (pattern.test(text)) {
      attackCount++;
    }
  });

  if (attackCount > 0) {
    abuseScore += Math.min(attackCount * 0.25, 0.6);
    reasons.push('personal attacks');
  }

  // Determine final tone based on scores
  const maxScore = Math.max(angerScore, concernScore, abuseScore);

  if (abuseScore >= 0.6) {
    return {
      label: 'abusive',
      reasons,
      confidence: Math.min(abuseScore, 1)
    };
  } else if (angerScore >= 0.5) {
    return {
      label: 'angry',
      reasons,
      confidence: Math.min(angerScore, 1)
    };
  } else if (concernScore >= 0.4) {
    return {
      label: 'concerned',
      reasons,
      confidence: Math.min(concernScore, 1)
    };
  } else {
    return {
      label: 'neutral',
      reasons: reasons.length > 0 ? reasons : ['polite language'],
      confidence: 1 - maxScore
    };
  }
}

/**
 * Gets tone-specific response guidelines
 */
export function getToneGuidelines(tone: ToneLabel): {
  approach: string;
  salutation: string;
  style: string[];
  boundaryLine?: string;
  escalationLine?: string;
} {
  switch (tone) {
    case 'neutral':
      return {
        approach: 'warm and helpful',
        salutation: 'Dear',
        style: ['friendly tone', 'complete information', 'helpful next steps']
      };

    case 'concerned':
      return {
        approach: 'empathetic with reassurance',
        salutation: 'Dear',
        style: ['acknowledge concern', 'provide reassurance', 'clear timeframes', 'empathetic language']
      };

    case 'angry':
      return {
        approach: 'concise empathy with facts-first approach',
        salutation: 'Dear',
        style: ['brief empathy', 'facts only', 'short sentences', 'no exclamation marks', 'professional tone']
      };

    case 'abusive':
      return {
        approach: 'brief empathy with clear boundaries',
        salutation: 'Dear',
        style: ['minimal empathy', 'state boundaries', 'escalation notice'],
        boundaryLine: 'We\'re here to help and will continue to do so, but we can only engage through respectful communication.',
        escalationLine: 'For everyone\'s safety, I\'m escalating this to a senior manager. We\'ll update you within 1 working day.'
      };

    default:
      return {
        approach: 'neutral and professional',
        salutation: 'Dear',
        style: ['professional tone', 'clear information']
      };
  }
}