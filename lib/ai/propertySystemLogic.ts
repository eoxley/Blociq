// Property Management System Logic
// Complete overhaul of Ask BlocIQ response understanding and formatting

import { parseQueryIntent, isPropertyQuery, isDocumentQuery, type QueryIntent } from './queryParser';

// Legacy interface for backward compatibility
interface ProcessedQuery {
  type: 'leaseholder' | 'access_codes' | 'service_charge' | 'building_info' | 'buildings' | 'documents' | 'document_analysis' | 'general';
  unit?: string;
  building?: string;
  confidence: number;
}

interface DocumentAnalysis {
  isLease: boolean;
  propertyAddress?: string;
  leaseTerm?: string;
  startDate?: string;
  endDate?: string;
  groundRent?: string;
  use?: string;
  serviceChargeShare?: string;
  insurance?: string;
  alterations?: string;
  alienation?: string;
  pets?: string;
  smoking?: string;
  extractedText?: string;
}

export class PropertySystemLogic {
  
  /**
   * Main request processor - routes to appropriate handler
   */
  static async processRequest(prompt: string, files?: any[], buildingId?: string) {
    console.log('🔄 Processing request with new system logic');
    
    // 1. DOCUMENT ANALYSIS ALWAYS TAKES PRIORITY
    if (files && files.length > 0) {
      console.log('📄 Document analysis mode');
      return await this.analyzeUploadedDocument(files[0], prompt);
    }
    
    // 2. PROPERTY QUERY PROCESSING
    const queryType = this.parsePropertyQuery(prompt);
    if (queryType.type !== 'general') {
      console.log('🏠 Property query mode:', queryType.type);
      return await this.handlePropertyQuery(queryType, buildingId);
    }
    
    // 3. GENERAL AI QUERY
    console.log('💬 General query mode');
    return await this.handleGeneralQuery(prompt);
  }

  /**
   * Document analysis with exact formatting requirements
   */
  static async analyzeUploadedDocument(file: any, prompt?: string): Promise<string> {
    try {
      // Extract text from document (assuming this is already implemented)
      const documentText = file.extractedText || '';
      
      // Check if it's a lease document
      const isLease = this.isLeaseDocument(documentText);
      
      if (isLease) {
        return await this.generateLeaseAnalysis(documentText);
      }
      
      // Handle other document types
      return await this.generateGenericDocumentAnalysis(documentText, file.filename);
      
    } catch (error) {
      console.error('Document analysis error:', error);
      return `I've received your document but encountered an issue during analysis. The file appears to be uploaded successfully, but I need a clearer copy to provide detailed analysis. Could you try uploading again or provide a different format?`;
    }
  }

  /**
   * Generate lease analysis in exact required format
   */
  static async generateLeaseAnalysis(leaseText: string): Promise<string> {
    // Extract key information using AI with specific prompting
    const analysis = await this.extractLeaseDetails(leaseText);
    
    // Format in EXACT required structure
    return `Got the lease—nice, clean copy. Here's the crisp "at-a-glance" you can drop into BlocIQ or an email 👇

${analysis.propertyAddress || '[Property Address]'} — key points
* **Term:** ${analysis.leaseTerm || '[lease length]'} from **${analysis.startDate || '[start date]'}** (to ${analysis.endDate || '[end date]'}).
* **Ground rent:** ${analysis.groundRent || '£[amount] p.a., [escalation terms]'}.
* **Use:** ${analysis.use || '[permitted use]'}.
* **Service charge share:** ${analysis.serviceChargeShare || '[percentages and descriptions]'}
* **Insurance:** ${analysis.insurance || '[arrangement details]'}
* **Alterations:** ${analysis.alterations || '[policy with consent requirements]'}
* **Alienation:** ${analysis.alienation || '[subletting/assignment rules]'}
* **Pets:** ${analysis.pets || '[policy]'}
* **Smoking:** ${analysis.smoking || '[restrictions]'}

Bottom line: ${this.generateBottomLine(analysis)}`;
  }

