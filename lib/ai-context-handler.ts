import { AI_PROMPTS, getPromptForContext, shouldAutoPolish, isComplaint, isDocumentSummaryRequest } from './ai-prompts';

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
   * Builds the complete prompt with context and user input
   */
  static buildPrompt(
    context: 'core' | 'doc_summary' | 'auto_polish' | 'complaints',
    userInput: string,
    buildingContext?: string,
    uploadedFiles?: File[]
  ): string {
    const basePrompt = getPromptForContext(context);
    
    let fullPrompt = `${basePrompt}\n\n`;
    
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
