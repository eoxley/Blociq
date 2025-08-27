// AI-related type definitions for consistent usage across the application

export interface SuggestedAction {
  key: string;
  label: string;
  icon?: string;
  action?: string;
}

export interface DocumentAnalysis {
  filename: string;
  summary: string;
  suggestedActions?: SuggestedAction[];
  extractionMethod?: string;
  confidence?: number;
  documentType?: string;
  extractedText?: string;
}

export interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
  documentAnalysis?: DocumentAnalysis[];
  results?: DocumentAnalysis[]; // Added for document analysis results from API
}

export interface SummarizeAndSuggestResult {
  summary: string;
  suggestions: SuggestedAction[];
  suggestedActions: SuggestedAction[];
}

export interface TriageResult {
  category: string;
  summary?: string;
  suggestedActions?: SuggestedAction[];
  confidence?: number;
}
