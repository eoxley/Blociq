import { AI_PROMPTS, getPromptForContext, shouldAutoPolish, isComplaint, isDocumentSummaryRequest } from './ai-prompts';
import { formatBuildingContextForAI, formatUnitSpecificContext } from './ai/buildingContextFormatter';

export interface AIResponse {
  content: string;
  metadata?: {
    context: string;
    autoPolished?: boolean;
    complaintHandled?: boolean;
    documentSummary?: any;
    wordCount?: number;
  };
}

export interface DocumentSummaryData {
  doc_type: string;
  title: string;
  document_date: string;
  validity_until?: string | null;
  next_due?: string | null;
  contractor?: string | null;
  summary: string;
  key_points: string[];
  compliance_actions: string[];
  immediate_risks: string[];
  s20_consultation_likely: boolean;
  s20B_notice_needed: boolean;
  section21_22_rights_relevant: boolean;
  confidence: number;
  is_probable_duplicate: boolean;
}

export interface ComplaintResponse {
  resident_reply: string;
  log: {
    owner: string;
    stage: number;
    issues: string[];
    actions: string[];
    next_review: string;
    deadline_stage_response: string;
    redress_signpost_ready: boolean;
    escalation_anchor_date: string;
  };
}

export class AIContextHandler {
  /**
   * Determines the appropriate prompt context based on user input and files
   */
  static determineContext(userInput: string, uploadedFiles?: File[]): 'core' | 'doc_summary' | 'auto_polish' | 'complaints' {
    // Check for document summary requests
    if (isDocumentSummaryRequest(userInput) || (uploadedFiles && uploadedFiles.length > 0)) {
      return 'doc_summary';
    }
    
    // Check for complaints
    if (isComplaint(userInput)) {
      return 'complaints';
    }
    
    // Check for auto-polish (long content)
    if (shouldAutoPolish(userInput)) {
      return 'auto_polish';
    }
    
    // Default to core
    return 'core';
  }

  /**
   * Detects if the user is asking about a specific building or unit
   */
  static detectBuildingQuery(userInput: string): { buildingId?: string; unitNumber?: string } {
    const input = userInput.toLowerCase();
    
    // Look for building ID patterns (UUID)
    const buildingIdMatch = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    
    // Look for unit number patterns
    const unitMatch = input.match(/(?:flat|apartment|unit)\s*(\d+)/i);
    
    return {
      buildingId: buildingIdMatch ? buildingIdMatch[0] : undefined,
      unitNumber: unitMatch ? unitMatch[1] : undefined
    };
  }

  /**
   * NEW: Automatically detect building context from current page URL
   */
  static detectPageBuildingContext(pathname: string): { buildingId?: string; buildingName?: string; unitId?: string } {
    try {
      // Pattern: /buildings/[buildingId]/[section]
      const buildingMatch = pathname.match(/\/buildings\/([a-f0-9-]+)(?:\/([^\/\?]+))?/i);
      
      if (buildingMatch) {
        const buildingId = buildingMatch[1];
        const section = buildingMatch[2];
        
        console.log('🔍 Page context detected:', { buildingId, section, pathname });
        
        return {
          buildingId,
          buildingName: section ? decodeURIComponent(section) : undefined,
          unitId: undefined // Could be enhanced to detect unit context
        };
      }
      
      // Pattern: /buildings/[buildingId]/units/[unitId]
      const unitMatch = pathname.match(/\/buildings\/([a-f0-9-]+)\/units\/([a-f0-9-]+)/i);
      if (unitMatch) {
        const buildingId = unitMatch[1];
        const unitId = unitMatch[2];
        
        console.log('🔍 Unit page context detected:', { buildingId, unitId, pathname });
        
        return {
          buildingId,
          unitId,
          buildingName: undefined
        };
      }
      
      return {};
    } catch (error) {
      console.warn('Error detecting page building context:', error);
      return {};
    }
  }

