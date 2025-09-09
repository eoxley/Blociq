'use client';

import { useEffect, useState } from 'react';
import { Mail, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface EmailSummary {
  summary: string;
  connected: boolean;
  analysis?: {
    totalEmails: number;
    unreadCount: number;
    flaggedCount: number;
    leakMentions: number;
    invoiceMentions: number;
    contractorMentions: number;
    approvalMentions: number;
    complaintMentions: number;
    topBuildings: { name: string; count: number }[];
  };
  error?: string;
  message?: string;
}

export default function EmailSummaryCard() {
  const [data, setData] = useState<EmailSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmailSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/ask-ai/email-summary');
      const result = await response.json();
      
      if (response.ok) {
        setData(result);
      } else {
        setError(result.message || 'Failed to fetch email summary');
        setData(result);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Email summary fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailSummary();
  }, []);

  const handleRefresh = () => {
    fetchEmailSummary();
  };

  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (!data?.connected) return <AlertCircle className="h-4 w-4 text-amber-500" />;
    return <Mail className="h-4 w-4 text-blue-500" />;
  };

  const getStatusText = () => {
    if (loading) return 'Loading summary...';
    if (!data?.connected) return 'Outlook not connected';
    return 'Email summary';
  };

  return (
    <div className="mt-8 p-6 rounded-xl bg-muted border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h2 className="text-lg font-semibold text-foreground">
            {getStatusText()}
          </h2>
        </div>
        
        {data?.connected && (
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-muted-foreground/10 transition-colors disabled:opacity-50"
            title="Refresh email summary"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Analyzing your recent emails...</span>
        </div>
      )}

      {!loading && data?.summary && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground">
            {data.summary}
          </p>
          
          {data.analysis && data.analysis.unreadCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>
                {data.analysis.unreadCount} unread email{data.analysis.unreadCount !== 1 ? 's' : ''}
                {data.analysis.flaggedCount > 0 && ` • ${data.analysis.flaggedCount} flagged`}
              </span>
            </div>
          )}
        </div>
      )}

      {!loading && !data?.summary && !data?.connected && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {data?.message || 'Unable to fetch summary. Make sure you\'re signed in to Outlook.'}
          </p>
          
          <a
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Connect Outlook
          </a>
        </div>
      )}

      {!loading && error && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {error}
          </p>
          
          <button
            onClick={handleRefresh}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && data?.connected && !data?.summary && !error && (
        <p className="text-sm text-muted-foreground">
          No recent email activity to report.
        </p>
      )}
    </div>
  );
}
