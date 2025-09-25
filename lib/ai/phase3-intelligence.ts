/**
 * Phase 3 AI Intelligence Library
 *
 * Extracted from Outlook Add-in for reuse across all AI systems
 * Provides advanced contextual intelligence, tone adaptation, and legal compliance
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for historical pattern analysis
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface TemplateVariation {
  primary_template: string;
  tone_adjustments: string[];
  max_tokens: number;
  structure: string[];
  issue_type: string;
  context_key: string;
}

export interface SenderProfile {
  profile_type: string;
  communication_style: string;
  previous_interactions: number;
  complexity_preference: string;
  authority_level: string;
  special_considerations: string[];
}

export interface AdaptedTone {
  tone_style: string;
  temperature: number;
  formality_level: string;
  technical_detail: string;
  empathy_level: string;
  response_structure: string;
}

export interface LegalCompliance {
  risk_level: string;
  applicable_regulations: string[];
  mandatory_clauses: string[];
  liability_considerations: string[];
  statutory_requirements: string[];
  recommended_disclaimers: string[];
}

export interface LanguagePreference {
  detected_language: string;
  confidence: number;
  region_variant: string;
  complexity_level: string;
  cultural_considerations: string[];
}

export interface HistoricalPatterns {
  pattern_count: number;
  common_issues: string[];
  response_effectiveness: string;
  seasonal_patterns: string[];
  building_specific_insights: string[];
  recommended_adaptations: string[];
}

export interface IntelligentFollowUp {
  strategy: string;
  escalation_timeline: Array<{days: number, action: string, trigger?: string}>;
  monitoring_points: Array<{timing: string, check: string, method: string}>;
  success_criteria: string[];
  risk_mitigation: string[];
}

/**
 * Dynamic Template System with Contextual Variations
 */
export function getTemplateVariations(primaryIssue: string, urgencyLevel: string, sentiment: string): TemplateVariation {
  const templates = {
    leak: {
      urgent_negative: {
        primary_template: 'emergency_leak_response',
        tone_adjustments: ['immediate_action', 'empathetic', 'professional'],
        max_tokens: 1400,
        structure: ['urgent_acknowledgment', 'immediate_steps', 'contractor_contact', 'insurance_guidance', 'follow_up']
      },
      high_negative: {
        primary_template: 'urgent_leak_investigation',
        tone_adjustments: ['responsive', 'professional', 'solution_focused'],
        max_tokens: 1300,
        structure: ['prompt_acknowledgment', 'investigation_plan', 'timeline', 'resident_cooperation', 'next_steps']
      },
      routine_neutral: {
        primary_template: 'standard_leak_investigation',
        tone_adjustments: ['professional', 'methodical', 'reassuring'],
        max_tokens: 1200,
        structure: ['polite_acknowledgment', 'investigation_plan', 'timeline', 'resident_cooperation', 'next_steps']
      }
    },
    service_charge: {
      urgent_negative: {
        primary_template: 'service_charge_dispute_resolution',
        tone_adjustments: ['understanding', 'detailed', 'regulatory_compliant'],
        max_tokens: 1500,
        structure: ['empathetic_response', 'detailed_breakdown', 'legal_framework', 'resolution_options', 'meeting_offer']
      },
      routine_neutral: {
        primary_template: 'service_charge_explanation',
        tone_adjustments: ['informative', 'transparent', 'helpful'],
        max_tokens: 1100,
        structure: ['friendly_acknowledgment', 'clear_explanation', 'supporting_documents', 'contact_details']
      }
    },
    noise: {
      urgent_negative: {
        primary_template: 'noise_complaint_mediation',
        tone_adjustments: ['diplomatic', 'solution_focused', 'fair'],
        max_tokens: 1300,
        structure: ['understanding_acknowledgment', 'investigation_process', 'mediation_options', 'lease_obligations', 'monitoring_plan']
      }
    },
    safety: {
      any_any: {
        primary_template: 'safety_priority_response',
        tone_adjustments: ['urgent', 'safety_first', 'regulatory_compliant', 'detailed'],
        max_tokens: 1500,
        structure: ['immediate_acknowledgment', 'safety_assessment', 'regulatory_framework', 'action_plan', 'escalation_process']
      }
    },
    maintenance: {
      urgent_any: {
        primary_template: 'urgent_maintenance_response',
        tone_adjustments: ['responsive', 'solution_oriented', 'timeline_specific'],
        max_tokens: 1200,
        structure: ['prompt_acknowledgment', 'responsibility_assessment', 'contractor_assignment', 'completion_timeline', 'follow_up']
      }
    },
    compliance: {
      high_any: {
        primary_template: 'compliance_priority_response',
        tone_adjustments: ['authoritative', 'detailed', 'regulatory_focused'],
        max_tokens: 1400,
        structure: ['compliance_acknowledgment', 'regulatory_framework', 'action_required', 'timeline', 'consequences']
      }
    },
    general: {
      default: {
        primary_template: 'professional_response',
        tone_adjustments: ['helpful', 'professional', 'clear'],
        max_tokens: 1000,
        structure: ['polite_acknowledgment', 'specific_response', 'next_steps', 'contact_details']
      }
    }
  };

  const issueTemplates = templates[primaryIssue as keyof typeof templates] || templates.general;
  const key = `${urgencyLevel}_${sentiment}` as keyof typeof issueTemplates;
  const specificTemplate = issueTemplates[key] || issueTemplates[Object.keys(issueTemplates)[0] as keyof typeof issueTemplates];

  return {
    primary_template: specificTemplate.primary_template,
    tone_adjustments: specificTemplate.tone_adjustments,
    max_tokens: specificTemplate.max_tokens,
    structure: specificTemplate.structure,
    issue_type: primaryIssue,
    context_key: `${primaryIssue}-${urgencyLevel}-${sentiment}`
  };
}

