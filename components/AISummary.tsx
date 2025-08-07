"use client";

import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AISummaryProps {
  title?: string;
  question?: string;
  buildingId?: string;
  documentIds?: string[];
  emailThreadId?: string;
  manualContext?: string;
  leaseholderId?: string;
  contextType?: string;
  className?: string;
  onSummaryGenerated?: (summary: string) => void;
}

export default function AISummary({
  title = "AI Summary",
  question,
  buildingId,
  documentIds = [],
  emailThreadId,
  manualContext,
  leaseholderId,
  contextType = 'summary',
  className = '',
  onSummaryGenerated
}: AISummaryProps) {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateSummary = async () => {
    if (!question) {
      toast.error('No question provided for summary generation');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          contextType,
          buildingId,
          documentIds,
          emailThreadId,
          manualContext,
          leaseholderId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.result) {
        setSummary(data.result);
        setHasGenerated(true);
        onSummaryGenerated?.(data.result);
        toast.success('AI summary generated successfully');
      } else {
        throw new Error(data.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('AI Summary error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateSummary = () => {
    setSummary('');
    setHasGenerated(false);
    generateSummary();
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        
        <div className="flex gap-2">
          {hasGenerated && (
            <button
              onClick={regenerateSummary}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </button>
          )}
          
          <button
            onClick={generateSummary}
            disabled={isLoading || !question}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Summary
              </>
            )}
          </button>
        </div>
      </div>

      {!question && (
        <div className="text-center py-8 text-gray-500">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No question provided for summary generation</p>
        </div>
      )}

      {summary && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">{summary}</div>
          </div>
        </div>
      )}

      {isLoading && !summary && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Generating AI summary...</span>
          </div>
        </div>
      )}
    </div>
  );
} 