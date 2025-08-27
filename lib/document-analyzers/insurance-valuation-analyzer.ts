/**
 * Insurance Valuation Analyzer for BlocIQ
 * Analyzes insurance valuation reports for UK property management
 */

export interface InsuranceValuationAnalysis {
  documentType: 'insurance-valuation';
  summary: string;
  valuationType: 'rebuild' | 'market' | 'reinstatement' | 'unknown';
  complianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  propertyDetails: {
    propertyType: string;
    address: string | null;
    constructionType: string | null;
    age: string | null;
    size: string | null;
    floors: string | null;
    units: string | null;
  };
  valuationFigures: {
    rebuildCost: string | null;
    marketValue: string | null;
    sumInsured: string | null;
    previousValuation: string | null;
    percentageChange: string | null;
    currency: string;
  };
  insuranceRequirements: {
    buildingInsurance: boolean;
    contentsInsurance: boolean;
    publicLiability: boolean;
    employersLiability: boolean;
    professionalIndemnity: boolean;
    terrorismCover: boolean;
  };
  riskAssessment: {
    overall: 'low' | 'medium' | 'high' | 'unknown';
    factors: string[];
    mitigation: string[];
    recommendations: string[];
  };
  complianceRequirements: {
    hasValuation: boolean;
    hasRebuildCost: boolean;
    hasProfessionalValuer: boolean;
    hasRegularReview: boolean;
    hasDocumentation: boolean;
  };
  keyDates: {
    valuationDate: string | null;
    reviewDate: string | null;
    insuranceRenewal: string | null;
    nextValuation: string | null;
  };
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    completed: string[];
  };
  recommendations: string[];
  legalCompliance: {
    buildingSafetyAct: boolean;
    insuranceAct: boolean;
    valuationStandards: boolean;
    professionalStandards: boolean;
  };
  valuerDetails: {
    name: string | null;
    company: string | null;
    qualifications: string[];
    accreditation: string[];
    contactInfo: string | null;
  };
  methodology: {
    approach: string;
    assumptions: string[];
    limitations: string[];
    dataSources: string[];
  };
}

/**
 * Analyze insurance valuation document content
 */
export function analyzeInsuranceValuation(extractedText: string, filename: string): InsuranceValuationAnalysis {
  const text = extractedText.toLowerCase();
  
  return {
    documentType: 'insurance-valuation',
    summary: generateInsuranceValuationSummary(text, filename),
    valuationType: determineValuationType(text),
    complianceStatus: determineComplianceStatus(text),
    propertyDetails: extractPropertyDetails(text),
    valuationFigures: extractValuationFigures(text),
    insuranceRequirements: extractInsuranceRequirements(text),
    riskAssessment: assessRisk(text),
    complianceRequirements: extractComplianceRequirements(text),
    keyDates: extractKeyDates(text),
    actionItems: categorizeActionItems(text),
    recommendations: extractRecommendations(text),
    legalCompliance: assessLegalCompliance(text),
    valuerDetails: extractValuerDetails(text),
    methodology: extractMethodology(text)
  };
}

function generateInsuranceValuationSummary(text: string, filename: string): string {
  const valuationType = determineValuationType(text);
  const figures = extractValuationFigures(text);
  const hasRebuildCost = figures.rebuildCost !== null;
  const hasMarketValue = figures.marketValue !== null;
  
  let summary = `Insurance Valuation for ${filename}`;
  
  if (valuationType !== 'unknown') {
    summary += ` - ${valuationType.charAt(0).toUpperCase() + valuationType.slice(1)} Valuation`;
  }
  
  if (hasRebuildCost && hasMarketValue) {
    summary += ` with rebuild cost of ${figures.rebuildCost} and market value of ${figures.marketValue}`;
  } else if (hasRebuildCost) {
    summary += ` with rebuild cost of ${figures.rebuildCost}`;
  } else if (hasMarketValue) {
    summary += ` with market value of ${figures.marketValue}`;
  }
  
  summary += '.';
  
  return summary;
}

function determineValuationType(text: string): 'rebuild' | 'market' | 'reinstatement' | 'unknown' {
  if (text.includes('rebuild cost') || text.includes('rebuild value')) {
    return 'rebuild';
  } else if (text.includes('market value') || text.includes('market valuation')) {
    return 'market';
  } else if (text.includes('reinstatement') || text.includes('reinstatement cost')) {
    return 'reinstatement';
  }
  return 'unknown';
}