  async getBuildingContext(buildingId: string) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ask-ai/building-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId })
      });
      
      if (!response.ok) {
        console.error('Failed to fetch building context:', response.status);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching building context:', error);
      return null;
    }
  }

  /**
   * Fetches building context data for a specific building
   */
  static async fetchBuildingContext(buildingId: string): Promise<string | null> {
    try {
      const response = await fetch('/api/ask-ai/building-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId })
      });

      if (!response.ok) {
        console.error('Failed to fetch building context:', response.status);
        return null;
      }

      const data = await response.json();
      return this.formatBuildingContextForAI(data);
    } catch (error) {
      console.error('Error fetching building context:', error);
      return null;
    }
  }

  /**
   * Formats building context data for AI consumption
   */
  static formatBuildingContextForAI(data: any): string {
    if (!data) return '';
    
    // Handle empty database scenarios
    if (data.databaseEmpty) {
      return `DATABASE STATUS: Empty database detected
      
No buildings table found in the database. This suggests the system is newly set up or the database is empty.

RECOMMENDATION: The user should set up their first building to get started with the system.

RESPONSE: When asked about buildings, leaseholders, or compliance, inform the user that no buildings have been set up yet and guide them to add their first building.`;
    }
    
    if (data.noBuildings) {
      return `DATABASE STATUS: No buildings in portfolio
      
The buildings table exists but contains no buildings. The user's portfolio is empty.

RECOMMENDATION: The user should add their first building to start using the system.

RESPONSE: When asked about buildings, leaseholders, or compliance, inform the user that their portfolio is empty and guide them to add their first building.`;
    }
    
    if (data.buildingNotFound) {
      return `DATABASE STATUS: Specific building not found
      
The requested building ID was not found in the database. This could be due to:
- Incorrect building ID
- Building was deleted
- User doesn't have access to this building

RESPONSE: Inform the user that the specific building was not found and suggest they check the building ID or add the building to their portfolio.`;
    }
    
    let context = '';
    
    // Building information
    if (data.building) {
      context += `BUILDING INFORMATION:\n`;
      context += `Name: ${data.building.name || 'Unknown'}\n`;
      context += `Address: ${data.building.address || 'Not set'}\n`;
      context += `Postcode: ${data.building.postcode || 'Not set'}\n`;
      context += `Total Units: ${data.metadata?.totalUnits || 0}\n`;
      context += `Total Leaseholders: ${data.metadata?.totalLeaseholders || 0}\n`;
      context += `Directors: ${data.metadata?.directors || 0}\n\n`;
    }
    
    // Units and leaseholders
    if (data.unitsLeaseholders && data.unitsLeaseholders.length > 0) {
      context += `UNITS & LEASEHOLDERS:\n`;
      data.unitsLeaseholders.forEach((unit: any, index: number) => {
        context += `${index + 1}. Unit: ${unit.unit_label || unit.unit_number || 'Unknown'}\n`;
        context += `   Leaseholder: ${unit.leaseholder_name || 'Not set'}\n`;
        context += `   Email: ${unit.leaseholder_email || 'Not set'}\n`;
        context += `   Phone: ${unit.leaseholder_phone || 'Not set'}\n`;
        context += `   Apportionment: ${unit.apportionment_percent || 'Not set'}%\n`;
        if (unit.is_director) {
          context += `   Director Role: ${unit.director_role || 'Director'}\n`;
        }
        context += `\n`;
      });
    }
    
    // Compliance summary
    if (data.complianceSummary) {
      context += `COMPLIANCE SUMMARY:\n`;
      context += `Total Assets: ${data.complianceSummary.total}\n`;
      context += `Compliant: ${data.complianceSummary.compliant}\n`;
      context += `Pending: ${data.complianceSummary.pending}\n`;
      context += `Overdue: ${data.complianceSummary.overdue}\n\n`;
    }
    
    // Recent call logs
    if (data.callLogs && data.callLogs.length > 0) {
      context += `RECENT CALL LOGS:\n`;
      data.callLogs.slice(0, 5).forEach((log: any) => {
        context += `- ${log.logged_at}: ${log.call_type} call - ${log.notes}\n`;
      });
      context += `\n`;
    }
    
    return context;
  }

  /**
   * Builds the complete prompt with context and user input
   */
  static async buildPrompt(
    context: 'core' | 'doc_summary' | 'auto_polish' | 'complaints',
    userInput: string,
    buildingContext?: string,
    uploadedFiles?: File[]
  ): Promise<string> {
    const basePrompt = getPromptForContext(context);
    
    let fullPrompt = `${basePrompt}\n\n`;
    
    // Detect if user is asking about a specific building
    const buildingQuery = this.detectBuildingQuery(userInput);
    if (buildingQuery.buildingId && !buildingContext) {
      const fetchedContext = await this.fetchBuildingContext(buildingQuery.buildingId);
      if (fetchedContext) {
        buildingContext = fetchedContext;
      }
    }
    
    // Add building context if available
    if (buildingContext) {
      fullPrompt += `Building Context: ${buildingContext}\n\n`;
    }
    
    // Add file context for document summaries
    if (context === 'doc_summary' && uploadedFiles && uploadedFiles.length > 0) {
      fullPrompt += `Document(s) to analyze:\n`;
      uploadedFiles.forEach((file, index) => {
        fullPrompt += `${index + 1}. ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)\n`;
      });
      fullPrompt += '\n';
    }
    
    // Add user input
    fullPrompt += `User Request: ${userInput}`;
    
    return fullPrompt;
  }

  /**
   * Processes AI response based on context
   */
  static processResponse(
    aiResponse: string,
    context: 'core' | 'doc_summary' | 'auto_polish' | 'complaints'
  ): AIResponse {
    const response: AIResponse = {
      content: aiResponse,
      metadata: {
        context,
        wordCount: aiResponse.split(' ').length
      }
    };

    switch (context) {
      case 'doc_summary':
        response.metadata!.documentSummary = this.extractDocumentSummary(aiResponse);
        break;
      
      case 'auto_polish':
        response.metadata!.autoPolished = true;
        break;
      
      case 'complaints':
        response.metadata!.complaintHandled = true;
        const complaintData = this.extractComplaintResponse(aiResponse);
        if (complaintData) {
          response.metadata!.documentSummary = complaintData;
        }
        break;
    }

    return response;
  }

  /**
   * Extracts JSON data from document summary response
   */
  private static extractDocumentSummary(response: string): DocumentSummaryData | null {
    try {
      // Look for JSON code block
      const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Fallback: try to find JSON anywhere in the response
      const jsonRegex = /\{[\s\S]*\}/;
      const match = response.match(jsonRegex);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (error) {
      console.error('Failed to extract document summary JSON:', error);
    }
    
    return null;
  }

  /**
   * Extracts complaint response data
   */
  private static extractComplaintResponse(response: string): ComplaintResponse | null {
    try {
      // Look for JSON code block
      const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Fallback: try to find JSON anywhere in the response
      const jsonRegex = /\{[\s\S]*\}/;
      const match = response.match(jsonRegex);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (error) {
      console.error('Failed to extract complaint response JSON:', error);
    }
    
    return null;
  }

  /**
   * Formats the response for display based on context
   */
  static formatResponseForDisplay(response: AIResponse): string {
    const { content, metadata } = response;
    
    if (!metadata) return content;
    
    switch (metadata.context) {
      case 'doc_summary':
        // For document summaries, show the human-readable part first
        const lines = content.split('\n');
        const jsonStartIndex = lines.findIndex(line => line.includes('```json'));
        if (jsonStartIndex > 0) {
          return lines.slice(0, jsonStartIndex).join('\n').trim();
        }
        return content;
      
      case 'complaints':
        // For complaints, show the resident reply
        if (metadata.documentSummary) {
          const complaintData = metadata.documentSummary as ComplaintResponse;
          return complaintData.resident_reply;
        }
        return content;
      
      case 'auto_polish':
        // For auto-polish, return the polished content
        return content;
      
      default:
        return content;
    }
  }

  /**
   * Gets additional metadata for the response
   */
  static getResponseMetadata(response: AIResponse): any {
    const { metadata } = response;
    if (!metadata) return null;
    
    const result: any = {
      context: metadata.context,
      wordCount: metadata.wordCount
    };
    
    if (metadata.documentSummary) {
      result.documentSummary = metadata.documentSummary;
    }
    
    if (metadata.autoPolished) {
      result.autoPolished = true;
    }
    
    if (metadata.complaintHandled) {
      result.complaintHandled = true;
    }
    
    return result;
  }
}
