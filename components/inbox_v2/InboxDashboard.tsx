import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  AlertTriangle, 
  Clock, 
  Users, 
  Wrench, 
  FileText, 
  MessageSquare, 
  Building, 
  RefreshCw,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Brain
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  enhancedTriageEnabled?: boolean;
}

interface InboxDashboardProps {
  onRefresh?: () => void;
  onNavigateToInbox?: (filter?: any) => void;
  onNavigateToEmail?: (emailId: string) => void;
}

const InboxDashboard: React.FC<InboxDashboardProps> = ({
  onRefresh,
  onNavigateToInbox,
  onNavigateToEmail
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const router = useRouter();

  // Fetch dashboard data using the enhanced API
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/inbox/dashboard?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  // Enhanced navigation functions that integrate with existing inbox system
  const handleCategoryClick = (category: string) => {
    const filter = {
      ai_tag: category,
      urgency_level: undefined
    };
    
    if (onNavigateToInbox) {
      onNavigateToInbox(filter);
    } else {
      // Fallback to direct navigation
      router.push(`/inbox?filter=${encodeURIComponent(JSON.stringify(filter))}`);
    }
  };

  const handleUrgentClick = () => {
    const filter = {
      urgency_level: ['critical', 'high']
    };
    
    if (onNavigateToInbox) {
      onNavigateToInbox(filter);
    } else {
      router.push(`/inbox?filter=${encodeURIComponent(JSON.stringify(filter))}`);
    }
  };

  const handlePropertyClick = (propertyName: string) => {
    const filter = {
      property: propertyName
    };
    
    if (onNavigateToInbox) {
      onNavigateToInbox(filter);
    } else {
      router.push(`/inbox?filter=${encodeURIComponent(JSON.stringify(filter))}`);
    }
  };

  const handleRecentActivityClick = (emailId: string) => {
    if (onNavigateToEmail) {
      onNavigateToEmail(emailId);
    } else {
      router.push(`/inbox/${emailId}`);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
    if (onRefresh) {
      onRefresh();
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      'fire_safety': AlertTriangle,
      'maintenance': Wrench,
      'service_charge': FileText,
      'complaint': MessageSquare,
      'legal': FileText,
      'tenant_communication': Users,
      'compliance': FileText,
      'urgent': AlertTriangle
    };
    return icons[category] || Mail;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <div className="h-4 w-4" />; // Spacer for stable
    }
  };

  const getPriorityColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getSuggestionStyles = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          containerClass: 'bg-red-50 border-red-200',
          titleClass: 'text-red-900',
          messageClass: 'text-red-800',
          buttonClass: 'text-red-600 hover:text-red-700'
        };
      case 'high':
        return {
          containerClass: 'bg-orange-50 border-orange-200',
          titleClass: 'text-orange-900',
          messageClass: 'text-orange-800',
          buttonClass: 'text-orange-600 hover:text-orange-700'
        };
      case 'medium':
        return {
          containerClass: 'bg-yellow-50 border-yellow-200',
          titleClass: 'text-yellow-900',
          messageClass: 'text-yellow-800',
          buttonClass: 'text-yellow-600 hover:text-yellow-700'
        };
      default:
        return {
          containerClass: 'bg-blue-50 border-blue-200',
          titleClass: 'text-blue-900',
          messageClass: 'text-blue-800',
          buttonClass: 'text-blue-600 hover:text-blue-700'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading inbox analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-800">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-lg font-semibold">Error Loading Dashboard</h2>
        </div>
        <p className="mt-2 text-red-700">{error}</p>
        <Button 
          onClick={handleRefresh}
          className="mt-4"
          variant="destructive"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">No Dashboard Data</h2>
        <p className="text-gray-500">No analytics data available for this time range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Enhanced Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Inbox Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Enhanced AI insights for property communications
            {dashboardData.enhancedTriageEnabled && (
              <Badge className="ml-2 bg-green-100 text-green-800">
                <Brain className="h-3 w-3 mr-1" />
                AI Enhanced
              </Badge>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigateToInbox?.({})}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Emails</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData.total}</p>
                <p className="text-xs text-gray-500 mt-1">{dashboardData.unread} unread</p>
              </div>
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleUrgentClick}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Urgent Priority</p>
                <p className="text-3xl font-bold text-red-600">{dashboardData.urgent}</p>
                <p className="text-xs text-red-500 mt-1">{dashboardData.urgencyDistribution.critical} critical</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Handled</p>
                <p className="text-3xl font-bold text-green-600">{dashboardData.handled}</p>
                <p className="text-xs text-green-500 mt-1">
                  {Math.round((dashboardData.handled / dashboardData.total) * 100)}% completion
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">AI Insights</p>
                <p className="text-3xl font-bold text-purple-600">{dashboardData.aiInsightsSummary.totalInsights}</p>
                <p className="text-xs text-purple-500 mt-1">{dashboardData.aiInsightsSummary.criticalInsights} critical</p>
              </div>
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Suggestions */}
      {dashboardData.smartSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Smart Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.smartSuggestions.slice(0, 6).map((suggestion, idx) => {
                const styles = getSuggestionStyles(suggestion.priority);
                
                return (
                  <div 
                    key={idx} 
                    className={`border rounded-lg p-4 ${styles.containerClass}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{suggestion.icon}</span>
                      <div className="flex-1">
                        <h3 className={`font-medium mb-2 ${styles.titleClass}`}>
                          {suggestion.title}
                        </h3>
                        <p className={`text-sm mb-3 ${styles.messageClass}`}>
                          {suggestion.message}
                        </p>
                        <button 
                          className={`text-sm font-medium flex items-center gap-1 ${styles.buttonClass}`}
                          onClick={() => {
                            // Handle suggestion action based on type
                            if (suggestion.type === 'urgent_spike' || suggestion.type === 'critical_spike') {
                              handleUrgentClick();
                            } else {
                              onNavigateToInbox?.({});
                            }
                          }}
                        >
                          {suggestion.action}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories and Properties Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced Email Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Email Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(dashboardData.categories)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 6)
                .map(([category, data]) => {
                const Icon = getCategoryIcon(category);
                
                return (
                  <div 
                    key={category} 
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow bg-white"
                    onClick={() => handleCategoryClick(category)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 capitalize">
                              {category.replace('_', ' ')}
                            </h3>
                            {getTrendIcon(data.trend)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {data.count} total • {data.unread} unread
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
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
                    
                    {data.samples.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {data.samples.slice(0, 2).map((sample, idx) => (
                          <div key={idx} className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2">
                            "{sample.subject}"
                            <span className="text-xs text-gray-500 ml-2">
                              ({sample.urgencyLevel})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Properties: {data.properties.slice(0, 2).join(', ')}
                        {data.properties.length > 2 && ` +${data.properties.length - 2} more`}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Property Summary & Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Top Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.topProperties.slice(0, 5).map((property) => (
                  <div 
                    key={property.name} 
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => handlePropertyClick(property.name)}
                  >
                    <div className="flex items-center gap-3">
                      <Building className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">{property.name}</p>
                        <p className="text-sm text-gray-600">
                          {property.count} emails • Score: {property.avgUrgencyScore}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {property.urgent > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {property.urgent} urgent
                        </Badge>
                      )}
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentActivity.slice(0, 8).map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                    onClick={() => handleRecentActivityClick(activity.id)}
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(activity.urgencyLevel)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate flex-1">
                          {activity.subject}
                        </p>
                        {activity.unread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-600">{activity.property}</p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-600">{activity.time}</p>
                        {activity.aiTag && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                              {activity.aiTag.replace('_', ' ')}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InboxDashboard;
