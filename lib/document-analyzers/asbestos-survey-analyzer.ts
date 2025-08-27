/**
 * Asbestos Survey Analyzer for BlocIQ
 * Analyzes asbestos survey reports for UK property management compliance
 */

export interface AsbestosSurveyAnalysis {
  documentType: 'asbestos-survey';
  summary: string;
  surveyType: 'management' | 'refurbishment' | 'demolition' | 'unknown';
  complianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  asbestosFindings: {
    acmIdentified: boolean;
    acmCount: number;
    acmLocations: string[];
    riskLevels: ('high' | 'medium' | 'low')[];
    materialTypes: string[];
  };
  riskAssessment: {
    overall: 'low' | 'medium' | 'high' | 'unknown';
    factors: string[];
    mitigation: string[];
    priorityActions: string[];
  };
  managementPlan: {
    exists: boolean;
    recommendations: string[];
    monitoringSchedule: string[];
    reInspectionDate: string | null;
    trainingRequirements: string[];
  };
  complianceRequirements: {
    hasSurvey: boolean;
    hasManagementPlan: boolean;
    hasRiskAssessment: boolean;
    hasTraining: boolean;
    hasMonitoring: boolean;
  };
  keyDates: {
    surveyDate: string | null;
    nextInspection: string | null;
    managementPlanReview: string | null;
    trainingDue: string | null;
  };
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    completed: string[];
  };
  recommendations: string[];
  legalCompliance: {
    controlOfAsbestosRegulations: boolean;
    healthAndSafetyAtWorkAct: boolean;
    buildingSafetyAct: boolean;
    managementRegulations: boolean;
  };
  surveyorDetails: {
    name: string | null;
    company: string | null;
    qualifications: string[];
    accreditation: string[];
    contactInfo: string | null;
  };
}

/**
 * Analyze asbestos survey document content
 */
export function analyzeAsbestosSurvey(extractedText: string, filename: string): AsbestosSurveyAnalysis {
  const text = extractedText.toLowerCase();
  
  return {
    documentType: 'asbestos-survey',
    summary: generateAsbestosSurveySummary(text, filename),
    surveyType: determineSurveyType(text),
    complianceStatus: determineComplianceStatus(text),
    asbestosFindings: extractAsbestosFindings(text),
    riskAssessment: assessRisk(text),
    managementPlan: extractManagementPlan(text),
    complianceRequirements: extractComplianceRequirements(text),
    keyDates: extractKeyDates(text),
    actionItems: categorizeActionItems(text),
    recommendations: extractRecommendations(text),
    legalCompliance: assessLegalCompliance(text),
    surveyorDetails: extractSurveyorDetails(text)
  };
}

function generateAsbestosSurveySummary(text: string, filename: string): string {
  const hasAcm = text.includes('acm') || text.includes('asbestos containing material');
  const surveyType = determineSurveyType(text);
  const riskLevel = assessRisk(text).overall;
  
  let summary = `Asbestos Survey for ${filename}`;
  
  if (surveyType !== 'unknown') {
    summary += ` - ${surveyType.charAt(0).toUpperCase() + surveyType.slice(1)} Survey`;
  }
  
  if (hasAcm) {
    summary += ` identifies asbestos containing materials requiring management`;
  } else {
    summary += ` - no asbestos containing materials identified`;
  }
  
  if (riskLevel !== 'unknown') {
    summary += `. Overall risk level: ${riskLevel}`;
  }
  
  summary += '.';
  
  return summary;
}

function determineSurveyType(text: string): 'management' | 'refurbishment' | 'demolition' | 'unknown' {
  if (text.includes('management survey') || text.includes('management plan')) {
    return 'management';
  } else if (text.includes('refurbishment survey') || text.includes('refurbishment')) {
    return 'refurbishment';
  } else if (text.includes('demolition survey') || text.includes('demolition')) {
    return 'demolition';
  }
  return 'unknown';
}

