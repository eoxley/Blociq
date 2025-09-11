'use client';

import { useEffect, useState } from 'react';
import { Mail, AlertCircle, RefreshCw, ExternalLink, FileText, DollarSign, Wrench, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
        <div className="space-y-4">
          {/* Unread Count Header */}
          {data.analysis && data.analysis.unreadCount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  {data.analysis.unreadCount} Unread Email{data.analysis.unreadCount !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Awaiting your attention</p>
              </div>
            </div>
          )}

          {/* Priority Issues */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Urgent Issues */}
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-100 text-sm">Urgent Issues</span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                {(data.analysis?.leakMentions || 0) + (data.analysis?.complaintMentions || 0) === 0 
                  ? 'No urgent issues' 
                  : `${(data.analysis?.leakMentions || 0) + (data.analysis?.complaintMentions || 0)} items need attention`}
              </p>
            </div>

            {/* Financial Matters */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-900 dark:text-amber-100 text-sm">Financial</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {data.analysis?.invoiceMentions === 0 
                  ? 'No invoices pending'
                  : `${data.analysis?.invoiceMentions} invoice${data.analysis?.invoiceMentions !== 1 ? 's' : ''} for review`}
              </p>
            </div>

            {/* Maintenance */}
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-900 dark:text-purple-100 text-sm">Maintenance</span>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                {data.analysis?.contractorMentions === 0 
                  ? 'No contractor updates'
                  : `${data.analysis?.contractorMentions} contractor mention${data.analysis?.contractorMentions !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Most Active Buildings */}
          {data.analysis?.topBuildings && data.analysis.topBuildings.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-slate-600" />
                <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">Most Active Buildings</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.analysis.topBuildings.slice(0, 3).map((building, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs">
                    "{building.name}" <span className="text-slate-500">({building.count})</span>
                  </span>
                ))}
              </div>
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
