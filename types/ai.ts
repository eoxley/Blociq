// AI-related type definitions for consistent usage across the application

export interface SuggestedAction {
  key: string;
  label: string;
  title?: string;
  icon?: string;
  action?: string;
}

export interface DocumentAnalysis {
  filename: string;
  summary: string;
  suggestedActions?: SuggestedAction[];  // Changed from string[] to SuggestedAction[]
  extractionMethod?: string;
  confidence?: number;
  documentType?: string;
  extractedText?: string;
  complianceStatus?: string;
  keyDates?: Array<{ description: string; date: string }>;
  actionItems?: Array<{ description: string; priority?: 'high' | 'medium' | 'low' }>;
  buildingContext?: {
    buildingId: string | null;
    buildingStatus: 'matched' | 'not_found' | 'unknown';
    extractedAddress: string | null;
    extractedBuildingType: string | null;
  };
}

// Enhanced lease analysis interface
export interface LeaseAnalysis extends DocumentAnalysis {
  leaseDetails?: {
    propertyAddress?: string;
    landlord?: string;
    tenant?: string;
    leaseStartDate?: string;
    leaseEndDate?: string;
    leaseTerm?: string;
    premium?: string;
    initialRent?: string;
    serviceChargePercentage?: string;
    buildingType?: string;
  };
  complianceChecklist?: LeaseComplianceItem[];
  financialObligations?: string[];
  keyRights?: string[];
  restrictions?: string[];
}

export interface LeaseComplianceItem {
  item: string;
  status: 'Y' | 'N' | 'Unknown';
  details?: string;
}

// Standard lease compliance items to check
export const LEASE_COMPLIANCE_CHECKLIST = [
  'Term Consent in favour of Client',
  'Reserve fund',
  'Windows',
  'Pipes',
  'Heating',
  'Parking',
  'Right of Access',
  'TV',
  'Assignment',
  'Alterations',
  'Notice',
  'Sublet',
  'Pets',
  'Debt recovery',
  'Interest',
  'Exterior redecorations',
  'Interior redecorations'
];

export interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
  documentAnalysis?: DocumentAnalysis[];
  results?: DocumentAnalysis[];  // API returns this field
  type?: string;
  message?: string;
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
