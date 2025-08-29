import { LeaseAnalysis, LEASE_COMPLIANCE_CHECKLIST } from '@/types/ai';

interface ParsedLeaseData {
  propertyAddress?: string;
  landlord?: string;
  tenant?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseTerm?: string;
  premium?: string;
  initialRent?: string;
  serviceCharge?: string;
  deposit?: string;
  buildingType?: string;
  financialAmounts?: string[];
}

class LeaseTextParser {
  parse(ocrText: string, filename: string): ParsedLeaseData {
    const text = ocrText.toLowerCase();
    const parsed: ParsedLeaseData = {};
    
    // Validate input
    if (!ocrText || ocrText.trim().length < 50) {
      console.warn('Insufficient text for lease parsing');
      return parsed;
    }

    // Extract filename info
    const filenameInfo = this.extractInfoFromFilename(filename);
    
    // Extract address
    parsed.propertyAddress = this.extractAddress(ocrText, filenameInfo);
    
    // Extract financial amounts
    const financialData = this.extractFinancialAmounts(ocrText);
    Object.assign(parsed, financialData);
    
    // Extract dates
    const dateData = this.extractDates(ocrText, filenameInfo);
    Object.assign(parsed, dateData);
    
    // Extract names
    const nameData = this.extractNames(ocrText);
    Object.assign(parsed, nameData);
    
    // Extract property type
    parsed.buildingType = this.extractPropertyType(ocrText);
    
    return parsed;
  }

  private extractInfoFromFilename(filename: string) {
    const info: any = {};
    
    // Extract date (DD.MM.YYYY format)
    const dateMatch = filename.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = dateMatch[3];
      
      info.startDate = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
      info.startDateFormatted = `${day}${this.getOrdinalSuffix(day)} ${this.getMonthName(month)} ${year}`;
    }
    
    // Extract building number
    const buildingMatch = filename.match(/(\d+)/);
    if (buildingMatch) {
      info.buildingNumber = buildingMatch[1];
    }
    
