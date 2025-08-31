"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Building2,
  Brain,
  RefreshCw,
  MailWarning,
  MailCheck,
  Users,
  Target,
  Lightbulb,
  Activity,
  Filter
} from "lucide-react";
import { BlocIQButton } from "@/components/ui/blociq-button";
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
    avgUrgencyScore: number;
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
  aiInsightsSummary: {
    totalInsights: number;
    criticalInsights: number;
    followUps: number;
    recurringIssues: number;
    complianceMatters: number;
  };
}

export default function InboxDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/inbox/dashboard?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setDashboard(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard');
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [timeRange]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getSuggestionVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading dashboard analytics...</p>
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
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Error Loading Dashboard</h2>
            </div>
            <p className="mt-2 text-red-700">{error}</p>
            <BlocIQButton 
              onClick={fetchDashboard}
              className="mt-4"
            >
              Try Again
            </BlocIQButton>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">No Dashboard Data</h2>
            <p className="text-gray-500">No analytics data available for this time range.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <MobilePageNavigation title="Inbox Dashboard" backTo="/home" backLabel="Home" />
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6 pt-20 lg:pt-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] px-8 py-8 rounded-3xl shadow-2xl mb-8">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center space-x-3 mb-4">
                  <BarChart3 className="h-10 w-10 text-white" />
                  <h1 className="text-3xl lg:text-4xl font-bold">Inbox Analytics Dashboard</h1>
                </div>
                <p className="text-xl text-white/90 mb-6">
                  Enhanced AI-powered insights and trends for your property communications
                </p>
                
                {/* Time Range Selector */}
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-5 w-5" />
                  <span className="text-sm font-medium">Time Range:</span>
                  <div className="flex gap-2">
                    {['today', 'week', 'month'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range as any)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${ 
                          timeRange === range 
                            ? 'bg-white/30 text-white' 
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {range.charAt(0).toUpperCase() + range.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-white/80 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    <span className="text-sm font-medium">{dashboard.total} Total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MailWarning className="h-5 w-5" />
                    <span className="text-sm font-medium">{dashboard.urgent} Urgent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MailCheck className="h-5 w-5" />
                    <span className="text-sm font-medium">{dashboard.handled} Handled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    <span className="text-sm font-medium">{dashboard.aiInsightsSummary.totalInsights} AI Insights</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-center">
                  <div className="relative inline-block mb-3">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  </div>
                  <p className="text-white font-medium mb-2">Analytics Active</p>
                  <p className="text-white/70 text-sm">Smart tracking enabled</p>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Suggestions Section */}
          {dashboard.smartSuggestions.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Smart Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboard.smartSuggestions.map((suggestion, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border-l-4 ${
                        suggestion.priority === 'critical' ? 'border-red-500 bg-red-50' :
                        suggestion.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                        suggestion.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{suggestion.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{suggestion.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{suggestion.message}</p>
                          <Badge 
                            variant={getSuggestionVariant(suggestion.priority)}
                            className="text-xs"
                          >
                            {suggestion.action}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Emails</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.total}</p>
                    <p className="text-xs text-gray-500">{dashboard.unread} unread</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Urgent Priority</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.urgent}</p>
                    <p className="text-xs text-gray-500">{dashboard.urgencyDistribution.critical} critical</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Handled</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.handled}</p>
                    <p className="text-xs text-gray-500">{Math.round((dashboard.handled / dashboard.total) * 100)}% completion</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">AI Insights</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.aiInsightsSummary.totalInsights}</p>
                    <p className="text-xs text-gray-500">{dashboard.aiInsightsSummary.criticalInsights} critical</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categories and Properties Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Categories Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Categories Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(dashboard.categories)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 6)
                    .map(([category, data]) => (
                    <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 capitalize">
                            {category.replace('_', ' ')}
                          </h3>
                          {getTrendIcon(data.trend)}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600">{data.count} total</span>
                          {data.urgent > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {data.urgent} urgent
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Score: {data.avgUrgencyScore}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Properties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Top Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard.topProperties.slice(0, 6).map((property, index) => (
                    <div key={property.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{property.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600">{property.count} emails</span>
                          {property.urgent > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {property.urgent} urgent
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Score: {property.avgUrgencyScore}
                          </Badge>
                        </div>
                      </div>
                      <div className={`w-2 h-8 rounded ${getPriorityColor(
                        property.urgent > 2 ? 'critical' : 
                        property.urgent > 0 ? 'high' : 'medium'
                      )}`}></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard.recentActivity.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(activity.urgencyLevel)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate max-w-md">{activity.subject}</h3>
                        {activity.aiTag && (
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                            {activity.aiTag.replace('_', ' ')}
                          </Badge>
                        )}
                        {activity.unread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span>{activity.property}</span>
                        <span>•</span>
                        <span>{activity.time}</span>
                        {activity.urgencyScore > 5 && (
                          <>
                            <span>•</span>
                            <span className="text-orange-600">Score: {activity.urgencyScore}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 py-4">
            <p>Dashboard analytics powered by enhanced AI triage system</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDashboard}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analytics
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