/**
 * Smart Tone Adaptation Based on Sender Profile
 */
export function analyzeSenderProfile(senderInfo: any, messageContent: string, context: any): SenderProfile {
  const profile: SenderProfile = {
    profile_type: 'standard_user',
    communication_style: 'neutral',
    previous_interactions: 0,
    complexity_preference: 'standard',
    authority_level: 'user',
    special_considerations: []
  };

  // Analyze communication style from message content
  if (messageContent) {
    const content = messageContent.toLowerCase();

    // Formal/professional indicators
    if (content.includes('dear sir/madam') || content.includes('yours faithfully') ||
        content.includes('pursuant to') || content.includes('in accordance with')) {
      profile.communication_style = 'formal';
      profile.complexity_preference = 'detailed';
    }

    // Informal/casual indicators
    else if (content.includes('hi there') || content.includes('cheers') ||
             content.includes('thanks!') || content.includes('quick question')) {
      profile.communication_style = 'casual';
      profile.complexity_preference = 'concise';
    }

    // Legal/professional background indicators
    if (content.includes('lease clause') || content.includes('statutory') ||
        content.includes('jurisdiction') || content.includes('precedent')) {
      profile.authority_level = 'legal_professional';
      profile.complexity_preference = 'technical';
    }

    // Property professional indicators
    if (content.includes('property manager') || content.includes('letting agent') ||
        content.includes('freeholder representative')) {
      profile.authority_level = 'property_professional';
    }

    // Vulnerable/special needs indicators
    if (content.includes('disability') || content.includes('accessibility') ||
        content.includes('support needed') || content.includes('reasonable adjustments')) {
      profile.special_considerations.push('accessibility_support');
    }

    // Language complexity analysis
    const sentenceCount = (content.match(/[.!?]+/g) || []).length;
    const wordCount = content.split(/\s+/).length;
    if (sentenceCount > 0) {
      const avgWordsPerSentence = wordCount / sentenceCount;
      if (avgWordsPerSentence > 20) {
        profile.complexity_preference = 'detailed';
      } else if (avgWordsPerSentence < 10) {
        profile.complexity_preference = 'simple';
      }
    }
  }

  // Context-specific considerations
  if (context?.building?.name) {
    // Check if it's a high-value development (might indicate more sophisticated users)
    const buildingName = context.building.name.toLowerCase();
    if (buildingName.includes('court') || buildingName.includes('gardens') ||
        buildingName.includes('place') || buildingName.includes('square')) {
      profile.profile_type = 'premium_user';
    }
  }

  return profile;
}

