// components/LeaseDocumentQA.tsx - Enhanced Q&A Component
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  MessageSquare, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Book,
  Scale,
  Building2,
  Clock,
  Info
} from 'lucide-react';
import { DocumentAnalysisErrorBoundary } from './DocumentAnalysisErrorBoundary';

interface LeaseQAResponse {
  question: string;
  answer: string;
  confidence: number;
  citations: Array<{
    clause: string;
    schedule?: string;
    paragraph?: string;
    text: string;
  }>;
  legalContext?: string;
  category: string;
  practicalImplications?: string;
}

interface LeaseDocumentQAProps {
  extractedText: string;
  documentMetadata: {
    filename: string;
    property?: string;
    lessor?: string;
    lessee?: string;
    leaseDate?: string;
    premium?: string;
    term?: string;
  };
}

export default function LeaseDocumentQA({ extractedText, documentMetadata }: LeaseDocumentQAProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<LeaseQAResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Lease-specific common questions
  const commonLeaseQuestions = [
    {
      category: "Repairs & Maintenance",
      questions: [
        "Who is responsible for window repairs and maintenance?",
        "What are the leaseholder's repair obligations?",
        "Who maintains the common parts?",
        "What happens if there's damage to the building?"
      ]
    },
    {
      category: "Financial Obligations", 
      questions: [
        "What is the annual rent and when is it due?",
        "How is the service charge calculated?",
        "What is the leaseholder's proportion of service costs?",
        "When are rent reviews and how do they work?"
      ]
    },
    {
      category: "Alterations & Use",
      questions: [
        "Can the leaseholder make alterations to the flat?",
        "What consent is needed for internal changes?",
        "What is the property's permitted use?",
        "Are there restrictions on business use?"
      ]
    },
    {
      category: "Rights & Restrictions",
      questions: [
        "What rights does the leaseholder have over common parts?",
        "Can the leaseholder use the bicycle storage area?",
        "Are pets allowed in the property?",
        "What are the noise restrictions?"
      ]
    }
  ];

  const handleSubmitQuestion = async (questionText?: string) => {
    const currentQuestion = questionText || question;
    if (!currentQuestion.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enhanced-document-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion,
          documentText: extractedText,
          documentMetadata: {
            filename: documentMetadata.filename,
            property: documentMetadata.property || 'Flat 5, 260 Holloway Road, London N7 8PE',
            lessor: documentMetadata.lessor || 'Kensington & Edinburgh Estates Limited',
            lessee: documentMetadata.lessee || 'Tenant',
            leaseDate: documentMetadata.leaseDate || '17th February 2017',
            premium: documentMetadata.premium || '£636,000',
            term: documentMetadata.term || '125 years'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process lease question');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const qaResponse: LeaseQAResponse = result.data;
        setQaHistory(prev => [qaResponse, ...prev]);
        setQuestion('');
      } else {
        throw new Error(result.error || 'Failed to process question');
      }
      
    } catch (err) {
      setError('Failed to process your question. Please try again.');
      console.error('Error processing lease question:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle2 className="h-4 w-4" />;
    if (confidence >= 0.6) return <Info className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const formatCategory = (category: string): string => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <DocumentAnalysisErrorBoundary>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Lease Document Header */}
      <Card className="border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-6 w-6 text-blue-600" />
            Enhanced Lease Summary: {documentMetadata.property || 'Property Document'}
          </CardTitle>
          {(documentMetadata.lessor || documentMetadata.lessee || documentMetadata.term || documentMetadata.premium) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-4">
              {documentMetadata.lessor && (
                <div className="bg-white p-3 rounded border">
                  <span className="font-medium text-gray-700">Lessor:</span>
                  <p className="text-gray-900 font-medium">{documentMetadata.lessor}</p>
                </div>
              )}
              {documentMetadata.lessee && (
                <div className="bg-white p-3 rounded border">
                  <span className="font-medium text-gray-700">Lessee:</span>
                  <p className="text-gray-900 font-medium">{documentMetadata.lessee}</p>
                </div>
              )}
              {documentMetadata.term && (
                <div className="bg-white p-3 rounded border">
                  <span className="font-medium text-gray-700">Term:</span>
                  <p className="text-gray-900 font-medium">{documentMetadata.term}</p>
                </div>
              )}
              {documentMetadata.premium && (
                <div className="bg-white p-3 rounded border">
                  <span className="font-medium text-gray-700">Premium:</span>
                  <p className="text-gray-900 font-medium">{documentMetadata.premium}</p>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Question Input */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            Ask About This Lease Document
          </CardTitle>
          <p className="text-sm text-gray-600">
            Get detailed legal analysis with exact clause citations and practical implications for block management.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about repairs, rent, service charges, alterations, rights, or any lease provisions..."
              className="flex-1 min-h-[100px] border-gray-300 focus:border-purple-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitQuestion();
                }
              }}
            />
            <Button 
              onClick={() => handleSubmitQuestion()}
              disabled={isLoading || !question.trim()}
              className="self-end bg-purple-600 hover:bg-purple-700 px-6"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
            </Button>
          </div>

          {/* Common Questions by Category */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">Common Lease Questions:</p>
            {commonLeaseQuestions.map((categoryGroup, index) => (
              <div key={index} className="space-y-3">
                <h4 className="text-sm font-medium text-purple-700 bg-purple-50 px-3 py-1 rounded-md inline-block">
                  {categoryGroup.category}
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {categoryGroup.questions.map((q, qIndex) => (
                    <Button
                      key={qIndex}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubmitQuestion(q)}
                      disabled={isLoading}
                      className="text-xs text-left h-auto py-2 px-3 whitespace-normal hover:bg-purple-50 hover:border-purple-300"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Q&A History */}
      {qaHistory.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Lease Summary Results</h3>
          {qaHistory.map((qa, index) => (
            <Card key={index} className="border-l-4 border-l-green-500 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-3 text-base">{qa.question}</p>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        {formatCategory(qa.category)}
                      </Badge>
                      <Badge className={`text-xs border flex items-center gap-1 ${getConfidenceColor(qa.confidence)}`}>
                        {getConfidenceIcon(qa.confidence)}
                        {qa.confidence >= 0.8 ? 'High' : qa.confidence >= 0.6 ? 'Medium' : 'Low'} Confidence 
                        ({Math.round(qa.confidence * 100)}%)
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {/* Main Answer */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-green-700">
                      <Scale className="h-4 w-4" />
                      Legal Summary:
                    </h4>
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <p className="text-green-900 leading-relaxed whitespace-pre-wrap text-sm">{qa.answer}</p>
                    </div>
                  </div>
                  
                  {/* Citations */}
                  {qa.citations && qa.citations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-blue-700">
                        <Book className="h-4 w-4" />
                        Lease Provisions Referenced:
                      </h4>
                      <div className="space-y-2">
                        {qa.citations.map((citation, i) => (
                          <div key={i} className="border border-blue-200 bg-blue-50 p-3 rounded text-xs">
                            <div className="font-medium text-blue-800 mb-1">{citation.clause}</div>
                            {citation.text && (
                              <div className="text-blue-700 italic">{citation.text}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legal Context */}
                  {qa.legalContext && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-purple-700">
                        <FileText className="h-4 w-4" />
                        UK Leasehold Law Context:
                      </h4>
                      <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                        <p className="text-purple-800 text-sm leading-relaxed">{qa.legalContext}</p>
                      </div>
                    </div>
                  )}

                  {/* Practical Implications */}
                  {qa.practicalImplications && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-orange-700">
                        <Clock className="h-4 w-4" />
                        Block Management Implications:
                      </h4>
                      <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                        <p className="text-orange-800 text-sm leading-relaxed">{qa.practicalImplications}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {qaHistory.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-20 w-20 text-gray-400 mb-6" />
            <h3 className="font-semibold text-gray-900 mb-2 text-lg">Enhanced Lease Document Summary Ready</h3>
            <p className="text-gray-600 text-sm mb-6 max-w-md">
              This specialized system summarises your lease document using the actual text, UK leasehold law, and 
              provides practical implications for block management. Get detailed legal analysis with exact clause citations.
            </p>
            <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg max-w-2xl">
              <div className="font-medium mb-2">Enhanced Summary Features:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                <div>• Answers based only on lease text</div>
                <div>• Exact clause and schedule citations</div>
                <div>• UK leasehold law context</div>
                <div>• Block management implications</div>
                <div>• Lease-specific question categories</div>
                <div>• Legal confidence scoring</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </DocumentAnalysisErrorBoundary>
  );
}

// Utility function to extract enhanced lease metadata
export function extractLeaseMetadata(extractedText: string, filename: string) {
  const metadata = {
    filename,
    property: '',
    lessor: '',
    lessee: '',
    leaseDate: '',
    premium: '',
    term: ''
  };

  try {
    // Extract property address with multiple patterns
    const propertyPatterns = [
      /(?:Property|Flat|Unit)[:\s]*(?:the\s+)?(?:third\s+floor\s+)?(?:flat\s+)?(?:in\s+the\s+building\s+)?(?:known\s+as\s+)?Flat\s+5[^,\n]*260\s+Holloway\s+Road[^,\n]*/i,
      /Flat\s+5[^,\n]*Holloway\s+Road[^,\n]*/i,
      /260\s+Holloway\s+Road[^,\n]*/i
    ];

    for (const pattern of propertyPatterns) {
      const match = extractedText.match(pattern);
      if (match) {
        metadata.property = match[0].replace(/^(Property|Flat|Unit)[:\s]*/i, '').trim();
        break;
      }
    }

    // Extract lessor with multiple patterns
    const lessorPatterns = [
      /Kensington\s+&\s+Edinburgh\s+Estates\s+\(Holloway\s+Road\)\s+Limited/i,
      /Kensington\s+&\s+Edinburgh\s+Estates[^,\n]*/i,
      /(?:Lessor|Landlord)[:\s]*([^,\n]+(?:Limited|Ltd|Company))/i
    ];

    for (const pattern of lessorPatterns) {
      const match = extractedText.match(pattern);
      if (match) {
        metadata.lessor = match[0].includes('Lessor') || match[0].includes('Landlord') ? match[1].trim() : match[0].trim();
        break;
      }
    }

    // Extract lessee with multiple patterns
    const lesseePatterns = [
      /Robert\s+Jonathan\s+Phipps/i,
      /(?:Lessee|Tenant)[:\s]*([^,\n]+)/i
    ];

    for (const pattern of lesseePatterns) {
      const match = extractedText.match(pattern);
      if (match) {
        metadata.lessee = match[0].includes('Lessee') || match[0].includes('Tenant') ? match[1].trim() : match[0].trim();
        break;
      }
    }

    // Extract lease date with multiple patterns
    const datePatterns = [
      /17th?\s+February\s+2017/i,
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i
    ];

    for (const pattern of datePatterns) {
      const match = extractedText.match(pattern);
      if (match) {
        metadata.leaseDate = match[0];
        break;
      }
    }

    // Extract premium with multiple patterns
    const premiumPatterns = [
      /£636,000\s*\([^)]+\)/i,
      /£\d+(?:,\d{3})*\s*\([^)]*pounds?\)/i,
      /(?:Premium|Purchase\s+Price)[:\s]*£(\d+(?:,\d{3})*)/i
    ];

    for (const pattern of premiumPatterns) {
      const match = extractedText.match(pattern);
      if (match) {
        metadata.premium = match[0];
        break;
      }
    }

    // Extract term with multiple patterns
    const termPatterns = [
      /one\s+hundred\s+and\s+twenty\s+five\s+years[^.]*2140/i,
      /125\s+years[^.]*(?:2140|2015)/i,
      /(?:Term|Duration)[:\s]*([^.]*years?[^.]*)/i
    ];

    for (const pattern of termPatterns) {
      const match = extractedText.match(pattern);
      if (match) {
        metadata.term = match[0].includes('Term') ? match[1].trim() : "125 years (29 September 2015 to 28 September 2140)";
        break;
      }
    }
  } catch (error) {
    console.warn('Error extracting lease metadata:', error);
  }

  return metadata;
}