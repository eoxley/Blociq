/**
 * Building Survey Analyzer for BlocIQ
 * Analyzes building survey reports for UK property management
 */

export interface BuildingSurveyAnalysis {
  documentType: 'building-survey';
  summary: string;
  surveyType: 'structural' | 'condition' | 'homebuyer' | 'full structural' | 'unknown';
  complianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  propertyDetails: {
    propertyType: string;
    address: string | null;
    constructionType: string | null;
    age: string | null;
    size: string | null;
    floors: string | null;
    condition: string | null;
  };
  structuralAssessment: {
    overall: 'good' | 'fair' | 'poor' | 'critical' | 'unknown';
    foundation: string;
    walls: string;
    roof: string;
    floors: string;
    windows: string;
    doors: string;
  };
  defects: {
    critical: string[];
    major: string[];
    minor: string[];
    recommendations: string[];
    estimatedCosts: string | null;
  };
  complianceIssues: {
    buildingRegulations: string[];
    planningPermissions: string[];
    healthAndSafety: string[];
    accessibility: string[];
    energyEfficiency: string[];
  };
  riskAssessment: {
    overall: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
    factors: string[];
    mitigation: string[];
    priorityActions: string[];
  };
  complianceRequirements: {
    hasSurvey: boolean;
    hasStructuralAssessment: boolean;
    hasDefectReport: boolean;
    hasCostEstimates: boolean;
    hasRecommendations: boolean;
  };
  keyDates: {
    surveyDate: string | null;
    nextInspection: string | null;
    remedialWorkDeadline: string | null;
    reviewDate: string | null;
  };
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    completed: string[];
  };
  recommendations: string[];
  legalCompliance: {
    buildingRegulations: boolean;
    planningPermissions: boolean;
    healthAndSafety: boolean;
    buildingSafetyAct: boolean;
    accessibilityRegulations: boolean;
  };
  surveyorDetails: {
    name: string | null;
    company: string | null;
    qualifications: string[];
    accreditation: string[];
    contactInfo: string | null;
  };
  methodology: {
    inspectionLevel: string;
    accessProvided: string;
    limitations: string[];
    assumptions: string[];
  };
}

/**
 * Analyze building survey document content
 */
export function analyzeBuildingSurvey(extractedText: string, filename: string): BuildingSurveyAnalysis {
  const text = extractedText.toLowerCase();
  
  return {
    documentType: 'building-survey',
    summary: generateBuildingSurveySummary(text, filename),
    surveyType: determineSurveyType(text),
    complianceStatus: determineComplianceStatus(text),
    propertyDetails: extractPropertyDetails(text),
    structuralAssessment: extractStructuralAssessment(text),
    defects: extractDefects(text),
    complianceIssues: extractComplianceIssues(text),
    riskAssessment: assessRisk(text),
    complianceRequirements: extractComplianceRequirements(text),
    keyDates: extractKeyDates(text),
    actionItems: categorizeActionItems(text),
    recommendations: extractRecommendations(text),
    legalCompliance: assessLegalCompliance(text),
    surveyorDetails: extractSurveyorDetails(text),
    methodology: extractMethodology(text)
  };
}

function generateBuildingSurveySummary(text: string, filename: string): string {
  const surveyType = determineSurveyType(text);
  const structuralAssessment = extractStructuralAssessment(text);
  const defects = extractDefects(text);
  const hasCriticalDefects = defects.critical.length > 0;
  const hasMajorDefects = defects.major.length > 0;
  
  let summary = `Building Survey for ${filename}`;
  
  if (surveyType !== 'unknown') {
    summary += ` - ${surveyType.charAt(0).toUpperCase() + surveyType.slice(1)} Survey`;
  }
  
  if (structuralAssessment.overall === 'critical') {
    summary += ' shows critical structural issues requiring immediate attention';
  } else if (structuralAssessment.overall === 'poor') {
    summary += ' identifies significant structural problems';
  } else if (structuralAssessment.overall === 'fair') {
    summary += ' shows some structural concerns';
  } else if (structuralAssessment.overall === 'good') {
    summary += ' shows good structural condition';
  }
  
  if (hasCriticalDefects) {
    summary += ` with ${defects.critical.length} critical defect(s)`;
  } else if (hasMajorDefects) {
    summary += ` with ${defects.major.length} major defect(s)`;
  }
  
  summary += '.';
  
  return summary;
}

