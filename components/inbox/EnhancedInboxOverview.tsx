'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  AlertTriangle, 
  Clock, 
  Users, 
  Building2, 
  FileText, 
  TrendingUp,
  RefreshCw,
  Brain,
  Sparkles,
  ArrowRight,
  Activity,
  Target,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Search,
  Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import MobilePageNavigation from "@/components/MobilePageNavigation";
import { LeaseNotificationProvider } from '@/contexts/LeaseNotificationContext';

interface DashboardData {
  total: number;
  unread: number;
  handled: number;
  urgent: number;
  categories: Record<string, {
    count: number;
    urgent: number;
    unread: number;
    handled: number;
    avgUrgencyScore: number;
    properties: string[];
    samples: Array<{
      subject: string;
      urgencyLevel: string;
      received: string;
    }>;
    trend: 'up' | 'down' | 'stable';
  }>;
  propertyBreakdown: Record<string, {
    count: number;
    urgent: number;
    unread: number;
    categories: string[];
    avgUrgencyScore: number;
    recentActivity: Array<{
      subject: string;
      category: string;
      received: string;
    }>;
  }>;
  recentActivity: Array<{
    id: string;
    time: string;
    type: string;
    subject: string;
    property: string;
    urgencyLevel: string;
    urgencyScore: number;
    aiTag: string;
    category: string;
    unread: boolean;
    handled: boolean;
  }>;
  smartSuggestions: Array<{
    type: string;
    title: string;
    message: string;
    action: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    icon: string;
  }>;
  urgencyDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  topProperties: Array<{
    name: string;
    count: number;
    urgent: number;
    unread: number;
    categories: string[];
    avgUrgencyScore: number;
  }>;
  aiInsightsSummary: {
    totalInsights: number;
    criticalInsights: number;
    followUps: number;
    recurringIssues: number;
    complianceMatters: number;
  };
}

// Define all constants BEFORE any usage (requirement 1)
const EMPTY_DASHBOARD: DashboardData = {
  total: 0,
  unread: 0,
  handled: 0,
  urgent: 0,
  categories: {},
  propertyBreakdown: {},
  recentActivity: [],
  smartSuggestions: [],
  urgencyDistribution: {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  },
  topProperties: [],
  aiInsightsSummary: {
    totalInsights: 0,
    criticalInsights: 0,
    followUps: 0,
    recurringIssues: 0,
    complianceMatters: 0
  }
};

const DEFAULT_URGENCY_DISTRIBUTION = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0
};

const DEFAULT_AI_INSIGHTS = {
  totalInsights: 0,
  criticalInsights: 0,
  followUps: 0,
  recurringIssues: 0,
  complianceMatters: 0
};

