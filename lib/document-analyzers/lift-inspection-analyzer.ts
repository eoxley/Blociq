/**
 * Lift Inspection Analyzer for BlocIQ
 * Analyzes lift inspection reports for UK property management compliance
 */

export interface LiftInspectionAnalysis {
  documentType: 'lift-inspection';
  summary: string;
  inspectionType: 'thorough examination' | 'periodic inspection' | 'maintenance' | 'unknown';
  complianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  liftDetails: {
    liftType: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    installationDate: string | null;
    capacity: string | null;
    floors: string | null;
  };
  inspectionResults: {
    overall: 'satisfactory' | 'unsatisfactory' | 'partially satisfactory' | 'unknown';
    details: string[];
    defects: string[];
    recommendations: string[];
  };
  safetyCertificate: {
    issued: boolean;
    issueDate: string | null;
    expiryDate: string | null;
    nextInspection: string | null;
    inspectorDetails: string | null;
  };
  maintenanceSchedule: {
    frequency: string;
    lastMaintenance: string | null;
    nextMaintenance: string | null;
    maintenanceCompany: string | null;
    contractType: string | null;
  };
  complianceRequirements: {
    hasInspection: boolean;
    hasCertificate: boolean;
    hasMaintenance: boolean;
    hasEmergencyProcedures: boolean;
    hasTraining: boolean;
  };
  riskAssessment: {
    overall: 'low' | 'medium' | 'high' | 'unknown';
    factors: string[];
    mitigation: string[];
    priorityActions: string[];
  };
  keyDates: {
    inspectionDate: string | null;
    certificateExpiry: string | null;
    nextInspection: string | null;
    nextMaintenance: string | null;
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
    liftRegulations: boolean;
    healthAndSafetyAtWorkAct: boolean;
    buildingSafetyAct: boolean;
    puwerRegulations: boolean;
  };
  inspectorDetails: {
    name: string | null;
    company: string | null;
    qualifications: string[];
    accreditation: string[];
    contactInfo: string | null;
  };
}

/**
 * Analyze lift inspection document content
 */
export function analyzeLiftInspection(extractedText: string, filename: string): LiftInspectionAnalysis {
  const text = extractedText.toLowerCase();
  
  return {
    documentType: 'lift-inspection',
    summary: generateLiftInspectionSummary(text, filename),
    inspectionType: determineInspectionType(text),
    complianceStatus: determineComplianceStatus(text),
    liftDetails: extractLiftDetails(text),
    inspectionResults: extractInspectionResults(text),
    safetyCertificate: extractSafetyCertificate(text),
    maintenanceSchedule: extractMaintenanceSchedule(text),
    complianceRequirements: extractComplianceRequirements(text),
    riskAssessment: assessRisk(text),
    keyDates: extractKeyDates(text),
    actionItems: categorizeActionItems(text),
    recommendations: extractRecommendations(text),
    legalCompliance: assessLegalCompliance(text),
    inspectorDetails: extractInspectorDetails(text)
  };
}

function generateLiftInspectionSummary(text: string, filename: string): string {
  const inspectionType = determineInspectionType(text);
  const results = extractInspectionResults(text);
  const hasDefects = results.defects.length > 0;
  const nextInspection = extractNextInspectionDate(text);
  
  let summary = `Lift Inspection Report for ${filename}`;
  
  if (inspectionType !== 'unknown') {
    summary += ` - ${inspectionType.charAt(0).toUpperCase() + inspectionType.slice(1)}`;
  }
  
  if (results.overall === 'satisfactory') {
    summary += ' shows satisfactory condition';
  } else if (results.overall === 'unsatisfactory') {
    summary += ' identifies safety issues requiring attention';
  } else if (results.overall === 'partially satisfactory') {
    summary += ' shows some issues requiring attention';
  }
  
  if (hasDefects) {
    summary += ` with ${results.defects.length} defect(s) identified`;
  }
  
  if (nextInspection) {
    summary += `. Next inspection due: ${nextInspection}`;
  }
  
  summary += '.';
  
  return summary;
}

function determineInspectionType(text: string): 'thorough examination' | 'periodic inspection' | 'maintenance' | 'unknown' {
  if (text.includes('thorough examination') || text.includes('thorough inspection')) {
    return 'thorough examination';
  } else if (text.includes('periodic inspection') || text.includes('periodic examination')) {
    return 'periodic inspection';
  } else if (text.includes('maintenance') || text.includes('service')) {
    return 'maintenance';
  }
  return 'unknown';
}

