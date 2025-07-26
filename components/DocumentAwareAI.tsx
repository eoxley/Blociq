"use client";

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Upload, 
  FileText, 
  Brain, 
  Send, 
  Loader2, 
  X,
  Calendar,
  User,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface DocumentContext {
  fileName: string;
  type: string;
  summary: string;
  inspection_date?: string;
  next_due_date?: string;
  responsible_party?: string;
  action_required?: string;
}

interface AIResponse {
  answer: string;
  sources: Array<{
    name: string;
    type: string;
    uploaded: string;
  }>;
  documentCount: number;
}

interface DocumentAwareAIProps {
  buildingId?: string;
  unitId?: string;
  leaseholderId?: string;
  className?: string;
}

export default function DocumentAwareAI({
  buildingId,
  unitId,
  leaseholderId,
  className = ""
}: DocumentAwareAIProps) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<DocumentContext | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    getSession();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }
    if (!userId) {
      toast.error('User not authenticated. Please log in.');
      return;
    }
    if (!buildingId) {
      toast.error('Building context required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ask-blociq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          buildingId,
          userId,
          documentContext
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      setResponse(data);
      toast.success('AI response generated successfully');

    } catch (error: any) {
      console.error("❌ AI request error:", error);
      toast.error(error.message || 'Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!uploadedFile) return;

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      if (buildingId) {
        formData.append('buildingId', buildingId);
      }

      const response = await fetch('/api/upload-and-analyse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      console.log("🧠 Document Analysis Result:", data);

      // Check if the document was processed successfully
      if (data.ai && data.ai.extractedText) {
        // Set document context for AI
        setDocumentContext({
          fileName: data.ai.originalFileName,
          type: data.ai.document_type,
          summary: data.ai.summary,
          inspection_date: data.ai.inspection_date,
          next_due_date: data.ai.next_due_date,
          responsible_party: data.ai.responsible_party,
          action_required: data.ai.action_required,
        });

        setShowDocumentUpload(false);
        setUploadedFile(null);
        toast.success('Document uploaded and analysed successfully');
      } else {
        // Document processing failed or yielded limited content
        throw new Error('Document processing yielded limited content. Please try uploading a different version or format.');
      }

    } catch (error: any) {
      console.error("❌ Upload error:", error);
      
      // Provide specific error messages based on the error
      let errorMessage = error.message || 'Failed to upload and analyse document';
      
      if (error.message.includes('OCR') || error.message.includes('scanned')) {
        errorMessage = 'This appears to be a scanned document. Please upload a text-based version or use OCR processing.';
      } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
        errorMessage = 'The file appears to be corrupted or in an invalid format. Please try uploading a different version.';
      } else if (error.message.includes('unsupported')) {
        errorMessage = 'This file type is not supported. Please upload PDF, DOCX, TXT, or image files.';
      }
      
      toast.error(errorMessage);
    } finally {
      setUploadLoading(false);
    }
  };

  const clearDocumentContext = () => {
    setDocumentContext(null);
    toast.info('Document context cleared');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('Unsupported file type. Please upload PDF, DOCX, DOC, TXT, or image files.');
        return;
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        toast.error('File too large. Please upload files smaller than 10MB.');
        return;
      }
      
      // Check for empty files
      if (selectedFile.size === 0) {
        toast.error('File appears to be empty. Please select a valid file.');
        return;
      }
      
      setUploadedFile(selectedFile);
      toast.success(`File selected: ${selectedFile.name}`);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Document Context Banner */}
      {documentContext && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <FileText className="h-5 w-5" />
              Document Context Active
              <Badge variant="default" className="bg-green-600">AI Aware</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-green-900">{documentContext.fileName}</p>
                  <p className="text-sm text-green-700">{documentContext.type}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDocumentContext}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-sm text-green-800">
                <p className="mb-2"><strong>Summary:</strong> {documentContext.summary.substring(0, 150)}...</p>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {documentContext.inspection_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Inspection: {documentContext.inspection_date}</span>
                    </div>
                  )}
                  {documentContext.next_due_date && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Next Due: {documentContext.next_due_date}</span>
                    </div>
                  )}
                  {documentContext.responsible_party && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Responsible: {documentContext.responsible_party}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Document-Aware AI Assistant
            {documentContext && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Document Context Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Ask about your building, documents, or compliance:
              </label>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  documentContext 
                    ? `Ask about ${documentContext.fileName} or any building-related question...`
                    : "Ask about your building, upload a document first for context-aware responses..."
                }
                rows={3}
                className="resize-none"
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDocumentUpload(true)}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
              
              <Button
                type="submit"
                disabled={loading || !question.trim()}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Ask AI
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* AI Response */}
          {response && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-2">AI Response</h4>
                    <div className="text-blue-800 whitespace-pre-wrap">
                      {response.answer}
                    </div>
                  </div>
                </div>

                {/* Sources */}
                {response.sources && response.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <h5 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Sources ({response.documentCount})
                    </h5>
                    <div className="space-y-1">
                      {response.sources.map((source, index) => (
                        <div key={index} className="text-xs text-blue-700 flex items-center gap-2">
                          <CheckCircle className="h-3 w-3" />
                          <span>{source.name}</span>
                          <Badge variant="outline">
                            {source.type}
                          </Badge>
                          <span className="text-blue-600">
                            {new Date(source.uploaded).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Upload Dialog */}
      <Dialog open={showDocumentUpload} onOpenChange={setShowDocumentUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Document for AI Context
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select PDF Document
              </label>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={uploadLoading}
              />
            </div>
            
            {uploadedFile && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">{uploadedFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDocumentUpload(false);
                  setUploadedFile(null);
                }}
                disabled={uploadLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDocumentUpload}
                disabled={!uploadedFile || uploadLoading}
                className="flex items-center gap-2"
              >
                {uploadLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Upload & Analyse
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 