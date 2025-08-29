/**
 * Unified email AI types and interfaces
 * Consolidates all email AI functionality into consistent types
 */

// ========================================
// Core Email Types
// ========================================

export interface EmailContent {
  subject: string;
  body: string;
  from: string;
  fromName?: string;
  to?: string;
  receivedAt?: string;
  messageId?: string;
  conversationId?: string;
}

export interface EmailContext {
  buildingId?: string;
  buildingName?: string;
  unitNumber?: string;
  leaseholderName?: string;
  leaseholderId?: string;
  propertyManagerName?: string;
  previousEmails?: EmailContent[];
  attachments?: EmailAttachment[];
  urgency?: 'low' | 'medium' | 'high' | 'urgent';
  category?: EmailCategory;
}

export interface EmailAttachment {
  filename: string;
  size: number;
  mimeType: string;
  content?: string; // Base64 encoded content
  url?: string;
}

// ========================================
// Email AI Operation Types
// ========================================

export type EmailAIAction = 
  | 'analyze'
  | 'draft' 
  | 'reply'
  | 'improve'
  | 'summarize'
  | 'categorize'
  | 'extract_info'
  | 'suggest_reply'
  | 'generate_followup';

export type EmailDraftType = 
  | 'reply'
  | 'reply_all'
  | 'forward'
  | 'new'
  | 'follow_up'
  | 'notification'
  | 'escalation'
  | 'resolution'
  | 'acknowledgment';

export type EmailTone = 
  | 'professional' 
  | 'friendly' 
  | 'formal' 
  | 'casual'
  | 'empathetic' 
  | 'firm' 
  | 'apologetic'
  | 'urgent';

export type EmailLength = 'brief' | 'standard' | 'detailed';

export type EmailCategory = 
  | 'maintenance_request'
  | 'service_charge_query'
  | 'noise_complaint'
  | 'access_request'
  | 'general_inquiry'
  | 'emergency'
  | 'lease_query'
  | 'payment_issue'
  | 'complaint'
  | 'compliance'
  | 'major_works'
  | 'other';

export type ImprovementType = 
  | 'polish'
  | 'grammar'
  | 'tone'
  | 'clarity'
  | 'professionalism'
  | 'length'
  | 'legal_compliance';

// ========================================
// Request Interfaces
// ========================================

export interface EmailAIRequest {
  action: EmailAIAction;
  
  // Email data
  emailContent?: EmailContent;
  emailId?: string;
  
  // Context
  context?: EmailContext;
  
  // Operation-specific options
  draftType?: EmailDraftType;
  tone?: EmailTone;
  length?: EmailLength;
  improvementType?: ImprovementType;
  
  // Additional options
  options?: EmailAIOptions;
  
  // User instructions
  userInstructions?: string;
  customPrompt?: string;
}

export interface EmailAIOptions {
  includeLegal?: boolean;
  includeNextSteps?: boolean;
  includeDeadlines?: boolean;
  includeContactInfo?: boolean;
  includeDisclaimer?: boolean;
  
  // Response preferences
  formatAsHtml?: boolean;
  includeSignature?: boolean;
  
  // Analysis options
  extractKeyInfo?: boolean;
  suggestActions?: boolean;
  assessUrgency?: boolean;
  
  // Context enhancement
  enrichWithBuildingData?: boolean;
  enrichWithLeaseholderData?: boolean;
  enrichWithHistoricalContext?: boolean;
}

// ========================================
// Response Interfaces  
// ========================================

export interface EmailAIResponse {
  success: boolean;
  action: EmailAIAction;
  
  // Generated content
  content?: string;
  subject?: string;
  htmlContent?: string;
  
  // Analysis results
  analysis?: EmailAnalysis;
  
  // Suggestions
  suggestions?: EmailSuggestion[];
  
  // Metadata
  metadata: EmailAIMetadata;
  
  // Error information
  error?: string;
}

export interface EmailAnalysis {
  category: EmailCategory;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  sentiment: 'positive' | 'neutral' | 'negative';
  tone: string;
  confidence: number;
  
  // Extracted information
  extractedInfo: {
    buildingIdentifiers?: string[];
    unitIdentifiers?: string[];
    personNames?: string[];
    dates?: string[];
    amounts?: string[];
    issues?: string[];
    requestedActions?: string[];
  };
  
