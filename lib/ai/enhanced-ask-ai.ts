import { IndustryKnowledgeProcessor } from '../industry-knowledge/pdf-processor';
import { OpenAI } from 'langchain/llms/openai';
import { PromptTemplate } from 'langchain/prompts';

export interface EnhancedAskAIRequest {
  prompt: string;
  building_id?: string | null;
  contextType?: string;
  emailContext?: any;
  is_outlook_addin?: boolean;
  includeIndustryKnowledge?: boolean;
  knowledgeCategories?: string[];
}

export interface EnhancedAskAIResponse {
  response: string;
  sources: Array<{
    title: string;
    category: string;
    relevance: number;
    excerpt: string;
  }>;
  confidence: number;
  knowledgeUsed: boolean;
}

export class EnhancedAskAI {
  private knowledgeProcessor: IndustryKnowledgeProcessor;
  private llm: OpenAI;

  constructor() {
    this.knowledgeProcessor = new IndustryKnowledgeProcessor();
    this.llm = new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.3, // Lower temperature for more factual responses
      maxTokens: 2000,
    });
  }

  /**
   * Generate AI response with industry knowledge integration
   */
  async generateResponse(request: EnhancedAskAIRequest): Promise<EnhancedAskAIResponse> {
    try {
      let knowledgeContext = '';
      let sources: Array<{ title: string; category: string; relevance: number; excerpt: string }> = [];
      let knowledgeUsed = false;

      // 1. Search industry knowledge if enabled
      if (request.includeIndustryKnowledge !== false) {
        const knowledgeResults = await this.searchRelevantKnowledge(
          request.prompt,
          request.knowledgeCategories,
          request.contextType
        );

        if (knowledgeResults.length > 0) {
          knowledgeContext = this.formatKnowledgeContext(knowledgeResults);
          sources = knowledgeResults.map(result => ({
            title: result.document.title,
            category: result.document.category,
            relevance: result.relevance,
            excerpt: result.chunk.text.substring(0, 200) + '...',
          }));
          knowledgeUsed = true;
        }
      }

      // 2. Build enhanced prompt with knowledge context
      const enhancedPrompt = this.buildEnhancedPrompt(request, knowledgeContext);

      // 3. Generate AI response
      const response = await this.llm.call(enhancedPrompt);

      // 4. Calculate confidence based on knowledge usage
      const confidence = this.calculateConfidence(knowledgeUsed, sources.length);

      return {
        response: response.trim(),
        sources,
        confidence,
        knowledgeUsed,
      };

    } catch (error) {
      console.error('Enhanced Ask AI failed:', error);
      
      // Fallback to basic response
      return {
        response: 'I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.',
        sources: [],
        confidence: 0,
        knowledgeUsed: false,
      };
    }
  }

  /**
   * Search for relevant industry knowledge
   */
  private async searchRelevantKnowledge(
    query: string,
    categories?: string[],
    contextType?: string
  ) {
    try {
      // Determine relevant categories based on context type
      let relevantCategories = categories;
      
      if (!relevantCategories && contextType) {
        relevantCategories = this.mapContextTypeToCategories(contextType);
      }

      // Search knowledge base
      const results = await this.knowledgeProcessor.searchKnowledge(
        query,
        relevantCategories?.[0], // Use first category for filtering
        8 // Get more results for better context
      );

      // Filter and rank results
      return results
        .filter(result => result.relevance > 30) // Only highly relevant results
        .slice(0, 5); // Top 5 most relevant

    } catch (error) {
      console.error('Knowledge search failed:', error);
      return [];
    }
  }

  /**
   * Map context type to relevant knowledge categories
   */
  private mapContextTypeToCategories(contextType: string): string[] {
    const categoryMapping: Record<string, string[]> = {
      'compliance': ['Compliance & Regulations', 'Health & Safety', 'Legal & Contracts'],
      'leaseholder': ['Leaseholder Relations', 'Property Management', 'Legal & Contracts'],
      'major_works': ['Maintenance & Repairs', 'Financial Management', 'Legal & Contracts'],
      'email_triage': ['Property Management', 'Leaseholder Relations', 'Emergency Procedures'],
      'email_reply': ['Property Management', 'Leaseholder Relations', 'Legal & Contracts'],
      'general': ['Property Management', 'Compliance & Regulations', 'Health & Safety'],
      'public': ['Property Management', 'Compliance & Regulations', 'Health & Safety'],
    };

    return categoryMapping[contextType] || ['Property Management'];
  }

  /**
   * Format knowledge context for AI prompt
   */
  private formatKnowledgeContext(
    knowledgeResults: Array<{ chunk: any; relevance: number; document: any }>
  ): string {
    let context = '\n\n**RELEVANT INDUSTRY KNOWLEDGE:**\n';
    
    knowledgeResults.forEach((result, index) => {
      context += `\n${index + 1}. **${result.document.title}** (${result.document.category})\n`;
      context += `   Relevance: ${result.relevance}%\n`;
      context += `   Content: ${result.chunk.text.substring(0, 300)}...\n`;
      
      if (result.chunk.sectionTitle) {
        context += `   Section: ${result.chunk.sectionTitle}\n`;
      }
    });

    context += '\n**INSTRUCTIONS:** Use the above industry knowledge to provide accurate, professional responses. ';
    context += 'Cite specific information when relevant. If the knowledge doesn\'t fully address the query, ';
    context += 'acknowledge this and provide general guidance based on best practices.\n';

    return context;
  }

  /**
   * Build enhanced prompt with knowledge context
   */
  private buildEnhancedPrompt(request: EnhancedAskAIRequest, knowledgeContext: string): string {
    const basePrompt = this.getBasePrompt(request.contextType);
    
    let enhancedPrompt = basePrompt;
    
    // Add building context if available
    if (request.building_id) {
      enhancedPrompt += `\n\n**BUILDING CONTEXT:** Building ID: ${request.building_id}`;
    }

    // Add email context if available
    if (request.emailContext) {
      enhancedPrompt += `\n\n**EMAIL CONTEXT:**\n`;
      enhancedPrompt += `Subject: ${request.emailContext.subject || 'N/A'}\n`;
      enhancedPrompt += `From: ${request.emailContext.from || 'N/A'}\n`;
      enhancedPrompt += `Content: ${request.emailContext.body || 'N/A'}`;
    }

    // Add industry knowledge context
    if (knowledgeContext) {
      enhancedPrompt += knowledgeContext;
    }

    // Add the user's question
    enhancedPrompt += `\n\n**USER QUESTION:** ${request.prompt}\n\n**RESPONSE:**`;

    return enhancedPrompt;
  }

  /**
   * Get base prompt template based on context type
   */
  private getBasePrompt(contextType?: string): string {
    const basePrompts: Record<string, string> = {
      'compliance': `You are a property management compliance expert. Provide accurate, up-to-date information about building regulations, safety requirements, and compliance procedures. Always reference specific regulations when possible.`,
      
      'leaseholder': `You are a property management professional specializing in leaseholder relations. Provide helpful, professional guidance while maintaining appropriate boundaries. Focus on practical solutions and clear communication.`,
      
      'major_works': `You are a property management expert specializing in major works and Section 20 processes. Provide detailed guidance on project management, consultation requirements, and best practices for major works.`,
      
      'email_triage': `You are an email triage specialist for property management. Analyze emails for urgency, categorize issues, and provide recommended actions. Be concise and actionable.`,
      
      'email_reply': `You are a professional property manager drafting email responses. Create clear, helpful, and professional replies that address the recipient's concerns while maintaining appropriate tone and legal compliance.`,
      
      'general': `You are a knowledgeable property management assistant. Provide helpful, accurate information about property management best practices, procedures, and industry standards.`,
      
      'public': `You are a helpful property management information assistant. Provide general guidance and information about property management topics while directing users to appropriate resources for specific issues.`,
    };

    return basePrompts[contextType] || basePrompts['general'];
  }

  /**
   * Calculate confidence score based on knowledge usage
   */
  private calculateConfidence(knowledgeUsed: boolean, sourceCount: number): number {
    if (!knowledgeUsed) return 60; // Base confidence without knowledge
    
    // Higher confidence with more relevant sources
    if (sourceCount >= 3) return 95;
    if (sourceCount >= 2) return 85;
    return 75;
  }

  /**
   * Get knowledge base statistics
   */
  async getKnowledgeStats() {
    return await this.knowledgeProcessor.getDocumentStats();
  }

  /**
   * Get available knowledge categories
   */
  async getKnowledgeCategories() {
    return await this.knowledgeProcessor.getCategories();
  }
}
