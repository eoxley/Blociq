'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  MessageSquare, 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight,
  Clock,
  Hash,
  User,
  Building
} from 'lucide-react';

// TypeScript interfaces
interface QAHistory {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  citations: string[];
  relevantSections: string[];
  category: string;
  timestamp: Date;
}

interface DocumentMetadata {
  filename: string;
  documentType: string;
  textLength: number;
  property?: string;
  parties?: string[];
  premium?: string;
  term?: string;
}

interface DocumentQAProps {
  documentText: string;
  documentMetadata: DocumentMetadata;
  onQuestionSubmit?: (question: string) => void;
}

const DocumentQA: React.FC<DocumentQAProps> = ({
  documentText,
  documentMetadata,
  onQuestionSubmit
}) => {
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<QAHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Common lease questions for quick access
  const commonQuestions = [
    "Who is responsible for window repairs?",
    "Can I make alterations to the property?", 
    "What's my rent and when is it due?",
    "Are pets allowed in the property?",
    "How much notice is needed to terminate?",
    "What maintenance am I responsible for?",
    "Who handles building insurance?",
    "What are the service charge provisions?"
  ];

  // Submit question to API
  const handleSubmitQuestion = async (questionText: string) => {
    if (!questionText.trim()) return;

    setIsLoading(true);
    setError(null);
    onQuestionSubmit?.(questionText);

    try {
      console.log('📝 Submitting question to Q&A API:', questionText);
      
      const response = await fetch('/api/ask-ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questionText,
          documentText,
          documentMetadata
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Q&A API response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to get answer');
      }

      const qaItem: QAHistory = {
        id: Date.now().toString(),
        question: questionText,
        answer: result.data.answer,
        confidence: result.data.confidence,
        citations: result.data.citations || [],
        relevantSections: result.data.relevantSections || [],
        category: result.data.category || 'general',
        timestamp: new Date()
      };

      setQaHistory(prev => [qaItem, ...prev]);
      setQuestion(''); // Clear input

    } catch (error) {
      console.error('❌ Q&A API error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process question');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuestion(question);
    }
  };

  // Toggle expanded sections
  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Get confidence label
  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  // Format category for display
  const formatCategory = (category: string): string => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Extract property address from document metadata or text
  const extractPropertyInfo = (): string => {
    if (documentMetadata.property) return documentMetadata.property;
    
    // Try to extract from document text
    const addressMatch = documentText.match(/(?:Property|Premises|Flat|Unit):\s*([^\n]+)/i);
    if (addressMatch) return addressMatch[1].trim();
    
    // Look for common address patterns
    const addressPattern = /([A-Za-z0-9\s,]+(?:Road|Street|Lane|Avenue|Place|Court|Drive|Close|Way|Gardens)[^,\n]*)/i;
    const match = documentText.match(addressPattern);
    return match ? match[0].trim() : 'Property address not found';
  };

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <span>Document Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Property:</span>
                <span>{extractPropertyInfo()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Type:</span>
                <span>{formatCategory(documentMetadata.documentType)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Text Length:</span>
                <span>{documentMetadata.textLength.toLocaleString()} characters</span>
              </div>
            </div>
            <div className="space-y-2">
              {documentMetadata.parties && (
                <div className="flex items-start space-x-2">
                  <User className="h-4 w-4 text-gray-500 mt-0.5" />
                  <span className="font-medium">Parties:</span>
                  <span>{documentMetadata.parties.join(', ')}</span>
                </div>
              )}
              {documentMetadata.premium && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Premium:</span>
                  <span>{documentMetadata.premium}</span>
                </div>
              )}
              {documentMetadata.term && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Term:</span>
                  <span>{documentMetadata.term}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-green-600" />
            <span>Ask a Question</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Question Input */}
            <div className="flex space-x-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about repairs, rent, responsibilities, alterations..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={() => handleSubmitQuestion(question)}
                disabled={isLoading || !question.trim()}
                className="px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Common Questions */}
            <div>
              <p className="text-sm text-gray-600 mb-3">Common lease questions:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {commonQuestions.map((q, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmitQuestion(q)}
                    disabled={isLoading}
                    className="justify-start text-left h-auto py-2 px-3"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Q&A History */}
      {qaHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6 text-purple-600" />
              <span>Q&A History</span>
              <Badge variant="secondary" className="ml-auto">
                {qaHistory.length} question{qaHistory.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {qaHistory.map((qa) => (
                <div key={qa.id} className="border-l-4 border-blue-200 pl-4">
                  {/* Question */}
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 mb-1">Question:</h4>
                    <p className="text-gray-700">{qa.question}</p>
                    <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                      <span>{formatCategory(qa.category)}</span>
                      <span>•</span>
                      <span>{qa.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">Answer:</h4>
                      <Badge className={getConfidenceColor(qa.confidence)}>
                        {getConfidenceLabel(qa.confidence)} ({Math.round(qa.confidence * 100)}%)
                      </Badge>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {qa.answer.split('\n').map((paragraph, idx) => (
                        <p key={idx} className="mb-2 last:mb-0">{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  {/* Citations */}
                  {qa.citations.length > 0 && (
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 mb-2">Citations:</h5>
                      <div className="flex flex-wrap gap-2">
                        {qa.citations.map((citation, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {citation}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Relevant Sections (Expandable) */}
                  {qa.relevantSections.length > 0 && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection(qa.id)}
                        className="h-auto p-0 text-gray-600 hover:text-gray-900"
                      >
                        {expandedSections.has(qa.id) ? (
                          <ChevronDown className="h-4 w-4 mr-1" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-1" />
                        )}
                        View Relevant Document Sections ({qa.relevantSections.length})
                      </Button>
                      
                      {expandedSections.has(qa.id) && (
                        <div className="mt-2 space-y-2">
                          {qa.relevantSections.map((section, idx) => (
                            <div key={idx} className="bg-blue-50 p-3 rounded border-l-2 border-blue-200">
                              <p className="text-sm text-gray-700 font-mono leading-relaxed">
                                {section}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {qaHistory.length === 0 && !isLoading && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-medium text-gray-900">Ready to Analyze</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Ask any question about this lease document. I can help you understand repairs and maintenance, 
                rent payments, alteration rights, tenant responsibilities, and more. Use the common questions 
                above or type your own specific question.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentQA;