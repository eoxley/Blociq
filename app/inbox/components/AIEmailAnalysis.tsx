'use client';

import React, { useState } from 'react';
import { 
  Brain, 
  MessageSquare, 
  FileText, 
  Tag, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Calendar,
  Zap,
  Lightbulb
} from 'lucide-react';
import { BlocIQButton } from '@/components/ui/blociq-button';
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card';
import { BlocIQBadge } from '@/components/ui/blociq-badge';
import { toast } from 'sonner';

interface Email {
  id: string;
  subject: string | null;
  from_email: string | null;
  body_preview: string | null;
  received_at: string | null;
  is_read: boolean | null;
  is_handled: boolean | null;
  tags: string[] | null;
  building_id: string | null;
}

interface AIEmailAnalysisProps {
  email: Email;
  onAnalysisComplete?: (analysis: any) => void;
  onDraftGenerated?: (draft: string) => void;
}

interface AnalysisResult {
  summary?: string;
  sentiment?: string;
  urgency?: string;
  category?: string;
  actionItems?: string[];
  suggestedResponse?: string;
  priority?: string;
  tags?: string[];
  insights?: string[];
}

export default function AIEmailAnalysis({ email, onAnalysisComplete, onDraftGenerated }: AIEmailAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'draft' | 'summary'>('analysis');

  const analyseEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-email-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyse',
          emailContent: {
            subject: email.subject || '',
            body: email.body_preview || '',
            from: email.from_email || '',
            receivedAt: email.received_at || ''
          }
        })
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      const analysisResult = parseAnalysisResult(data.result);
      setAnalysis(analysisResult);
      onAnalysisComplete?.(analysisResult);
      toast.success('Email analysis completed');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyse email');
    } finally {
      setLoading(false);
    }
  };

  const generateDraft = async (draftType: 'reply' | 'follow-up' | 'notification' = 'reply') => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-email-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          draftType,
          options: {
            tone: 'professional',
            length: 'standard',
            includeNextSteps: true
          }
        })
      });

      if (!response.ok) throw new Error('Draft generation failed');
      
      const data = await response.json();
      onDraftGenerated?.(data.draft);
      toast.success(`${draftType} draft generated`);
    } catch (error) {
      console.error('Draft generation error:', error);
      toast.error('Failed to generate draft');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-email-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summary',
          emailContent: {
            subject: email.subject || '',
            body: email.body_preview || '',
            from: email.from_email || '',
            receivedAt: email.received_at || ''
          }
        })
      });

      if (!response.ok) throw new Error('Summary generation failed');
      
      const data = await response.json();
      const summaryResult = parseSummaryResult(data.result);
      setAnalysis(prev => ({ ...prev, ...summaryResult }));
      toast.success('Email summary generated');
    } catch (error) {
      console.error('Summary error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const parseAnalysisResult = (result: string): AnalysisResult => {
    // Simple parsing - in production, you might want more sophisticated parsing
    const lines = result.split('\n');
    const analysis: AnalysisResult = {};
    
    lines.forEach(line => {
      if (line.includes('Sentiment:')) analysis.sentiment = line.split('Sentiment:')[1]?.trim();
      if (line.includes('Urgency:')) analysis.urgency = line.split('Urgency:')[1]?.trim();
      if (line.includes('Priority:')) analysis.priority = line.split('Priority:')[1]?.trim();
      if (line.includes('Category:')) analysis.category = line.split('Category:')[1]?.trim();
    });

    return analysis;
  };

  const parseSummaryResult = (result: string): AnalysisResult => {
    return { summary: result };
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency?.toLowerCase()) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'negative': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <BlocIQCard className="w-full">
      <BlocIQCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold">AI Email Analysis</h3>
          </div>
          <BlocIQBadge variant="secondary" className="bg-purple-100 text-purple-800">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </BlocIQBadge>
        </div>
      </BlocIQCardHeader>

      <BlocIQCardContent>
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'analysis' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Brain className="h-4 w-4 inline mr-1" />
            Analysis
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'draft' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-1" />
            Draft
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'summary' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-1" />
            Summary
          </button>
        </div>

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-4">
            {!analysis ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-purple-300 mx-auto mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">Analyse Email</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Get AI-powered insights about this email including sentiment, urgency, and suggested actions.
                </p>
                <BlocIQButton
                  onClick={analyseEmail}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Analysing...' : 'Analyse Email'}
                </BlocIQButton>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Analysis Results */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {getSentimentIcon(analysis.sentiment)}
                      <span className="text-sm font-medium">Sentiment</span>
                    </div>
                    <p className="text-sm text-gray-600 capitalize">{analysis.sentiment || 'Neutral'}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Urgency</span>
                    </div>
                    <p className={`text-sm font-medium capitalize ${getUrgencyColor(analysis.urgency)}`}>
                      {analysis.urgency || 'Medium'}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Category</span>
                    </div>
                    <p className="text-sm text-gray-600 capitalize">{analysis.category || 'General'}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Priority</span>
                    </div>
                    <p className="text-sm text-gray-600">{analysis.priority || '3'}</p>
                  </div>
                </div>

                {/* Action Items */}
                {analysis.actionItems && analysis.actionItems.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Action Items
                    </h4>
                    <ul className="space-y-1">
                      {analysis.actionItems.map((item, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-purple-500 mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Insights */}
                {analysis.insights && analysis.insights.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      AI Insights
                    </h4>
                    <div className="bg-purple-50 rounded-lg p-3">
                      {analysis.insights.map((insight, index) => (
                        <p key={index} className="text-sm text-purple-800 mb-2 last:mb-0">
                          {insight}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Draft Tab */}
        {activeTab === 'draft' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <FileText className="h-8 w-8 text-blue-300 mx-auto mb-3" />
              <h4 className="font-medium text-gray-900 mb-2">Generate Email Draft</h4>
              <p className="text-gray-600 text-sm mb-4">
                Create professional email responses with AI assistance.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <BlocIQButton
                onClick={() => generateDraft('reply')}
                disabled={loading}
                variant="outline"
                className="justify-start"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Generate Reply
              </BlocIQButton>
              
              <BlocIQButton
                onClick={() => generateDraft('follow-up')}
                disabled={loading}
                variant="outline"
                className="justify-start"
              >
                <Clock className="h-4 w-4 mr-2" />
                Generate Follow-up
              </BlocIQButton>
              
              <BlocIQButton
                onClick={() => generateDraft('notification')}
                disabled={loading}
                variant="outline"
                className="justify-start"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Generate Notification
              </BlocIQButton>
            </div>

            {loading && (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-500" />
                <p className="text-sm text-gray-600">Generating draft...</p>
              </div>
            )}
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {!analysis?.summary ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-green-300 mx-auto mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">Email Summary</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Get a concise summary of this email with key points and action items.
                </p>
                <BlocIQButton
                  onClick={generateSummary}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Generating...' : 'Generate Summary'}
                </BlocIQButton>
              </div>
            ) : (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-500" />
                  Email Summary
                </h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {analysis.summary}
                </div>
              </div>
            )}
          </div>
        )}
      </BlocIQCardContent>
    </BlocIQCard>
  );
} 