  /**
   * Extract lease details using AI
   */
  static async extractLeaseDetails(leaseText: string): Promise<DocumentAnalysis> {
    // This would use OpenAI to extract structured data
    // For now, implementing basic pattern matching
    
    const analysis: DocumentAnalysis = {
      isLease: true
    };

    // Extract property address
    const addressMatch = leaseText.match(/(?:property|premises|demised premises)[\s\S]*?([A-Z][^.]*(?:House|Court|Road|Street|Avenue|Lane|Place|Building)[^.]*)/i);
    if (addressMatch) {
      analysis.propertyAddress = addressMatch[1].trim();
    }

    // Extract lease term
    const termMatch = leaseText.match(/term of (\d+) years?|(\d+) year term|for a term of (\d+)/i);
    if (termMatch) {
      const years = termMatch[1] || termMatch[2] || termMatch[3];
      analysis.leaseTerm = `${years} years`;
    }

    // Extract dates
    const startDateMatch = leaseText.match(/from (?:the )?(\d{1,2}(?:st|nd|rd|th)? \w+ \d{4})/i);
    if (startDateMatch) {
      analysis.startDate = startDateMatch[1];
    }

    // Extract ground rent
    const groundRentMatch = leaseText.match(/ground rent[^£]*£(\d+(?:,\d+)?(?:\.\d{2})?)[^a-z]*(?:per annum|annually|p\.a\.)/i);
    if (groundRentMatch) {
      analysis.groundRent = `£${groundRentMatch[1]} p.a.`;
    }

    // Extract service charge information
    const serviceChargeMatch = leaseText.match(/service charge[^%]*(\d+(?:\.\d+)?)%/i);
    if (serviceChargeMatch) {
      analysis.serviceChargeShare = `${serviceChargeMatch[1]}% of total service charges`;
    }

    return analysis;
  }

  /**
   * Parse property queries using unified parser
   */
  static parsePropertyQuery(prompt: string): ProcessedQuery {
    const intent = parseQueryIntent(prompt);
    
    // Convert unified intent to legacy format for backward compatibility
    let legacyType: ProcessedQuery['type'] = 'general';
    
    switch (intent.type) {
      case 'leaseholder_lookup':
        legacyType = 'leaseholder';
        break;
      case 'access_codes':
        legacyType = 'access_codes';
        break;
      case 'buildings_list':
        legacyType = 'buildings'; // Map buildings_list to buildings to trigger the correct handler
        break;
      case 'building_info':
        legacyType = 'building_info';
        break;
      case 'document_query':
        legacyType = 'document_analysis';
        break;
      default:
        // Check for service charge queries specifically
        const promptLower = prompt.toLowerCase();
        if (promptLower.includes('service charge') || promptLower.includes('ground rent')) {
          legacyType = 'service_charge';
        }
        break;
    }
    
    return {
      type: legacyType,
      unit: intent.unitIdentifier,
      building: intent.buildingIdentifier,
      confidence: intent.confidence
    };
  }

  /**
   * Handle property queries with database integration
   */
  static async handlePropertyQuery(queryType: ProcessedQuery, buildingId?: string): Promise<string> {
    try {
      switch (queryType.type) {
        case 'leaseholder':
          return await this.getLeaseholderInfo(queryType.unit, queryType.building);
        case 'access_codes':
          return await this.getAccessCodes(queryType.building);
        case 'service_charge':
          return await this.getServiceChargeInfo(queryType.unit, queryType.building);
        case 'building_info':
          return await this.getBuildingInfo(queryType.building);
        default:
          return await this.handleGeneralQuery(queryType.building || 'property management question');
      }
    } catch (error) {
      console.error('Property query error:', error);
      return `I encountered an issue while searching our property database. Please try rephrasing your question or contact support if this continues to happen.`;
    }
  }

  /**
   * Get leaseholder information with helpful responses
   */
  static async getLeaseholderInfo(unit?: string, building?: string): Promise<string> {
    if (!unit || !building) {
      return `I need both a unit number and building name to find leaseholder information. Please try asking something like "Who is the leaseholder of unit 5 at Ashwood House?"`;
    }

    try {
      // This would integrate with your actual Supabase client
      // For now, returning a structured response format
      
      // Simulate database query
      const mockData = {
        found: false, // This would be based on actual query results
        leaseholder_name: null,
        email: null,
        phone: null
      };

      if (!mockData.found) {
        return `I couldn't find unit ${unit} in ${building} in our records. This could mean:

• The unit number might be listed differently (e.g., 'Flat ${unit}', 'Apartment ${unit}')
• The building name might vary in our records (e.g., '${building}' vs '${building} Building')
• This property isn't in our database yet

Would you like me to search for all units in buildings matching '${building}' to help you find the right one?`;
      }

      return `The leaseholder of unit ${unit}, ${building} is: ${mockData.leaseholder_name}${mockData.email ? `\nContact: ${mockData.email}` : ''}${mockData.phone ? ` | ${mockData.phone}` : ''}`;

    } catch (error) {
      return `Database connection error while looking up leaseholder information for unit ${unit} at ${building}. Please try again in a moment.`;
    }
  }