function determineSurveyType(text: string): 'structural' | 'condition' | 'homebuyer' | 'full structural' | 'unknown' {
  if (text.includes('full structural') || text.includes('comprehensive structural')) {
    return 'full structural';
  } else if (text.includes('structural survey') || text.includes('structural assessment')) {
    return 'structural';
  } else if (text.includes('condition survey') || text.includes('condition report')) {
    return 'condition';
  } else if (text.includes('homebuyer') || text.includes('home buyer')) {
    return 'homebuyer';
  }
  return 'unknown';
}

function determineComplianceStatus(text: string): 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' {
  const hasSurvey = text.includes('survey') || text.includes('inspection');
  const hasStructuralAssessment = text.includes('structural') || text.includes('foundation') || text.includes('roof');
  const hasDefectReport = text.includes('defect') || text.includes('issue') || text.includes('problem');
  
  if (hasSurvey && hasStructuralAssessment && hasDefectReport) {
    return 'compliant';
  } else if (hasSurvey && (hasStructuralAssessment || hasDefectReport)) {
    return 'partially-compliant';
  } else if (!hasSurvey) {
    return 'non-compliant';
  }
  return 'unknown';
}

function extractPropertyDetails(text: string): {
  propertyType: string;
  address: string | null;
  constructionType: string | null;
  age: string | null;
  size: string | null;
  floors: string | null;
  condition: string | null;
} {
  // Determine property type
  let propertyType = 'Commercial property';
  if (text.includes('residential') || text.includes('house') || text.includes('flat')) propertyType = 'Residential property';
  if (text.includes('industrial') || text.includes('warehouse') || text.includes('factory')) propertyType = 'Industrial property';
  if (text.includes('retail') || text.includes('shop') || text.includes('store')) propertyType = 'Retail property';
  if (text.includes('office') || text.includes('commercial')) propertyType = 'Office property';
  
  return {
    propertyType,
    address: extractAddress(text),
    constructionType: extractConstructionType(text),
    age: extractAge(text),
    size: extractSize(text),
    floors: extractFloors(text),
    condition: extractCondition(text)
  };
}

function extractAddress(text: string): string | null {
  const addressMatch = text.match(/address[:\s]+([^.\n]+)/i);
  return addressMatch ? addressMatch[1].trim() : null;
}

