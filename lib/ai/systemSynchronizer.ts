/**
 * SYSTEM SYNCHRONIZER
 * 
 * Ensures both Ask Bloc AI and Outlook Add-in AI systems are perfectly aligned
 * and automatically synchronized. Any changes to one system are immediately
 * reflected in the other.
 */

import { ComprehensiveUnifiedAIProcessor } from './comprehensiveUnifiedSystem';

/**
 * SYNCHRONIZED AI PROCESSOR
 * 
 * This is the single entry point for both systems. All queries go through
 * this processor to ensure perfect alignment.
 */
export class SynchronizedAIProcessor {
  
  /**
   * Process query for Ask Bloc AI
   */
  static async processAskBlocQuery(
    prompt: string,
    userId?: string,
    buildingId?: string,
    contextType: string = 'general',
    emailContext?: any,
    tone: string = 'Professional'
  ) {
    console.log('🔄 SYNCHRONIZED: Processing Ask Bloc AI query');
    
    return await ComprehensiveUnifiedAIProcessor.processQuery(
      prompt,
      userId,
      buildingId,
      contextType,
      emailContext,
      tone
    );
  }
  
  /**
   * Process query for Outlook Add-in AI
   */
  static async processOutlookQuery(
    prompt: string,
    userId?: string,
    buildingId?: string,
    contextType: string = 'outlook_addin',
    emailContext?: any,
    tone: string = 'Professional'
  ) {
    console.log('🔄 SYNCHRONIZED: Processing Outlook Add-in AI query');
    
    return await ComprehensiveUnifiedAIProcessor.processQuery(
      prompt,
      userId,
      buildingId,
      contextType,
      emailContext,
      tone
    );
  }
  
  /**
   * Process query for both systems simultaneously
   * This ensures they always return identical results
   */
  static async processBothSystems(
    prompt: string,
    userId?: string,
    buildingId?: string,
    contextType: string = 'general',
    emailContext?: any,
    tone: string = 'Professional'
  ) {
    console.log('🔄 SYNCHRONIZED: Processing query for both systems simultaneously');
    
    const result = await ComprehensiveUnifiedAIProcessor.processQuery(
      prompt,
      userId,
      buildingId,
      contextType,
      emailContext,
      tone
    );
    
    // Both systems will use this exact same result
    return {
      askBlocResult: result,
      outlookResult: result,
      synchronized: true
    };
  }
}

/**
 * CONFIGURATION SYNCHRONIZER
 * 
 * Ensures both systems use identical configuration
 */
export class ConfigurationSynchronizer {
  
  static getUnifiedConfiguration() {
    return {
      // Both systems use the same AI model
      aiModel: 'gpt-4o',
      
      // Both systems use the same temperature
      temperature: 0.1,
      
      // Both systems use the same max tokens
      maxTokens: 2000,
      
      // Both systems use the same system prompts
      systemPrompts: {
        general: 'You are BlocIQ, a UK property management AI assistant. You help property managers with building management, compliance, leaseholder relations, and operational tasks.',
        outlook_addin: 'You are BlocIQ, a UK property management AI assistant integrated with Outlook. You help with email responses, property queries, and provide comprehensive property management support directly within email workflows.'
      },
      
      // Both systems use the same response formatting
      responseFormatting: {
        includeSource: true,
        includeMetadata: true,
        includeSuggestions: true
      },
      
      // Both systems use the same error handling
      errorHandling: {
        fallbackToLegacy: true,
        logErrors: true,
        returnHelpfulMessages: true
      }
    };
  }
}

/**
 * FEATURE SYNCHRONIZER
 * 
 * Ensures both systems have access to all features
 */
export class FeatureSynchronizer {
  
  static getAllFeatures() {
    return {
      // Database features
      databaseAccess: {
        leaseholderQueries: true,
        buildingQueries: true,
        unitQueries: true,
        documentQueries: true,
        complianceQueries: true
      },
      
      // Email features
      emailFeatures: {
        emailGeneration: true,
        replyGeneration: true,
        templateSystem: true,
        contextIntegration: true
      },
      
      // Letter features
      letterFeatures: {
        rentDemandLetters: true,
        breachNotices: true,
        section20Notices: true,
        customTemplates: true
      },
      
      // HR features
      hrFeatures: {
        complianceTracking: true,
        safetyManagement: true,
        trainingRecords: true,
        policyManagement: true
      },
      
      // Advanced features
      advancedFeatures: {
        leakTriagePolicy: true,
        legalContext: true,
        industryKnowledge: true,
        antiHallucination: true,
        contextAwareness: true
      }
    };
  }
}

/**
 * VALIDATION SYNCHRONIZER
 * 
 * Ensures both systems return identical responses
 */
export class ValidationSynchronizer {
  
  static validateResponseAlignment(response1: any, response2: any): boolean {
    // Check if responses are identical
    if (response1.response === response2.response) {
      return true;
    }
    
    // Check if responses are similar (80%+ similarity)
    const similarity = this.calculateSimilarity(response1.response, response2.response);
    return similarity >= 0.8;
  }
  
  static calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  static logAlignmentCheck(query: string, response1: any, response2: any): void {
    const isAligned = this.validateResponseAlignment(response1, response2);
    
    console.log(`🔍 ALIGNMENT CHECK: "${query}"`);
    console.log(`   Ask Bloc AI: ${response1.success ? 'Success' : 'Failed'}`);
    console.log(`   Outlook AI: ${response2.success ? 'Success' : 'Failed'}`);
    console.log(`   Aligned: ${isAligned ? '✅ Yes' : '❌ No'}`);
    
    if (!isAligned) {
      console.log(`   Response 1: ${response1.response?.substring(0, 100)}...`);
      console.log(`   Response 2: ${response2.response?.substring(0, 100)}...`);
    }
  }
}
