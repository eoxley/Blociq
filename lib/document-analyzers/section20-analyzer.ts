/**
 * Section 20 Notice Analyzer for BlocIQ
 * Analyzes Section 20 consultation notices for major works
 */

export interface Section20Analysis {
  documentType: 'section20';
  summary: string;
  consultationStage: 'stage1' | 'stage2' | 'stage3' | 'unknown';
  complianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  consultationDetails: {
    worksDescription: string;
    estimatedCost: string | null;
    costPerLeaseholder: string | null;
    consultationPeriod: {
      startDate: string | null;
      endDate: string | null;
      responseDeadline: string | null;
    };
    consultationMethod: string[];
  };
  leaseholderObligations: {
    responseRequired: boolean;
    responseDeadline: string | null;
    objectionRights: string[];
    consultationRights: string[];
    costSharing: string;
  };
  statutoryRequirements: {
    consultationPeriod: boolean;
    costThreshold: boolean;
    multipleQuotes: boolean;
    leaseholderResponse: boolean;
    consultationReport: boolean;
  };
  timeline: {
    consultationStart: string | null;
    consultationEnd: string | null;
    worksStart: string | null;
    worksCompletion: string | null;
    responseDeadline: string | null;
  };
  costBreakdown: {
    totalCost: string | null;
    costPerUnit: string | null;
    leaseholderContribution: string | null;
    fundingSource: string[];
    paymentSchedule: string[];
  };
  contractorDetails: {
    name: string | null;
    company: string | null;
    qualifications: string[];
    insurance: string[];
    references: string[];
  };
  riskAssessment: {
    overall: 'low' | 'medium' | 'high' | 'unknown';
    factors: string[];
    mitigation: string[];
  };
  recommendations: string[];
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  legalCompliance: {
    buildingSafetyAct: boolean;
    landlordTenantAct: boolean;
    consultationRegulations: boolean;
    costRecovery: boolean;
  };
}

/**
 * Analyze Section 20 notice document content
 */
export function analyzeSection20(extractedText: string, filename: string): Section20Analysis {
  const text = extractedText.toLowerCase();
  
  return {
    documentType: 'section20',
    summary: generateSection20Summary(text, filename),
    consultationStage: determineConsultationStage(text),
    complianceStatus: determineComplianceStatus(text),
    consultationDetails: extractConsultationDetails(text),
    leaseholderObligations: extractLeaseholderObligations(text),
    statutoryRequirements: extractStatutoryRequirements(text),
    timeline: extractTimeline(text),
    costBreakdown: extractCostBreakdown(text),
    contractorDetails: extractContractorDetails(text),
    riskAssessment: assessRisk(text),
    recommendations: extractRecommendations(text),
    actionItems: categorizeActionItems(text),
    legalCompliance: assessLegalCompliance(text)
  };
}

function generateSection20Summary(text: string, filename: string): string {
  const stage = determineConsultationStage(text);
  const hasCosts = text.includes('cost') || text.includes('£') || text.includes('pound');
  const hasDeadline = text.includes('deadline') || text.includes('response') || text.includes('consultation');
  
  let summary = `Section 20 Notice for ${filename}`;
  
  if (stage !== 'unknown') {
    summary += ` - Stage ${stage.replace('stage', '')} consultation`;
  }
  
  if (hasCosts) {
    summary += ' with cost implications for leaseholders';
  }
  
  if (hasDeadline) {
    summary += '. Response deadline applies.';
  } else {
    summary += '.';
  }
  
  return summary;
}

function determineConsultationStage(text: string): 'stage1' | 'stage2' | 'stage3' | 'unknown' {
  if (text.includes('stage 1') || text.includes('stage1') || text.includes('first stage')) {
    return 'stage1';
  } else if (text.includes('stage 2') || text.includes('stage2') || text.includes('second stage')) {
    return 'stage2';
  } else if (text.includes('stage 3') || text.includes('stage3') || text.includes('third stage')) {
    return 'stage3';
  }
  return 'unknown';
}