function determineComplianceStatus(text: string): 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' {
  const hasValuation = text.includes('valuation') || text.includes('assessment');
  const hasRebuildCost = text.includes('rebuild cost') || text.includes('sum insured');
  const hasProfessionalValuer = text.includes('surveyor') || text.includes('valuer') || text.includes('professional');
  
  if (hasValuation && hasRebuildCost && hasProfessionalValuer) {
    return 'compliant';
  } else if (hasValuation && (hasRebuildCost || hasProfessionalValuer)) {
    return 'partially-compliant';
  } else if (!hasValuation) {
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
  units: string | null;
} {
  // Determine property type
  let propertyType = 'Commercial property';
  if (text.includes('residential') || text.includes('flat') || text.includes('apartment')) propertyType = 'Residential property';
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
    units: extractUnits(text)
  };
}

function extractAddress(text: string): string | null {
  const addressMatch = text.match(/address[:\s]+([^.\n]+)/i);
  return addressMatch ? addressMatch[1].trim() : null;
}

function extractConstructionType(text: string): string | null {
  const constructionKeywords = [
    'brick', 'concrete', 'steel', 'timber', 'masonry', 'reinforced concrete',
    'steel frame', 'timber frame', 'traditional', 'modern'
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

function extractUnits(text: string): string | null {
  const unitMatch = text.match(/(\d+)\s*(?:unit|flat|apartment|office)/i);
  return unitMatch ? `${unitMatch[1]} units` : null;
}

function extractValuationFigures(text: string): {
  rebuildCost: string | null;
  marketValue: string | null;
  sumInsured: string | null;
  previousValuation: string | null;
  percentageChange: string | null;
  currency: string;
} {
  // Extract currency
  let currency = 'GBP';
  if (text.includes('£') || text.includes('pound')) currency = 'GBP';
  if (text.includes('€') || text.includes('euro')) currency = 'EUR';
  if (text.includes('$') || text.includes('dollar')) currency = 'USD';
  
  // Extract monetary values
  const monetaryPattern = /(?:£|€|\$)?([\d,]+(?:\.\d{2})?)\s*(?:k|m|b|thousand|million|billion)?/gi;
  const monetaryMatches = text.match(monetaryPattern) || [];
  
  let rebuildCost: string | null = null;
  let marketValue: string | null = null;
  let sumInsured: string | null = null;
  const previousValuation: string | null = null;
  
  // Try to identify specific values
  if (text.includes('rebuild cost') || text.includes('rebuild value')) {
    const rebuildMatch = text.match(/rebuild[^£€$]*[£€$]?([\d,]+(?:\.\d{2})?)/i);
    if (rebuildMatch) rebuildCost = rebuildMatch[1];
  }
  
  if (text.includes('market value') || text.includes('market valuation')) {
    const marketMatch = text.match(/market[^£€$]*[£€$]?([\d,]+(?:\.\d{2})?)/i);
    if (marketMatch) marketValue = marketMatch[1];
  }
  
  if (text.includes('sum insured') || text.includes('insurance value')) {
    const sumMatch = text.match(/sum insured[^£€$]*[£€$]?([\d,]+(?:\.\d{2})?)/i);
    if (sumMatch) sumInsured = sumMatch[1];
  }
  
  // Extract percentage change
  const percentageMatch = text.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  const percentageChange = percentageMatch ? percentageMatch[1] : null;
  
  return {
    rebuildCost,
    marketValue,
    sumInsured,
    previousValuation,
    percentageChange,
    currency
  };
}

function extractInsuranceRequirements(text: string): {
  buildingInsurance: boolean;
  contentsInsurance: boolean;
  publicLiability: boolean;
  employersLiability: boolean;
  professionalIndemnity: boolean;
  terrorismCover: boolean;
} {
  return {
    buildingInsurance: text.includes('building insurance') || text.includes('property insurance'),
    contentsInsurance: text.includes('contents insurance') || text.includes('furniture insurance'),
    publicLiability: text.includes('public liability') || text.includes('third party liability'),
    employersLiability: text.includes('employers liability') || text.includes('el insurance'),
    professionalIndemnity: text.includes('professional indemnity') || text.includes('pi insurance'),
    terrorismCover: text.includes('terrorism') || text.includes('terrorism cover')
  };
}

function assessRisk(text: string): {
  overall: 'low' | 'medium' | 'high' | 'unknown';
  factors: string[];
  mitigation: string[];
  recommendations: string[];
} {
  const factors: string[] = [];
  const mitigation: string[] = [];
  const recommendations: string[] = [];
  
  // Assess risk factors
  if (text.includes('underinsured') || text.includes('insufficient cover')) factors.push('Underinsured property');
  if (text.includes('overvalued') || text.includes('excessive value')) factors.push('Overvalued property');
  if (text.includes('outdated') || text.includes('old valuation')) factors.push('Outdated valuation');
  if (text.includes('construction risk') || text.includes('building risk')) factors.push('Construction-related risks');
  if (text.includes('location risk') || text.includes('area risk')) factors.push('Location-related risks');
  
  // Determine overall risk
  let overall: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
  if (factors.length >= 3) overall = 'high';
  else if (factors.length >= 1) overall = 'medium';
  else overall = 'low';
  
  // Suggest mitigation
  if (factors.includes('Underinsured property')) {
    mitigation.push('Increase sum insured to adequate level');
    recommendations.push('Review insurance coverage annually');
  }
  if (factors.includes('Outdated valuation')) {
    mitigation.push('Obtain updated professional valuation');
    recommendations.push('Schedule regular valuation reviews');
  }
  if (factors.includes('Construction-related risks')) {
    mitigation.push('Implement risk management measures');
    recommendations.push('Consider specialist insurance products');
  }
  
  return { overall, factors, mitigation, recommendations };
}

function extractComplianceRequirements(text: string): {
  hasValuation: boolean;
  hasRebuildCost: boolean;
  hasProfessionalValuer: boolean;
  hasRegularReview: boolean;
  hasDocumentation: boolean;
} {
  return {
    hasValuation: text.includes('valuation') || text.includes('assessment'),
    hasRebuildCost: text.includes('rebuild cost') || text.includes('sum insured'),
    hasProfessionalValuer: text.includes('surveyor') || text.includes('valuer') || text.includes('professional'),
    hasRegularReview: text.includes('review') || text.includes('update') || text.includes('annual'),
    hasDocumentation: text.includes('documentation') || text.includes('report') || text.includes('certificate')
  };
}

function extractKeyDates(text: string): {
  valuationDate: string | null;
  reviewDate: string | null;
  insuranceRenewal: string | null;
  nextValuation: string | null;
} {
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
  const dates = text.match(datePattern) || [];
  
  return {
    valuationDate: dates[0] || null,
    reviewDate: dates[1] || null,
    insuranceRenewal: extractInsuranceRenewalDate(text),
    nextValuation: extractNextValuationDate(text)
  };
}

function extractInsuranceRenewalDate(text: string): string | null {
  const renewalPatterns = [
    /renewal[:\s]+([^.\n]+)/i,
    /insurance renewal[:\s]+([^.\n]+)/i,
    /policy renewal[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of renewalPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return null;
}

function extractNextValuationDate(text: string): string | null {
  const valuationPatterns = [
    /next valuation[:\s]+([^.\n]+)/i,
    /review date[:\s]+([^.\n]+)/i,
    /revaluation[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of valuationPatterns) {
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
  if (text.includes('underinsured') || text.includes('insufficient')) {
    immediate.push('Review insurance coverage adequacy');
  }
  if (text.includes('outdated') || text.includes('old')) {
    immediate.push('Schedule updated valuation');
  }
  
  // Short term actions
  if (text.includes('review') || text.includes('update')) {
    shortTerm.push('Review valuation methodology');
  }
  if (text.includes('documentation') || text.includes('report')) {
    shortTerm.push('Update valuation documentation');
  }
  if (text.includes('insurance') || text.includes('coverage')) {
    shortTerm.push('Review insurance policy terms');
  }
  
  // Long term actions
  if (text.includes('regular') || text.includes('annual')) {
    longTerm.push('Establish regular valuation schedule');
  }
  if (text.includes('risk management') || text.includes('mitigation')) {
    longTerm.push('Implement risk management strategy');
  }
  
  return { immediate, shortTerm, longTerm, completed };
}

function extractRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  if (text.includes('underinsured') || text.includes('insufficient')) {
    recommendations.push('Increase sum insured to adequate level');
  }
  if (text.includes('outdated') || text.includes('old')) {
    recommendations.push('Obtain updated professional valuation');
  }
  if (text.includes('review') || text.includes('update')) {
    recommendations.push('Review valuation annually');
  }
  if (text.includes('documentation') || text.includes('report')) {
    recommendations.push('Maintain comprehensive documentation');
  }
  if (text.includes('professional') || text.includes('surveyor')) {
    recommendations.push('Use qualified professional valuers');
  }
  if (text.includes('risk') || text.includes('mitigation')) {
    recommendations.push('Implement risk mitigation measures');
  }
  
  return recommendations.length > 0 ? recommendations : ['Follow standard insurance valuation procedures'];
}

function assessLegalCompliance(text: string): {
  buildingSafetyAct: boolean;
  insuranceAct: boolean;
  valuationStandards: boolean;
  professionalStandards: boolean;
} {
  return {
    buildingSafetyAct: text.includes('building safety') || text.includes('bsa'),
    insuranceAct: text.includes('insurance act') || text.includes('insurance regulation'),
    valuationStandards: text.includes('rics') || text.includes('valuation standard'),
    professionalStandards: text.includes('professional standard') || text.includes('code of practice')
  };
}

function extractValuerDetails(text: string): {
  name: string | null;
  company: string | null;
  qualifications: string[];
  accreditation: string[];
  contactInfo: string | null;
} {
  return {
    name: null, // Would need more sophisticated extraction
    company: null,
    qualifications: extractValuerQualifications(text),
    accreditation: extractValuerAccreditation(text),
    contactInfo: null
  };
}

function extractValuerQualifications(text: string): string[] {
  const qualifications: string[] = [];
  
  if (text.includes('surveyor') || text.includes('valuer')) qualifications.push('Qualified surveyor/valuer');
  if (text.includes('rics') || text.includes('royal institution')) qualifications.push('RICS qualified');
  if (text.includes('licensed') || text.includes('accredited')) qualifications.push('Licensed professional');
  if (text.includes('certified') || text.includes('certification')) qualifications.push('Certified professional');
  
  return qualifications.length > 0 ? qualifications : ['Qualifications not specified'];
}

function extractValuerAccreditation(text: string): string[] {
  const accreditation: string[] = [];
  
  if (text.includes('rics') || text.includes('royal institution')) accreditation.push('RICS member');
  if (text.includes('ukas') || text.includes('accreditation')) accreditation.push('UKAS accredited');
  if (text.includes('iso') || text.includes('standard')) accreditation.push('ISO standard compliance');
  if (text.includes('professional body') || text.includes('institution')) accreditation.push('Professional body membership');
  
  return accreditation.length > 0 ? accreditation : ['Accreditation not specified'];
}

function extractMethodology(text: string): {
  approach: string;
  assumptions: string[];
  limitations: string[];
  dataSources: string[];
} {
  // Determine approach
  let approach = 'Not specified';
  if (text.includes('comparative') || text.includes('market comparison')) approach = 'Comparative approach';
  if (text.includes('cost') || text.includes('replacement cost')) approach = 'Cost approach';
  if (text.includes('income') || text.includes('investment method')) approach = 'Income approach';
  if (text.includes('residual') || text.includes('development method')) approach = 'Residual approach';
  
  return {
    approach,
    assumptions: extractAssumptions(text),
    limitations: extractLimitations(text),
    dataSources: extractDataSources(text)
  };
}

function extractAssumptions(text: string): string[] {
  const assumptions: string[] = [];
  
  if (text.includes('assumption') || text.includes('assume')) assumptions.push('Standard valuation assumptions apply');
  if (text.includes('market condition') || text.includes('economic')) assumptions.push('Market conditions as at valuation date');
  if (text.includes('planning') || text.includes('permission')) assumptions.push('Planning permissions in place');
  if (text.includes('occupancy') || text.includes('tenancy')) assumptions.push('Current occupancy status');
  
  return assumptions.length > 0 ? assumptions : ['Standard assumptions apply'];
}

function extractLimitations(text: string): string[] {
  const limitations: string[] = [];
  
  if (text.includes('limitation') || text.includes('restriction')) limitations.push('Standard valuation limitations apply');
  if (text.includes('access') || text.includes('inspection')) limitations.push('Limited access during inspection');
  if (text.includes('documentation') || text.includes('information')) limitations.push('Limited documentation available');
  if (text.includes('market') || text.includes('data')) limitations.push('Limited market data available');
  
  return limitations.length > 0 ? limitations : ['Standard limitations apply'];
}

function extractDataSources(text: string): string[] {
  const sources: string[] = [];
  
  if (text.includes('market data') || text.includes('comparable')) sources.push('Market data and comparable sales');
  if (text.includes('building cost') || text.includes('construction')) sources.push('Building cost data');
  if (text.includes('planning') || text.includes('local authority')) sources.push('Planning and local authority data');
  if (text.includes('survey') || text.includes('inspection')) sources.push('Site survey and inspection');
  
  return sources.length > 0 ? sources : ['Standard data sources used'];
}
