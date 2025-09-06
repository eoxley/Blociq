import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getTimeWindow, isValidTimeRange, type TimeRange } from '@/lib/utils/timeWindow';
import { createGraphHeadersForUser } from '@/lib/outlookAuth';

export const maxDuration = 60; // 1 minute timeout for dashboard queries

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Fetching inbox dashboard data...');
    
    // Use the shared server client (renamed from 't' to 'db' to avoid shadowing)
    const db = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await db.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Authentication failed for dashboard request');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log into your BlocIQ account.'
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Get and validate time range
    const { searchParams } = new URL(req.url);
    const timeRangeParam = searchParams.get('timeRange') || 'week';
    const timeRange: TimeRange = isValidTimeRange(timeRangeParam) ? timeRangeParam : 'week';

    // Get time window
    const { since, until } = getTimeWindow(timeRange);
    console.log(`📅 Time window: ${since.toISOString()} to ${until?.toISOString() || 'now'}`);

    // Check agency membership
    const { data: agencyMember, error: agencyError } = await db
      .from('agency_members')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (agencyError) {
      console.error('❌ Agency query error:', agencyError);
      
      if (agencyError.code === 'PGRST116') {
        console.log('ℹ️ User not yet linked to agency - returning empty dashboard');
        return NextResponse.json({
          success: true,
          data: createEmptyDashboard(),
          timeRange,
          message: 'User not yet linked to agency - please complete setup',
          needsSetup: true
        });
      }
      
      return NextResponse.json({
        error: 'Database error',
        message: 'Failed to check agency membership',
        details: process.env.NODE_ENV === 'development' ? agencyError.message : 'Internal error'
      }, { status: 500 });
    }

    console.log('✅ User is member of agency:', agencyMember.agency_id);

    // Fetch emails from Outlook via Graph API
    let emails = [];
    let emailsError = null;
    
    try {
      console.log('🔍 Querying Outlook via Microsoft Graph API...');
      
      const headers = await createGraphHeadersForUser(user.id);
      const messagesResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$select=id,subject,from,bodyPreview,receivedDateTime,isRead,importance&$orderby=receivedDateTime desc&$top=100`,
        { headers }
      );
      
      if (!messagesResponse.ok) {
        throw new Error(`Failed to fetch messages: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
      
      // Transform Outlook messages to expected format
      const outlookEmails = messagesData.value?.map((msg: any) => ({
        id: msg.id,
        subject: msg.subject || 'No Subject',
        from_email: msg.from?.emailAddress?.address || '',
        from_name: msg.from?.emailAddress?.name || '',
        body: msg.bodyPreview || '',
        received_at: msg.receivedDateTime,
        is_read: msg.isRead || false,
        building_id: null,
        urgency_level: msg.importance === 'high' ? 'high' : 'low',
        urgency_score: msg.importance === 'high' ? 8 : 2,
        mentioned_properties: [],
        ai_insights: [],
        suggested_actions: [],
        ai_tag: 'General',
        triage_category: 'General'
      })) || [];

      // Filter emails by time window
      emails = outlookEmails.filter((email: any) => {
        const receivedDate = new Date(email.received_at);
        return receivedDate >= since && (until ? receivedDate < until : true);
      });

      console.log(`📊 Outlook query result: ${outlookEmails.length} total, ${emails.length} in time window`);

    } catch (error) {
      console.error('❌ Error fetching from Outlook:', error);
      emailsError = error;
      
      // Check if it's a "No Outlook connection" error
      if (error instanceof Error && error.message.includes('No Outlook connection found')) {
        return NextResponse.json({
          success: true,
          data: createEmptyDashboard(),
          timeRange,
          message: 'Please connect your Outlook account to view email data',
          needsConnect: true,
          outlookConnectionRequired: true
        });
      }
      
      // Fallback to database
      try {
        console.log('🔄 Falling back to database emails...');
        const { data: dbEmails, error: dbError } = await db
          .from('incoming_emails')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .gte('received_at', since.toISOString())
          .order('received_at', { ascending: false })
          .limit(100);
        
        if (dbError) {
          console.error('❌ Database fallback failed:', dbError);
          emails = [];
        } else {
          console.log('✅ Database fallback successful:', dbEmails?.length || 0, 'emails');
          emails = dbEmails || [];
        }
      } catch (fallbackError) {
        console.error('❌ Database fallback error:', fallbackError);
        emails = [];
      }
    }

    // Process dashboard data
    const dashboard = processDashboardData(emails, {});

    return NextResponse.json({
      success: true,
      data: dashboard,
      timeRange,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
      data: createEmptyDashboard(),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function processDashboardData(emails: any[], buildingsMap: any) {
  const safeEmails = Array.isArray(emails) ? emails.filter(e => e && typeof e === 'object') : [];
  
  const dashboard = {
    total: safeEmails.length,
    unread: safeEmails.filter(e => e && e.is_read === false).length,
    handled: 0, // handled field not available in current schema
    urgent: safeEmails.filter(e => e && ['critical', 'high'].includes(e.urgency_level || 'low')).length,
    categories: {} as any,
    propertyBreakdown: {} as any,
    recentActivity: [] as any[],
    smartSuggestions: [] as any[],
    urgencyDistribution: {
      critical: safeEmails.filter(e => (e.urgency_level || 'low') === 'critical').length,
      high: safeEmails.filter(e => (e.urgency_level || 'low') === 'high').length,
      medium: safeEmails.filter(e => (e.urgency_level || 'low') === 'medium').length,
      low: safeEmails.filter(e => (e.urgency_level || 'low') === 'low').length
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

  // Group by categories
  const categoryGroups: { [key: string]: any[] } = {};
  safeEmails.forEach(email => {
    const category = email?.ai_tag || email?.triage_category || 'General';
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(email);
  });

  // Build category summary
  Object.entries(categoryGroups).forEach(([category, categoryEmails]) => {
    const properties = new Set<string>();
    const urgencyScores = categoryEmails.map(e => e.urgency_score || 0);
    const avgUrgencyScore = urgencyScores.length > 0 
      ? urgencyScores.reduce((a, b) => a + b, 0) / urgencyScores.length 
      : 0;

    dashboard.categories[category] = {
      count: categoryEmails.length,
      urgent: categoryEmails.filter(e => ['critical', 'high'].includes(e.urgency_level || 'low')).length,
      unread: categoryEmails.filter(e => e.is_read === false).length,
      handled: 0,
      avgUrgencyScore: Math.round(avgUrgencyScore * 10) / 10,
      properties: Array.from(properties).slice(0, 5),
      samples: categoryEmails.slice(0, 3).map(e => ({
        subject: e.subject || 'No Subject',
        urgencyLevel: e.urgency_level || 'low',
        received: e.received_at
      })),
      trend: 'stable'
    };
  });

  // Property breakdown
  const propertyGroups: { [key: string]: any[] } = {};
  safeEmails.forEach(email => {
    let propertyName = 'Unknown Property';
    
    if (email?.building_id && buildingsMap?.[email.building_id]?.name) {
      propertyName = buildingsMap[email.building_id].name;
    } else if (email?.mentioned_properties && Array.isArray(email.mentioned_properties) && email.mentioned_properties.length > 0) {
      const firstProperty = email.mentioned_properties[0];
      if (firstProperty && typeof firstProperty === 'string' && firstProperty.trim()) {
        propertyName = firstProperty.trim();
      }
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
      urgent: propertyEmails.filter(e => ['critical', 'high'].includes(e.urgency_level || 'low')).length,
      unread: propertyEmails.filter(e => e.is_read === false).length,
      categories: [...new Set(propertyEmails.map(e => e?.ai_tag || e?.triage_category || 'General').filter(Boolean))],
      avgUrgencyScore: Math.round(avgUrgencyScore * 10) / 10,
      recentActivity: propertyEmails.slice(0, 3).map(e => ({
        subject: e.subject || 'No Subject',
        category: e?.ai_tag || e?.triage_category || 'General',
        received: e.received_at
      }))
    };
  });

  // Sort properties by urgency and volume for top properties
  dashboard.topProperties = Object.entries(dashboard.propertyBreakdown)
    .sort(([, a]: [string, any], [, b]: [string, any]) => {
      if (b.urgent !== a.urgent) return b.urgent - a.urgent;
      return b.count - a.count;
    })
    .slice(0, 5)
    .map(([name, data]) => ({ name, ...data }));

  // Recent activity
  dashboard.recentActivity = safeEmails.slice(0, 15).map(email => {
    let propertyName = 'Unknown';
    
    if (email?.building_id && buildingsMap?.[email.building_id]?.name) {
      propertyName = buildingsMap[email.building_id].name;
    } else if (email?.mentioned_properties && Array.isArray(email.mentioned_properties) && email.mentioned_properties.length > 0) {
      const firstProp = email.mentioned_properties[0];
      if (firstProp && typeof firstProp === 'string' && firstProp.trim()) {
        propertyName = firstProp.trim();
      }
    }

    return {
      id: email?.id || 'unknown',
      time: formatTimeAgo(email?.received_at || new Date().toISOString()),
      type: getActivityType(email),
      subject: email?.subject || 'No Subject',
      property: propertyName,
      urgencyLevel: email?.urgency_level || 'low',
      urgencyScore: email?.urgency_score || 0,
      aiTag: email?.ai_tag || null,
      category: email?.triage_category || null,
      unread: email?.is_read === false,
      handled: false
    };
  });

  // Generate smart suggestions
  dashboard.smartSuggestions = generateSmartSuggestions(safeEmails, dashboard);

  return dashboard;
}

function getActivityType(email: any): string {
  const urgencyLevel = email?.urgency_level || 'low';
  if (urgencyLevel === 'critical') return 'critical';
  if (urgencyLevel === 'high') return 'urgent';
  if (email?.ai_tag && typeof email.ai_tag === 'string') {
    return email.ai_tag.toLowerCase().replace(/\s+/g, '_');
  }
  if (email?.triage_category && typeof email.triage_category === 'string') {
    return email.triage_category.toLowerCase().replace(/\s+/g, '_');
  }
  return 'general';
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

  // Follow-up needed suggestion
  const unreadOldCount = emails.filter(e => 
    e.is_read === false && 
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

  return suggestions.slice(0, 6);
}

function createEmptyDashboard() {
  return {
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