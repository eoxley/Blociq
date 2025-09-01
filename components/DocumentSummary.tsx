// components/DocumentSummary.tsx - Enhanced Document Summary Display Component
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Calendar, 
  Users, 
  MapPin, 
  PoundSterling, 
  Clock,
  AlertCircle,
  CheckCircle2,
  Info,
  MessageSquare,
  Sparkles,
  Building,
  Hash
} from 'lucide-react';

export interface DocumentSummary {
  documentName: string;
  documentType: string;
  keyDates: {
    startDate?: string;
    endDate?: string;
    paymentDates?: string[];
    reviewDates?: string[];
    noticePeriods?: string[];
    otherImportantDates?: Array<{date: string, description: string}>;
  };
  keyParties: {
    lessor?: string;
    lessee?: string;
    agent?: string;
    guarantor?: string;
  };
  propertyDetails: {
    address?: string;
    type?: string;
    description?: string;
  };
  financialTerms: {
    rent?: string;
    deposit?: string;
    serviceCharge?: string;
    otherFees?: Array<{type: string, amount: string}>;
  };
  keyTerms: string[];
  summary: string;
  extractedLength: number;
  confidence: number;
}

interface DocumentSummaryProps {
  summary: DocumentSummary;
  onStartQA: () => void;
}

export default function DocumentSummary({ summary, onStartQA }: DocumentSummaryProps) {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle2 className="h-4 w-4" />;
    if (confidence >= 0.6) return <Info className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Try to parse various date formats
    try {
      // Handle UK date formats
      const ukDateMatch = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{2,4})/i);
      if (ukDateMatch) {
        const [, day, month, year] = ukDateMatch;
        const date = new Date(`${month} ${day}, ${year}`);
        return date.toLocaleDateString('en-GB');
      }
      
      // Handle standard date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB');
      }
      
      return dateStr; // Return as-is if can't parse
    } catch {
      return dateStr;
    }
  };

  const formatCategory = (category: string): string => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Check if we have meaningful data in each section
  const hasPropertyDetails = summary.propertyDetails.address || summary.propertyDetails.type || summary.propertyDetails.description;
  const hasParties = Object.values(summary.keyParties).some(party => party && party.trim());
  const hasDates = Object.values(summary.keyDates).some(dates => 
    dates && (Array.isArray(dates) ? dates.length > 0 : typeof dates === 'string' && dates.trim())
  );
  const hasFinancials = Object.values(summary.financialTerms).some(term => 
    term && (Array.isArray(term) ? term.length > 0 : typeof term === 'string' && term.trim())
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Document Header */}
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-3 text-xl mb-3">
                <FileText className="h-6 w-6 text-blue-600" />
                {summary.documentName}
              </CardTitle>
              <div className="flex items-center gap-4 flex-wrap mb-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {formatCategory(summary.documentType)}
                </Badge>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm border ${getConfidenceColor(summary.confidence)}`}>
                  {getConfidenceIcon(summary.confidence)}
                  <span className="font-medium">
                    {getConfidenceLabel(summary.confidence)} ({Math.round(summary.confidence * 100)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Hash className="h-4 w-4" />
                  <span>{summary.extractedLength.toLocaleString()} characters</span>
                </div>
              </div>
            </div>
            <Button 
              onClick={onStartQA} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Q&A Session
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed text-base">{summary.summary}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Property Details */}
        {hasPropertyDetails && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-green-600" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.propertyDetails.address && (
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-l-green-400">
                  <div className="flex items-start gap-2">
                    <Building className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-sm text-green-800 block">Property Address:</span>
                      <p className="text-green-700 font-medium">{summary.propertyDetails.address}</p>
                    </div>
                  </div>
                </div>
              )}
              {summary.propertyDetails.type && (
                <div>
                  <span className="font-medium text-sm text-gray-600">Property Type:</span>
                  <p className="text-gray-800">{summary.propertyDetails.type}</p>
                </div>
              )}
              {summary.propertyDetails.description && (
                <div>
                  <span className="font-medium text-sm text-gray-600">Description:</span>
                  <p className="text-gray-700 text-sm leading-relaxed">{summary.propertyDetails.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Key Parties */}
        {hasParties && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-purple-600" />
                Key Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.keyParties.lessor && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-sm text-purple-800 block">Lessor/Landlord:</span>
                  <p className="text-purple-700 font-medium">{summary.keyParties.lessor}</p>
                </div>
              )}
              {summary.keyParties.lessee && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-sm text-blue-800 block">Lessee/Tenant:</span>
                  <p className="text-blue-700 font-medium">{summary.keyParties.lessee}</p>
                </div>
              )}
              {summary.keyParties.agent && (
                <div>
                  <span className="font-medium text-sm text-gray-600">Managing Agent:</span>
                  <p className="text-gray-800">{summary.keyParties.agent}</p>
                </div>
              )}
              {summary.keyParties.guarantor && (
                <div>
                  <span className="font-medium text-sm text-gray-600">Guarantor:</span>
                  <p className="text-gray-800">{summary.keyParties.guarantor}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Key Dates */}
      {hasDates && (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-orange-600" />
              Important Dates & Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.keyDates.startDate && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-sm text-green-800">Lease Start</span>
                  </div>
                  <p className="text-green-700 font-medium">{formatDate(summary.keyDates.startDate)}</p>
                </div>
              )}
              {summary.keyDates.endDate && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="font-medium text-sm text-red-800">Lease End</span>
                  </div>
                  <p className="text-red-700 font-medium">{formatDate(summary.keyDates.endDate)}</p>
                </div>
              )}
              {summary.keyDates.paymentDates && summary.keyDates.paymentDates.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-sm text-blue-800">Payment Dates</span>
                  </div>
                  {summary.keyDates.paymentDates.slice(0, 3).map((date, i) => (
                    <p key={i} className="text-blue-700 text-sm font-medium">{date}</p>
                  ))}
                  {summary.keyDates.paymentDates.length > 3 && (
                    <p className="text-blue-600 text-xs">+{summary.keyDates.paymentDates.length - 3} more</p>
                  )}
                </div>
              )}
              {summary.keyDates.reviewDates && summary.keyDates.reviewDates.length > 0 && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="font-medium text-sm text-purple-800">Review Dates</span>
                  </div>
                  {summary.keyDates.reviewDates.slice(0, 2).map((date, i) => (
                    <p key={i} className="text-purple-700 text-sm font-medium">{date}</p>
                  ))}
                </div>
              )}
              {summary.keyDates.noticePeriods && summary.keyDates.noticePeriods.length > 0 && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="font-medium text-sm text-orange-800">Notice Periods</span>
                  </div>
                  {summary.keyDates.noticePeriods.slice(0, 2).map((notice, i) => (
                    <p key={i} className="text-orange-700 text-sm font-medium">{notice}</p>
                  ))}
                </div>
              )}
              {summary.keyDates.otherImportantDates && summary.keyDates.otherImportantDates.length > 0 && (
                <div className="col-span-full">
                  <div className="mb-3">
                    <span className="font-medium text-sm text-gray-700">Other Important Dates:</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {summary.keyDates.otherImportantDates.map((item, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-800 block">{formatDate(item.date)}</span>
                            <p className="text-gray-600 text-sm">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Terms */}
      {hasFinancials && (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PoundSterling className="h-5 w-5 text-green-600" />
              Financial Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {summary.financialTerms.rent && (
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-l-green-400">
                  <div className="flex items-center gap-2 mb-1">
                    <PoundSterling className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm text-green-800">Rent</span>
                  </div>
                  <p className="text-green-700 font-bold text-lg">{summary.financialTerms.rent}</p>
                </div>
              )}
              {summary.financialTerms.deposit && (
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-l-blue-400">
                  <span className="font-medium text-sm text-blue-800 block">Deposit:</span>
                  <p className="text-blue-700 font-bold text-lg">{summary.financialTerms.deposit}</p>
                </div>
              )}
              {summary.financialTerms.serviceCharge && (
                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-l-purple-400">
                  <span className="font-medium text-sm text-purple-800 block">Service Charge:</span>
                  <p className="text-purple-700 font-bold text-lg">{summary.financialTerms.serviceCharge}</p>
                </div>
              )}
              {summary.financialTerms.otherFees && summary.financialTerms.otherFees.length > 0 && (
                <div className="col-span-full">
                  <span className="font-medium text-sm text-gray-700 mb-3 block">Additional Fees:</span>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {summary.financialTerms.otherFees.map((fee, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded border border-gray-200">
                        <span className="font-medium text-sm text-gray-800 block">{fee.type}:</span>
                        <span className="text-gray-700 font-medium">{fee.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Terms */}
      {summary.keyTerms && summary.keyTerms.length > 0 && (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Key Terms & Obligations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.keyTerms.map((term, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-indigo-800 text-sm leading-relaxed font-medium">{term}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-t-4 border-t-gradient-to-r border-t-blue-500">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-semibold text-gray-900 text-lg mb-1">Ready to summarise this document further?</h3>
              <p className="text-sm text-gray-600">
                Ask specific questions about repairs, rent, obligations, termination clauses, and more. 
                Our AI will provide detailed answers with proper legal citations.
              </p>
            </div>
            <Button 
              onClick={onStartQA} 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg px-8 py-3"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Start Q&A Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}