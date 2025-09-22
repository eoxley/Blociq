/**
 * Logging utility for tone detection and user interactions
 * Stores non-PII data for analysis and improvement
 */

import { ToneResult } from './tone-detection';

export interface ToneLogEntry {
  timestamp: string;
  detectedTone: ToneResult['label'];
  confidence: number;
  reasons: string[];
  userOverride?: ToneResult['label'];
  escalationRequired: boolean;
  topic?: string;
  buildingId?: string;
  sessionId: string;
}

/**
 * Log tone detection and user interaction
 */
export function logToneInteraction(entry: Omit<ToneLogEntry, 'timestamp' | 'sessionId'>) {
  try {
    const logEntry: ToneLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId()
    };

    // Store in console for now (could be sent to analytics service)
    console.log('📊 Tone Interaction Log:', logEntry);

    // Store in local storage for debugging
    const logs = getToneLogs();
    logs.push(logEntry);

    // Keep only last 100 entries
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }

    localStorage.setItem('blociq_tone_logs', JSON.stringify(logs));

    return logEntry;
  } catch (error) {
    console.error('Failed to log tone interaction:', error);
  }
}

/**
 * Get stored tone logs for analysis
 */
export function getToneLogs(): ToneLogEntry[] {
  try {
    const stored = localStorage.getItem('blociq_tone_logs');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('blociq_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('blociq_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Log tone detection result
 */
export function logToneDetection(
  tone: ToneResult,
  topic?: string,
  buildingId?: string
) {
  return logToneInteraction({
    detectedTone: tone.label,
    confidence: tone.confidence,
    reasons: tone.reasons.slice(0, 5), // Limit to avoid too much data
    escalationRequired: tone.escalationRequired,
    topic,
    buildingId
  });
}

/**
 * Log user tone override
 */
export function logToneOverride(
  originalTone: ToneResult,
  overrideTone: ToneResult['label'],
  topic?: string,
  buildingId?: string
) {
  return logToneInteraction({
    detectedTone: originalTone.label,
    confidence: originalTone.confidence,
    reasons: originalTone.reasons.slice(0, 5),
    userOverride: overrideTone,
    escalationRequired: originalTone.escalationRequired,
    topic,
    buildingId
  });
}

/**
 * Get tone interaction statistics
 */
export function getToneStats(): {
  totalInteractions: number;
  detectedTones: Record<string, number>;
  overrideRate: number;
  escalationRate: number;
  avgConfidence: number;
} {
  const logs = getToneLogs();

  if (logs.length === 0) {
    return {
      totalInteractions: 0,
      detectedTones: {},
      overrideRate: 0,
      escalationRate: 0,
      avgConfidence: 0
    };
  }

  const detectedTones: Record<string, number> = {};
  let overrideCount = 0;
  let escalationCount = 0;
  let totalConfidence = 0;

  logs.forEach(log => {
    detectedTones[log.detectedTone] = (detectedTones[log.detectedTone] || 0) + 1;

    if (log.userOverride) {
      overrideCount++;
    }

    if (log.escalationRequired) {
      escalationCount++;
    }

    totalConfidence += log.confidence;
  });

  return {
    totalInteractions: logs.length,
    detectedTones,
    overrideRate: (overrideCount / logs.length) * 100,
    escalationRate: (escalationCount / logs.length) * 100,
    avgConfidence: totalConfidence / logs.length
  };
}

/**
 * Clear tone logs (for privacy/cleanup)
 */
export function clearToneLogs() {
  localStorage.removeItem('blociq_tone_logs');
  console.log('🧹 Tone logs cleared');
}