function determineComplianceStatus(text: string): 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' {
  const hasInspection = text.includes('inspection') || text.includes('examination');
  const hasCertificate = text.includes('certificate') || text.includes('safety certificate');
  const results = extractInspectionResults(text);
  
  if (hasInspection && hasCertificate && results.overall === 'satisfactory') {
    return 'compliant';
  } else if (hasInspection && results.overall === 'unsatisfactory') {
    return 'non-compliant';
  } else if (hasInspection && results.overall === 'partially satisfactory') {
    return 'partially-compliant';
  }
  return 'unknown';
}

function extractLiftDetails(text: string): {
  liftType: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installationDate: string | null;
  capacity: string | null;
  floors: string | null;
} {
  // Determine lift type
  let liftType = 'Passenger lift';
  if (text.includes('goods lift') || text.includes('freight lift')) liftType = 'Goods lift';
  if (text.includes('dumb waiter') || text.includes('dumbwaiter')) liftType = 'Dumb waiter';
  if (text.includes('escalator') || text.includes('moving walkway')) liftType = 'Escalator/Moving walkway';
  
  // Extract dates
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dates = text.match(datePattern) || [];
  
  return {
    liftType,
    manufacturer: extractManufacturer(text),
    model: extractModel(text),
    serialNumber: extractSerialNumber(text),
    installationDate: dates[0] || null,
    capacity: extractCapacity(text),
    floors: extractFloors(text)
  };
}

