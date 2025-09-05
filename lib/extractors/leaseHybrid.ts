import { LeaseDocumentParser } from "@/lib/lease-document-parser";

type LeaseFields = {
  term_start?: string;
  term_end?: string;
  term_years?: number;
  ground_rent_terms?: string;
  service_charge_percent?: number;
  apportionment_basis?: string;
  repairs_split_summary?: string;
  alterations_rules?: string;
  subletting_rules?: string;
  insurance_obligations?: string;
  property_address?: string;
  lessor_name?: string;
  lessee_name?: string;
  title_number?: string;
};

export async function extractLeaseHybrid(text: string, fileName: string = "document.pdf") {
  // Use existing LeaseDocumentParser
  const parser = new LeaseDocumentParser(text, fileName);
  const existingData = parser.parse();
  
  // Extract additional fields with regex helpers
  const fields: LeaseFields = {
    // Use existing parser methods where available
    property_address: existingData.basicDetails?.property || extractPropertyAddress(text),
    lessor_name: existingData.basicDetails?.parties?.lessor || extractPartyName(text, 'lessor'),
    lessee_name: existingData.basicDetails?.parties?.lessee || extractPartyName(text, 'lessee'),
    title_number: existingData.basicDetails?.titleNumber || extractTitleNumber(text),
    
    // Extract lease terms
    term_start: extractTermStart(text),
    term_end: extractTermEnd(text),
    term_years: extractTermYears(text),
    
    // Financial terms
    ground_rent_terms: existingData.financialTerms?.groundRent || extractGroundRentTerms(text),
    service_charge_percent: extractServiceChargePercent(text),
    apportionment_basis: extractApportionmentBasis(text),
    
    // Lease clauses
    repairs_split_summary: extractRepairsSplit(text),
    alterations_rules: extractAlterationsRules(text),
    subletting_rules: extractSublettingRules(text),
    insurance_obligations: extractInsuranceObligations(text),
  };

  // Calculate confidence scores
  const confidence: Record<string, number> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      confidence[key] = typeof value === 'string' && value.length > 10 ? 0.85 : 0.7;
    } else {
      confidence[key] = 0.3;
    }
  }
  
  // Boost confidence for critical fields if they seem well-extracted
  if (fields.property_address && fields.property_address.includes('Close')) confidence.property_address = 0.9;
  if (fields.term_years && fields.term_years >= 99) confidence.term_years = 0.9;
  if (fields.lessor_name && fields.lessor_name.includes('Limited')) confidence.lessor_name = 0.9;

  return { 
    fields, 
    confidence, 
    source: "docai_hybrid" as const,
    existingParserData: existingData 
  };
}

// Helper extraction functions
function extractPropertyAddress(text: string): string {
  const patterns = [
    /\b\d+[^,\n]*(?:Close|Road|Street|Avenue|Lane|Drive|Way|Place|Court|Gardens?)[^,\n]*/gi,
    /Property[:\s]+([^\n]+)/i,
    /Premises[:\s]+([^\n]+)/i,
    /Address[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return "";
}

function extractPartyName(text: string, type: 'lessor' | 'lessee'): string {
  const patterns = [
    new RegExp(`${type}[^a-z]*([A-Z][^(\n,]+(?:Limited|Ltd|Company|Corp)?[^(\n,]*)`, 'i'),
    new RegExp(`${type}[^a-z]*([^(\n,]{10,50})`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]?.trim().length > 3) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  }
  return "";
}

function extractTitleNumber(text: string): string {
  const patterns = [
    /title\s+(?:number|no\.?)\s*:?\s*([A-Z]{2,3}\s*\d+)/i,
    /([A-Z]{2,3}\s*\d+)(?:\s|$)/,
    /title\s*([A-Z]{2,3}\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function extractTermStart(text: string): string {
  const patterns = [
    /(?:from|starting|commencing)[^0-9]*(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i,
    /term[^0-9]*(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i,
    /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function extractTermEnd(text: string): string {
  const startDate = extractTermStart(text);
  const years = extractTermYears(text);
  
  if (startDate && years) {
    const startYear = parseInt(startDate.match(/\d{4}/)?.[0] || "0");
    if (startYear > 1900) {
      return `${startYear + years}`;
    }
  }
  
  const patterns = [
    /(?:until|ending|expiring)[^0-9]*(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i,
    /expires?[^0-9]*(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function extractTermYears(text: string): number | undefined {
  const patterns = [
    /(\d+)\s+years?/i,
    /term\s+of\s+(\d+)/i,
    /for\s+a\s+term\s+of\s+(\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const years = parseInt(match[1]);
      if (years > 0 && years <= 999) return years;
    }
  }
  return undefined;
}

function extractGroundRentTerms(text: string): string {
  if (/peppercorn/i.test(text)) {
    return "One peppercorn per year (if demanded)";
  }
  
  const rentMatch = text.match(/ground\s+rent[^£]*£(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
  if (rentMatch) {
    return `£${rentMatch[1]} per annum`;
  }
  
  const rentPattern = /rent[^£]*£(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
  const match = text.match(rentPattern);
  if (match) {
    return `£${match[1]} per annum`;
  }
  
  return "";
}

function extractServiceChargePercent(text: string): number | undefined {
  const patterns = [
    /service\s+charge[^0-9]*(\d+\.?\d*)\s*%/i,
    /(\d+\.?\d*)\s*%[^a-z]*service/i,
    /apportionment[^0-9]*(\d+\.?\d*)\s*%/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const percent = parseFloat(match[1]);
      if (percent > 0 && percent <= 100) return percent;
    }
  }
  return undefined;
}

function extractApportionmentBasis(text: string): string {
  const patterns = [
    /apportionment[^a-z]+([^.]+)/i,
    /service\s+charge[^a-z]+basis[^a-z]+([^.]+)/i,
    /proportionate\s+share[^a-z]+([^.]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].length > 5) {
      return match[1].trim().substring(0, 200);
    }
  }
  return "";
}

function extractRepairsSplit(text: string): string {
  const sections = text.match(/repair[^.]*\.[^.]*\./gi);
  return sections ? sections.join(' ').substring(0, 300) : "";
}

function extractAlterationsRules(text: string): string {
  const sections = text.match(/alteration[^.]*\.[^.]*\./gi);
  return sections ? sections.join(' ').substring(0, 300) : "";
}

function extractSublettingRules(text: string): string {
  const sections = text.match(/(?:sublet|assign|transfer)[^.]*\.[^.]*\./gi);
  return sections ? sections.join(' ').substring(0, 300) : "";
}

function extractInsuranceObligations(text: string): string {
  const sections = text.match(/insurance[^.]*\.[^.]*\./gi);
  return sections ? sections.join(' ').substring(0, 300) : "";
}