/**
 * Get Adapted Tone Based on Profile Analysis
 */
export function getAdaptedTone(senderProfile: SenderProfile, primaryIssue: string, urgencyLevel: string): AdaptedTone {
  const baseTone: AdaptedTone = {
    tone_style: 'professional',
    temperature: 0.2,
    formality_level: 'standard',
    technical_detail: 'moderate',
    empathy_level: 'standard',
    response_structure: 'standard'
  };

  // Adapt based on sender profile
  switch (senderProfile.communication_style) {
    case 'formal':
      baseTone.tone_style = 'formal_professional';
      baseTone.temperature = 0.1;
      baseTone.formality_level = 'high';
      baseTone.technical_detail = 'detailed';
      break;

    case 'casual':
      baseTone.tone_style = 'approachable_professional';
      baseTone.temperature = 0.3;
      baseTone.formality_level = 'relaxed';
      baseTone.technical_detail = 'simplified';
      break;
  }

  // Adapt based on authority level
  if (senderProfile.authority_level === 'legal_professional') {
    baseTone.technical_detail = 'technical';
    baseTone.tone_style = 'technical_professional';
  } else if (senderProfile.authority_level === 'property_professional') {
    baseTone.technical_detail = 'industry_standard';
    baseTone.tone_style = 'peer_professional';
  }

  // Adapt based on issue urgency
  if (urgencyLevel === 'high' || urgencyLevel === 'critical') {
    baseTone.empathy_level = 'high';
    baseTone.response_structure = 'action_focused';
    baseTone.temperature = Math.max(0.1, baseTone.temperature - 0.1); // More focused
  }

  // Special considerations
  if (senderProfile.special_considerations.includes('accessibility_support')) {
    baseTone.tone_style = 'supportive_professional';
    baseTone.empathy_level = 'high';
    baseTone.technical_detail = 'clear_simple';
  }

  return baseTone;
}

/**
 * Legal Compliance Validation and Risk Assessment
 */
export async function validateLegalCompliance(primaryIssue: string, context: any): Promise<LegalCompliance> {
  const compliance: LegalCompliance = {
    risk_level: 'low',
    applicable_regulations: [],
    mandatory_clauses: [],
    liability_considerations: [],
    statutory_requirements: [],
    recommended_disclaimers: []
  };

  // Issue-specific legal frameworks
  switch (primaryIssue) {
    case 'leak':
      compliance.applicable_regulations = [
        'Landlord and Tenant Act 1985',
        'Defective Premises Act 1972',
        'Insurance (Residential Property) requirements'
      ];
      compliance.mandatory_clauses = [
        'Demised vs common parts responsibility',
        'Reasonable access for investigation',
        'Cost liability determination'
      ];
      compliance.risk_level = 'medium';
      compliance.liability_considerations = [
        'Water damage liability',
        'Emergency access rights',
        'Insurance excess responsibility'
      ];
      break;

    case 'service_charge':
      compliance.applicable_regulations = [
        'Landlord and Tenant Act 1985 (Section 18-30)',
        'Commonhold and Leasehold Reform Act 2002',
        'Section 20 Consultation Requirements'
      ];
      compliance.mandatory_clauses = [
        'Reasonableness of charges',
        'Statutory consultation requirements',
        'Right to challenge service charges'
      ];
      compliance.risk_level = 'high';
      compliance.statutory_requirements = [
        'Section 20 consultation for works >£250/unit',
        'Section 20ZA consultation for long-term agreements',
        'Annual service charge statements'
      ];
      break;

    case 'safety':
      compliance.applicable_regulations = [
        'Building Safety Act 2022',
        'Fire Safety England guidance',
        'Gas Safety (Installation and Use) Regulations',
        'Electrical Equipment (Safety) Regulations'
      ];
      compliance.risk_level = 'critical';
      compliance.statutory_requirements = [
        'Immediate safety assessment',
        'Resident safety communications',
        'Regulatory reporting if required'
      ];
      break;

    case 'noise':
      compliance.applicable_regulations = [
        'Environmental Protection Act 1990',
        'Noise and Statutory Nuisance Act 1993',
        'Lease covenant enforcement'
      ];
      compliance.mandatory_clauses = [
        'Peaceful enjoyment rights',
        'Anti-social behaviour procedures',
        'Mediation before enforcement'
      ];
      break;

    case 'compliance':
      compliance.applicable_regulations = [
        'Building Safety Act 2022',
        'Fire Safety England Regulations',
        'Gas Safety (Installation and Use) Regulations',
        'Electrical Equipment (Safety) Regulations'
      ];
      compliance.risk_level = 'high';
      compliance.statutory_requirements = [
        'Annual compliance certificates',
        'Regular inspection schedules',
        'Resident notification requirements'
      ];
      break;
  }

  // Building-specific considerations
  if (context?.building?.floors && context.building.floors > 11) {
    compliance.applicable_regulations.push('Building Safety Act 2022 (Higher Risk Buildings)');
    if (primaryIssue === 'safety') {
      compliance.risk_level = 'critical';
      compliance.statutory_requirements.push('Building Safety Manager involvement required');
    }
  }

  // Universal disclaimers
  compliance.recommended_disclaimers = [
    'Professional advice qualification',
    'Lease-specific terms precedence',
    'Regulatory compliance commitment'
  ];

  return compliance;
}

