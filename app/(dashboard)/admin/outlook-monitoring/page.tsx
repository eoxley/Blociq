'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Refresh
} from 'lucide-react';

interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  monthlyRecurringRevenue: number;
  averageUsagePerUser: number;
  topUsageUsers: Array<{
    email: string;
    usage: number;
    limit: number;
    status: string;
  }>;
  recentActivity: Array<{
    email: string;
    action: string;
    timestamp: string;
    details?: string;
  }>;
  usageByEndpoint: Array<{
    endpoint: string;
    count: number;
    percentage: number;
  }>;
}

export default function OutlookMonitoringPage() {
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/outlook-monitoring');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outlook AI Monitoring</h1>
          <p className="text-gray-600">
            Monitor subscriptions, usage, and revenue metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button onClick={fetchMetrics} disabled={loading} size="sm">
            <Refresh className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active users with subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{metrics?.monthlyRecurringRevenue || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Recurring revenue per month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.trialSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Users in 30-day trial period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.averageUsagePerUser || 0}</div>
            <p className="text-xs text-muted-foreground">
              AI requests per user/month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Insights</TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Status Breakdown</CardTitle>
                <CardDescription>Current status of all subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm">Active Paid</span>
                    </div>
                    <Badge variant="default">
                      {(metrics?.activeSubscriptions || 0) - (metrics?.trialSubscriptions || 0)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm">Free Trial</span>
                    </div>
                    <Badge variant="secondary">
                      {metrics?.trialSubscriptions || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-sm">Cancelled</span>
                    </div>
                    <Badge variant="destructive">
                      {metrics?.cancelledSubscriptions || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Usage Users</CardTitle>
                <CardDescription>Users with highest AI request volumes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.topUsageUsers?.map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          {user.usage} / {user.limit} requests
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={user.status === 'active' ? 'default' :
                                   user.status === 'trialing' ? 'secondary' : 'destructive'}
                        >
                          {user.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round((user.usage / user.limit) * 100)}% used
                        </p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-gray-500">No usage data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Analytics Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Endpoint</CardTitle>
              <CardDescription>Which AI features are most popular</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.usageByEndpoint?.map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart3 className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium">{endpoint.endpoint}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-600">{endpoint.count} requests</div>
                      <div className="text-sm text-gray-500">({endpoint.percentage}%)</div>
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">No usage data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest subscription and usage events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.recentActivity?.map((activity, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{activity.email}</p>
                      <p className="text-sm text-gray-600">{activity.action}</p>
                      {activity.details && (
                        <p className="text-xs text-gray-500">{activity.details}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Metrics</CardTitle>
                <CardDescription>Financial performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Monthly Recurring Revenue:</span>
                    <span className="font-medium">£{metrics?.monthlyRecurringRevenue || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Average Revenue Per User:</span>
                    <span className="font-medium">
                      £{metrics?.totalSubscriptions ?
                        Math.round((metrics.monthlyRecurringRevenue / metrics.totalSubscriptions) * 100) / 100 : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Trial Conversion Rate:</span>
                    <span className="font-medium">
                      {metrics?.totalSubscriptions && metrics?.trialSubscriptions ?
                        Math.round(((metrics.totalSubscriptions - metrics.trialSubscriptions) / metrics.totalSubscriptions) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Insights</CardTitle>
                <CardDescription>Subscription growth patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Subscriptions:</span>
                    <span className="font-medium">{metrics?.activeSubscriptions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Churn Rate:</span>
                    <span className="font-medium">
                      {metrics?.totalSubscriptions ?
                        Math.round((metrics.cancelledSubscriptions / metrics.totalSubscriptions) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Users in Trial:</span>
                    <span className="font-medium">{metrics?.trialSubscriptions || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}