    return info;
  }

  private extractAddress(ocrText: string, filenameInfo: any): string | undefined {
    // If we have building number from filename, look for it in text
    if (filenameInfo.buildingNumber) {
      const pattern = new RegExp(`${filenameInfo.buildingNumber}\\s+([A-Za-z\\s]+?)(?:,|\\n|$)`, 'i');
      const match = ocrText.match(pattern);
      if (match) {
        return `${filenameInfo.buildingNumber} ${match[1].trim()}`;
      }
    }
    
    // Look for any address pattern (number + street name)
    const addressPatterns = [
      /(\d+\s+[A-Za-z\s]+(?:Street|Road|Avenue|Lane|Drive|Close|Way|Place))/gi,
      /(\d+\s+[A-Za-z\s]+)(?:,|\n)/gi
    ];
    
    for (const pattern of addressPatterns) {
      const matches = ocrText.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].replace(/[,\n]$/, '').trim();
      }
    }
    
    return undefined;
  }

  private extractFinancialAmounts(ocrText: string): Partial<ParsedLeaseData> {
    const amounts: ParsedLeaseData = {};
    const text = ocrText.toLowerCase();
    
    // Find all monetary amounts
    const moneyPattern = /£[\d,]+(?:\.\d{2})?/g;
    const allAmounts = ocrText.match(moneyPattern);
    
    if (allAmounts) {
      amounts.financialAmounts = allAmounts;
      
      // Look for specific labeled amounts
      const labeledAmounts = [
        { key: 'premium', patterns: ['premium[:\s]*£[\d,]+(?:\.\d{2})?'] },
        { key: 'initialRent', patterns: ['(?:annual )?rent[:\s]*£[\d,]+(?:\.\d{2})?', 'yearly rent[:\s]*£[\d,]+(?:\.\d{2})?'] },
        { key: 'serviceCharge', patterns: ['service charge[:\s]*£[\d,]+(?:\.\d{2})?'] },
        { key: 'deposit', patterns: ['deposit[:\s]*£[\d,]+(?:\.\d{2})?'] }
      ];
      
      for (const { key, patterns } of labeledAmounts) {
        for (const pattern of patterns) {
          const match = text.match(new RegExp(pattern, 'i'));
          if (match) {
            const amountMatch = match[0].match(/£[\d,]+(?:\.\d{2})?/);
            if (amountMatch) {
              (amounts as any)[key] = amountMatch[0];
              break;
            }
          }
        }
      }
    }
    
    return amounts;
  }

  private extractDates(ocrText: string, filenameInfo: any): Partial<ParsedLeaseData> {
    const dates: ParsedLeaseData = {};
    
    // Use filename date if available
    if (filenameInfo.startDateFormatted) {
      dates.leaseStartDate = filenameInfo.startDateFormatted;
    }
    
    // Look for end dates
    const endDatePatterns = [
      /(?:expires?|until|end(?:s|ing)?|term)[:\s]*(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi,
      /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi
    ];
    
    for (const pattern of endDatePatterns) {
      const matches = [...ocrText.toLowerCase().matchAll(pattern)];
      if (matches.length > 0) {
        const match = matches[matches.length - 1]; // Take the last date found
        const day = parseInt(match[1]);
        dates.leaseEndDate = `${day}${this.getOrdinalSuffix(day)} ${this.capitalizeFirst(match[2])} ${match[3]}`;
        break;
      }
    }
    
    // Extract lease term
    const termPatterns = [
      /(?:term|duration|period)[:\s]*(\d+)\s+(years?|months?)/gi,
      /(\d+)\s+year\s+term/gi
    ];
    
    for (const pattern of termPatterns) {
      const match = ocrText.match(pattern);
      if (match) {
        dates.leaseTerm = match[0];
        break;
      }
    }
    
    return dates;
  }

  private extractNames(ocrText: string): Partial<ParsedLeaseData> {
    const names: ParsedLeaseData = {};
    const text = ocrText.toLowerCase();
    
    // Extract landlord
    const landlordPatterns = [
      /(?:landlord|lessor)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /landlord[:\s]+([A-Z][a-zA-Z\s]+?)(?:\s*\n|\s*,|\s*\()/g
    ];
    
    for (const pattern of landlordPatterns) {
      const matches = [...ocrText.matchAll(pattern)];
      if (matches.length > 0) {
        names.landlord = matches[0][1].trim();
        break;
      }
    }
    
    // Extract tenant
    const tenantPatterns = [
      /(?:tenant|lessee)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /tenant[:\s]+([A-Z][a-zA-Z\s]+?)(?:\s*\n|\s*,|\s*\()/g
    ];
    
    for (const pattern of tenantPatterns) {
      const matches = [...ocrText.matchAll(pattern)];
      if (matches.length > 0) {
        names.tenant = matches[0][1].trim();
        break;
      }
    }
    
    return names;
  }

  private extractPropertyType(ocrText: string): string | undefined {
    const typePatterns = [
      /\b(flat|apartment|house|maisonette|studio|penthouse)\b/gi,
      /\b(residential|commercial|retail|office)\s+(?:property|premises|unit)\b/gi
    ];
    
    for (const pattern of typePatterns) {
      const match = ocrText.match(pattern);
      if (match) {
        return this.capitalizeFirst(match[1]);
      }
    }
    
    return undefined;
  }

  private getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  private getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

class LeaseAIAnalyzer {
  async analyze(extractedText: string, parsedData: ParsedLeaseData): Promise<any> {
    const prompt = this.buildPrompt(extractedText, parsedData);
    
    try {
      const { getOpenAIClient } = await import('@/lib/openai-client');
      const openai = getOpenAIClient();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(result);

    } catch (error) {
      console.error('AI analysis failed:', error);
      throw error;
    }
  }

  private buildPrompt(extractedText: string, parsedData: ParsedLeaseData): string {
    return `
You are analyzing a UK lease document. Here is the extracted data and full text:

EXTRACTED DATA:
${JSON.stringify(parsedData, null, 2)}

FULL DOCUMENT TEXT:
${extractedText.substring(0, 3000)}

Please provide a JSON response with this structure:

{
  "summary": "Brief summary of this lease agreement",
  "leaseDetails": {
    "propertyAddress": "Property address (use extracted data if available)",
    "landlord": "Landlord name (use extracted data if available)", 
    "tenant": "Tenant name (use extracted data if available)",
    "leaseStartDate": "Start date (use extracted data if available)",
    "leaseEndDate": "End date (use extracted data if available)",
    "leaseTerm": "Lease term (use extracted data if available)",
    "premium": "Premium amount (use extracted data if available)",
    "initialRent": "Annual rent (use extracted data if available)",
    "serviceCharge": "Service charge (use extracted data if available)",
    "buildingType": "Property type (use extracted data if available)"
  },
  "complianceChecklist": [
    {
      "item": "Term consent in favour of client",
      "status": "Y/N/Unknown", 
      "details": "Details if found"
    }
  ],
  "keyRights": ["List of tenant rights found"],
  "restrictions": ["List of restrictions found"],
  "suggestedActions": ["Relevant actions based on analysis"]
}

IMPORTANT: Use the EXTRACTED DATA first - it contains pre-processed information from the document. Only analyze the full text for items not in the extracted data.
    `;
  }
}

export async function analyzeLeaseDocument(
  extractedText: string,
  filename: string,
  buildingId?: string
): Promise<LeaseAnalysis> {
  
  console.log('Starting lease analysis for:', filename);
  
  // Validate input
  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error('No text content provided for lease analysis');
  }
  
  // Check for extraction failures
  const failureIndicators = [
    '[Fallback extractor]',
    '[OCR Fallback]', 
    'Unable to extract text',
    'All extraction methods failed'
  ];
  
  const hasExtractionFailure = failureIndicators.some(indicator => 
    extractedText.includes(indicator)
  );
  
  if (hasExtractionFailure) {
    console.warn('Text extraction may have failed for:', filename);
  }

  try {
    // Parse the text first
    const parser = new LeaseTextParser();
    const parsedData = parser.parse(extractedText, filename);
    
    console.log('Parsed lease data:', parsedData);
    
    // Analyze with AI
    const analyzer = new LeaseAIAnalyzer();
    const aiResult = await analyzer.analyze(extractedText, parsedData);
    
    console.log('AI analysis complete');

    // Build final result
    const result: LeaseAnalysis = {
      filename,
      summary: aiResult.summary || 'Lease document analyzed',
      documentType: 'lease',
      leaseDetails: {
        // Use parsed data as fallback if AI doesn't provide values
        propertyAddress: aiResult.leaseDetails?.propertyAddress || parsedData.propertyAddress || null,
        landlord: aiResult.leaseDetails?.landlord || parsedData.landlord || null,
        tenant: aiResult.leaseDetails?.tenant || parsedData.tenant || null,
        leaseStartDate: aiResult.leaseDetails?.leaseStartDate || parsedData.leaseStartDate || null,
        leaseEndDate: aiResult.leaseDetails?.leaseEndDate || parsedData.leaseEndDate || null,
        leaseTerm: aiResult.leaseDetails?.leaseTerm || parsedData.leaseTerm || null,
        premium: aiResult.leaseDetails?.premium || parsedData.premium || null,
        initialRent: aiResult.leaseDetails?.initialRent || parsedData.initialRent || null,
        serviceCharge: aiResult.leaseDetails?.serviceCharge || parsedData.serviceCharge || null,
        buildingType: aiResult.leaseDetails?.buildingType || parsedData.buildingType || null,
        serviceChargePercentage: aiResult.leaseDetails?.serviceChargePercentage || null
      },
      complianceChecklist: aiResult.complianceChecklist?.map((item: any) => ({
        item: item.item || item.name,
        status: item.status,
        details: item.details
      })) || [],
      financialObligations: aiResult.financialObligations || [],
      keyRights: aiResult.keyRights || [],
      restrictions: aiResult.restrictions || [],
      suggestedActions: aiResult.suggestedActions?.map((action: any, index: number) => ({
        key: `action_${index}`,
        label: typeof action === 'string' ? action : action.label || action.title,
        icon: 'FileText',
        action: 'review'
      })) || [],
      extractionMethod: 'ai_enhanced',
      confidence: hasExtractionFailure ? 0.3 : 0.8,
      buildingContext: {
        buildingId: buildingId || null,
        buildingStatus: buildingId ? 'matched' : 'not_found',
        extractedAddress: aiResult.leaseDetails?.propertyAddress || parsedData.propertyAddress || null,
        extractedBuildingType: aiResult.leaseDetails?.buildingType || parsedData.buildingType || null
      }
    };

    return result;

  } catch (error) {
    console.error('Lease analysis failed:', error);
    
    // Return fallback result
    return {
      filename,
      summary: 'Lease analysis failed due to processing error',
      documentType: 'lease',
      leaseDetails: {},
      complianceChecklist: LEASE_COMPLIANCE_CHECKLIST.map(item => ({
        item,
        status: 'Unknown' as const,
        details: 'Analysis failed'
      })),
      financialObligations: [],
      keyRights: [],
      restrictions: [],
      suggestedActions: [{
        key: 'manual_review',
        label: 'Manual review required - automated analysis failed',
        icon: 'AlertTriangle',
        action: 'review'
      }],
      extractionMethod: 'failed',
      confidence: 0.1,
      buildingContext: {
        buildingId: buildingId || null,
        buildingStatus: 'unknown',
        extractedAddress: null,
        extractedBuildingType: null
      }
    };
  }
}

// Legacy compatibility function
export async function analyzeLease(
  extractedText: string,
  options: any = {}
): Promise<any> {
  const newAnalysis = await analyzeLeaseDocument(extractedText, 'legacy_lease', undefined);
  
  // Transform to legacy format
  return {
    propertyDetails: {
      address: newAnalysis.leaseDetails?.propertyAddress || '',
      propertyType: newAnalysis.leaseDetails?.buildingType || '',
      leaseTerm: newAnalysis.leaseDetails?.leaseTerm || '',
      startDate: newAnalysis.leaseDetails?.leaseStartDate || '',
      endDate: newAnalysis.leaseDetails?.leaseEndDate || '',
      premium: newAnalysis.leaseDetails?.premium || ''
    },
    metadata: {
      confidence: newAnalysis.confidence || 0.5,
      extractedDate: new Date().toISOString(),
      documentType: 'lease',
      analysisVersion: '3.0.0'
    }
  };
}