/**
 * Detect Language Preference
 */
export function detectLanguagePreference(messageContent: string, senderInfo?: any): LanguagePreference {
  const preference: LanguagePreference = {
    detected_language: 'en-GB',
    confidence: 1.0,
    region_variant: 'British',
    complexity_level: 'standard',
    cultural_considerations: []
  };

  if (!messageContent) return preference;

  // Simple language detection patterns
  const content = messageContent.toLowerCase();

  // American English indicators
  if (content.includes('apartment') || content.includes('elevator') ||
      content.includes('color') || content.includes('neighbor')) {
    preference.region_variant = 'American';
    preference.detected_language = 'en-US';
  }

  // Non-native English indicators
  const nonNativePatterns = [
    /please to help/,
    /kindly do the needful/,
    /revert back/,
    /good morning sir\/madam/
  ];

  if (nonNativePatterns.some(pattern => pattern.test(content))) {
    preference.complexity_level = 'simple';
    preference.cultural_considerations.push('clear_language_preferred');
  }

  return preference;
}

/**
 * Analyze Historical Patterns
 */
export async function analyzeHistoricalPatterns(email: string, primaryIssue: string, buildingId?: string): Promise<HistoricalPatterns> {
  const patterns: HistoricalPatterns = {
    pattern_count: 0,
    common_issues: [],
    response_effectiveness: 'unknown',
    seasonal_patterns: [],
    building_specific_insights: [],
    recommended_adaptations: []
  };

  try {
    // Query historical interactions for this user/building
    if (buildingId) {
      const { data: historicalData } = await supabaseAdmin
        .from('email_interactions')
        .select('issue_type, resolution_time, satisfaction_score')
        .eq('building_id', buildingId)
        .limit(50)
        .order('created_at', { ascending: false });

      if (historicalData && historicalData.length > 0) {
        patterns.pattern_count = historicalData.length;

        // Analyze common issues
        const issueCounts = historicalData.reduce((acc: any, item: any) => {
          acc[item.issue_type] = (acc[item.issue_type] || 0) + 1;
          return acc;
        }, {});

        patterns.common_issues = Object.entries(issueCounts)
          .sort(([,a]: any, [,b]: any) => b - a)
          .slice(0, 3)
          .map(([issue]) => issue);

        // Building-specific insights
        if (patterns.common_issues.includes('leak')) {
          patterns.building_specific_insights.push('Building has recurring leak issues - suggest proactive maintenance');
        }
        if (patterns.common_issues.includes('service_charge')) {
          patterns.building_specific_insights.push('Residents frequently query service charges - consider detailed annual breakdown');
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not analyze historical patterns:', error);
  }

  return patterns;
}

/**
 * Generate Intelligent Follow-up Scheduling
 */
export function generateIntelligentFollowUp(
  primaryIssue: string,
  urgencyLevel: string,
  legalCompliance: LegalCompliance,
  historicalPatterns: HistoricalPatterns,
  context: any
): IntelligentFollowUp {
  const followUp: IntelligentFollowUp = {
    strategy: 'adaptive',
    escalation_timeline: [],
    monitoring_points: [],
    success_criteria: [],
    risk_mitigation: []
  };

  // Base escalation timeline by issue type and urgency
  const baseTimelines = {
    leak: {
      critical: [
        { days: 1, action: 'Immediate contractor contact confirmation' },
        { days: 2, action: 'Site visit completion check' },
        { days: 7, action: 'Temporary repairs completion' },
        { days: 14, action: 'Permanent solution implementation' },
        { days: 30, action: 'Insurance claim status and final resolution' }
      ],
      high: [
        { days: 2, action: 'Investigation appointment confirmation' },
        { days: 5, action: 'Cause identification and responsibility determination' },
        { days: 10, action: 'Repair works commencement' },
        { days: 21, action: 'Completion and damage assessment' }
      ],
      medium: [
        { days: 3, action: 'Investigation scheduling' },
        { days: 7, action: 'Report and recommendations' },
        { days: 14, action: 'Repair works planning' },
        { days: 28, action: 'Resolution confirmation' }
      ]
    },
    service_charge: {
      high: [
        { days: 2, action: 'Detailed breakdown provision' },
        { days: 7, action: 'Supporting documentation sharing' },
        { days: 14, action: 'Query resolution or tribunal guidance' },
        { days: 30, action: 'Formal dispute process if required' }
      ],
      medium: [
        { days: 3, action: 'Explanation and documentation' },
        { days: 10, action: 'Follow-up on understanding' },
        { days: 21, action: 'Payment arrangement if needed' }
      ]
    },
    safety: {
      critical: [
        { days: 1, action: 'Safety assessment completion', trigger: 'immediate_danger' },
        { days: 2, action: 'Emergency measures implementation' },
        { days: 5, action: 'Specialist contractor engagement' },
        { days: 10, action: 'Regulatory compliance verification' },
        { days: 21, action: 'Long-term safety solution confirmation' }
      ]
    },
    maintenance: {
      critical: [
        { days: 1, action: 'Emergency response confirmation' },
        { days: 3, action: 'Temporary solution implementation' },
        { days: 10, action: 'Permanent repair completion' }
      ],
      high: [
        { days: 2, action: 'Contractor appointment scheduling' },
        { days: 7, action: 'Repair works commencement' },
        { days: 14, action: 'Completion and quality check' }
      ]
    }
  };

  // Select appropriate timeline
  const issueTimelines = baseTimelines[primaryIssue as keyof typeof baseTimelines];
  if (issueTimelines) {
    const urgencyTimeline = issueTimelines[urgencyLevel as keyof typeof issueTimelines];
    if (urgencyTimeline) {
      followUp.escalation_timeline = [...urgencyTimeline];
    }
  }

  // Add legal compliance checkpoints
  if (legalCompliance.risk_level === 'critical' || legalCompliance.risk_level === 'high') {
    followUp.escalation_timeline.push({
      days: 7,
      action: 'Legal compliance verification',
      trigger: 'regulatory_requirements'
    });

    if (legalCompliance.statutory_requirements.length > 0) {
      followUp.escalation_timeline.push({
        days: 14,
        action: 'Statutory requirement fulfilment check',
        trigger: 'legal_obligations'
      });
    }
  }

  // Historical pattern adaptations
  if (historicalPatterns.common_issues.includes(primaryIssue)) {
    followUp.strategy = 'proactive_historical';
    followUp.escalation_timeline.unshift({
      days: 0,
      action: 'Proactive communication based on building history'
    });
  }

  // Monitoring points
  followUp.monitoring_points = [
    {
      timing: 'daily',
      check: 'Response acknowledgment and progress monitoring',
      method: 'automated'
    },
    {
      timing: 'weekly',
      check: 'Resolution progress assessment',
      method: 'system_check'
    },
    {
      timing: 'bi-weekly',
      check: 'User satisfaction survey trigger',
      method: 'automated_survey'
    }
  ];

  // Success criteria based on issue type
  switch (primaryIssue) {
    case 'leak':
      followUp.success_criteria = [
        'Source identified and repaired',
        'Damage assessed and insurance claim initiated',
        'Affected residents notified of resolution',
        'No further leak reports within 30 days'
      ];
      break;
    case 'service_charge':
      followUp.success_criteria = [
        'Query fully explained with documentation',
        'User understanding confirmed',
        'Any disputes resolved or tribunal process initiated',
        'Payment arrangements confirmed if applicable'
      ];
      break;
    case 'safety':
      followUp.success_criteria = [
        'Safety hazard eliminated or controlled',
        'Regulatory compliance achieved',
        'All residents informed of resolution',
        'Preventive measures implemented'
      ];
      break;
    default:
      followUp.success_criteria = [
        'Issue acknowledged and understood',
        'Action plan implemented',
        'User satisfaction achieved',
        'Follow-up requirements completed'
      ];
  }

  // Risk mitigation strategies
  followUp.risk_mitigation = [
    'Automated reminder system for missed deadlines',
    'Escalation to senior management if targets missed',
    'Regular communication to prevent dissatisfaction',
    'Documentation trail for legal protection'
  ];

  if (context?.building?.name && historicalPatterns.building_specific_insights.length > 0) {
    followUp.risk_mitigation.push(
      `Building-specific protocols: ${historicalPatterns.building_specific_insights.join('; ')}`
    );
  }

  return followUp;
}

/**
 * Build Enhanced System Message with Phase 3 Intelligence
 */
export function buildEnhancedSystemMessage(
  templateVariations: TemplateVariation,
  adaptedTone: AdaptedTone,
  legalCompliance: LegalCompliance,
  languagePreference: LanguagePreference,
  historicalPatterns: HistoricalPatterns,
  context?: any
) {
  return `You are BlocIQ's advanced AI property management assistant with Phase 3 contextual intelligence.

🎯 RESPONSE TEMPLATE: ${templateVariations.primary_template}
📝 STRUCTURE: ${templateVariations.structure.join(' → ')}

🎭 TONE ADAPTATION:
- Style: ${adaptedTone.tone_style}
- Formality: ${adaptedTone.formality_level}
- Technical Detail: ${adaptedTone.technical_detail}
- Empathy Level: ${adaptedTone.empathy_level}

⚖️ LEGAL COMPLIANCE (${legalCompliance.risk_level.toUpperCase()} RISK):
- Regulations: ${legalCompliance.applicable_regulations.join(', ')}
- Mandatory Elements: ${legalCompliance.mandatory_clauses.join('; ')}
${legalCompliance.statutory_requirements.length > 0 ? `- Statutory Requirements: ${legalCompliance.statutory_requirements.join('; ')}` : ''}

🌍 LANGUAGE/CULTURAL:
- Language: ${languagePreference.detected_language}
- Complexity: ${languagePreference.complexity_level}
${languagePreference.cultural_considerations.length > 0 ? `- Considerations: ${languagePreference.cultural_considerations.join(', ')}` : ''}

📊 HISTORICAL INSIGHTS:
${historicalPatterns.pattern_count > 0 ? `- Past Interactions: ${historicalPatterns.pattern_count}` : ''}
${historicalPatterns.common_issues.length > 0 ? `- Common Issues: ${historicalPatterns.common_issues.join(', ')}` : ''}
${historicalPatterns.building_specific_insights.length > 0 ? `- Building Insights: ${historicalPatterns.building_specific_insights.join('; ')}` : ''}

GENERATE A COMPREHENSIVE RESPONSE:
- Use British English property management terminology
- Follow the specified tone and structure exactly
- Include all mandatory legal elements for ${legalCompliance.risk_level} risk issues
- Adapt complexity to ${languagePreference.complexity_level} level
- Apply historical insights where relevant
- Provide actionable next steps with clear timelines

Remember: This is a complete, contextually intelligent response that considers all aspects of the user's situation.`;
}