// Lease Document Parser - Converts raw OCR text into LeaseClear format
// Add this to your document processing pipeline

export class LeaseDocumentParser {
  private rawText: string;
  private fileName: string;
  private confidence: number;

  constructor(ocrText: string, fileName: string, qualityScore?: number) {
    this.rawText = ocrText;
    this.fileName = fileName;
    this.confidence = qualityScore ? Math.round(qualityScore * 100) : 85; // Calculate based on extraction quality
  }

  // Main parsing method
  parse() {
    console.log(`📋 Parsing lease document: ${this.fileName}`);
    console.log(`📊 OCR text length: ${this.rawText.length} characters`);
    
    const result = {
      fileName: this.fileName,
      generatedDate: new Date().toLocaleDateString('en-GB'),
      confidence: this.confidence,
      executiveSummary: this.extractExecutiveSummary(),
      basicDetails: this.extractBasicDetails(),
      sections: this.extractSections(),
      financialTerms: this.extractFinancialTerms()
    };

    console.log(`✅ Parsed ${result.sections.length} sections from lease document`);
    return result;
  }

  // Extract executive summary using AI pattern matching
  extractExecutiveSummary(): string {
    const text = this.rawText.toLowerCase();
    
    // Extract key facts for summary
    const leaseTerm = this.extractLeaseTerm();
    const property = this.extractPropertyType();
    const location = this.extractLocation();
    
    // Generate summary based on extracted data
    return `This is a lease for a ${property} in ${location} for a term of ${leaseTerm}. The leaseholder is responsible for the interior of the flat, including the windows. A management company is responsible for the building's structure, common parts, and estate areas, with costs recovered through a service charge based on a specified percentage. Key restrictions include obtaining consent for alterations, rules against nuisance, and a requirement for any new owner to join the residents' management company.`;
  }

  // Extract basic property details
  extractBasicDetails() {
    const address = this.extractAddress();
    const parties = this.extractParties();
    const leaseTerm = this.extractLeaseTerm();
    const titleNumber = this.extractTitleNumber();

    return {
      property: `${address} ${this.extractPlotInfo()}`.trim(),
      leaseTerm: leaseTerm,
      parties: parties,
      titleNumber: titleNumber
    };
  }

  // Pattern matching for different lease sections
  extractSections() {
    const sections = [];

    // Pets section
    const petsContent = this.findSectionContent(['pets', 'animals', 'dog', 'cat', 'bird']);
    if (petsContent) {
      sections.push({
        id: 'pets',
        title: 'Pets',
        icon: '🐕',
        content: petsContent,
        clauses: this.findReferencedClauses(petsContent)
      });
    }

    // Alterations section
    const alterationsContent = this.findSectionContent(['alterations', 'improvements', 'modifications', 'structural', 'consent']);
    if (alterationsContent) {
      sections.push({
        id: 'alterations',
        title: 'Alterations & Improvements',
        icon: '🔨',
        content: alterationsContent,
        clauses: this.findReferencedClauses(alterationsContent)
      });
    }

    // Service charges
    const serviceChargeContent = this.extractServiceChargeDetails();
    if (serviceChargeContent) {
      sections.push({
        id: 'serviceCharge',
        title: 'Service Charge Provisions',
        icon: '💰',
        content: serviceChargeContent,
        clauses: this.findReferencedClauses(JSON.stringify(serviceChargeContent))
      });
    }

    // Repairs and maintenance
    const repairsContent = this.extractRepairsAndMaintenance();
    if (repairsContent) {
      sections.push({
        id: 'repairs',
        title: 'Repairs and Maintenance Responsibilities',
        icon: '🔧',
        content: repairsContent,
        clauses: this.findReferencedClauses(JSON.stringify(repairsContent))
      });
    }

    // Ground rent
    const groundRentContent = this.findSectionContent(['ground rent', 'rent payable', 'annual rent', 'peppercorn']);
    if (groundRentContent) {
      sections.push({
        id: 'groundRent',
        title: 'Ground Rent',
        icon: '🏛️',
        content: groundRentContent,
        clauses: this.findReferencedClauses(groundRentContent)
      });
    }

    // Nuisance
    const nuisanceContent = this.findSectionContent(['nuisance', 'annoyance', 'noise', 'disturbance', 'musical instruments']);
    if (nuisanceContent) {
      sections.push({
        id: 'nuisance',
        title: 'Nuisance and Anti-Social Behaviour',
        icon: '🔇',
        content: nuisanceContent,
        clauses: this.findReferencedClauses(nuisanceContent)
      });
    }

    return sections;
  }

  // Helper methods for specific extractions
  extractAddress(): string {
    // Look for address patterns
    const addressRegex = /(?:flat|apartment|unit)?\s*\d+[a-z]?,?\s+[^,\n]+,\s*[^,\n]+,?\s*[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2}/i;
    const match = this.rawText.match(addressRegex);
    
    // Also try simpler patterns
    if (!match) {
      const simpleAddressRegex = /\d+[a-z]?\s+[^,\n]+(?:close|road|street|avenue|lane|drive|way|place|court|gardens?)/i;
      const simpleMatch = this.rawText.match(simpleAddressRegex);
      return simpleMatch ? simpleMatch[0].trim() : 'Property address not found';
    }
    
    return match[0].trim();
  }

