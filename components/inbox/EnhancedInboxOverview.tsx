'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
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

const EnhancedInboxOverview: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('week');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setRefreshing(!showLoader);
      setError(null);

      // Check if user is authenticated before making the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Please log in to view the inbox dashboard');
      }

      const response = await fetch(`/api/inbox/dashboard?timeRange=${timeRange}`, {
        method: 'GET',
        credentials: 'include', // This ensures cookies are sent
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required - please log in again');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch dashboard data: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }
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
      <>
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
      </>
    );
  }

  if (error) {
    return (
      <>
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
                <Button onClick={() => fetchDashboardData()} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (!dashboardData) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
      <MobilePageNavigation title="Smart Inbox" backTo="/home" backLabel="Home" />
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6 pt-20 lg:pt-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Brain className="h-8 w-8 text-blue-600" />
                  Smart Inbox Dashboard
                </h1>
                <p className="text-gray-600 mt-1">AI-powered insights for your property communications</p>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => fetchDashboardData(false)}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 mb-8">
            <Card>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Emails</p>
                    <p className="text-2xl lg:text-3xl font-bold text-gray-900">{dashboardData.total}</p>
                  </div>
                  <Mail className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={handleUnreadClick}
            >
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unread</p>
                    <p className="text-2xl lg:text-3xl font-bold text-yellow-600">{dashboardData.unread}</p>
                  </div>
                  <Eye className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-red-200"
              onClick={handleUrgentClick}
            >
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600">Urgent</p>
                    <p className="text-2xl lg:text-3xl font-bold text-red-600">{dashboardData.urgent}</p>
                  </div>
                  <AlertTriangle className="w-6 h-6 lg:w-8 lg:h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Handled</p>
                    <p className="text-2xl lg:text-3xl font-bold text-green-600">{dashboardData.handled}</p>
                  </div>
                  <CheckCircle className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Properties</p>
                    <p className="text-2xl lg:text-3xl font-bold text-purple-600">
                      {Object.keys(dashboardData.propertyBreakdown || {}).length}
                    </p>
                  </div>
                  <Building2 className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Smart Suggestions */}
          {dashboardData.smartSuggestions?.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Smart Suggestions
                  <Badge variant="secondary">{dashboardData.smartSuggestions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.smartSuggestions.map((suggestion, idx) => (
                    <div 
                      key={idx} 
                      className={`border rounded-lg p-4 ${getPriorityColor(suggestion.priority)}`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">{suggestion.icon}</span>
                        <div>
                          <h3 className="font-medium mb-1">{suggestion.title}</h3>
                          <p className="text-sm opacity-90">{suggestion.message}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="w-full justify-between text-left"
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Email Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(dashboardData.categories || {})
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 6)
                    .map(([category, data]) => (
                    <div 
                      key={category} 
                      className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleCategoryClick(category)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getCategoryIcon(category)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 capitalize flex items-center gap-2">
                              {category.replace('_', ' ')}
                              <span className="text-sm">{getTrendIcon(data.trend)}</span>
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{data.count} emails</span>
                              <span>{data.unread} unread</span>
                              {data.avgUrgencyScore > 0 && (
                                <span className="text-orange-600">
                                  Score: {data.avgUrgencyScore}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {data.urgent > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {data.urgent} urgent
                          </Badge>
                        )}
                      </div>
                      
                      {data.properties.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Properties affected:</p>
                          <div className="flex flex-wrap gap-1">
                            {data.properties.slice(0, 3).map((property, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {property}
                              </Badge>
                            ))}
                            {data.properties.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{data.properties.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-between"
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  Top Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.topProperties.slice(0, 6).map((property) => (
                    <div 
                      key={property.name}
                      className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handlePropertyClick(property.name)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-gray-600" />
                          <div>
                            <h3 className="font-medium text-gray-900">{property.name}</h3>
                            <p className="text-sm text-gray-600">
                              {property.count} emails • {property.unread} unread
                            </p>
                          </div>
                        </div>
                        {property.urgent > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {property.urgent} urgent
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        {property.categories.slice(0, 3).map((category, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {property.categories.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{property.categories.length - 3}
                          </Badge>
                        )}
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-between"
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
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentActivity.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.urgencyLevel === 'critical' ? 'bg-red-500' :
                        activity.urgencyLevel === 'high' ? 'bg-orange-500' :
                        activity.urgencyLevel === 'medium' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {activity.subject.substring(0, 50)}...
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{activity.property}</span>
                          <span>•</span>
                          <span>{activity.time}</span>
                          {activity.aiTag && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {activity.aiTag}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!activity.handled && (
                        <Badge variant="outline" className="text-xs">
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
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  AI Insights Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {dashboardData.aiInsightsSummary.totalInsights}
                    </p>
                    <p className="text-sm text-gray-600">Total Insights</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {dashboardData.aiInsightsSummary.criticalInsights}
                    </p>
                    <p className="text-sm text-gray-600">Critical</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {dashboardData.aiInsightsSummary.followUps}
                    </p>
                    <p className="text-sm text-gray-600">Follow-ups</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {dashboardData.aiInsightsSummary.recurringIssues}
                    </p>
                    <p className="text-sm text-gray-600">Recurring</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {dashboardData.aiInsightsSummary.complianceMatters}
                    </p>
                    <p className="text-sm text-gray-600">Compliance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-4">
              Dashboard shows data for the selected time period
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/emails')}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                View All Emails
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/communications')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Communications
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EnhancedInboxOverview;