function extractManufacturer(text: string): string | null {
  const manufacturerKeywords = [
    'otis', 'kone', 'schindler', 'thyssenkrupp', 'mitsubishi', 'hitachi',
    'express', 'stannah', 'acorn', 'british', 'english'
  ];
  
  for (const keyword of manufacturerKeywords) {
    if (text.includes(keyword)) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  
  return null;
}

function extractModel(text: string): string | null {
  const modelMatch = text.match(/model[:\s]+([a-z0-9\-\s]+)/i);
  return modelMatch ? modelMatch[1].trim() : null;
}

function extractSerialNumber(text: string): string | null {
  const serialMatch = text.match(/serial[:\s]+([a-z0-9\-\s]+)/i);
  return serialMatch ? serialMatch[1].trim() : null;
}

function extractCapacity(text: string): string | null {
  const capacityMatch = text.match(/(\d+)\s*(?:person|kg|ton|capacity)/i);
  return capacityMatch ? `${capacityMatch[1]} person capacity` : null;
}

function extractFloors(text: string): string | null {
  const floorMatch = text.match(/(\d+)\s*(?:floor|storey|level)/i);
  return floorMatch ? `${floorMatch[1]} floors` : null;
}

function extractInspectionResults(text: string): {
  overall: 'satisfactory' | 'unsatisfactory' | 'partially satisfactory' | 'unknown';
  details: string[];
  defects: string[];
  recommendations: string[];
} {
  let overall: 'satisfactory' | 'unsatisfactory' | 'partially satisfactory' | 'unknown' = 'unknown';
  
  if (text.includes('satisfactory') && !text.includes('unsatisfactory')) {
    overall = 'satisfactory';
  } else if (text.includes('unsatisfactory') || text.includes('dangerous')) {
    overall = 'unsatisfactory';
  } else if (text.includes('partially') || text.includes('some issues')) {
    overall = 'partially satisfactory';
  }
  
  const details = extractInspectionDetails(text);
  const defects = extractDefects(text);
  const recommendations = extractRecommendations(text);
  
  return { overall, details, defects, recommendations };
}

function extractInspectionDetails(text: string): string[] {
  const details: string[] = [];
  
  if (text.includes('mechanical') || text.includes('electrical')) details.push('Mechanical and electrical systems checked');
  if (text.includes('safety') || text.includes('brake')) details.push('Safety systems and brakes tested');
  if (text.includes('emergency') || text.includes('alarm')) details.push('Emergency systems and alarms tested');
  if (text.includes('door') || text.includes('gate')) details.push('Door and gate operation checked');
  if (text.includes('control') || text.includes('panel')) details.push('Control panel and operation checked');
  
  return details.length > 0 ? details : ['Standard inspection procedures followed'];
}

function extractDefects(text: string): string[] {
  const defects: string[] = [];
  
  if (text.includes('defect') || text.includes('fault')) defects.push('Defects identified during inspection');
  if (text.includes('wear') || text.includes('damage')) defects.push('Wear and damage noted');
  if (text.includes('safety') || text.includes('risk')) defects.push('Safety concerns identified');
  if (text.includes('maintenance') || text.includes('service')) defects.push('Maintenance issues found');
  if (text.includes('compliance') || text.includes('regulation')) defects.push('Compliance issues noted');
  
  return defects;
}

function extractSafetyCertificate(text: string): {
  issued: boolean;
  issueDate: string | null;
  expiryDate: string | null;
  nextInspection: string | null;
  inspectorDetails: string | null;
} {
  const issued = text.includes('certificate') || text.includes('issued') || text.includes('valid');
  
  // Extract dates
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dates = text.match(datePattern) || [];
  
  return {
    issued,
    issueDate: dates[0] || null,
    expiryDate: dates[1] || null,
    nextInspection: extractNextInspectionDate(text),
    inspectorDetails: extractInspectorDetails(text).name
  };
}

function extractNextInspectionDate(text: string): string | null {
  const inspectionPatterns = [
    /next inspection[:\s]+([^.\n]+)/i,
    /next examination[:\s]+([^.\n]+)/i,
    /re.?inspection[:\s]+([^.\n]+)/i,
    /due date[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of inspectionPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return null;
}

function extractMaintenanceSchedule(text: string): {
  frequency: string;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  maintenanceCompany: string | null;
  contractType: string | null;
} {
  // Determine frequency
  let frequency = 'Not specified';
  if (text.includes('monthly') || text.includes('month')) frequency = 'Monthly';
  if (text.includes('quarterly') || text.includes('quarter')) frequency = 'Quarterly';
  if (text.includes('6 months') || text.includes('six months')) frequency = '6-monthly';
  if (text.includes('annually') || text.includes('year')) frequency = 'Annually';
  
  // Extract dates
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dates = text.match(datePattern) || [];
  
  return {
    frequency,
    lastMaintenance: dates[0] || null,
    nextMaintenance: dates[1] || null,
    maintenanceCompany: extractMaintenanceCompany(text),
    contractType: extractContractType(text)
  };
}

function extractMaintenanceCompany(text: string): string | null {
  const companyMatch = text.match(/maintenance company[:\s]+([^.\n]+)/i);
  return companyMatch ? companyMatch[1].trim() : null;
}

function extractContractType(text: string): string | null {
  if (text.includes('full maintenance') || text.includes('comprehensive')) return 'Full maintenance contract';
  if (text.includes('call out') || text.includes('breakdown')) return 'Call out contract';
  if (text.includes('inspection only') || text.includes('examination only')) return 'Inspection only contract';
  return null;
}

function extractComplianceRequirements(text: string): {
  hasInspection: boolean;
  hasCertificate: boolean;
  hasMaintenance: boolean;
  hasEmergencyProcedures: boolean;
  hasTraining: boolean;
} {
  return {
    hasInspection: text.includes('inspection') || text.includes('examination'),
    hasCertificate: text.includes('certificate') || text.includes('safety certificate'),
    hasMaintenance: text.includes('maintenance') || text.includes('service'),
    hasEmergencyProcedures: text.includes('emergency') || text.includes('procedure'),
    hasTraining: text.includes('training') || text.includes('competent person')
  };
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
  if (text.includes('unsatisfactory') || text.includes('dangerous')) factors.push('Unsatisfactory inspection result');
  if (text.includes('defect') || text.includes('fault')) factors.push('Defects identified');
  if (text.includes('safety') || text.includes('risk')) factors.push('Safety concerns identified');
  if (text.includes('expired') || text.includes('out of date')) factors.push('Certificate expired or out of date');
  if (text.includes('maintenance') || text.includes('overdue')) factors.push('Maintenance overdue');
  
  // Determine overall risk
  let overall: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
  if (factors.length >= 3) overall = 'high';
  else if (factors.length >= 1) overall = 'medium';
  else overall = 'low';
  
  // Suggest mitigation
  if (factors.includes('Unsatisfactory inspection result')) {
    mitigation.push('Immediate remedial action required');
    priorityActions.push('Address all identified defects');
  }
  if (factors.includes('Certificate expired or out of date')) {
    mitigation.push('Schedule immediate inspection');
    priorityActions.push('Book qualified inspector');
  }
  if (factors.includes('Maintenance overdue')) {
    mitigation.push('Schedule maintenance work');
    priorityActions.push('Contact maintenance contractor');
  }
  
  return { overall, factors, mitigation, priorityActions };
}

function extractKeyDates(text: string): {
  inspectionDate: string | null;
  certificateExpiry: string | null;
  nextInspection: string | null;
  nextMaintenance: string | null;
  trainingDue: string | null;
} {
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dates = text.match(datePattern) || [];
  
  return {
    inspectionDate: dates[0] || null,
    certificateExpiry: dates[1] || null,
    nextInspection: extractNextInspectionDate(text),
    nextMaintenance: dates[2] || null,
    trainingDue: extractTrainingDueDate(text)
  };
}

function extractTrainingDueDate(text: string): string | null {
  const trainingPatterns = [
    /training due[:\s]+([^.\n]+)/i,
    /competent person[:\s]+([^.\n]+)/i,
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
  if (text.includes('unsatisfactory') || text.includes('dangerous')) {
    immediate.push('Address safety issues immediately');
  }
  if (text.includes('expired') || text.includes('out of date')) {
    immediate.push('Schedule immediate inspection');
  }
  
  // Short term actions
  if (text.includes('defect') || text.includes('fault')) {
    shortTerm.push('Repair identified defects');
  }
  if (text.includes('maintenance') || text.includes('overdue')) {
    shortTerm.push('Schedule maintenance work');
  }
  if (text.includes('training') || text.includes('competent')) {
    shortTerm.push('Schedule staff training');
  }
  
  // Long term actions
  if (text.includes('upgrade') || text.includes('modernization')) {
    longTerm.push('Plan lift modernization');
  }
  if (text.includes('replacement') || text.includes('new lift')) {
    longTerm.push('Plan lift replacement');
  }
  
  return { immediate, shortTerm, longTerm, completed };
}

function extractRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  if (text.includes('defect') || text.includes('fault')) recommendations.push('Address all identified defects promptly');
  if (text.includes('maintenance') || text.includes('service')) recommendations.push('Maintain regular maintenance schedule');
  if (text.includes('inspection') || text.includes('examination')) recommendations.push('Ensure inspections are conducted on time');
  if (text.includes('training') || text.includes('competent')) recommendations.push('Provide regular staff training');
  if (text.includes('emergency') || text.includes('procedure')) recommendations.push('Review emergency procedures');
  if (text.includes('upgrade') || text.includes('modernization')) recommendations.push('Consider lift modernization');
  
  return recommendations.length > 0 ? recommendations : ['Follow standard lift maintenance procedures'];
}

function assessLegalCompliance(text: string): {
  liftRegulations: boolean;
  healthAndSafetyAtWorkAct: boolean;
  buildingSafetyAct: boolean;
  puwerRegulations: boolean;
} {
  return {
    liftRegulations: text.includes('lift regulations') || text.includes('safety regulations'),
    healthAndSafetyAtWorkAct: text.includes('health and safety') || text.includes('hswa'),
    buildingSafetyAct: text.includes('building safety') || text.includes('bsa'),
    puwerRegulations: text.includes('puwer') || text.includes('provision and use of work equipment')
  };
}

function extractInspectorDetails(text: string): {
  name: string | null;
  company: string | null;
  qualifications: string[];
  accreditation: string[];
  contactInfo: string | null;
} {
  return {
    name: null, // Would need more sophisticated extraction
    company: null,
    qualifications: extractInspectorQualifications(text),
    accreditation: extractInspectorAccreditation(text),
    contactInfo: null
  };
}

function extractInspectorQualifications(text: string): string[] {
  const qualifications: string[] = [];
  
  if (text.includes('engineer') || text.includes('inspector')) qualifications.push('Qualified lift engineer');
  if (text.includes('licensed') || text.includes('accredited')) qualifications.push('Licensed lift inspector');
  if (text.includes('competent') || text.includes('experienced')) qualifications.push('Competent person');
  if (text.includes('certified') || text.includes('certification')) qualifications.push('Certified professional');
  
  return qualifications.length > 0 ? qualifications : ['Qualifications not specified'];
}

function extractInspectorAccreditation(text: string): string[] {
  const accreditation: string[] = [];
  
  if (text.includes('ukas') || text.includes('accreditation')) accreditation.push('UKAS accredited');
  if (text.includes('iso') || text.includes('standard')) accreditation.push('ISO standard compliance');
  if (text.includes('professional body') || text.includes('institution')) accreditation.push('Professional body membership');
  if (text.includes('licence') || text.includes('permit')) accreditation.push('Licensed inspector');
  
  return accreditation.length > 0 ? accreditation : ['Accreditation not specified'];
}