function determineComplianceStatus(text: string): 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' {
  const hasSurvey = text.includes('survey') || text.includes('inspection');
  const hasManagementPlan = text.includes('management plan') || text.includes('management strategy');
  const hasRiskAssessment = text.includes('risk assessment') || text.includes('risk evaluation');
  
  if (hasSurvey && hasManagementPlan && hasRiskAssessment) {
    return 'compliant';
  } else if (hasSurvey && (hasManagementPlan || hasRiskAssessment)) {
    return 'partially-compliant';
  } else if (!hasSurvey) {
    return 'non-compliant';
  }
  return 'unknown';
}

function extractAsbestosFindings(text: string): {
  acmIdentified: boolean;
  acmCount: number;
  acmLocations: string[];
  riskLevels: ('high' | 'medium' | 'low')[];
  materialTypes: string[];
} {
  const acmIdentified = text.includes('acm') || text.includes('asbestos containing material');
  
  // Extract ACM count
  let acmCount = 0;
  const countMatch = text.match(/(\d+)\s*(?:acm|asbestos containing material)/i);
  if (countMatch) {
    acmCount = parseInt(countMatch[1]);
  }
  
  // Extract locations
  const acmLocations = extractACMLocations(text);
  
  // Extract risk levels
  const riskLevels = extractRiskLevels(text);
  
  // Extract material types
  const materialTypes = extractMaterialTypes(text);
  
  return {
    acmIdentified,
    acmCount,
    acmLocations,
    riskLevels,
    materialTypes
  };
}