function determineComplianceStatus(text: string): 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' {
  const hasConsultation = text.includes('consultation') || text.includes('notice');
  const hasCosts = text.includes('cost') || text.includes('estimate');
  const hasDeadline = text.includes('deadline') || text.includes('response');
  
  if (hasConsultation && hasCosts && hasDeadline) {
    return 'compliant';
  } else if (hasConsultation && (hasCosts || hasDeadline)) {
    return 'partially-compliant';
  } else if (!hasConsultation) {
    return 'non-compliant';
  }
  return 'unknown';
}

function extractConsultationDetails(text: string): {
  worksDescription: string;
  estimatedCost: string | null;
  costPerLeaseholder: string | null;
  consultationPeriod: { startDate: string | null; endDate: string | null; responseDeadline: string | null };
  consultationMethod: string[];
} {
  // Extract works description
  let worksDescription = 'Not specified';
  if (text.includes('works') || text.includes('project') || text.includes('refurbishment')) {
    worksDescription = 'Major works project identified';
  }
  
  // Extract costs
  const costMatch = text.match(/£([\d,]+)/g);
  const estimatedCost = costMatch ? costMatch[0] : null;
  
  // Extract consultation period
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dates = text.match(datePattern) || [];
  
  return {
    worksDescription,
    estimatedCost,
    costPerLeaseholder: null, // Would need more sophisticated extraction
    consultationPeriod: {
      startDate: dates[0] || null,
      endDate: dates[1] || null,
      responseDeadline: dates[2] || null
    },
    consultationMethod: extractConsultationMethods(text)
  };
}

function extractConsultationMethods(text: string): string[] {
  const methods: string[] = [];
  
  if (text.includes('post') || text.includes('letter')) methods.push('Postal notification');
  if (text.includes('email') || text.includes('electronic')) methods.push('Email notification');
  if (text.includes('meeting') || text.includes('consultation')) methods.push('Consultation meeting');
  if (text.includes('display') || text.includes('notice board')) methods.push('Notice board display');
  
  return methods.length > 0 ? methods : ['Standard consultation methods'];
}

function extractLeaseholderObligations(text: string): {
  responseRequired: boolean;
  responseDeadline: string | null;
  objectionRights: string[];
  consultationRights: string[];
  costSharing: string;
} {
  const responseRequired = text.includes('response') || text.includes('reply') || text.includes('objection');
  const deadlineMatch = text.match(/deadline[:\s]+([^.\n]+)/i);
  const responseDeadline = deadlineMatch ? deadlineMatch[1].trim() : null;
  
  return {
    responseRequired,
    responseDeadline,
    objectionRights: extractObjectionRights(text),
    consultationRights: extractConsultationRights(text),
    costSharing: extractCostSharing(text)
  };
}

function extractObjectionRights(text: string): string[] {
  const rights: string[] = [];
  
  if (text.includes('object') || text.includes('objection')) rights.push('Right to object to works');
  if (text.includes('challenge') || text.includes('dispute')) rights.push('Right to challenge costs');
  if (text.includes('consultation') || text.includes('meeting')) rights.push('Right to consultation meeting');
  if (text.includes('quote') || text.includes('estimate')) rights.push('Right to multiple quotes');
  
  return rights.length > 0 ? rights : ['Standard leaseholder rights apply'];
}

function extractConsultationRights(text: string): string[] {
  const rights: string[] = [];
  
  if (text.includes('meeting') || text.includes('consultation')) rights.push('Attend consultation meetings');
  if (text.includes('inspect') || text.includes('examine')) rights.push('Inspect documentation');
  if (text.includes('quote') || text.includes('estimate')) rights.push('Request multiple quotes');
  if (text.includes('response') || text.includes('reply')) rights.push('Submit formal response');
  
  return rights.length > 0 ? rights : ['Standard consultation rights'];
}

function extractCostSharing(text: string): string {
  if (text.includes('pro rata') || text.includes('proportion')) {
    return 'Costs shared proportionally between leaseholders';
  } else if (text.includes('equal') || text.includes('divided')) {
    return 'Costs divided equally between leaseholders';
  } else if (text.includes('service charge')) {
    return 'Costs recovered through service charge';
  }
  return 'Cost sharing method not specified';
}