function extractConstructionType(text: string): string | null {
  const constructionKeywords = [
    'brick', 'concrete', 'steel', 'timber', 'masonry', 'reinforced concrete',
    'steel frame', 'timber frame', 'traditional', 'modern', 'stone'
  ];
  
  for (const keyword of constructionKeywords) {
    if (text.includes(keyword)) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  
  return null;
}

function extractAge(text: string): string | null {
  const ageMatch = text.match(/(\d+)\s*(?:year|age|old)/i);
  return ageMatch ? `${ageMatch[1]} years old` : null;
}

function extractSize(text: string): string | null {
  const sizeMatch = text.match(/(\d+)\s*(?:sq\s*m|square\s*meter|sq\s*ft|square\s*foot)/i);
  return sizeMatch ? `${sizeMatch[1]} sq m` : null;
}

function extractFloors(text: string): string | null {
  const floorMatch = text.match(/(\d+)\s*(?:floor|storey|level)/i);
  return floorMatch ? `${floorMatch[1]} floors` : null;
}

function extractCondition(text: string): string | null {
  if (text.includes('good condition') || text.includes('well maintained')) return 'Good';
  if (text.includes('fair condition') || text.includes('reasonable condition')) return 'Fair';
  if (text.includes('poor condition') || text.includes('deteriorated')) return 'Poor';
  if (text.includes('critical condition') || text.includes('unsafe')) return 'Critical';
  return null;
}

function extractStructuralAssessment(text: string): {
  overall: 'good' | 'fair' | 'poor' | 'critical' | 'unknown';
  foundation: string;
  walls: string;
  roof: string;
  floors: string;
  windows: string;
  doors: string;
} {
  let overall: 'good' | 'fair' | 'poor' | 'critical' | 'unknown' = 'unknown';
  
  if (text.includes('good condition') || text.includes('sound')) overall = 'good';
  else if (text.includes('fair condition') || text.includes('reasonable')) overall = 'fair';
  else if (text.includes('poor condition') || text.includes('deteriorated')) overall = 'poor';
  else if (text.includes('critical') || text.includes('unsafe') || text.includes('dangerous')) overall = 'critical';
  
  return {
    overall,
    foundation: assessFoundation(text),
    walls: assessWalls(text),
    roof: assessRoof(text),
    floors: assessFloors(text),
    windows: assessWindows(text),
    doors: assessDoors(text)
  };
}

function assessFoundation(text: string): string {
  if (text.includes('foundation') && text.includes('good')) return 'Good';
  if (text.includes('foundation') && text.includes('settlement')) return 'Settlement issues';
  if (text.includes('foundation') && text.includes('crack')) return 'Cracking';
  if (text.includes('foundation') && text.includes('damp')) return 'Damp issues';
  return 'Not assessed';
}

function assessWalls(text: string): string {
  if (text.includes('wall') && text.includes('good')) return 'Good';
  if (text.includes('wall') && text.includes('crack')) return 'Cracking';
  if (text.includes('wall') && text.includes('damp')) return 'Damp issues';
  if (text.includes('wall') && text.includes('movement')) return 'Movement';
  return 'Not assessed';
}

function assessRoof(text: string): string {
  if (text.includes('roof') && text.includes('good')) return 'Good';
  if (text.includes('roof') && text.includes('leak')) return 'Leaking';
  if (text.includes('roof') && text.includes('deteriorated')) return 'Deteriorated';
  if (text.includes('roof') && text.includes('structural')) return 'Structural issues';
  return 'Not assessed';
}

function assessFloors(text: string): string {
  if (text.includes('floor') && text.includes('good')) return 'Good';
  if (text.includes('floor') && text.includes('sag')) return 'Sagging';
  if (text.includes('floor') && text.includes('movement')) return 'Movement';
  if (text.includes('floor') && text.includes('damp')) return 'Damp issues';
  return 'Not assessed';
}

function assessWindows(text: string): string {
  if (text.includes('window') && text.includes('good')) return 'Good';
  if (text.includes('window') && text.includes('deteriorated')) return 'Deteriorated';
  if (text.includes('window') && text.includes('seal')) return 'Seal failure';
  if (text.includes('window') && text.includes('frame')) return 'Frame issues';
  return 'Not assessed';
}

function assessDoors(text: string): string {
  if (text.includes('door') && text.includes('good')) return 'Good';
  if (text.includes('door') && text.includes('deteriorated')) return 'Deteriorated';
  if (text.includes('door') && text.includes('frame')) return 'Frame issues';
  if (text.includes('door') && text.includes('security')) return 'Security issues';
  return 'Not assessed';
}

function extractDefects(text: string): {
  critical: string[];
  major: string[];
  minor: string[];
  recommendations: string[];
  estimatedCosts: string | null;
} {
  const critical: string[] = [];
  const major: string[] = [];
  const minor: string[] = [];
  
  // Extract critical defects
  if (text.includes('critical') || text.includes('dangerous') || text.includes('unsafe')) {
    critical.push('Critical structural issues identified');
  }
  if (text.includes('foundation') && text.includes('settlement')) {
    critical.push('Foundation settlement issues');
  }
  if (text.includes('structural') && text.includes('movement')) {
    critical.push('Structural movement detected');
  }
  
  // Extract major defects
  if (text.includes('major') || text.includes('significant')) {
    major.push('Major defects requiring attention');
  }
  if (text.includes('roof') && text.includes('leak')) {
    major.push('Roof leaking issues');
  }
  if (text.includes('damp') && text.includes('penetrating')) {
    major.push('Penetrating damp problems');
  }
  
  // Extract minor defects
  if (text.includes('minor') || text.includes('cosmetic')) {
    minor.push('Minor cosmetic issues');
  }
  if (text.includes('decorative') || text.includes('finish')) {
    minor.push('Decorative finish issues');
  }
  
  // Extract estimated costs
  const costMatch = text.match(/£([\d,]+)/);
  const estimatedCosts = costMatch ? costMatch[1] : null;
  
  return {
    critical,
    major,
    minor,
    recommendations: extractRecommendations(text),
    estimatedCosts
  };
}

function extractComplianceIssues(text: string): {
  buildingRegulations: string[];
  planningPermissions: string[];
  healthAndSafety: string[];
  accessibility: string[];
  energyEfficiency: string[];
} {
  return {
    buildingRegulations: extractBuildingRegulations(text),
    planningPermissions: extractPlanningPermissions(text),
    healthAndSafety: extractHealthAndSafety(text),
    accessibility: extractAccessibility(text),
    energyEfficiency: extractEnergyEfficiency(text)
  };
}

function extractBuildingRegulations(text: string): string[] {
  const issues: string[] = [];
  
  if (text.includes('building regulations') || text.includes('building regs')) {
    issues.push('Building regulations compliance issues');
  }
  if (text.includes('fire safety') || text.includes('fire regulations')) {
    issues.push('Fire safety compliance issues');
  }
  if (text.includes('structural') && text.includes('regulations')) {
    issues.push('Structural regulations compliance issues');
  }
  
  return issues.length > 0 ? issues : ['No building regulations issues identified'];
}

function extractPlanningPermissions(text: string): string[] {
  const issues: string[] = [];
  
  if (text.includes('planning permission') || text.includes('planning consent')) {
    issues.push('Planning permission issues identified');
  }
  if (text.includes('unauthorized') || text.includes('illegal')) {
    issues.push('Unauthorized works identified');
  }
  
  return issues.length > 0 ? issues : ['No planning permission issues identified'];
}

function extractHealthAndSafety(text: string): string[] {
  const issues: string[] = [];
  
  if (text.includes('health and safety') || text.includes('h&s')) {
    issues.push('Health and safety concerns identified');
  }
  if (text.includes('asbestos') || text.includes('acm')) {
    issues.push('Asbestos-related safety issues');
  }
  if (text.includes('electrical') && text.includes('safety')) {
    issues.push('Electrical safety issues');
  }
  
  return issues.length > 0 ? issues : ['No health and safety issues identified'];
}

function extractAccessibility(text: string): string[] {
  const issues: string[] = [];
  
  if (text.includes('accessibility') || text.includes('disabled access')) {
    issues.push('Accessibility compliance issues');
  }
  if (text.includes('ramp') || text.includes('lift') || text.includes('stairs')) {
    issues.push('Accessibility feature issues');
  }
  
  return issues.length > 0 ? issues : ['No accessibility issues identified'];
}

function extractEnergyEfficiency(text: string): string[] {
  const issues: string[] = [];
  
  if (text.includes('energy efficiency') || text.includes('epc')) {
    issues.push('Energy efficiency compliance issues');
  }
  if (text.includes('insulation') || text.includes('heating')) {
    issues.push('Energy performance issues');
  }
  
  return issues.length > 0 ? issues : ['No energy efficiency issues identified'];
}

function assessRisk(text: string): {
  overall: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  factors: string[];
  mitigation: string[];
  priorityActions: string[];
} {
  const factors: string[] = [];
  const mitigation: string[] = [];
  const priorityActions: string[] = [];
  
  // Assess risk factors
  if (text.includes('critical') || text.includes('dangerous')) factors.push('Critical structural issues');
  if (text.includes('major') || text.includes('significant')) factors.push('Major defects identified');
  if (text.includes('foundation') && text.includes('settlement')) factors.push('Foundation settlement');
  if (text.includes('structural') && text.includes('movement')) factors.push('Structural movement');
  if (text.includes('roof') && text.includes('leak')) factors.push('Roof leaking');
  if (text.includes('damp') && text.includes('penetrating')) factors.push('Penetrating damp');
  
  // Determine overall risk
  let overall: 'low' | 'medium' | 'high' | 'critical' | 'unknown' = 'unknown';
  if (factors.some(f => f.includes('Critical'))) overall = 'critical';
  else if (factors.length >= 3) overall = 'high';
  else if (factors.length >= 1) overall = 'medium';
  else overall = 'low';
  
  // Suggest mitigation
  if (factors.includes('Critical structural issues')) {
    mitigation.push('Immediate structural assessment required');
    priorityActions.push('Engage structural engineer immediately');
  }
  if (factors.includes('Foundation settlement')) {
    mitigation.push('Foundation investigation required');
    priorityActions.push('Schedule foundation survey');
  }
  if (factors.includes('Roof leaking')) {
    mitigation.push('Roof repair required');
    priorityActions.push('Schedule roof repairs');
  }
  
  return { overall, factors, mitigation, priorityActions };
}

function extractComplianceRequirements(text: string): {
  hasSurvey: boolean;
  hasStructuralAssessment: boolean;
  hasDefectReport: boolean;
  hasCostEstimates: boolean;
  hasRecommendations: boolean;
} {
  return {
    hasSurvey: text.includes('survey') || text.includes('inspection'),
    hasStructuralAssessment: text.includes('structural') || text.includes('foundation'),
    hasDefectReport: text.includes('defect') || text.includes('issue'),
    hasCostEstimates: text.includes('cost') || text.includes('estimate') || text.includes('£'),
    hasRecommendations: text.includes('recommendation') || text.includes('action')
  };
}

function extractKeyDates(text: string): {
  surveyDate: string | null;
  nextInspection: string | null;
  remedialWorkDeadline: string | null;
  reviewDate: string | null;
} {
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dates = text.match(datePattern) || [];
  
  return {
    surveyDate: dates[0] || null,
    nextInspection: extractNextInspectionDate(text),
    remedialWorkDeadline: dates[1] || null,
    reviewDate: dates[2] || null
  };
}

function extractNextInspectionDate(text: string): string | null {
  const inspectionPatterns = [
    /next inspection[:\s]+([^.\n]+)/i,
    /re-inspection[:\s]+([^.\n]+)/i,
    /review date[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of inspectionPatterns) {
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
  if (text.includes('critical') || text.includes('dangerous')) {
    immediate.push('Address critical structural issues immediately');
  }
  if (text.includes('foundation') && text.includes('settlement')) {
    immediate.push('Investigate foundation issues');
  }
  
  // Short term actions
  if (text.includes('major') || text.includes('significant')) {
    shortTerm.push('Address major defects');
  }
  if (text.includes('roof') && text.includes('leak')) {
    shortTerm.push('Repair roof leaks');
  }
  if (text.includes('damp') && text.includes('penetrating')) {
    shortTerm.push('Address damp issues');
  }
  
  // Long term actions
  if (text.includes('maintenance') || text.includes('upkeep')) {
    longTerm.push('Implement maintenance schedule');
  }
  if (text.includes('improvement') || text.includes('upgrade')) {
    longTerm.push('Plan property improvements');
  }
  
  return { immediate, shortTerm, longTerm, completed };
}

function extractRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  if (text.includes('critical') || text.includes('dangerous')) {
    recommendations.push('Immediate structural assessment required');
  }
  if (text.includes('foundation') || text.includes('settlement')) {
    recommendations.push('Foundation investigation recommended');
  }
  if (text.includes('roof') || text.includes('leak')) {
    recommendations.push('Roof inspection and repair recommended');
  }
  if (text.includes('damp') || text.includes('moisture')) {
    recommendations.push('Damp survey and treatment recommended');
  }
  if (text.includes('maintenance') || text.includes('upkeep')) {
    recommendations.push('Regular maintenance schedule recommended');
  }
  if (text.includes('professional') || text.includes('specialist')) {
    recommendations.push('Engage specialist contractors for complex works');
  }
  
  return recommendations.length > 0 ? recommendations : ['Follow standard building maintenance procedures'];
}

function assessLegalCompliance(text: string): {
  buildingRegulations: boolean;
  planningPermissions: boolean;
  healthAndSafety: boolean;
  buildingSafetyAct: boolean;
  accessibilityRegulations: boolean;
} {
  return {
    buildingRegulations: text.includes('building regulations') || text.includes('building regs'),
    planningPermissions: text.includes('planning permission') || text.includes('planning consent'),
    healthAndSafety: text.includes('health and safety') || text.includes('h&s'),
    buildingSafetyAct: text.includes('building safety') || text.includes('bsa'),
    accessibilityRegulations: text.includes('accessibility') || text.includes('disabled access')
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
  
  if (text.includes('surveyor') || text.includes('inspector')) qualifications.push('Qualified building surveyor');
  if (text.includes('structural engineer') || text.includes('engineer')) qualifications.push('Structural engineer');
  if (text.includes('rics') || text.includes('royal institution')) qualifications.push('RICS qualified');
  if (text.includes('licensed') || text.includes('accredited')) qualifications.push('Licensed professional');
  
  return qualifications.length > 0 ? qualifications : ['Qualifications not specified'];
}

function extractSurveyorAccreditation(text: string): string[] {
  const accreditation: string[] = [];
  
  if (text.includes('rics') || text.includes('royal institution')) accreditation.push('RICS member');
  if (text.includes('ukas') || text.includes('accreditation')) accreditation.push('UKAS accredited');
  if (text.includes('iso') || text.includes('standard')) accreditation.push('ISO standard compliance');
  if (text.includes('professional body') || text.includes('institution')) accreditation.push('Professional body membership');
  
  return accreditation.length > 0 ? accreditation : ['Accreditation not specified'];
}

function extractMethodology(text: string): {
  inspectionLevel: string;
  accessProvided: string;
  limitations: string[];
  assumptions: string[];
} {
  // Determine inspection level
  let inspectionLevel = 'Not specified';
  if (text.includes('full access') || text.includes('comprehensive')) inspectionLevel = 'Full access inspection';
  if (text.includes('limited access') || text.includes('restricted')) inspectionLevel = 'Limited access inspection';
  if (text.includes('visual only') || text.includes('non-intrusive')) inspectionLevel = 'Visual inspection only';
  
  return {
    inspectionLevel,
    accessProvided: extractAccessProvided(text),
    limitations: extractLimitations(text),
    assumptions: extractAssumptions(text)
  };
}

function extractAccessProvided(text: string): string {
  if (text.includes('full access') || text.includes('unrestricted')) return 'Full access provided';
  if (text.includes('limited access') || text.includes('restricted')) return 'Limited access provided';
  if (text.includes('no access') || text.includes('inaccessible')) return 'No access to certain areas';
  return 'Access level not specified';
}

function extractLimitations(text: string): string[] {
  const limitations: string[] = [];
  
  if (text.includes('limitation') || text.includes('restriction')) limitations.push('Standard survey limitations apply');
  if (text.includes('access') || text.includes('inaccessible')) limitations.push('Limited access to certain areas');
  if (text.includes('furniture') || text.includes('fittings')) limitations.push('Furniture and fittings not moved');
  if (text.includes('weather') || text.includes('conditions')) limitations.push('Weather conditions may affect inspection');
  
  return limitations.length > 0 ? limitations : ['Standard limitations apply'];
}

function extractAssumptions(text: string): string[] {
  const assumptions: string[] = [];
  
  if (text.includes('assumption') || text.includes('assume')) assumptions.push('Standard survey assumptions apply');
  if (text.includes('planning') || text.includes('permission')) assumptions.push('Planning permissions in place');
  if (text.includes('building regulations') || text.includes('compliance')) assumptions.push('Building regulations compliance assumed');
  if (text.includes('services') || text.includes('utilities')) assumptions.push('Services and utilities functioning normally');
  
  return assumptions.length > 0 ? assumptions : ['Standard assumptions apply'];
}