function extractACMLocations(text: string): string[] {
  const locations: string[] = [];
  
  const locationKeywords = [
    'roof', 'ceiling', 'wall', 'floor', 'pipe', 'duct', 'boiler', 'heating',
    'electrical', 'insulation', 'tile', 'board', 'cement', 'textured coating'
  ];
  
  for (const keyword of locationKeywords) {
    if (text.includes(keyword)) {
      locations.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  }
  
  return locations.length > 0 ? locations : ['Locations not specified'];
}

function extractRiskLevels(text: string): ('high' | 'medium' | 'low')[] {
  const levels: ('high' | 'medium' | 'low')[] = [];
  
  if (text.includes('high risk') || text.includes('high risk level')) levels.push('high');
  if (text.includes('medium risk') || text.includes('medium risk level')) levels.push('medium');
  if (text.includes('low risk') || text.includes('low risk level')) levels.push('low');
  
  return levels.length > 0 ? levels : ['unknown'];
}

function extractMaterialTypes(text: string): string[] {
  const materials: string[] = [];
  
  const materialKeywords = [
    'chrysotile', 'amosite', 'crocidolite', 'cement', 'insulation board',
    'textured coating', 'floor tile', 'pipe lagging', 'roofing felt'
  ];
  
  for (const keyword of materialKeywords) {
    if (text.includes(keyword)) {
      materials.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  }
  
  return materials.length > 0 ? materials : ['Material types not specified'];
}

function assessRisk(text: string): {
  overall: 'low' | 'medium' | 'high' | 'unknown';
  factors: string[];
  mitigation: string[];
  priorityActions: string[];
} {
  const factors: string[] = [];
  const mitigation: string[] = [];
  const priorityActions: string[] = [];
  
  // Assess risk factors
  if (text.includes('high risk') || text.includes('dangerous')) factors.push('High risk ACM identified');
  if (text.includes('damaged') || text.includes('deteriorated')) factors.push('Damaged or deteriorated ACM');
  if (text.includes('accessible') || text.includes('exposed')) factors.push('Accessible or exposed ACM');
  if (text.includes('friable') || text.includes('loose')) factors.push('Friable or loose ACM');
  if (text.includes('disturbance') || text.includes('work')) factors.push('Risk of ACM disturbance');
  
  // Determine overall risk
  let overall: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
  if (factors.length >= 3) overall = 'high';
  else if (factors.length >= 1) overall = 'medium';
  else overall = 'low';
  
  // Suggest mitigation
  if (factors.includes('High risk ACM identified')) {
    mitigation.push('Immediate professional assessment required');
    priorityActions.push('Engage licensed asbestos contractor');
  }
  if (factors.includes('Damaged or deteriorated ACM')) {
    mitigation.push('Repair or encapsulate damaged ACM');
    priorityActions.push('Schedule remedial work');
  }
  if (factors.includes('Accessible or exposed ACM')) {
    mitigation.push('Restrict access to ACM areas');
    priorityActions.push('Install warning signs and barriers');
  }
  if (factors.includes('Risk of ACM disturbance')) {
    mitigation.push('Implement safe working procedures');
    priorityActions.push('Provide asbestos awareness training');
  }
  
  return { overall, factors, mitigation, priorityActions };
}

function extractManagementPlan(text: string): {
  exists: boolean;
  recommendations: string[];
  monitoringSchedule: string[];
  reInspectionDate: string | null;
  trainingRequirements: string[];
} {
  const exists = text.includes('management plan') || text.includes('management strategy');
  
  // Extract recommendations
  const recommendations = extractRecommendations(text);
  
  // Extract monitoring schedule
  const monitoringSchedule = extractMonitoringSchedule(text);
  
  // Extract re-inspection date
  const reInspectionDate = extractReInspectionDate(text);
  
  // Extract training requirements
  const trainingRequirements = extractTrainingRequirements(text);
  
  return {
    exists,
    recommendations,
    monitoringSchedule,
    reInspectionDate,
    trainingRequirements
  };
}

function extractMonitoringSchedule(text: string): string[] {
  const schedule: string[] = [];
  
  if (text.includes('monthly') || text.includes('month')) schedule.push('Monthly monitoring');
  if (text.includes('quarterly') || text.includes('quarter')) schedule.push('Quarterly monitoring');
  if (text.includes('annually') || text.includes('year')) schedule.push('Annual monitoring');
  if (text.includes('6 months') || text.includes('six months')) schedule.push('6-monthly monitoring');
  
  return schedule.length > 0 ? schedule : ['Monitoring schedule not specified'];
}

function extractReInspectionDate(text: string): string | null {
  const datePatterns = [
    /re.?inspection[:\s]+([^.\n]+)/i,
    /next inspection[:\s]+([^.\n]+)/i,
    /review date[:\s]+([^.\n]+)/i,
    /monitoring date[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return null;
}

function extractTrainingRequirements(text: string): string[] {
  const requirements: string[] = [];
  
  if (text.includes('asbestos awareness') || text.includes('awareness training')) {
    requirements.push('Asbestos awareness training');
  }
  if (text.includes('licensed contractor') || text.includes('specialist training')) {
    requirements.push('Licensed contractor training');
  }
  if (text.includes('supervisor') || text.includes('management training')) {
    requirements.push('Supervisor/management training');
  }
  if (text.includes('refresher') || text.includes('annual training')) {
    requirements.push('Annual refresher training');
  }
  
  return requirements.length > 0 ? requirements : ['Training requirements not specified'];
}

function extractComplianceRequirements(text: string): {
  hasSurvey: boolean;
  hasManagementPlan: boolean;
  hasRiskAssessment: boolean;
  hasTraining: boolean;
  hasMonitoring: boolean;
} {
  return {
    hasSurvey: text.includes('survey') || text.includes('inspection'),
    hasManagementPlan: text.includes('management plan') || text.includes('management strategy'),
    hasRiskAssessment: text.includes('risk assessment') || text.includes('risk evaluation'),
    hasTraining: text.includes('training') || text.includes('awareness'),
    hasMonitoring: text.includes('monitoring') || text.includes('re-inspection')
  };
}

function extractKeyDates(text: string): {
  surveyDate: string | null;
  nextInspection: string | null;
  managementPlanReview: string | null;
  trainingDue: string | null;
} {
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dates = text.match(datePattern) || [];
  
  return {
    surveyDate: dates[0] || null,
    nextInspection: extractReInspectionDate(text),
    managementPlanReview: dates[1] || null,
    trainingDue: extractTrainingDueDate(text)
  };
}

function extractTrainingDueDate(text: string): string | null {
  const trainingPatterns = [
    /training due[:\s]+([^.\n]+)/i,
    /awareness training[:\s]+([^.\n]+)/i,
    /refresher due[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of trainingPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return null;
}

function categorizeActionItems(text: string): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  completed: string[];
} {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];
  const completed: string[] = [];
  
  // Immediate actions
  if (text.includes('high risk') || text.includes('dangerous')) {
    immediate.push('Immediate professional assessment of high-risk ACM');
  }
  if (text.includes('damaged') || text.includes('deteriorated')) {
    immediate.push('Assess and secure damaged ACM');
  }
  
  // Short term actions
  if (text.includes('management plan')) {
    shortTerm.push('Develop or update asbestos management plan');
  }
  if (text.includes('training') || text.includes('awareness')) {
    shortTerm.push('Schedule asbestos awareness training');
  }
  if (text.includes('monitoring') || text.includes('inspection')) {
    shortTerm.push('Establish monitoring and inspection schedule');
  }
  
  // Long term actions
  if (text.includes('remediation') || text.includes('removal')) {
    longTerm.push('Plan long-term ACM remediation strategy');
  }
  if (text.includes('review') || text.includes('update')) {
    longTerm.push('Schedule regular management plan reviews');
  }
  
  return { immediate, shortTerm, longTerm, completed };
}

function extractRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  if (text.includes('management plan')) recommendations.push('Develop comprehensive asbestos management plan');
  if (text.includes('risk assessment')) recommendations.push('Conduct detailed risk assessment of identified ACM');
  if (text.includes('training')) recommendations.push('Provide asbestos awareness training to staff');
  if (text.includes('monitoring')) recommendations.push('Establish regular monitoring and inspection regime');
  if (text.includes('remediation')) recommendations.push('Plan ACM remediation where necessary');
  if (text.includes('encapsulation')) recommendations.push('Consider ACM encapsulation as alternative to removal');
  
  return recommendations.length > 0 ? recommendations : ['Follow standard asbestos management procedures'];
}

function assessLegalCompliance(text: string): {
  controlOfAsbestosRegulations: boolean;
  healthAndSafetyAtWorkAct: boolean;
  buildingSafetyAct: boolean;
  managementRegulations: boolean;
} {
  return {
    controlOfAsbestosRegulations: text.includes('control of asbestos') || text.includes('car 2012'),
    healthAndSafetyAtWorkAct: text.includes('health and safety') || text.includes('hswa'),
    buildingSafetyAct: text.includes('building safety') || text.includes('bsa'),
    managementRegulations: text.includes('management regulations') || text.includes('regulation 4')
  };
}

function extractSurveyorDetails(text: string): {
  name: string | null;
  company: string | null;
  qualifications: string[];
  accreditation: string[];
  contactInfo: string | null;
} {
  return {
    name: null, // Would need more sophisticated extraction
    company: null,
    qualifications: extractSurveyorQualifications(text),
    accreditation: extractSurveyorAccreditation(text),
    contactInfo: null
  };
}

function extractSurveyorQualifications(text: string): string[] {
  const qualifications: string[] = [];
  
  if (text.includes('surveyor') || text.includes('inspector')) qualifications.push('Qualified asbestos surveyor');
  if (text.includes('licensed') || text.includes('accredited')) qualifications.push('Licensed asbestos professional');
  if (text.includes('competent') || text.includes('experienced')) qualifications.push('Competent person');
  if (text.includes('certified') || text.includes('certification')) qualifications.push('Certified professional');
  
  return qualifications.length > 0 ? qualifications : ['Qualifications not specified'];
}

function extractSurveyorAccreditation(text: string): string[] {
  const accreditation: string[] = [];
  
  if (text.includes('ukas') || text.includes('accreditation')) accreditation.push('UKAS accredited');
  if (text.includes('iso') || text.includes('standard')) accreditation.push('ISO standard compliance');
  if (text.includes('professional body') || text.includes('institution')) accreditation.push('Professional body membership');
  if (text.includes('licence') || text.includes('permit')) accreditation.push('Licensed contractor');
  
  return accreditation.length > 0 ? accreditation : ['Accreditation not specified'];
}