function extractStatutoryRequirements(text: string): {
  consultationPeriod: boolean;
  costThreshold: boolean;
  multipleQuotes: boolean;
  leaseholderResponse: boolean;
  consultationReport: boolean;
} {
  return {
    consultationPeriod: text.includes('consultation') || text.includes('notice period'),
    costThreshold: text.includes('threshold') || text.includes('limit') || text.includes('exceed'),
    multipleQuotes: text.includes('quote') || text.includes('estimate') || text.includes('tender'),
    leaseholderResponse: text.includes('response') || text.includes('reply') || text.includes('objection'),
    consultationReport: text.includes('report') || text.includes('summary') || text.includes('outcome')
  };
}

function extractTimeline(text: string): {
  consultationStart: string | null;
  consultationEnd: string | null;
  worksStart: string | null;
  worksCompletion: string | null;
  responseDeadline: string | null;
} {
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dates = text.match(datePattern) || [];
  
  return {
    consultationStart: dates[0] || null,
    consultationEnd: dates[1] || null,
    worksStart: dates[2] || null,
    worksCompletion: dates[3] || null,
    responseDeadline: extractResponseDeadline(text)
  };
}

function extractResponseDeadline(text: string): string | null {
  const deadlinePatterns = [
    /deadline[:\s]+([^.\n]+)/i,
    /response[:\s]+([^.\n]+)/i,
    /reply[:\s]+([^.\n]+)/i,
    /objection[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return null;
}

function extractCostBreakdown(text: string): {
  totalCost: string | null;
  costPerUnit: string | null;
  leaseholderContribution: string | null;
  fundingSource: string[];
  paymentSchedule: string[];
} {
  const costMatch = text.match(/£([\d,]+)/g);
  const totalCost = costMatch ? costMatch[0] : null;
  
  return {
    totalCost,
    costPerUnit: null, // Would need more sophisticated extraction
    leaseholderContribution: null,
    fundingSource: extractFundingSources(text),
    paymentSchedule: extractPaymentSchedule(text)
  };
}

function extractFundingSources(text: string): string[] {
  const sources: string[] = [];
  
  if (text.includes('service charge') || text.includes('reserve fund')) sources.push('Service charge/Reserve fund');
  if (text.includes('insurance') || text.includes('claim')) sources.push('Insurance claim');
  if (text.includes('grant') || text.includes('funding')) sources.push('Government grant');
  if (text.includes('loan') || text.includes('finance')) sources.push('Financing arrangement');
  
  return sources.length > 0 ? sources : ['Funding source not specified'];
}

function extractPaymentSchedule(text: string): string[] {
  const schedule: string[] = [];
  
  if (text.includes('monthly') || text.includes('month')) schedule.push('Monthly payments');
  if (text.includes('quarterly') || text.includes('quarter')) schedule.push('Quarterly payments');
  if (text.includes('annually') || text.includes('year')) schedule.push('Annual payments');
  if (text.includes('lump sum') || text.includes('one-off')) schedule.push('Lump sum payment');
  
  return schedule.length > 0 ? schedule : ['Payment schedule not specified'];
}

function extractContractorDetails(text: string): {
  name: string | null;
  company: string | null;
  qualifications: string[];
  insurance: string[];
  references: string[];
} {
  return {
    name: null, // Would need more sophisticated extraction
    company: null,
    qualifications: extractQualifications(text),
    insurance: extractInsurance(text),
    references: extractReferences(text)
  };
}

function extractQualifications(text: string): string[] {
  const qualifications: string[] = [];
  
  if (text.includes('certified') || text.includes('accredited')) qualifications.push('Certified contractor');
  if (text.includes('licensed') || text.includes('registered')) qualifications.push('Licensed tradesperson');
  if (text.includes('qualified') || text.includes('competent')) qualifications.push('Qualified professional');
  if (text.includes('experience') || text.includes('expertise')) qualifications.push('Experienced contractor');
  
  return qualifications.length > 0 ? qualifications : ['Qualifications not specified'];
}

function extractInsurance(text: string): string[] {
  const insurance: string[] = [];
  
  if (text.includes('public liability') || text.includes('liability insurance')) insurance.push('Public liability insurance');
  if (text.includes('employers liability') || text.includes('el insurance')) insurance.push('Employers liability insurance');
  if (text.includes('professional indemnity') || text.includes('pi insurance')) insurance.push('Professional indemnity insurance');
  if (text.includes('contract works') || text.includes('works insurance')) insurance.push('Contract works insurance');
  
  return insurance.length > 0 ? insurance : ['Insurance requirements not specified'];
}

function extractReferences(text: string): string[] {
  const references: string[] = [];
  
  if (text.includes('reference') || text.includes('previous work')) references.push('Previous work references');
  if (text.includes('testimonial') || text.includes('recommendation')) references.push('Client testimonials');
  if (text.includes('portfolio') || text.includes('examples')) references.push('Portfolio of work');
  if (text.includes('certification') || text.includes('accreditation')) references.push('Professional certifications');
  
  return references.length > 0 ? references : ['References not specified'];
}

function assessRisk(text: string): {
  overall: 'low' | 'medium' | 'high' | 'unknown';
  factors: string[];
  mitigation: string[];
} {
  const factors: string[] = [];
  const mitigation: string[] = [];
  
  // Assess risk factors
  if (text.includes('high cost') || text.includes('expensive')) factors.push('High cost implications');
  if (text.includes('urgent') || text.includes('emergency')) factors.push('Urgent works required');
  if (text.includes('disruption') || text.includes('inconvenience')) factors.push('Potential disruption to residents');
  if (text.includes('complex') || text.includes('technical')) factors.push('Complex technical requirements');
  
  // Determine overall risk
  let overall: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
  if (factors.length >= 3) overall = 'high';
  else if (factors.length >= 1) overall = 'medium';
  else overall = 'low';
  
  // Suggest mitigation
  if (factors.includes('High cost implications')) mitigation.push('Ensure multiple quotes obtained');
  if (factors.includes('Urgent works required')) mitigation.push('Expedite consultation process');
  if (factors.includes('Potential disruption')) mitigation.push('Plan works to minimize disruption');
  if (factors.includes('Complex technical requirements')) mitigation.push('Engage qualified specialists');
  
  return { overall, factors, mitigation };
}

function extractRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  if (text.includes('consultation') || text.includes('notice')) recommendations.push('Ensure full consultation period observed');
  if (text.includes('cost') || text.includes('estimate')) recommendations.push('Obtain multiple quotes for comparison');
  if (text.includes('deadline') || text.includes('response')) recommendations.push('Monitor response deadlines carefully');
  if (text.includes('contractor') || text.includes('qualification')) recommendations.push('Verify contractor qualifications and insurance');
  
  return recommendations.length > 0 ? recommendations : ['Follow standard Section 20 procedures'];
}

function categorizeActionItems(text: string): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
} {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];
  
  // Immediate actions
  if (text.includes('deadline') || text.includes('response')) immediate.push('Review response deadline');
  if (text.includes('consultation') || text.includes('notice')) immediate.push('Ensure consultation period compliance');
  
  // Short term actions
  if (text.includes('quote') || text.includes('estimate')) shortTerm.push('Obtain multiple contractor quotes');
  if (text.includes('meeting') || text.includes('consultation')) shortTerm.push('Schedule consultation meetings');
  
  // Long term actions
  if (text.includes('works') || text.includes('project')) longTerm.push('Monitor project progress');
  if (text.includes('cost') || text.includes('payment')) longTerm.push('Plan cost recovery strategy');
  
  return { immediate, shortTerm, longTerm };
}

function assessLegalCompliance(text: string): {
  buildingSafetyAct: boolean;
  landlordTenantAct: boolean;
  consultationRegulations: boolean;
  costRecovery: boolean;
} {
  return {
    buildingSafetyAct: text.includes('building safety') || text.includes('fire safety') || text.includes('structural'),
    landlordTenantAct: text.includes('leaseholder') || text.includes('consultation') || text.includes('notice'),
    consultationRegulations: text.includes('consultation') || text.includes('notice period') || text.includes('response'),
    costRecovery: text.includes('cost recovery') || text.includes('service charge') || text.includes('contribution')
  };
}
