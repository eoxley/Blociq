import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Fetching inbox dashboard data...');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.log('❌ Authentication failed for dashboard request');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log into your BlocIQ account.'
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', session.user.id);

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || 'week';

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7); // Default to week
    }

    console.log(`📅 Fetching emails from ${startDate.toISOString()} to ${now.toISOString()}`);

    // Query the enhanced incoming_emails table with all triage data
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select(`
        id,
        subject,
        from_email,
        body_preview,
        received_at,
        unread,
        handled,
        urgency_level,
        urgency_score,
        mentioned_properties,
        ai_insights,
        suggested_actions,
        ai_tag,
        triage_category,
        building_id,
        tag,
        message_id
      `)
      .gte('received_at', startDate.toISOString())
      .order('received_at', { ascending: false });

    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError);
      throw emailsError;
    }

    console.log(`✅ Fetched ${emails?.length || 0} emails for dashboard`);

    // Get building information for the emails
    const buildingIds = [...new Set(emails?.map(e => e.building_id).filter(Boolean) || [])];
    let buildingsMap = {};
    
    if (buildingIds.length > 0) {
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, address')
        .in('id', buildingIds);
      
      if (buildingsError) {
        console.error('❌ Error fetching buildings:', buildingsError);
      } else {
        buildingsMap = buildings?.reduce((acc, building) => {
          acc[building.id] = building;
          return acc;
        }, {}) || {};
      }
    }

    // Process data for dashboard with enhanced triage integration
    const dashboard = processDashboardData(emails || [], buildingsMap);

    console.log('✅ Dashboard data processed:', {
      total: dashboard.total,
      urgent: dashboard.urgent,
      categories: Object.keys(dashboard.categories).length,
      properties: Object.keys(dashboard.propertyBreakdown).length,
      suggestions: dashboard.smartSuggestions.length
    });

    return NextResponse.json({
      success: true,
      data: dashboard,
      timeRange,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      message: 'An unexpected error occurred. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function processDashboardData(emails: any[], buildingsMap: any) {
  const dashboard = {
    total: emails.length,
    unread: emails.filter(e => e.unread).length,
    handled: emails.filter(e => e.handled).length,
    urgent: emails.filter(e => ['critical', 'high'].includes(e.urgency_level)).length,
    categories: {} as any,
    propertyBreakdown: {} as any,
    recentActivity: [] as any[],
    smartSuggestions: [] as any[],
    urgencyDistribution: {
      critical: emails.filter(e => e.urgency_level === 'critical').length,
      high: emails.filter(e => e.urgency_level === 'high').length,
      medium: emails.filter(e => e.urgency_level === 'medium').length,
      low: emails.filter(e => e.urgency_level === 'low').length
    },
    topProperties: [] as any[],
    aiInsightsSummary: {
      totalInsights: 0,
      criticalInsights: 0,
      followUps: 0,
      recurringIssues: 0,
      complianceMatters: 0
    }
  };

  // Group by categories using enhanced AI tags
  const categoryGroups: { [key: string]: any[] } = {};
  emails.forEach(email => {
    const category = email.ai_tag || email.triage_category || 'General';
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(email);
  });

  // Build enhanced category summary
  Object.entries(categoryGroups).forEach(([category, categoryEmails]) => {
    const properties = new Set<string>();
    const urgencyScores = categoryEmails.map(e => e.urgency_score || 0);
    const avgUrgencyScore = urgencyScores.length > 0 
      ? urgencyScores.reduce((a, b) => a + b, 0) / urgencyScores.length 
      : 0;

    // Extract properties from various sources
    categoryEmails.forEach(email => {
      // From building relationship
      if (email.building_id && buildingsMap[email.building_id]) {
        properties.add(buildingsMap[email.building_id].name);
      }
      
      // From mentioned_properties array
      if (email.mentioned_properties && Array.isArray(email.mentioned_properties)) {
        email.mentioned_properties.forEach((prop: string) => properties.add(prop));
      }
    });

    dashboard.categories[category] = {
      count: categoryEmails.length,
      urgent: categoryEmails.filter(e => ['critical', 'high'].includes(e.urgency_level)).length,
      unread: categoryEmails.filter(e => e.unread).length,
      handled: categoryEmails.filter(e => e.handled).length,
      avgUrgencyScore: Math.round(avgUrgencyScore * 10) / 10,
      properties: Array.from(properties).slice(0, 5), // Show top 5
      samples: categoryEmails.slice(0, 3).map(e => ({
        subject: e.subject,
        urgencyLevel: e.urgency_level,
        received: e.received_at
      })),
      trend: calculateCategoryTrend(categoryEmails)
    };
  });

  // Enhanced property breakdown using building relationships and mentions
  const propertyGroups: { [key: string]: any[] } = {};
  emails.forEach(email => {
    let propertyName = 'Unknown Property';
    
    // Primary: Use building relationship
    if (email.building_id && buildingsMap[email.building_id]) {
      propertyName = buildingsMap[email.building_id].name;
    }
    // Secondary: Use first mentioned property
    else if (email.mentioned_properties && Array.isArray(email.mentioned_properties) && email.mentioned_properties.length > 0) {
      propertyName = email.mentioned_properties[0];
    }
    
    if (!propertyGroups[propertyName]) {
      propertyGroups[propertyName] = [];
    }
    propertyGroups[propertyName].push(email);
  });

  Object.entries(propertyGroups).forEach(([property, propertyEmails]) => {
    const urgencyScores = propertyEmails.map(e => e.urgency_score || 0);
    const avgUrgencyScore = urgencyScores.length > 0 
      ? urgencyScores.reduce((a, b) => a + b, 0) / urgencyScores.length 
      : 0;

    dashboard.propertyBreakdown[property] = {
      count: propertyEmails.length,
      urgent: propertyEmails.filter(e => ['critical', 'high'].includes(e.urgency_level)).length,
      unread: propertyEmails.filter(e => e.unread).length,
      categories: [...new Set(propertyEmails.map(e => e.ai_tag || e.triage_category))],
      avgUrgencyScore: Math.round(avgUrgencyScore * 10) / 10,
      recentActivity: propertyEmails.slice(0, 3).map(e => ({
        subject: e.subject,
        category: e.ai_tag || e.triage_category,
        received: e.received_at
      }))
    };
  });

  // Sort properties by urgency and volume for top properties
  dashboard.topProperties = Object.entries(dashboard.propertyBreakdown)
    .sort(([, a]: [string, any], [, b]: [string, any]) => {
      // Sort by urgent count first, then total count
      if (b.urgent !== a.urgent) return b.urgent - a.urgent;
      return b.count - a.count;
    })
    .slice(0, 5)
    .map(([name, data]) => ({ name, ...data }));

  // Enhanced recent activity with AI context
  dashboard.recentActivity = emails.slice(0, 15).map(email => ({
    id: email.id,
    time: formatTimeAgo(email.received_at),
    type: getActivityType(email),
    subject: email.subject,
    property: email.building_id && buildingsMap[email.building_id] 
      ? buildingsMap[email.building_id].name 
      : (email.mentioned_properties && email.mentioned_properties[0]) || 'Unknown',
    urgencyLevel: email.urgency_level,
    urgencyScore: email.urgency_score,
    aiTag: email.ai_tag,
    category: email.triage_category,
    unread: email.unread,
    handled: email.handled
  }));

  // Process AI insights summary
  emails.forEach(email => {
    if (email.ai_insights && Array.isArray(email.ai_insights)) {
      dashboard.aiInsightsSummary.totalInsights += email.ai_insights.length;
      
      email.ai_insights.forEach((insight: any) => {
        if (insight.priority === 'critical') {
          dashboard.aiInsightsSummary.criticalInsights++;
        }
        if (insight.type === 'follow_up') {
          dashboard.aiInsightsSummary.followUps++;
        }
        if (insight.type === 'recurring') {
          dashboard.aiInsightsSummary.recurringIssues++;
        }
        if (insight.type === 'compliance') {
          dashboard.aiInsightsSummary.complianceMatters++;
        }
      });
    }
  });

  // Generate enhanced smart suggestions
  dashboard.smartSuggestions = generateSmartSuggestions(emails, dashboard);

  return dashboard;
}

function getActivityType(email: any): string {
  if (email.urgency_level === 'critical') return 'critical';
  if (email.urgency_level === 'high') return 'urgent';
  if (email.ai_tag) return email.ai_tag.toLowerCase().replace(' ', '_');
  if (email.triage_category) return email.triage_category.toLowerCase().replace(' ', '_');
  return 'general';
}

function calculateCategoryTrend(categoryEmails: any[]): 'up' | 'down' | 'stable' {
  // Simple trend calculation based on recent vs older emails
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  const recentCount = categoryEmails.filter(e => new Date(e.received_at).getTime() > oneDayAgo).length;
  const olderCount = categoryEmails.length - recentCount;
  
  if (recentCount > olderCount * 1.5) return 'up';
  if (recentCount < olderCount * 0.5) return 'down';
  return 'stable';
}

function generateSmartSuggestions(emails: any[], dashboard: any) {
  const suggestions = [];

  // Critical urgency spike
  if (dashboard.urgencyDistribution.critical > 2) {
    suggestions.push({
      type: 'critical_spike',
      title: 'Critical Priority Alert',
      message: `${dashboard.urgencyDistribution.critical} critical emails need immediate attention`,
      action: 'Review critical emails',
      priority: 'critical',
      icon: '🚨'
    });
  }

  // High urgent volume suggestion
  if (dashboard.urgent > 5) {
    suggestions.push({
      type: 'urgent_spike',
      title: 'High Urgent Volume',
      message: `${dashboard.urgent} urgent emails detected - consider prioritizing workflow`,
      action: 'Review urgent queue',
      priority: 'high',
      icon: '⚡'
    });
  }

  // Batch processing opportunities
  const batchableCategories = ['service_charge', 'payment', 'maintenance'];
  batchableCategories.forEach(category => {
    const count = dashboard.categories[category]?.count || 0;
    if (count > 4) {
      suggestions.push({
        type: 'batch_process',
        title: 'Batch Processing Opportunity',
        message: `${count} ${category.replace('_', ' ')} emails can be processed efficiently with templates`,
        action: `Process ${category} batch`,
        priority: 'medium',
        icon: '📦'
      });
    }
  });

  // Follow-up needed suggestion with enhanced logic
  const unreadOldCount = emails.filter(e => 
    e.unread && 
    !e.handled &&
    new Date(e.received_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;

  if (unreadOldCount > 3) {
    suggestions.push({
      type: 'follow_up',
      title: 'Overdue Follow-ups',
      message: `${unreadOldCount} emails unread for 24+ hours`,
      action: 'Review overdue items',
      priority: 'medium',
      icon: '⏰'
    });
  }

  // Compliance/legal priority suggestion
  if (dashboard.aiInsightsSummary.complianceMatters > 0) {
    suggestions.push({
      type: 'compliance_priority',
      title: 'Compliance Matters Detected',
      message: `${dashboard.aiInsightsSummary.complianceMatters} compliance-related emails require attention`,
      action: 'Review compliance items',
      priority: 'high',
      icon: '📋'
    });
  }

  // Recurring issues pattern
  if (dashboard.aiInsightsSummary.recurringIssues > 2) {
    suggestions.push({
      type: 'recurring_pattern',
      title: 'Recurring Issues Pattern',
      message: `${dashboard.aiInsightsSummary.recurringIssues} recurring issues detected - may need systematic review`,
      action: 'Analyze patterns',
      priority: 'medium',
      icon: '🔄'
    });
  }

  // Property hotspot suggestion
  const hotspotProperty = dashboard.topProperties[0];
  if (hotspotProperty && hotspotProperty.urgent > 2) {
    suggestions.push({
      type: 'property_hotspot',
      title: 'Property Requiring Attention',
      message: `${hotspotProperty.name} has ${hotspotProperty.urgent} urgent matters`,
      action: `Review ${hotspotProperty.name}`,
      priority: 'medium',
      icon: '🏢'
    });
  }

  return suggestions.slice(0, 6); // Limit to top 6 suggestions
}

function formatTimeAgo(dateTime: string): string {
  const now = new Date();
  const then = new Date(dateTime);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
}