  // Flags
  flags: {
    requiresUrgentResponse?: boolean;
    containsComplaint?: boolean;
    hasMaintenanceRequest?: boolean;
    mentionsLegalIssues?: boolean;
    requiresDirectorNotification?: boolean;
  };
}

export interface EmailSuggestion {
  type: 'reply' | 'action' | 'escalation' | 'information';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  
  // Actionable data
  suggestedReply?: string;
  suggestedAction?: string;
  escalationLevel?: string;
}

export interface EmailAIMetadata {
  processingTime: number;
  timestamp: string;
  confidence: number;
  model?: string;
  
  // Source information
  userId?: string;
  buildingId?: string;
  emailId?: string;
  
  // Processing details
  tokensUsed?: number;
  contextEnriched?: boolean;
  databaseQueriesExecuted?: number;
  
  // Quality metrics
  relevanceScore?: number;
  professionalismScore?: number;
  completenessScore?: number;
}

// ========================================
// Utility Types
// ========================================

export interface EmailTemplate {
  id: string;
  name: string;
  category: EmailCategory;
  subject: string;
  body: string;
  tone: EmailTone;
  variables: string[];
  metadata?: Record<string, any>;
}

export interface EmailSignature {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo?: string;
  htmlContent?: string;
}

export interface ConversationHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ========================================
// Configuration Types
// ========================================

export interface EmailAIConfig {
  // Model configuration
  model?: string;
  temperature?: number;
  maxTokens?: number;
  
  // Default options
  defaultTone?: EmailTone;
  defaultLength?: EmailLength;
  
  // Feature flags
  enableSmartCategorization?: boolean;
  enableContextEnrichment?: boolean;
  enableComplianceCheck?: boolean;
  
  // Templates
  templates?: EmailTemplate[];
  
  // Signature
  signature?: EmailSignature;
}

// ========================================
// Error Types
// ========================================

export interface EmailAIError {
  type: 'validation' | 'authentication' | 'processing' | 'external_service' | 'quota_exceeded';
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// ========================================
// Legacy Compatibility Types
// ========================================

export interface LegacyEmailRequest {
  // Legacy ai-email-assistant format
  action?: 'draft' | 'summary' | 'analyse' | 'categorise' | 'suggest-reply' | 'extract-info';
  emailId?: string;
  emailContent?: {
    subject: string;
    body: string;
    from: string;
    receivedAt: string;
  };
  
  // Legacy ai-email-draft format  
  draftType?: 'reply' | 'follow-up' | 'notification' | 'escalation' | 'resolution';
  
  // Legacy ai-email-reply format
  originalEmail?: any;
  replyType?: string;
  buildingContext?: any;
  leaseholderContext?: any;
  
  // Common legacy fields
  tone?: string;
  options?: any;
  context?: any;
}

// ========================================
// Type Guards
// ========================================

export function isValidEmailContent(content: any): content is EmailContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    typeof content.subject === 'string' &&
    typeof content.body === 'string' &&
    typeof content.from === 'string'
  );
}

export function isValidEmailAIAction(action: any): action is EmailAIAction {
  const validActions: EmailAIAction[] = [
    'analyze', 'draft', 'reply', 'improve', 'summarize', 
    'categorize', 'extract_info', 'suggest_reply', 'generate_followup'
  ];
  return typeof action === 'string' && validActions.includes(action as EmailAIAction);
}

export function isValidEmailTone(tone: any): tone is EmailTone {
  const validTones: EmailTone[] = [
    'professional', 'friendly', 'formal', 'casual',
    'empathetic', 'firm', 'apologetic', 'urgent'
  ];
  return typeof tone === 'string' && validTones.includes(tone as EmailTone);
}

// ========================================
// Default Values
// ========================================

export const DEFAULT_EMAIL_AI_CONFIG: EmailAIConfig = {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
  defaultTone: 'professional',
  defaultLength: 'standard',
  enableSmartCategorization: true,
  enableContextEnrichment: true,
  enableComplianceCheck: true
};

export const DEFAULT_EMAIL_OPTIONS: EmailAIOptions = {
  includeLegal: false,
  includeNextSteps: true,
  includeDeadlines: false,
  includeContactInfo: true,
  includeDisclaimer: false,
  formatAsHtml: false,
  includeSignature: true,
  extractKeyInfo: true,
  suggestActions: true,
  assessUrgency: true,
  enrichWithBuildingData: true,
  enrichWithLeaseholderData: true,
  enrichWithHistoricalContext: false
};