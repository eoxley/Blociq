"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InboxIcon, MailWarning, MailCheck, Sparkles, RefreshCw, AlertCircle, Brain, TrendingUp, Users, Clock } from "lucide-react";
import { BlocIQButton } from "@/components/ui/blociq-button";
import MobilePageNavigation from "@/components/MobilePageNavigation";

interface EmailItem {
  id: string;
  subject: string;
  sender: string;
  sent_at: string;
  priority?: string;
  status?: string;
  suggestedAction?: string;
  building?: string | null;
}

interface InboxSummary {
  urgent: EmailItem[];
  needsAction: EmailItem[];
  aiSuggestions: string[];
  totalEmails: number;
  lastUpdated: string;
  fallback?: boolean;
  error?: string;
}

export default function InboxOverviewPage() {
  const [summary, setSummary] = useState<InboxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchInboxSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/inbox/summary');
      if (!response.ok) {
        throw new Error(`Failed to fetch inbox summary: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setSummary(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch inbox summary');
      }
    } catch (err) {
      console.error('Error fetching inbox summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inbox summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxSummary();
  }, []);



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading inbox summary...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Error Loading Inbox Summary</h2>
            </div>
            <p className="mt-2 text-red-700">{error}</p>
            <BlocIQButton 
              onClick={fetchInboxSummary}
              className="mt-4"
            >
              Try Again
            </BlocIQButton>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <InboxIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">No Inbox Data</h2>
            <p className="text-gray-500">No emails found in your inbox.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <MobilePageNavigation title="Inbox Overview" backTo="/home" backLabel="Home" />
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6 pt-20 lg:pt-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] px-8 py-8 rounded-3xl shadow-2xl mb-8">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center space-x-3 mb-4">
                  <InboxIcon className="h-10 w-10 text-white" />
                  <h1 className="text-3xl lg:text-4xl font-bold">Inbox Overview</h1>
                </div>
                <p className="text-xl text-white/90 mb-6">
                  Smart triage dashboard for your communications and emails
                </p>
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-medium">{summary.totalEmails} Total Emails</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span className="text-sm font-medium">{summary.urgent.length} Urgent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="text-sm font-medium">Last: {new Date(summary.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Pulsating Brain Widget */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-center">
                  <div className="relative inline-block mb-3">
                    <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-white font-medium mb-2">Ask BlocIQ AI</p>
                  <p className="text-white/70 text-sm mb-3">Smart email assistance</p>
                  <button
                    onClick={() => {
                      const button = document.querySelector('[data-askblociq-button]') as HTMLElement;
                      if (button) button.click();
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-all duration-200 hover:scale-105 border border-white/30"
                  >
                    Ask Now
                  </button>
                </div>
              </div>
            </div>
          </div>



        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <MailWarning className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Urgent</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.urgent.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MailCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Action Required</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.needsAction.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Emails</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalEmails}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section: Urgent Emails */}
        <Card className="mb-6 lg:mb-8">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg lg:text-xl font-medium flex items-center gap-2">
                <MailWarning className="h-5 w-5 text-red-600" />
                Urgent Emails
              </h2>
              <Badge variant="destructive">{summary.urgent.length} urgent</Badge>
            </div>
            {summary.urgent.length === 0 ? (
              <p className="text-sm text-gray-500">No urgent emails right now.</p>
            ) : (
              <div className="space-y-3">
                {summary.urgent.map((email) => (
                  <div key={email.id} className="border-l-4 border-red-500 pl-4 py-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{email.subject}</h3>
                        <p className="text-sm text-gray-600">From: {email.sender}</p>
                        {email.building && (
                          <p className="text-xs text-gray-500">Building: {email.building}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {new Date(email.sent_at).toLocaleDateString()}
                        </Badge>
                        {email.priority && (
                          <Badge variant="destructive" className="text-xs">
                            {email.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section: Emails Needing Action */}
        <Card className="mb-6 lg:mb-8">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg lg:text-xl font-medium flex items-center gap-2">
                <MailCheck className="h-5 w-5 text-blue-600" />
                Action Required
              </h2>
              <Badge>{summary.needsAction.length} to review</Badge>
            </div>
            {summary.needsAction.length === 0 ? (
              <p className="text-sm text-gray-500">You're all caught up 🎉</p>
            ) : (
              <div className="space-y-3">
                {summary.needsAction.map((email) => (
                  <div key={email.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{email.subject}</h3>
                        <p className="text-sm text-gray-600">From: {email.sender}</p>
                        {email.building && (
                          <p className="text-xs text-gray-500">Building: {email.building}</p>
                        )}
                        <p className="text-sm text-blue-700 mt-1">
                          <strong>Suggested:</strong> {email.suggestedAction}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {new Date(email.sent_at).toLocaleDateString()}
                        </Badge>
                        {email.status && (
                          <Badge variant="outline" className="text-xs">
                            {email.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section: AI Suggestions */}
        <Card className="mb-6 lg:mb-8">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg lg:text-xl font-medium flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Suggestions
              </h2>
              <Badge variant="outline">AI enabled</Badge>
            </div>
            {summary.aiSuggestions.length === 0 ? (
              <p className="text-sm text-gray-500">No AI insights right now.</p>
            ) : (
              <ul className="space-y-2">
                {summary.aiSuggestions.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">•</span>
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>



        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>Last updated: {new Date(summary.lastUpdated).toLocaleString()}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchInboxSummary}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* AI Assistant Button - REMOVED */}
      {/* <AskBlocIQButton selectedMessage={null} data-askblociq-button /> */}
    </div>
    </>
  );
}