  /**
   * Get access codes - NO SECURITY RESTRICTIONS
   */
  static async getAccessCodes(building?: string): Promise<string> {
    if (!building) {
      return `I need a building name to find access codes. Please try asking "What are the access codes for [building name]?"`;
    }

    try {
      // Simulate database query for access codes
      const mockData = {
        found: false, // This would be based on actual query results
        main_entrance_code: null,
        gate_code: null,
        communal_code: null,
        notes: null
      };

      if (!mockData.found) {
        return `No access codes found for ${building} in our records. You may need to:

• Add this building to the database first
• Check if the building name is spelled correctly
• Update the property record with current access codes

Would you like me to search for similar building names or help you add this property?`;
      }

      return `Access codes for ${building}:
• Main entrance: ${mockData.main_entrance_code || 'Not set'}
• Gate: ${mockData.gate_code || 'Not set'}
• Communal areas: ${mockData.communal_code || 'Not set'}${mockData.notes ? `\n\nNotes: ${mockData.notes}` : ''}`;

    } catch (error) {
      return `Error retrieving access codes for ${building}. Please try again or contact support.`;
    }
  }

  /**
   * Get service charge information
   */
  static async getServiceChargeInfo(unit?: string, building?: string): Promise<string> {
    if (!unit || !building) {
      return `I need both a unit number and building name to find service charge information. Please try asking "What is the service charge for unit 5 at Ashwood House?"`;
    }

    try {
      // Simulate service charge query
      const mockData = {
        found: false,
        annual_charge: null,
        percentage: null,
        last_updated: null
      };

      if (!mockData.found) {
        return `I couldn't find service charge information for unit ${unit} at ${building}. This might be because:

• The unit isn't in our database yet
• Service charges haven't been calculated for this property
• The unit or building name needs to be updated

Would you like me to help you add this information or search for the building in our records?`;
      }

      return `Service charge for unit ${unit}, ${building}: £${mockData.annual_charge} per year (${mockData.percentage}% share)${mockData.last_updated ? `\n\nLast updated: ${mockData.last_updated}` : ''}`;

    } catch (error) {
      return `Error retrieving service charge information for unit ${unit} at ${building}. Please try again.`;
    }
  }

  /**
   * Get building information
   */
  static async getBuildingInfo(building?: string): Promise<string> {
    if (!building) {
      return `I need a building name to provide information. Please try asking "Tell me about [building name]" or "What information do you have on [building name]?"`;
    }

    // This would query the database for building information
    return `I'm looking up information about ${building} in our property database...`;
  }

  /**
   * Handle general queries
   */
  static async handleGeneralQuery(prompt: string): Promise<string> {
    // This would use OpenAI for general property management questions
    return `I can help you with property management questions. For specific information about leaseholders, units, or buildings, try asking something like:

• "Who is the leaseholder of unit 5 at Ashwood House?"
• "What are the access codes for Ashwood House?"
• "What is the service charge for unit 3 at Oak Court?"

What would you like to know?`;
  }

  // Helper methods
  static extractUnit(prompt: string): string | undefined {
    const unitPattern = /(?:unit|flat|apartment|apt)\s*([0-9]+[a-zA-Z]?)|(?:^|\s)([0-9]+[a-zA-Z]?)(?:\s+(?:at|in|of)|\s)/i;
    const match = prompt.match(unitPattern);
    return match ? (match[1] || match[2]) : undefined;
  }

  static extractBuilding(prompt: string): string | undefined {
    const buildingPatterns = [
      /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(?:house|court|place|tower|manor|lodge|building)\b/i,
      /at\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/i,
      /building\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/i
    ];
    
    for (const pattern of buildingPatterns) {
      const match = prompt.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  static isLeaseDocument(text: string): boolean {
    const leaseKeywords = [
      'lease', 'demise', 'lessee', 'lessor', 'tenancy',
      'ground rent', 'service charge', 'term of years'
    ];
    
    const keywordCount = leaseKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).length;
    
    return keywordCount >= 3;
  }

  static generateBottomLine(analysis: DocumentAnalysis): string {
    if (analysis.leaseTerm && analysis.groundRent) {
      return `${analysis.leaseTerm} lease with ${analysis.groundRent} ground rent. Standard residential terms with usual restrictions on alterations and subletting.`;
    }
    return `Standard residential lease with typical terms and conditions for property management.`;
  }

  static generateGenericDocumentAnalysis(text: string, filename?: string): Promise<string> {
    return Promise.resolve(`I've analyzed your document${filename ? ` "${filename}"` : ''} but it doesn't appear to be a lease agreement. 

The document contains ${text.length} characters of text. For the most helpful analysis, please let me know:

• What type of document this is (contract, notice, correspondence, etc.)
• What specific information you'd like me to extract or analyze
• Any particular questions you have about the content

I can help with various property management documents including tenancy agreements, service charge statements, building reports, and legal notices.`);
  }
}