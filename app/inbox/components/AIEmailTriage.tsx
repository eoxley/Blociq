'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Tag, 
  Users, 
  Building, 
  Mail, 
  Loader2,
  Sparkles,
  TrendingUp,
  Calendar,
  Zap,
  Lightbulb,
  Filter,
  SortAsc,
  Eye,
  MessageSquare
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

interface TriageResult {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestedActions: string[];
  responseTime: string;
  tags: string[];
  insights: string[];
}

interface AIEmailTriageProps {
  emails: Email[];
  onTriageComplete?: (results: { [emailId: string]: TriageResult }) => void;
  onEmailAction?: (emailId: string, action: string) => void;
}

export default function AIEmailTriage({ emails, onTriageComplete, onEmailAction }: AIEmailTriageProps) {
  const [triageResults, setTriageResults] = useState<{ [emailId: string]: TriageResult }>({});
  const [loading, setLoading] = useState(false);
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high-priority' | 'unread' | 'unhandled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'urgency'>('date');

  const triageEmail = async (email: Email) => {
    setProcessingEmail(email.id);
    try {
      const response = await fetch('/api/ai-email-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'categorize',
          emailContent: {
            subject: email.subject || '',
            body: email.body_preview || '',
            from: email.from_email || '',
            receivedAt: email.received_at || ''
          }
        })
      });

      if (!response.ok) throw new Error('Triage failed');
      
      const data = await response.json();
      const result = parseTriageResult(data.result);
      
      setTriageResults(prev => ({
        ...prev,
        [email.id]: result
      }));

      toast.success(`Email triaged: ${result.category}`);
    } catch (error) {
      console.error('Triage error:', error);
      toast.error('Failed to triage email');
    } finally {
      setProcessingEmail(null);
    }
  };

  const triageAllEmails = async () => {
    setLoading(true);
    const results: { [emailId: string]: TriageResult } = {};
    
    for (const email of emails) {
      try {
        const response = await fetch('/api/ai-email-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'categorize',
            emailContent: {
              subject: email.subject || '',
              body: email.body_preview || '',
              from: email.from_email || '',
              receivedAt: email.received_at || ''
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          results[email.id] = parseTriageResult(data.result);
        }
      } catch (error) {
        console.error(`Failed to triage email ${email.id}:`, error);
      }
    }

    setTriageResults(results);
    onTriageComplete?.(results);
    setLoading(false);
    toast.success(`Triage completed for ${Object.keys(results).length} emails`);
  };

  const parseTriageResult = (result: string): TriageResult => {
    // Simple parsing - in production, you might want more sophisticated parsing
    const lines = result.split('\n');
    const triage: TriageResult = {
      category: 'General',
      priority: 'medium',
      urgency: 'medium',
      sentiment: 'neutral',
      suggestedActions: [],
      responseTime: '24 hours',
      tags: [],
      insights: []
    };
    
    lines.forEach(line => {
      if (line.includes('Primary category:')) triage.category = line.split('Primary category:')[1]?.trim() || 'General';
      if (line.includes('Priority:')) triage.priority = (line.split('Priority:')[1]?.trim().toLowerCase() as any) || 'medium';
      if (line.includes('Tags:')) triage.tags = line.split('Tags:')[1]?.trim().split(',').map(t => t.trim()) || [];
    });

    return triage;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'maintenance': return <Building className="h-4 w-4" />;
      case 'compliance': return <CheckCircle className="h-4 w-4" />;
      case 'complaint': return <AlertTriangle className="h-4 w-4" />;
      case 'service charge': return <TrendingUp className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const filteredEmails = emails.filter(email => {
    if (filter === 'high-priority') {
      const result = triageResults[email.id];
      return result && (result.priority === 'high' || result.priority === 'critical');
    }
    if (filter === 'unread') return !email.is_read;
    if (filter === 'unhandled') return !email.is_handled;
    return true;
  });

  const sortedEmails = [...filteredEmails].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.received_at || '').getTime() - new Date(a.received_at || '').getTime();
    }
    if (sortBy === 'priority') {
      const aResult = triageResults[a.id];
      const bResult = triageResults[b.id];
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = aResult ? priorityOrder[aResult.priority] : 2;
      const bPriority = bResult ? priorityOrder[bResult.priority] : 2;
      return bPriority - aPriority;
    }
    return 0;
  });

  return (
    <BlocIQCard className="w-full">
      <BlocIQCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold">AI Email Triage</h3>
          </div>
          <BlocIQBadge variant="secondary" className="bg-purple-100 text-purple-800">
            <Sparkles className="h-3 w-3 mr-1" />
            Smart Sorting
          </BlocIQBadge>
        </div>
      </BlocIQCardHeader>

      <BlocIQCardContent>
        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1"
            >
              <option value="all">All Emails</option>
              <option value="high-priority">High Priority</option>
              <option value="unread">Unread</option>
              <option value="unhandled">Unhandled</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1"
            >
              <option value="date">Date</option>
              <option value="priority">Priority</option>
            </select>
          </div>

          <BlocIQButton
            onClick={triageAllEmails}
            disabled={loading}
            size="sm"
            className="ml-auto"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Triage All...' : 'Triage All'}
          </BlocIQButton>
        </div>

        {/* Email List */}
        <div className="space-y-3">
          {sortedEmails.map((email) => {
            const result = triageResults[email.id];
            const isProcessing = processingEmail === email.id;
            
            return (
              <div
                key={email.id}
                className={`border rounded-lg p-4 transition-all ${
                  result ? 'bg-white shadow-sm' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900 truncate">
                        {email.subject || 'No Subject'}
                      </h4>
                      {result && (
                        <BlocIQBadge 
                          variant="secondary" 
                          className={getPriorityColor(result.priority)}
                        >
                          {result.priority}
                        </BlocIQBadge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {email.from_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(email.received_at || '').toLocaleDateString()}
                      </span>
                      {result && (
                        <span className="flex items-center gap-1">
                          {getCategoryIcon(result.category)}
                          {result.category}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {email.body_preview || 'No content'}
                    </p>

                                         {result && (
                       <div className="mt-3 flex flex-wrap gap-2">
                         {result.tags.slice(0, 3).map((tag, index) => (
                           <BlocIQBadge key={index} variant="secondary" size="sm">
                             {tag}
                           </BlocIQBadge>
                         ))}
                         {result.tags.length > 3 && (
                           <BlocIQBadge variant="secondary" size="sm">
                             +{result.tags.length - 3}
                           </BlocIQBadge>
                         )}
                       </div>
                     )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {!result && !isProcessing && (
                      <BlocIQButton
                        onClick={() => triageEmail(email)}
                        size="sm"
                        variant="outline"
                      >
                        <Brain className="h-4 w-4" />
                        Triage
                      </BlocIQButton>
                    )}
                    
                    {isProcessing && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </div>
                    )}

                    {result && (
                      <div className="flex items-center gap-1">
                        <BlocIQButton
                          onClick={() => onEmailAction?.(email.id, 'view')}
                          size="sm"
                          variant="ghost"
                        >
                          <Eye className="h-4 w-4" />
                        </BlocIQButton>
                        <BlocIQButton
                          onClick={() => onEmailAction?.(email.id, 'reply')}
                          size="sm"
                          variant="ghost"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </BlocIQButton>
                      </div>
                    )}
                  </div>
                </div>

                {result && result.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Lightbulb className="h-3 w-3 text-yellow-500" />
                      Suggested Actions
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {result.suggestedActions.slice(0, 2).map((action, index) => (
                        <span key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sortedEmails.length === 0 && (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 mb-2">No emails to triage</h4>
            <p className="text-gray-600 text-sm">
              {filter === 'all' ? 'No emails available' : `No emails match the "${filter}" filter`}
            </p>
          </div>
        )}
      </BlocIQCardContent>
    </BlocIQCard>
  );
} 