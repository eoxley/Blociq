import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { SuggestedAction as AISuggestedAction, DocumentAnalysis } from '@/types/ai';

// Shared types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: UploadedFile[];
  documentAnalysis?: DocumentAnalysis[];
}

export interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  extractionMethod?: 'ocr' | 'enhanced' | 'standard';
}

export interface SuggestedAction {
  type: 'todo';
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date?: string | null;
  description?: string;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  summary: string;
  doc_url: string;
  uploaded_at: string;
  expiry_date?: string;
}

export interface AIResponse {
  success: boolean;
  response: string;
  documentSearch?: boolean;
  documents?: DocumentSearchResult[];
  suggested_action?: SuggestedAction;
  context?: {
    majorWorksUsed?: boolean;
    complianceUsed?: boolean;
  };
}

export interface UseAskBlocIQProps {
  buildingId?: string;
  buildingName?: string;
  selectedMessage?: any;
  isPublic?: boolean; // New flag for public mode
}

export interface UseAskBlocIQReturn {
  // State
  messages: Message[];
  question: string;
  isLoading: boolean;
  uploadedFiles: UploadedFile[];
  isDragOver: boolean;
  suggestedAction: SuggestedAction | null;
  documentResults: DocumentSearchResult[];
  isDocumentSearch: boolean;
  usedMajorWorksData: boolean;
  addingToTodo: boolean;
  addingToCalendar: boolean;
  
  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  
  // Context
  projectId: string | null;
  isMajorWorksContext: boolean;
  
  // Functions
  setQuestion: (question: string) => void;
  setIsDragOver: (isDragOver: boolean) => void;
  setSuggestedAction: (action: SuggestedAction | null) => void;
  setDocumentResults: (results: DocumentSearchResult[]) => void;
  setIsDocumentSearch: (isSearch: boolean) => void;
  setUsedMajorWorksData: (used: boolean) => void;
  setAddingToTodo: (adding: boolean) => void;
  setAddingToCalendar: (adding: boolean) => void;
  
