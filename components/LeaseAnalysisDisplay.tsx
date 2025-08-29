"use client";

import React from 'react';
import { CalendarDays, AlertTriangle, CheckCircle, Clock, FileText, TrendingUp } from 'lucide-react';

interface LeaseAnalysisResult {
  documentType: 'lease';
  filename: string;
  summary: string;
  keyDates: {
    description: string;
    date: string;
    type: 'start' | 'end' | 'review' | 'payment' | 'other';
  }[];
  actionItems: {
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: 'financial' | 'compliance' | 'maintenance' | 'legal';
    dueDate?: string;
  }[];
  riskAssessment: {
    overall: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
  };
  complianceStatus: 'compliant' | 'requires_review' | 'non_compliant' | 'unknown';
  extractedText: string;
  detailedAnalysis: any;
}

interface Props {
  result: LeaseAnalysisResult;
}

export default function LeaseAnalysisDisplay({ result }: Props) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50';
      case 'requires_review': return 'text-yellow-600 bg-yellow-50';
      case 'non_compliant': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDateTypeIcon = (type: string) => {
    switch (type) {
      case 'start': return '🟢';
      case 'end': return '🔴';
      case 'review': return '🔄';
      case 'payment': return '💰';
      default: return '📅';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial': return '💰';
      case 'compliance': return '✅';
      case 'maintenance': return '🔧';
      case 'legal': return '⚖️';
      default: return '📋';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{result.filename}</h1>
            <p className="text-gray-600 mt-1">Lease Analysis Report</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${getComplianceColor(result.complianceStatus)}`}>
            {result.complianceStatus.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Executive Summary
        </h2>
        <p className="text-gray-700 leading-relaxed">{result.summary}</p>
      </div>

      {/* Key Dates */}
      {result.keyDates.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <CalendarDays className="h-5 w-5 mr-2" />
            Key Dates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.keyDates.map((date, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{getDateTypeIcon(date.type)}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{date.description}</h3>
                      <p className="text-sm text-gray-600">{new Date(date.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Risk Assessment
        </h2>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Risk Level</span>
            <span className={`text-sm font-bold ${getRiskColor(result.riskAssessment.overall)}`}>
              {result.riskAssessment.overall.toUpperCase()}
            </span>
          </div>
        </div>

        {result.riskAssessment.factors.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Risk Factors:</h3>
            <ul className="space-y-1">
              {result.riskAssessment.factors.map((factor, index) => (
                <li key={index} className="text-sm text-red-600 flex items-start">
                  <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.riskAssessment.mitigation.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Mitigation Strategies:</h3>
            <ul className="space-y-1">
              {result.riskAssessment.mitigation.map((strategy, index) => (
                <li key={index} className="text-sm text-green-600 flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  {strategy}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Items */}
      {result.actionItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Action Items ({result.actionItems.length})
          </h2>
          <div className="space-y-4">
            {result.actionItems.map((item, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getPriorityColor(item.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <span className="text-lg mr-3">{getCategoryIcon(item.category)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.category.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-800">{item.description}</p>
                      {item.dueDate && (
                        <p className="text-sm text-gray-600 mt-1">
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Analysis Preview */}
      {result.detailedAnalysis && Object.keys(result.detailedAnalysis).length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Analysis</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">
              Full analysis data available - {Object.keys(result.detailedAnalysis).length} sections analyzed
            </p>
            <details className="cursor-pointer">
              <summary className="text-sm text-blue-600 hover:text-blue-800">
                View detailed analysis (JSON)
              </summary>
              <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-40">
                {JSON.stringify(result.detailedAnalysis, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}