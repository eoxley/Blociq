// Document Q&A System TypeScript Types

export interface QAResponse {
  question: string;
  answer: string;
  confidence: number;
  citations: string[];
  relevantSections: string[];
  category: string;
  metadata?: {
    processingTime: number;
    modelUsed: string;
    documentLength: number;
  };
}

export interface QAHistory {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  citations: string[];
  relevantSections: string[];
  category: string;
  timestamp: Date;
}

export interface DocumentMetadata {
  filename: string;
  documentType: string;
  textLength: number;
  property?: string;
  parties?: string[];
  premium?: string;
  term?: string;
}

export interface ProcessedDocument {
  id: string;
  filename: string;
  documentType: string;
  textLength: number;
  extractedText: string;
  property?: string;
  parties?: string[];
  premium?: string;
  term?: string;
  ocrSource: string;
  timestamp: Date;
}

export interface DocumentQAProps {
  documentText: string;
  documentMetadata: DocumentMetadata;
  onQuestionSubmit?: (question: string) => void;
}

export interface QAApiRequest {
  question: string;
  documentText: string;
  documentMetadata?: DocumentMetadata;
}

export interface QAApiResponse {
  success: boolean;
  data?: QAResponse;
  error?: string;
  details?: string;
}

export type QuestionCategory = 
  | 'repairs_maintenance'
  | 'rent_payments'
  | 'alterations'
  | 'responsibilities'
  | 'termination'
  | 'pets_restrictions'
  | 'utilities'
  | 'insurance'
  | 'access'
  | 'general';

export interface CommonQuestion {
  text: string;
  category: QuestionCategory;
  description?: string;
}

export const COMMON_LEASE_QUESTIONS: CommonQuestion[] = [
  {
    text: "Who is responsible for window repairs?",
    category: "repairs_maintenance",
    description: "Find out repair obligations for windows and glass"
  },
  {
    text: "Can I make alterations to the property?",
    category: "alterations",
    description: "Understand alteration and modification rights"
  },
  {
    text: "What's my rent and when is it due?",
    category: "rent_payments",
    description: "Get rental payment details and schedule"
  },
  {
    text: "Are pets allowed in the property?",
    category: "pets_restrictions",
    description: "Check pet policies and restrictions"
  },
  {
    text: "How much notice is needed to terminate?",
    category: "termination",
    description: "Find termination notice requirements"
  },
  {
    text: "What maintenance am I responsible for?",
    category: "repairs_maintenance",
    description: "Understand tenant maintenance obligations"
  },
  {
    text: "Who handles building insurance?",
    category: "insurance",
    description: "Clarify insurance responsibilities"
  },
  {
    text: "What are the service charge provisions?",
    category: "utilities",
    description: "Get details on service charges and costs"
  }
];

// Confidence level indicators
export const CONFIDENCE_LEVELS = {
  HIGH: { min: 0.8, label: 'High Confidence', color: 'green' },
  MEDIUM: { min: 0.6, label: 'Medium Confidence', color: 'yellow' },
  LOW: { min: 0, label: 'Low Confidence', color: 'red' }
} as const;

// OCR Source types
export type OCRSource = 
  | 'google_vision' 
  | 'openai_vision' 
  | 'tesseract' 
  | 'pdfjs' 
  | 'test_mode' 
  | 'timeout' 
  | 'failed';

// Document extraction result (from OCR)
export interface DocumentExtractionResult {
  success: boolean;
  documentType: string;
  summary: string;
  analysis: string;
  filename: string;
  textLength: number;
  extractedText: string;
  ocrSource: OCRSource;
  metadata: {
    fileType?: string;
    fileSize?: number;
    fileSizeMB?: string;
    extractedLength?: number;
    timestamp?: string;
    ocrMethod?: string;
    processingTime?: number;
    pageCount?: number;
    errorDetails?: string;
    availableMethods?: string[];
  };
}

// Property information extracted from documents
export interface PropertyInfo {
  property: string;
  parties: string[];
  premium: string;
  term: string;
}

// Citation patterns for legal documents
export const CITATION_PATTERNS = {
  CLAUSE: /clause\s+\d+(?:\.\d+)*/gi,
  PARAGRAPH: /paragraph\s+\d+(?:\.\d+)*/gi,
  SCHEDULE: /schedule\s+\d+(?:\s+paragraph\s+\d+)?/gi,
  SECTION: /section\s+\d+(?:\.\d+)*/gi,
  PART: /part\s+\d+(?:\.\d+)*/gi,
  NUMERIC: /\b\d+\.\d+(?:\.\d+)*\b/g
} as const;

export default {
  QAResponse,
  QAHistory,
  DocumentMetadata,
  ProcessedDocument,
  DocumentQAProps,
  QAApiRequest,
  QAApiResponse,
  COMMON_LEASE_QUESTIONS,
  CONFIDENCE_LEVELS,
  CITATION_PATTERNS
};