  // Core functionality
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleFileUpload: (files: FileList | null) => void;
  removeFile: (index: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleSuggestedPrompt: (prompt: string) => void;
  handleCreateLetter: (aiContent: string) => void;
  handleSendEmail: (aiContent: string) => void;
  handleSaveAsNotice: (aiContent: string) => void;
  handleAddToTodo: () => Promise<void>;
  handleAddToOutlook: () => Promise<void>;
  getFileIcon: (fileType: string) => string;
  formatFileSize: (bytes: number) => string;
  getSuggestedPrompts: () => string[];
  
  // Utility functions
  fileToBase64: (file: File) => Promise<string>;
}

// Extract project ID from pathname
const extractProjectId = (pathname: string): string | null => {
  const majorWorksMatch = pathname.match(/\/major-works\/([^\/]+)/);
  return majorWorksMatch ? majorWorksMatch[1] : null;
};

// Suggested prompts based on building context and major works
const getSuggestedPrompts = (buildingName?: string, isMajorWorksContext?: boolean, projectId?: string, isPublic: boolean = false) => {
  if (isPublic) {
    // Public mode: Generic property management prompts
    return [
      "What are the key responsibilities of a property manager?",
      "How do I handle a maintenance request?",
      "What should I include in a property inspection?",
      "How do I deal with noisy neighbors?",
      "What are the basics of lease management?",
      "How do I handle emergency situations?",
      "What are common property management challenges?",
      "How do I improve tenant relations?"
    ];
  }

  if (isMajorWorksContext && projectId) {
    return [
      "Generate a Section 20 notice for this project",
      "Summarise this Major Works Project",
      "What's the current project timeline?",
      "Show me all project documents",
      "What are the next milestones?",
      "Calculate the cost breakdown",
      "Generate a project status report"
    ];
  }

  const basePrompts = [
    "What are the overdue tasks?",
    "Summarise the last fire inspection",
    "What's the next EICR due?",
    "Show me recent compliance alerts",
    "What maintenance is scheduled this month?"
  ];

  if (buildingName) {
    return [
      `What are the overdue tasks for ${buildingName}?`,
      `Summarise the last fire inspection for ${buildingName}`,
      `What's the next EICR due for ${buildingName}?`,
      `Show me recent compliance alerts for ${buildingName}`,
      `What maintenance is scheduled for ${buildingName} this month?`
    ];
  }

  return basePrompts;
};

export function useAskBlocIQ({ buildingId, buildingName, selectedMessage, isPublic = false }: UseAskBlocIQProps): UseAskBlocIQReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [suggestedAction, setSuggestedAction] = useState<SuggestedAction | null>(null);
  const [documentResults, setDocumentResults] = useState<DocumentSearchResult[]>([]);
  const [isDocumentSearch, setIsDocumentSearch] = useState(false);
  const [usedMajorWorksData, setUsedMajorWorksData] = useState(false);
  const [addingToTodo, setAddingToTodo] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  
  const pathname = usePathname();
  const projectId = extractProjectId(pathname || '');
  const isMajorWorksContext = Boolean(pathname?.includes('major-works') && projectId);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // Handle add to todo
  const handleAddToTodo = async () => {
    if (!suggestedAction || !buildingId) return;
    
    setAddingToTodo(true);
    try {
      const response = await fetch('/api/create-task-from-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestedAction,
          buildingId: parseInt(buildingId)
        }),
      });

      if (response.ok) {
        setSuggestedAction(null);
        toast.success('✅ Task added to your building to-do list!');
      } else {
        toast.error('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setAddingToTodo(false);
    }
  };

  // Handle add to Outlook calendar
  const handleAddToOutlook = async () => {
    if (!suggestedAction) return;
    
    setAddingToCalendar(true);
    try {
      const response = await fetch('/api/add-to-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: suggestedAction.title,
          date: suggestedAction.due_date,
          building: buildingName || 'Building'
        }),
      });

      if (response.ok) {
        setSuggestedAction(null);
        toast.success('📅 Event added to your Outlook calendar!');
      } else {
        toast.error('Failed to add to calendar');
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
      toast.error('Failed to add to calendar');
    } finally {
      setAddingToCalendar(false);
    }
  };

  // Handle suggested prompt click
  const handleSuggestedPrompt = (prompt: string) => {
    setQuestion(prompt);
  };

  // Handle create letter
  const handleCreateLetter = (aiContent: string) => {
    toast.info('Letter creation feature available for BlocIQ clients. Contact us to learn more!');
  };

  // Handle send email
  const handleSendEmail = (aiContent: string) => {
    toast.info('Email sending feature available for BlocIQ clients. Contact us to learn more!');
  };

  // Handle save as notice
  const handleSaveAsNotice = (aiContent: string) => {
    toast.info('Notice saving feature available for BlocIQ clients. Contact us to learn more!');
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text')) return '📄';
    return '📎';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle chat submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() && uploadedFiles.length === 0) {
      toast.error('Please enter a question or upload a file.');
      return;
    }

    // Add user message to history
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setSuggestedAction(null);
    setDocumentResults([]);
    setIsDocumentSearch(false);
    
    try {
      let finalPrompt = question.trim();
      const uploadedFileResults: any[] = [];

      // Handle file uploads first if any files are present
      if (uploadedFiles.length > 0) {
        // Process each file through appropriate analysis based on mode
        for (const uploadedFile of uploadedFiles) {
          try {
            console.log('🔄 Processing file:', uploadedFile.name, 'Type:', uploadedFile.file.type);
            
            if (isPublic) {
              // Public mode: Use external OCR service
              console.log('🔒 Public mode: Using external OCR service');
              
              const formData = new FormData();
              formData.append('file', uploadedFile.file);
              
              const ocrResponse = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
                method: 'POST',
                body: formData,
              });

              if (!ocrResponse.ok) {
                throw new Error(`OCR failed: ${ocrResponse.status}`);
              }

              const ocrResult = await ocrResponse.json();
              console.log('✅ External OCR successful');
              
              // Create basic document analysis result for public mode
              const documentAnalysis: DocumentAnalysis = {
                filename: uploadedFile.name,
                summary: ocrResult.text ? `Document processed via OCR. Extracted ${ocrResult.text.length} characters.` : 'Document processed via OCR.',
                suggestedActions: [],
                extractionMethod: 'external_ocr',
                extractedText: ocrResult.text || '',
                documentType: 'other'
              };
              
              uploadedFileResults.push(documentAnalysis);

              // Add OCR analysis to the prompt
              if (!finalPrompt) {
                finalPrompt = `Please analyze the uploaded document: ${uploadedFile.name}`;
              }
              finalPrompt += `\n\nDocument: ${uploadedFile.name}\nOCR Text: ${ocrResult.text ? ocrResult.text.substring(0, 500) + '...' : 'No text extracted'}\n\nPlease provide insights based on the OCR content.`;
              
              // Add document analysis to messages for display
              const analysisMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `📄 **${uploadedFile.name}** processed via OCR!\n\n**Extraction Method:** External OCR\n**Text Length:** ${ocrResult.text ? ocrResult.text.length : 0} characters`,
                timestamp: new Date(),
                documentAnalysis: [documentAnalysis]
              };
              
              setMessages(prev => [...prev, analysisMessage]);
            } else {
              // Full mode: Use comprehensive document analysis
              console.log('🔄 Processing file through comprehensive analysis:', uploadedFile.name, 'Type:', uploadedFile.file.type);
              
              // Convert file to base64 for analysis
              const base64Data = await fileToBase64(uploadedFile.file);
              console.log('✅ File converted to base64, length:', base64Data.length);
              
              // Process through comprehensive document analysis endpoint
              const analysisResponse = await fetch('/api/documents/analyze-comprehensive', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  file: base64Data,
                  fileName: uploadedFile.name,
                  buildingId: buildingId
                }),
              });

              if (!analysisResponse.ok) {
                const errorText = await analysisResponse.text();
                console.error('❌ Comprehensive analysis failed:', analysisResponse.status, errorText);
                throw new Error(`Document analysis failed: ${analysisResponse.status}`);
              }

              const analysisResult = await analysisResponse.json();
              console.log('✅ Comprehensive analysis successful:', analysisResult);
              
              if (analysisResult.success) {
                // Create structured document analysis result
                const documentAnalysis: DocumentAnalysis = {
                  filename: uploadedFile.name,
                  summary: analysisResult.analysis.summary || 'Document analyzed successfully',
                  suggestedActions: analysisResult.suggestedActions || [],
                  extractionMethod: 'comprehensive_analysis',
                  extractedText: analysisResult.extractedText,
                  documentType: analysisResult.documentType
                };
                
                uploadedFileResults.push(documentAnalysis);

                // Add comprehensive analysis to the prompt
                if (!finalPrompt) {
                  finalPrompt = `Please analyze the uploaded document: ${uploadedFile.name}`;
                }
                finalPrompt += `\n\nDocument: ${uploadedFile.name}\nType: ${analysisResult.documentType}\nSummary: ${analysisResult.analysis.summary}\n\nPlease provide insights and answer any specific questions about this document.`;
                
                // Add document analysis to messages for display
                const analysisMessage: Message = {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `📄 **${uploadedFile.name}** analyzed successfully!\n\n**Document Type:** ${analysisResult.documentType}\n**Summary:** ${analysisResult.analysis.summary}`,
                  timestamp: new Date(),
                  documentAnalysis: [documentAnalysis]
                };
                
                setMessages(prev => [...prev, analysisMessage]);
              } else {
                throw new Error('Document analysis failed');
              }
            }
          } catch (uploadError) {
            console.error(`Error processing ${uploadedFile.name}:`, uploadError);
            toast.error(`Failed to process ${uploadedFile.name}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          }
        }
      }

      // Now send the enhanced prompt to the main ask-ai endpoint
      const requestBody = JSON.stringify({
        question: finalPrompt, // API expects 'question'
        buildingId: buildingId, // Always pass buildingId - let backend handle gracefully
        contextType: isPublic ? 'public' : (isMajorWorksContext ? 'major_works' : 'general'),
        projectId: isPublic ? undefined : (isMajorWorksContext ? projectId : undefined),
        uploadedFiles: uploadedFileResults,
        isPublic: isPublic // Flag to indicate public mode
      });

      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      if (data.success && data.response) {
        // Check if Major Works data was used (only in full mode)
        if (!isPublic) {
          setUsedMajorWorksData(data.context?.majorWorksUsed || false);
        }
        
        // Add assistant message to history
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          documentAnalysis: uploadedFileResults.length > 0 ? uploadedFileResults : undefined
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Handle document search results (only in full mode)
        if (!isPublic && data.documentSearch && data.documents) {
          setIsDocumentSearch(true);
          setDocumentResults(data.documents);
        }
        
        // Check if there's a suggested action (only in full mode)
        if (!isPublic && data.suggested_action) {
          setSuggestedAction(data.suggested_action);
        }

        // Log the AI interaction to ai_logs (only in full mode)
        if (!isPublic) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('ai_logs')
                .insert({
                  user_id: user.id,
                  question: finalPrompt,
                  response: data.response,
                  timestamp: new Date().toISOString(),
                  building_id: buildingId,
                  document_search: data.documentSearch || false,
                  documents_found: data.documents?.length || 0,
                  files_uploaded: uploadedFiles.length
                });
            }
          } catch (logError) {
            console.error('Failed to log AI interaction:', logError);
          }
        }
      } else {
        toast.error('Error: No response from AI service');
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('Error: Failed to connect to AI service. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
      setQuestion('');
      setUploadedFiles([]);
    }
  };

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  // Remove file
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return {
    // State
    messages,
    question,
    isLoading,
    uploadedFiles,
    isDragOver,
    suggestedAction,
    documentResults,
    isDocumentSearch,
    usedMajorWorksData,
    addingToTodo,
    addingToCalendar,
    
    // Refs
    messagesEndRef,
    fileInputRef,
    inputRef,
    
    // Context
    projectId,
    isMajorWorksContext,
    
    // Functions
    setQuestion,
    setIsDragOver,
    setSuggestedAction,
    setDocumentResults,
    setIsDocumentSearch,
    setUsedMajorWorksData,
    setAddingToTodo,
    setAddingToCalendar,
    
    // Core functionality
    handleSubmit,
    handleFileUpload,
    removeFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleSuggestedPrompt,
    handleCreateLetter,
    handleSendEmail,
    handleSaveAsNotice,
    handleAddToTodo,
    handleAddToOutlook,
    getFileIcon,
    formatFileSize,
    getSuggestedPrompts: () => getSuggestedPrompts(buildingName, isMajorWorksContext, projectId || undefined, isPublic),
    
    // Utility functions
    fileToBase64,
  };
}
