/**
 * Unified response schema for AI endpoints
 * Standardizes response format across all Ask AI routes
 */

export interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
  metadata?: AIResponseMetadata;
  sources?: AIResponseSources;
  context?: AIResponseContext;
  documents?: ProcessedDocument[];
  data?: any; // Legacy support
}

export interface AIResponseMetadata {
  processingTime?: number;
  timestamp: string;
  confidence?: number;
  queryType: string;
  contextType?: string;
  isDatabaseQuery?: boolean;
  isLeaseSummary?: boolean;
  knowledgeUsed?: boolean | string[];
  databaseResults?: any;
  buildingId?: string | null;
  userId?: string;
}

export interface AIResponseSources {
  primary: 'database' | 'ai' | 'document' | 'knowledge_base';
  types: AISourceType[];
  count?: number;
}

export type AISourceType = 
  | 'database_search'
  | 'lease_document_analysis' 
  | 'ai_knowledge'
  | 'document_analysis'
  | 'ocr_processing'
  | 'industry_knowledge'
  | 'property_management';

export interface AIResponseContext {
  intent?: {
    type: string;
    confidence: number;
    extracted?: {
      building?: string;
      unit?: string;
      person?: string;
    };
  };
  building?: {
    id?: string;
    name?: string;
    found?: boolean;
  };
  authentication?: {
    authenticated: boolean;
    userId?: string;
  };
  propertyManagementType?: string;
  propertyManagementSubtype?: string;
}

export interface ProcessedDocument {
  id: string | null;
  filename: string;
  type: string;
  summary?: string;
  extractedText?: string | null;
  confidence?: string | number;
  error?: any;
  metadata?: {
    fileSize?: number;
    processingTime?: number;
    attempts?: number;
    ocrConfidence?: string | number;
  };
}

/**
 * Legacy response interfaces for backward compatibility
 */
export type AskAiAnswer = {
  status: 'ok'|'not_found'|'needs_clarification'|'forbidden'|'error';
  answer: string;
  data?: Record<string, any>;
  actions?: Array<{type:string,label:string,payload?:any}>;
  sources?: Array<{type:'db'|'doc'|'web',label:string,url?:string,id?:string}>;
};

export interface LegacyAssistantResponse {
  answer: string;
  context?: {
    building?: string | null;
    units?: string | null;
    leaseholders?: string | null;
    compliance?: string | null;
    emails?: string | null;
    tasks?: string | null;
    documents?: string | null;
    events?: string | null;
    majorWorks?: string | null;
    documentsFound?: number;
    attachmentsProcessed?: number;
  };
}

/**
 * Create a standardized AI response
 */
export function createAIResponse(params: {
  success: boolean;
  response?: string;
  error?: string;
  queryType: string;
  contextType?: string;
  sources?: AISourceType[];
  confidence?: number;
  knowledgeUsed?: boolean | string[];
  isDatabaseQuery?: boolean;
  isLeaseSummary?: boolean;
  documents?: ProcessedDocument[];
  buildingId?: string | null;
  userId?: string;
  databaseResults?: any;
  intent?: any;
  building?: any;
  processingStartTime?: number;
}): AIResponse {
  const timestamp = new Date().toISOString();
  const processingTime = params.processingStartTime 
    ? Date.now() - params.processingStartTime 
    : undefined;

  // Determine primary source
  let primarySource: AIResponseSources['primary'] = 'ai';
  if (params.isDatabaseQuery) primarySource = 'database';
  else if (params.documents && params.documents.length > 0) primarySource = 'document';
  else if (params.knowledgeUsed) primarySource = 'knowledge_base';

  return {
    success: params.success,
    response: params.response,
    error: params.error,
    metadata: {
      processingTime,
      timestamp,
      confidence: params.confidence,
      queryType: params.queryType,
      contextType: params.contextType,
      isDatabaseQuery: params.isDatabaseQuery || false,
      isLeaseSummary: params.isLeaseSummary || false,
      knowledgeUsed: params.knowledgeUsed || false,
      databaseResults: params.databaseResults,
      buildingId: params.buildingId,
      userId: params.userId
    },
    sources: {
      primary: primarySource,
      types: params.sources || [],
      count: params.sources ? params.sources.length : 0
    },
    context: {
      intent: params.intent ? {
        type: params.intent.type || 'general',
        confidence: params.intent.confidence || 0.5,
        extracted: {
          building: params.intent.buildingIdentifier,
          unit: params.intent.unitIdentifier,
          person: params.intent.personName
        }
      } : undefined,
      building: params.building ? {
        id: params.building.id,
        name: params.building.name,
        found: !!params.building.id
      } : undefined,
      authentication: {
        authenticated: !!params.userId,
        userId: params.userId
      }
    },
    documents: params.documents || []
  };
}

/**
 * Convert legacy response format to unified format
 */
export function convertLegacyResponse(
  legacyResponse: AskAiAnswer | LegacyAssistantResponse,
  queryType: string = 'legacy'
): AIResponse {
  // Handle legacy ask-ai response
  if ('status' in legacyResponse) {
    return createAIResponse({
      success: legacyResponse.status === 'ok',
      response: legacyResponse.answer,
      error: legacyResponse.status === 'error' ? legacyResponse.answer : undefined,
      queryType: `legacy_${queryType}`,
      confidence: legacyResponse.status === 'ok' ? 0.8 : 0.3,
      sources: ['ai_knowledge']
    });
  }

  // Handle legacy assistant response
  return createAIResponse({
    success: !!legacyResponse.answer,
    response: legacyResponse.answer,
    queryType: `assistant_${queryType}`,
    confidence: 0.7,
    sources: ['ai_knowledge']
  });
}

/**
 * Validate AI response structure
 */
export function validateAIResponse(response: any): response is AIResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    typeof response.success === 'boolean' &&
    typeof response.metadata?.timestamp === 'string' &&
    typeof response.metadata?.queryType === 'string'
  );
}

/**
 * Create error response
 */
export function createErrorResponse(
  error: string,
  queryType: string = 'error',
  statusCode: number = 500
): AIResponse {
  return createAIResponse({
    success: false,
    error,
    queryType,
    confidence: 0,
    sources: []
  });
}

/**
 * Create database response
 */
export function createDatabaseResponse(
  response: string,
  databaseResults: any,
  queryType: string = 'database_query',
  confidence: number = 0.9
): AIResponse {
  return createAIResponse({
    success: true,
    response,
    queryType,
    confidence,
    isDatabaseQuery: true,
    databaseResults,
    sources: ['database_search']
  });
}

/**
 * Create document analysis response
 */
export function createDocumentResponse(
  response: string,
  documents: ProcessedDocument[],
  queryType: string = 'document_analysis',
  isLeaseSummary: boolean = false
): AIResponse {
  const sources: AISourceType[] = ['document_analysis'];
  if (documents.some(doc => doc.extractedText)) {
    sources.push('ocr_processing');
  }
  if (isLeaseSummary) {
    sources.push('lease_document_analysis');
  }

  return createAIResponse({
    success: true,
    response,
    queryType,
    confidence: 0.8,
    isLeaseSummary,
    documents,
    sources
  });
}