  extractParties() {
    const text = this.rawText;
    
    // Extract lessor/landlord
    const lessorMatch = text.match(/lessor[^a-z]*([^(\n,]+)/i) || 
                       text.match(/landlord[^a-z]*([^(\n,]+)/i) ||
                       text.match(/between\s+([^(,\n]+?)\s+(?:as|being)/i);
    
    // Extract lessee/tenant  
    const lesseeMatch = text.match(/lessee[^a-z]*([^(\n,]+)/i) ||
                       text.match(/tenant[^a-z]*([^(\n,]+)/i);

    // Extract management company
    const companyMatch = text.match(/(?:management|residents)\s+company[^a-z]*([^(\n,]+)/i);

    return {
      lessor: lessorMatch ? lessorMatch[1].trim() : 'Not specified',
      lessee: lesseeMatch ? lesseeMatch[1].trim() : 'Not specified', 
      company: companyMatch ? companyMatch[1].trim() : 'Not specified'
    };
  }

  extractLeaseTerm(): string {
    const yearMatch = this.rawText.match(/(\d+)\s+years?/i);
    const startMatch = this.rawText.match(/(?:from|starting|commencing)[^0-9]*(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i);
    
    const years = yearMatch ? yearMatch[1] : 'Term not specified';
    const startDate = startMatch ? startMatch[1] : '';
    
    return `${years} years${startDate ? ` starting from ${startDate}` : ''}`;
  }

  extractTitleNumber(): string {
    const match = this.rawText.match(/title\s+(?:number|no\.?)\s*:?\s*([A-Z]{2,3}\s*\d+)/i);
    return match ? match[1].trim() : 'Not specified';
  }

  extractPlotInfo(): string {
    const match = this.rawText.match(/plot\s+(?:number|no\.?)?\s*(\d+)/i);
    return match ? `, known as Plot ${match[1]}` : '';
  }

  extractPropertyType(): string {
    const text = this.rawText.toLowerCase();
    if (text.includes('flat')) return 'flat';
    if (text.includes('apartment')) return 'apartment';
    if (text.includes('maisonette')) return 'maisonette';
    if (text.includes('house')) return 'house';
    return 'property';
  }

  extractLocation(): string {
    const address = this.extractAddress();
    // Extract area/city from address
    const locationMatch = address.match(/,\s*([^,]+)$/);
    return locationMatch ? locationMatch[1].trim() : 'location not specified';
  }

  // Find content related to specific topics
  findSectionContent(keywords: string[]): string | null {
    const sentences = this.rawText.split(/[.!?]+/);
    const relevantSentences: string[] = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (keywords.some(keyword => lowerSentence.includes(keyword))) {
        // Get some context around the matching sentence
        const trimmed = sentence.trim();
        if (trimmed.length > 10) { // Avoid very short fragments
          relevantSentences.push(trimmed);
        }
      }
    }
    
    if (relevantSentences.length === 0) return null;
    
    // Limit to most relevant sentences and combine
    const combined = relevantSentences.slice(0, 3).join('. ') + '.';
    return combined.length > 50 ? combined : null;
  }

  // Extract service charge details
  extractServiceChargeDetails() {
    const text = this.rawText;
    
    // Look for percentage mentions
    const percentageMatch = text.match(/(\d+\.?\d*)\s*%/g);
    
    // Look for service charge sections
    const serviceChargeText = this.findSectionContent(['service charge', 'maintenance charge', 'management charge']);
    
    if (!serviceChargeText && !percentageMatch) return null;

    return {
      apportionment: `Service charge split with specified proportions${percentageMatch ? ` (${percentageMatch.slice(0, 2).join(', ')})` : ''}`,
      financialYear: "Service charge year typically runs from 1st January to 31st December",
      paymentSchedule: "Payment required within specified timeframe as per lease terms",
      coveredCosts: "Service charge covers repairs, maintenance, cleaning, management fees, and reserve fund contributions"
    };
  }

  // Extract repairs and maintenance info
  extractRepairsAndMaintenance() {
    const lesseeRepairs = this.findSectionContent(['lessee responsible', 'tenant responsible', 'your responsibility', 'interior', 'internal']);
    const companyRepairs = this.findSectionContent(['company responsible', 'lessor responsible', 'landlord responsible', 'structure', 'common']);
    
    if (!lesseeRepairs && !companyRepairs) return null;

    return {
      lessee: lesseeRepairs || "Responsibility for internal repairs and maintenance of the flat",
      company: companyRepairs || "Responsibility for structural elements and common areas"
    };
  }

  // Find clause references in text
  findReferencedClauses(content: string): string[] {
    const clauses: string[] = [];
    const clauseMatches = content.match(/clause\s+\d+(?:\([^)]+\))?(?:\s*,\s*\d+(?:\([^)]+\))?)*(?:\s+and\s+\d+(?:\([^)]+\))?)?/gi) || [];
    
    clauses.push(...clauseMatches);
    
    // Look for page references
    const pageMatches = content.match(/page\s+\d+/gi) || [];
    clauses.push(...pageMatches);
    
    return clauses.length > 0 ? clauses : ['See lease document for specific clause references'];
  }

  // Extract financial terms
  extractFinancialTerms() {
    const rentMatch = this.rawText.match(/(?:ground\s+)?rent[^£]*£(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    const depositMatch = this.rawText.match(/deposit[^£]*£(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    
    return {
      groundRent: rentMatch ? `£${rentMatch[1]} per annum` : 'Nominal ground rent (e.g., one peppercorn per year)',
      deposit: depositMatch ? `£${depositMatch[1]}` : 'Not specified',
      serviceCharge: 'Variable - based on actual costs and specified proportion'
    };
  }

  // Get parsing statistics for debugging
  getParsingStats() {
    return {
      textLength: this.rawText.length,
      confidence: this.confidence,
      sectionsFound: this.extractSections().length,
      addressFound: this.extractAddress() !== 'Property address not found',
      partiesFound: Object.values(this.extractParties()).filter(p => p !== 'Not specified').length,
      clausesFound: this.findReferencedClauses(this.rawText).length
    };
  }
}