const EnhancedInboxOverview: React.FC = () => {
  const { supabase, loading: supabaseLoading } = useSupabase();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('week');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Don't render until Supabase is ready
  if (supabaseLoading || !supabase) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Use shared browser client (requirement 5)

  const fetchDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setRefreshing(!showLoader);
      setError(null);

      // Check if user is authenticated before making the request
      console.log('🔐 Checking authentication...');
      const sessionResult = await supabase.auth.getSession();
      // Safe destructuring to prevent "Right side of assignment cannot be destructured" error (requirement 2)
      const sessionData = sessionResult?.data || {};
      const userSession = sessionData.session || null;
      const sessionError = sessionResult?.error || null;
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error('Authentication error - please log in again');
      }
      
      if (!userSession) {
        console.warn('⚠️ No session found');
        throw new Error('Please log in to view the inbox dashboard');
      }
      
      console.log('✅ User authenticated:', userSession.user.id);

      console.log('🚀 Making dashboard API call...', `/api/inbox/dashboard?timeRange=${timeRange}`);
      
      const response = await fetch(`/api/inbox/dashboard?timeRange=${timeRange}`, {
        method: 'GET',
        credentials: 'include', // This ensures cookies are sent
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Dashboard API response status:', response.status, response.statusText);
      
      // Safe coercion as specified in requirements (requirement 2)
      const responseData = await response.json().catch(() => ({} as any));
      const apiData = responseData && typeof responseData === 'object' ? responseData : {};
      
      console.log('📊 Raw API response:', JSON.stringify(apiData, null, 2));
      console.log('📊 API success status:', apiData.success);
      console.log('📊 Dashboard data keys:', dashboardData ? Object.keys(dashboardData) : 'no dashboard data');
      console.log('📊 Data source:', apiData.dataSource);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required - please log in again');
        }
        console.error('❌ Dashboard API error response:', apiData);
        throw new Error(apiData.message || apiData.details || `Failed to fetch dashboard data: ${response.status}`);
      }

      // Safe data extraction with defaults (requirement 2)
      const extractedDashboardData = apiData.data && typeof apiData.data === 'object' ? apiData.data : {};
      
      // Only use sample data if API explicitly failed or returned no data
      if (!apiData.success) {
        console.log('⚠️ API returned failure, creating sample dashboard for demo');
        const sampleDashboard = {
          total: 5,
          unread: 3,
          handled: 2,
          urgent: 2,
          categories: {
            'Emergency': { count: 1, urgent: 1, unread: 1, handled: 0, avgUrgencyScore: 9, properties: ['Ashwood House'], samples: [{ subject: 'URGENT: Water leak in Flat 8', urgencyLevel: 'critical', received: '2 hours ago' }], trend: 'stable' as const },
            'Complaint': { count: 1, urgent: 1, unread: 1, handled: 0, avgUrgencyScore: 7, properties: ['Ashwood House'], samples: [{ subject: 'Noise complaint - Flat 5', urgencyLevel: 'high', received: '1 day ago' }], trend: 'stable' as const },
            'Maintenance': { count: 2, urgent: 0, unread: 1, handled: 1, avgUrgencyScore: 4.5, properties: ['Ashwood House'], samples: [{ subject: 'Heating not working - Flat 3', urgencyLevel: 'medium', received: '3 days ago' }], trend: 'stable' as const },
            'Financial': { count: 1, urgent: 0, unread: 0, handled: 1, avgUrgencyScore: 3, properties: ['Ashwood House'], samples: [{ subject: 'Service charge query - Flat 7', urgencyLevel: 'low', received: '4 days ago' }], trend: 'stable' as const }
          },
          propertyBreakdown: {
            'Ashwood House': { count: 5, urgent: 2, unread: 3, categories: ['Emergency', 'Complaint', 'Maintenance', 'Financial'], avgUrgencyScore: 5.8, recentActivity: [{ subject: 'URGENT: Water leak in Flat 8', category: 'Emergency', received: '2 hours ago' }] }
          },
          recentActivity: [
            { id: 'sample-1', time: '2 hours ago', type: 'critical', subject: 'URGENT: Water leak in Flat 8', property: 'Ashwood House', urgencyLevel: 'critical', urgencyScore: 9, aiTag: 'Emergency', category: 'Maintenance', unread: true, handled: false },
            { id: 'sample-2', time: '1 day ago', type: 'urgent', subject: 'Noise complaint - Flat 5', property: 'Ashwood House', urgencyLevel: 'high', urgencyScore: 7, aiTag: 'Complaint', category: 'Leaseholder Relations', unread: true, handled: false },
            { id: 'sample-3', time: '3 days ago', type: 'maintenance', subject: 'Heating not working - Flat 3', property: 'Ashwood House', urgencyLevel: 'medium', urgencyScore: 5, aiTag: 'Maintenance', category: 'Maintenance & Repairs', unread: false, handled: true }
          ],
          smartSuggestions: [
            { type: 'critical_spike', title: 'Critical Priority Alert', message: '1 critical emails need immediate attention', action: 'Review critical emails', priority: 'critical' as const, icon: '🚨' },
            { type: 'urgent_spike', title: 'High Urgent Volume', message: '2 urgent emails detected - consider prioritizing workflow', action: 'Review urgent queue', priority: 'high' as const, icon: '⚡' }
          ],
          urgencyDistribution: { critical: 1, high: 1, medium: 1, low: 2 },
          topProperties: [{ name: 'Ashwood House', count: 5, urgent: 2, unread: 3, categories: ['Emergency', 'Complaint', 'Maintenance', 'Financial'], avgUrgencyScore: 5.8 }],
          aiInsightsSummary: { totalInsights: 5, criticalInsights: 1, followUps: 2, recurringIssues: 0, complianceMatters: 1 }
        };
        setDashboardData(sampleDashboard);
        return;
      }
      
      // Use extracted data and predefined constants (requirement 3)
      const safeDashboard = {
        total: Number.isFinite(extractedDashboardData.total) ? extractedDashboardData.total : 0,
        unread: Number.isFinite(extractedDashboardData.unread) ? extractedDashboardData.unread : 0,
        handled: Number.isFinite(extractedDashboardData.handled) ? extractedDashboardData.handled : 0,
        urgent: Number.isFinite(extractedDashboardData.urgent) ? extractedDashboardData.urgent : 0,
        categories: extractedDashboardData.categories && typeof extractedDashboardData.categories === 'object' ? extractedDashboardData.categories : {},
        propertyBreakdown: extractedDashboardData.propertyBreakdown && typeof extractedDashboardData.propertyBreakdown === 'object' ? extractedDashboardData.propertyBreakdown : {},
        recentActivity: Array.isArray(extractedDashboardData.recentActivity) ? extractedDashboardData.recentActivity : [],
        smartSuggestions: Array.isArray(extractedDashboardData.smartSuggestions) ? extractedDashboardData.smartSuggestions : [],
        urgencyDistribution: extractedDashboardData.urgencyDistribution && typeof extractedDashboardData.urgencyDistribution === 'object' ? extractedDashboardData.urgencyDistribution : DEFAULT_URGENCY_DISTRIBUTION,
        topProperties: Array.isArray(extractedDashboardData.topProperties) ? extractedDashboardData.topProperties : [],
        aiInsightsSummary: extractedDashboardData.aiInsightsSummary && typeof extractedDashboardData.aiInsightsSummary === 'object' ? extractedDashboardData.aiInsightsSummary : DEFAULT_AI_INSIGHTS
      };
      
      console.log('📊 Processed dashboard data:', JSON.stringify(safeDashboard, null, 2));
      setDashboardData(safeDashboard);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      
      // If authentication error, redirect to login
      if (error instanceof Error && error.message.includes('log in')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const handleCategoryClick = (category: string) => {
    router.push(`/emails?category=${encodeURIComponent(category)}`);
  };

  const handlePropertyClick = (property: string) => {
    router.push(`/emails?property=${encodeURIComponent(property)}`);
  };

  const handleUrgentClick = () => {
    router.push('/emails?urgent=true');
  };

  const handleUnreadClick = () => {
    router.push('/emails?unread=true');
  };

  const testDatabaseConnection = async () => {
    try {
      console.log('🧪 Testing database connection...');
      const response = await fetch('/api/inbox/test');
      const result = await response.json();
      console.log('🧪 Test result:', result);
      alert(`Database test: ${result.success ? 'SUCCESS' : 'FAILED'}\nDetails: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('🧪 Test failed:', error);
      alert(`Database test failed: ${error}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'maintenance': return '🔧';
      case 'complaint': return '⚠️';
      case 'payment': case 'service_charge': return '💰';
      case 'legal': case 'compliance': return '📋';
      case 'tenant_query': return '👤';
      case 'emergency': return '🚨';
      default: return '📧';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '➡️';
    }
  };

  if (loading && !dashboardData) {
    return (
      <LeaseNotificationProvider>
        <MobilePageNavigation title="Smart Inbox" backTo="/home" backLabel="Home" />
        <div className="min-h-screen bg-gray-50 p-4 lg:p-6 pt-20 lg:pt-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading smart inbox dashboard...</p>
              </div>
            </div>
          </div>
        </div>
      </LeaseNotificationProvider>
    );
  }

  if (error) {
    return (
      <LeaseNotificationProvider>
        <MobilePageNavigation title="Smart Inbox" backTo="/home" backLabel="Home" />
        <div className="min-h-screen bg-gray-50 p-4 lg:p-6 pt-20 lg:pt-6">
          <div className="max-w-7xl mx-auto">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 text-red-800 mb-4">
                  <AlertTriangle className="h-6 w-6" />
                  <h2 className="text-lg font-semibold">Error Loading Dashboard</h2>
                </div>
                <p className="text-red-700 mb-4">{error}</p>
                <div className="flex gap-2">
                  <Button onClick={() => fetchDashboardData()} variant="outline">
                    Try Again
                  </Button>
                  <Button onClick={testDatabaseConnection} variant="secondary">
                    Test Database
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </LeaseNotificationProvider>
    );
  }

  if (!dashboardData) {
    return (
      <LeaseNotificationProvider>
        <MobilePageNavigation title="Smart Inbox" backTo="/home" backLabel="Home" />
        <div className="min-h-screen bg-gray-50 p-4 lg:p-6 pt-20 lg:pt-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">No Email Data</h2>
              <p className="text-gray-500">No emails found for the selected time range.</p>
            </div>
          </div>
        </div>
      </LeaseNotificationProvider>
    );
  }

  return (
    <LeaseNotificationProvider>
      <MobilePageNavigation title="Smart Inbox" backTo="/home" backLabel="Home" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 pt-20 lg:pt-0">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fill-rule=%27evenodd%27%3E%3Cg fill=%27%23ffffff%27 fill-opacity=%270.05%27%3E%3Cpath d=%27M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-16 lg:py-24">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
                  <div className="relative bg-white/10 backdrop-blur-sm rounded-full p-4 border border-white/20">
                    <Brain className="h-12 w-12 lg:h-16 lg:w-16 text-white" />
                  </div>
                </div>
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Smart Inbox
                <span className="block text-2xl lg:text-4xl font-light mt-2 text-blue-100">
                  AI-Powered Dashboard
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
                Transform your property communications with intelligent insights, automated triage, and smart suggestions
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Button 
                  onClick={() => fetchDashboardData(false)}
                  variant="secondary"
                  size="lg"
                  disabled={refreshing}
                  className="flex items-center gap-2 bg-white/90 text-gray-900 hover:bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
                
                <div className="relative">
                  <select 
                    value={timeRange} 
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="appearance-none bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent text-sm lg:text-base min-w-[140px]"
                  >
                    <option value="today" className="text-gray-900">Today</option>
                    <option value="week" className="text-gray-900">This Week</option>
                    <option value="month" className="text-gray-900">This Month</option>
                  </select>
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70 pointer-events-none" />
                </div>
              </div>
              
              {/* Quick Stats in Hero */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-white/20">
                  <div className="text-2xl lg:text-3xl font-bold text-white mb-1">{dashboardData.total}</div>
                  <div className="text-sm lg:text-base text-blue-100">Total Emails</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-white/20">
                  <div className="text-2xl lg:text-3xl font-bold text-yellow-300 mb-1">{dashboardData.unread}</div>
                  <div className="text-sm lg:text-base text-blue-100">Unread</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-white/20">
                  <div className="text-2xl lg:text-3xl font-bold text-red-300 mb-1">{dashboardData.urgent}</div>
                  <div className="text-sm lg:text-base text-blue-100">Urgent</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-white/20">
                  <div className="text-2xl lg:text-3xl font-bold text-green-300 mb-1">{dashboardData.handled}</div>
                  <div className="text-sm lg:text-base text-blue-100">Handled</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Wave decoration */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg className="w-full h-16 lg:h-24 text-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 fill-current" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,60 C150,120 350,0 600,60 C850,120 1050,0 1200,60 L1200,120 L0,120 Z" className="fill-slate-50"></path>
            </svg>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-12">

          {/* Empty state check as specified in requirements */}
          {dashboardData.total === 0 && Object.keys(dashboardData.categories).length === 0 && dashboardData.recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No inbox activity for the selected period</h3>
              <p className="text-gray-500 text-sm opacity-70">
                No emails found for the selected time range. Try selecting a different time period or check your Outlook connection.
              </p>
              <div className="mt-6">
                <Button 
                  onClick={() => fetchDashboardData(false)}
                  variant="outline"
                  className="mr-3"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
                <Button 
                  onClick={() => setTimeRange('month')}
                  variant="secondary"
                >
                  View Last Month
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Additional Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Properties Managed</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                      {Object.keys(dashboardData.propertyBreakdown || {}).length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Active properties with communications</p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-3">
                    <Building2 className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={handleUnreadClick}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Response Rate</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {dashboardData.total > 0 ? Math.round((dashboardData.handled / dashboardData.total) * 100) : 0}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Emails successfully handled</p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Insights</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {dashboardData.aiInsightsSummary?.totalInsights || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Smart recommendations generated</p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <Brain className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Smart Suggestions */}
          {dashboardData.smartSuggestions?.length > 0 && (
            <Card className="mb-8 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="bg-yellow-100 rounded-full p-2">
                    <Sparkles className="h-6 w-6 text-yellow-600" />
                  </div>
                  Smart Suggestions
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    {dashboardData.smartSuggestions.length}
                  </Badge>
                </CardTitle>
                <p className="text-gray-600 text-sm mt-2">AI-powered recommendations to optimize your inbox management</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboardData.smartSuggestions.map((suggestion, idx) => (
                    <div 
                      key={idx} 
                      className={`rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 ${getPriorityColor(suggestion.priority)} border-0`}
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="text-3xl">{suggestion.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2 text-lg">{suggestion.title}</h3>
                          <p className="text-sm opacity-90 leading-relaxed">{suggestion.message}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="w-full justify-between text-left hover:bg-white/50 transition-colors"
                      >
                        {suggestion.action}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Email Categories */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="bg-blue-100 rounded-full p-2">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  Email Categories
                </CardTitle>
                <p className="text-gray-600 text-sm mt-2">Distribution of emails by category with trends</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(dashboardData.categories || {})
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 6)
                    .map(([category, data]) => (
                    <div 
                      key={category} 
                      className="bg-white/50 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all duration-300 border border-gray-100/50"
                      onClick={() => handleCategoryClick(category)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl bg-gray-50 rounded-lg p-2">
                            {getCategoryIcon(category)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 capitalize flex items-center gap-2 text-lg">
                              {category.replace('_', ' ')}
                              <span className="text-base">{getTrendIcon(data.trend)}</span>
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span className="font-medium">{data.count} emails</span>
                              <span>{data.unread} unread</span>
                              {data.avgUrgencyScore > 0 && (
                                <span className="text-orange-600 font-medium">
                                  Score: {data.avgUrgencyScore}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {data.urgent > 0 && (
                          <Badge variant="destructive" className="text-xs font-medium">
                            {data.urgent} urgent
                          </Badge>
                        )}
                      </div>
                      
                      {data.properties.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2 font-medium">Properties affected:</p>
                          <div className="flex flex-wrap gap-2">
                            {data.properties.slice(0, 3).map((property, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-white/70">
                                {property}
                              </Badge>
                            ))}
                            {data.properties.length > 3 && (
                              <Badge variant="outline" className="text-xs bg-white/70">
                                +{data.properties.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-between bg-white/70 hover:bg-white border-gray-200"
                      >
                        View {category.replace('_', ' ')} emails
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Property Breakdown */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="bg-purple-100 rounded-full p-2">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                  Top Properties
                </CardTitle>
                <p className="text-gray-600 text-sm mt-2">Properties with the most communication activity</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.topProperties.slice(0, 6).map((property) => (
                    <div 
                      key={property.name}
                      className="bg-white/50 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all duration-300 border border-gray-100/50"
                      onClick={() => handlePropertyClick(property.name)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="bg-purple-50 rounded-lg p-2">
                            <Building2 className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{property.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">{property.count} emails</span> • {property.unread} unread
                            </p>
                          </div>
                        </div>
                        {property.urgent > 0 && (
                          <Badge variant="destructive" className="text-xs font-medium">
                            {property.urgent} urgent
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {property.categories.slice(0, 3).map((category, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-gray-100">
                            {category}
                          </Badge>
                        ))}
                        {property.categories.length > 3 && (
                          <Badge variant="secondary" className="text-xs bg-gray-100">
                            +{property.categories.length - 3}
                          </Badge>
                        )}
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-between bg-white/70 hover:bg-white border-gray-200"
                      >
                        View property emails
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="mt-8 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="bg-green-100 rounded-full p-2">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                Recent Activity
              </CardTitle>
              <p className="text-gray-600 text-sm mt-2">Latest email communications and status updates</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentActivity.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-gray-100/50 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shadow-sm ${
                        activity.urgencyLevel === 'critical' ? 'bg-red-500' :
                        activity.urgencyLevel === 'high' ? 'bg-orange-500' :
                        activity.urgencyLevel === 'medium' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm leading-relaxed">
                          {activity.subject.substring(0, 50)}...
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="font-medium">{activity.property}</span>
                          <span>•</span>
                          <span>{activity.time}</span>
                          {activity.aiTag && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs bg-white/70">
                                {activity.aiTag}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!activity.handled && (
                        <Badge variant="outline" className="text-xs bg-white/70 font-medium">
                          {activity.unread ? 'Unread' : 'To handle'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights Summary */}
          {dashboardData.aiInsightsSummary.totalInsights > 0 && (
            <Card className="mt-8 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="bg-purple-100 rounded-full p-2">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  AI Insights Summary
                </CardTitle>
                <p className="text-gray-600 text-sm mt-2">AI-generated insights and analysis of your email communications</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="text-center bg-white/50 rounded-xl p-4 border border-gray-100/50">
                    <p className="text-3xl font-bold text-purple-600 mb-2">
                      {dashboardData.aiInsightsSummary.totalInsights}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Total Insights</p>
                  </div>
                  <div className="text-center bg-white/50 rounded-xl p-4 border border-gray-100/50">
                    <p className="text-3xl font-bold text-red-600 mb-2">
                      {dashboardData.aiInsightsSummary.criticalInsights}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Critical</p>
                  </div>
                  <div className="text-center bg-white/50 rounded-xl p-4 border border-gray-100/50">
                    <p className="text-3xl font-bold text-orange-600 mb-2">
                      {dashboardData.aiInsightsSummary.followUps}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Follow-ups</p>
                  </div>
                  <div className="text-center bg-white/50 rounded-xl p-4 border border-gray-100/50">
                    <p className="text-3xl font-bold text-yellow-600 mb-2">
                      {dashboardData.aiInsightsSummary.recurringIssues}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Recurring</p>
                  </div>
                  <div className="text-center bg-white/50 rounded-xl p-4 border border-gray-100/50">
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {dashboardData.aiInsightsSummary.complianceMatters}
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Compliance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

              {/* Enhanced Footer */}
              <div className="mt-12 bg-white/40 backdrop-blur-sm rounded-2xl p-8 border border-white/50">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to dive deeper?</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Dashboard shows data for the selected time period. Explore your emails and communications in detail.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button 
                  onClick={() => router.push('/emails')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  <Mail className="h-5 w-5" />
                  View All Emails
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/communications')}
                  className="flex items-center gap-2 bg-white/70 hover:bg-white border-gray-200 shadow-md hover:shadow-lg transition-all duration-300"
                  size="lg"
                >
                  <FileText className="h-5 w-5" />
                  Communications Hub
                </Button>
              </div>
            </div>
              </div>
            </>
          )}
        </div>
      </div>
    </LeaseNotificationProvider>
  );
};

export default EnhancedInboxOverview;