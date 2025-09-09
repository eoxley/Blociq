'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  AlertTriangle, 
  RefreshCw,
  Brain,
  Activity,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOutlookConnection } from '@/hooks/useOutlookConnection';

interface LiveEmailStats {
  total: number;
  unread: number;
  urgent: number;
  today: number;
  thisWeek: number;
  categories: Record<string, number>;
  recentEmails: Array<{
    id: string;
    subject: string;
    from: string;
    received: string;
    isRead: boolean;
    importance: string;
  }>;
}

const LiveInboxOverview: React.FC = () => {
  const { supabase, loading: supabaseLoading } = useSupabase();
  const { status: outlookStatus, checkConnection, initiateConnection } = useOutlookConnection();
  const [emailStats, setEmailStats] = useState<LiveEmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const router = useRouter();

  const fetchLiveEmailStats = async () => {
    if (!outlookStatus.isConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching live email stats from Outlook...');
      
      const response = await fetch('/api/outlook/v2/messages/list?folderId=inbox', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.ok || !data.items) {
        throw new Error('Invalid response from Outlook API');
      }

      const emails = data.items;
      
      // Process emails to create stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const stats: LiveEmailStats = {
        total: emails.length,
        unread: emails.filter((e: any) => !e.isRead).length,
        urgent: emails.filter((e: any) => e.importance === 'high').length,
        today: emails.filter((e: any) => {
          const emailDate = new Date(e.receivedDateTime);
          return emailDate >= today;
        }).length,
        thisWeek: emails.filter((e: any) => {
          const emailDate = new Date(e.receivedDateTime);
          return emailDate >= weekAgo;
        }).length,
        categories: {},
        recentEmails: emails.slice(0, 5).map((e: any) => ({
          id: e.id,
          subject: e.subject || 'No Subject',
          from: e.from?.emailAddress?.name || e.from?.emailAddress?.address || 'Unknown',
          received: e.receivedDateTime,
          isRead: e.isRead,
          importance: e.importance || 'normal'
        }))
      };

      setEmailStats(stats);
      setLastRefresh(new Date());
      console.log('✅ Live email stats fetched successfully');
      
    } catch (error) {
      console.error('Error fetching live email stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch email stats');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch email stats when Outlook becomes connected
  useEffect(() => {
    if (outlookStatus.isConnected && !outlookStatus.isChecking) {
      fetchLiveEmailStats();
    } else if (!outlookStatus.isConnected && !outlookStatus.isChecking) {
      setLoading(false);
    }
  }, [outlookStatus.isConnected, outlookStatus.isChecking]);

  // Auto-initiate connection if user is logged in but Outlook is not connected
  useEffect(() => {
    if (!supabaseLoading && supabase && !outlookStatus.isChecking && !outlookStatus.isConnected && !outlookStatus.error) {
      console.log('🔄 Auto-initiating Outlook connection...');
      // Small delay to ensure UI is ready
      setTimeout(() => {
        initiateConnection();
      }, 1000);
    }
  }, [supabaseLoading, supabase, outlookStatus, initiateConnection]);

  const handleRefresh = () => {
    if (outlookStatus.isConnected) {
      fetchLiveEmailStats();
    } else {
      checkConnection();
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Loading state
  if (supabaseLoading || outlookStatus.isChecking || (loading && outlookStatus.isConnected)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto p-6 pt-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg mb-6">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-gray-700 font-medium">
                {supabaseLoading ? 'Initializing...' :
                 outlookStatus.isChecking ? 'Checking Outlook connection...' :
                 'Loading live email data...'}
              </span>
            </div>
            
            {!outlookStatus.isConnected && !outlookStatus.isChecking && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-blue-800 text-sm">
                  🔗 Setting up your Outlook connection for live email stats...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Connection required state
  if (!outlookStatus.isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto p-6 pt-24">
          <div className="text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50">
              <div className="bg-blue-100 rounded-full p-4 w-20 h-20 mx-auto mb-6">
                <Mail className="w-12 h-12 text-blue-600 mx-auto" />
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Connect Your Inbox
              </h1>
              
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                To view live email statistics and smart insights, we need to connect to your Outlook account. 
                This enables real-time email monitoring and AI-powered management.
              </p>

              {outlookStatus.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                  <p className="text-red-800 text-sm font-medium">
                    Connection Error: {outlookStatus.error}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={initiateConnection}
                  size="lg"
                  className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Mail className="w-5 h-5" />
                  Connect Outlook Account
                </Button>
                
                <Button 
                  onClick={handleRefresh}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-3"
                >
                  <RefreshCw className="w-5 h-5" />
                  Check Connection
                </Button>
              </div>

              <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-medium">Secure & Private</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Your email data is processed securely and never stored permanently.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto p-6 pt-24">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-900 mb-4">Unable to Load Email Data</h2>
              <p className="text-red-700 mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => checkConnection()}>
                  Check Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main dashboard with live stats
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section with Live Stats */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 pt-20">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 border border-white/20">
                <Brain className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Live Inbox Dashboard
            </h1>
            
            <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
              Real-time email statistics and insights from your Outlook inbox
            </p>

            {/* Live Status Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
              <span className="text-white/90 font-medium">Live Connected to {outlookStatus.userEmail}</span>
              {lastRefresh && (
                <span className="text-white/70 text-sm ml-2">
                  • Updated {formatTimeAgo(lastRefresh.toISOString())}
                </span>
              )}
            </div>
            
            {/* Main Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-white mb-2">{emailStats?.total || 0}</div>
                <div className="text-blue-100 text-sm">Total Emails</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-yellow-300 mb-2">{emailStats?.unread || 0}</div>
                <div className="text-blue-100 text-sm">Unread</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-red-300 mb-2">{emailStats?.urgent || 0}</div>
                <div className="text-blue-100 text-sm">High Priority</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold text-green-300 mb-2">{emailStats?.today || 0}</div>
                <div className="text-blue-100 text-sm">Today</div>
              </div>
            </div>

            <div className="mt-8">
              <Button 
                onClick={handleRefresh}
                variant="secondary"
                size="lg"
                disabled={loading}
                className="flex items-center gap-2 bg-white/90 text-gray-900 hover:bg-white"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh Now'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Insights */}
          <Card className="lg:col-span-2 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-blue-600" />
                Today's Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{emailStats?.today || 0}</div>
                  <div className="text-blue-700 text-sm font-medium">Emails Today</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{emailStats?.thisWeek || 0}</div>
                  <div className="text-purple-700 text-sm font-medium">This Week</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connection Status */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-green-700">Outlook Connected</div>
                  <div className="text-sm text-gray-600">{outlookStatus.userEmail}</div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-green-800 font-medium">Real-time sync active</div>
                <div className="text-xs text-green-600 mt-1">
                  Last updated: {lastRefresh ? formatTimeAgo(lastRefresh.toISOString()) : 'Never'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Emails */}
        {emailStats?.recentEmails && emailStats.recentEmails.length > 0 && (
          <Card className="mt-8 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-gray-600" />
                Recent Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {emailStats.recentEmails.map((email) => (
                  <div key={email.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-gray-100/50 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${email.isRead ? 'bg-gray-400' : 'bg-blue-500'}`} />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {email.subject.length > 50 ? email.subject.substring(0, 50) + '...' : email.subject}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                          <span>{email.from}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(email.received)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!email.isRead && (
                        <Badge variant="secondary" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          Unread
                        </Badge>
                      )}
                      {email.importance === 'high' && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          High Priority
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="mt-12 text-center bg-white/40 backdrop-blur-sm rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Ready to manage your emails?
          </h3>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              onClick={() => router.push('/inbox')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail className="w-5 h-5 mr-2" />
              Open Full Inbox
            </Button>
            <Button 
              onClick={() => router.push('/emails?urgent=true')}
              variant="outline"
              size="lg"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              View Urgent Emails
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveInboxOverview;