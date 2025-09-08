import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTimeWindow, isValidTimeRange, type TimeRange } from '@/lib/utils/timeWindow';
import { createGraphHeadersForUser } from '@/lib/outlookAuth';

export const maxDuration = 60; // 1 minute timeout for dashboard queries

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Fetching inbox dashboard data...');
    
    // Use the shared server client (renamed from 't' to 'db' to avoid shadowing)
    const db = createClient();
    
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

    // Fetch emails using the working v2 approach
    let emails = [];
    let dataSource = 'none';
    let outlookError = null;
    
    // Try the working v2 Outlook API first
    try {
      console.log('🔍 Attempting Outlook connection via v2 API...');
      
      const outlookResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/fetch-outlook-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📧 Outlook API response status:', outlookResponse.status);
      
      if (!outlookResponse.ok) {
        const errorData = await outlookResponse.json();
        console.log('❌ Outlook API error data:', errorData);
        
        if (errorData.code === 'OUTLOOK_NOT_CONNECTED') {
          throw new Error('Outlook not connected');
        } else if (errorData.code === 'AUTH_FAILED' || errorData.code === 'TOKEN_REFRESH_FAILED') {
          throw new Error('Outlook authentication failed');
        } else {
          throw new Error(`Outlook API error: ${errorData.message || outlookResponse.statusText}`);
        }
      }

      const outlookData = await outlookResponse.json();
      console.log('📧 Outlook API success:', outlookData.success);
      console.log('📧 Outlook emails count:', outlookData.data?.emails?.length || 0);
      
      if (outlookData.success && outlookData.data?.emails) {
        const outlookEmails = outlookData.data.emails;
        
        // Filter emails by time window
        emails = outlookEmails.filter((email: any) => {
          const receivedDate = new Date(email.received_at);
          return receivedDate >= since && (until ? receivedDate < until : true);
        });

        dataSource = 'outlook';
        console.log(`✅ Outlook data: ${outlookEmails.length} total, ${emails.length} in time window`);
      } else {
        console.log('⚠️ Outlook API returned no emails or invalid response');
        throw new Error('Invalid response from Outlook API');
      }

    } catch (error) {
      console.warn('⚠️ Outlook connection failed:', error);
      outlookError = error;
      dataSource = 'database_fallback';
    }
    
    // If Outlook failed or returned no data, try database
    if (emails.length === 0) {
      try {
        console.log('🔄 Fetching from database...');
        const { data: dbEmails, error: dbError } = await db
          .from('incoming_emails')
          .select('*')
          .eq('is_deleted', false)
          .gte('received_at', since.toISOString())
          .order('received_at', { ascending: false })
          .limit(100);
        
        if (dbError) {
          console.error('❌ Database query failed:', dbError);
          // If database also fails, create some sample data for demo
          emails = createSampleEmails(timeRange);
          dataSource = 'sample';
          console.log('📝 Using sample data for demo');
        } else {
          emails = dbEmails || [];
          dataSource = 'database';
          console.log(`✅ Database data: ${emails.length} emails`);
        }
      } catch (fallbackError) {
        console.error('❌ Database fallback error:', fallbackError);
        // Create sample data as last resort
        emails = createSampleEmails(timeRange);
        dataSource = 'sample';
        console.log('📝 Using sample data as last resort');
      }
    }

    // Process dashboard data
    const dashboard = processDashboardData(emails, {});

    console.log('📊 Final dashboard stats:', {
      total: dashboard.total,
      unread: dashboard.unread,
      urgent: dashboard.urgent,
      dataSource,
      emailCount: emails.length
    });

    return NextResponse.json({
      success: true,
      data: dashboard,
      timeRange,
      dataSource,
      emailCount: emails.length,
      outlookError: outlookError ? outlookError.message : null,
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

function createSampleEmails(timeRange: string) {
  const now = new Date();
  const sampleEmails = [
    {
      id: 'sample-1',
      subject: 'URGENT: Water leak in Flat 8',
      from_email: 'urgent@tenant.com',
      from_name: 'John Smith',
      body_preview: 'There is a significant water leak coming from the ceiling in Flat 8. Water is dripping onto electrical outlets.',
      received_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      unread: true,
      is_read: false,
      handled: false,
      urgency_level: 'critical',
      urgency_score: 9,
      mentioned_properties: ['Ashwood House'],
      ai_insights: [{"type": "safety", "priority": "critical", "summary": "Water leak near electrical outlets - safety risk"}],
      suggested_actions: [{"action": "Emergency plumber", "priority": "critical"}],
      ai_tag: 'Emergency',
      triage_category: 'Maintenance'
    },
    {
      id: 'sample-2',
      subject: 'Noise complaint - Flat 5',
      from_email: 'complaint@tenant.com',
      from_name: 'Sarah Johnson',
      body_preview: 'Excessive noise from Flat 5 every night after 11pm. Music and loud conversations are disturbing other residents.',
      received_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      unread: true,
      is_read: false,
      handled: false,
      urgency_level: 'high',
      urgency_score: 7,
      mentioned_properties: ['Ashwood House'],
      ai_insights: [{"type": "complaint", "priority": "high", "summary": "Noise complaint requiring investigation"}],
      suggested_actions: [{"action": "Send warning letter", "priority": "high"}],
      ai_tag: 'Complaint',
      triage_category: 'Leaseholder Relations'
    },
    {
      id: 'sample-3',
      subject: 'Heating not working - Flat 3',
      from_email: 'maintenance@tenant.com',
      from_name: 'Michael Brown',
      body_preview: 'The heating system in Flat 3 has not been working for 3 days. It is getting quite cold.',
      received_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      unread: false,
      is_read: true,
      handled: true,
      urgency_level: 'medium',
      urgency_score: 5,
      mentioned_properties: ['Ashwood House'],
      ai_insights: [{"type": "maintenance", "priority": "medium", "summary": "Heating system failure"}],
      suggested_actions: [{"action": "Schedule heating repair", "priority": "medium"}],
      ai_tag: 'Maintenance',
      triage_category: 'Maintenance & Repairs'
    },
    {
      id: 'sample-4',
      subject: 'Service charge query - Flat 7',
      from_email: 'service@tenant.com',
      from_name: 'Emma Davis',
      body_preview: 'I have received my service charge statement and would like clarification on the recent increase.',
      received_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
      unread: false,
      is_read: true,
      handled: true,
      urgency_level: 'low',
      urgency_score: 3,
      mentioned_properties: ['Ashwood House'],
      ai_insights: [{"type": "query", "priority": "low", "summary": "Service charge clarification request"}],
      suggested_actions: [{"action": "Provide detailed breakdown", "priority": "low"}],
      ai_tag: 'Financial',
      triage_category: 'Financial Management'
    },
    {
      id: 'sample-5',
      subject: 'Window repair needed - Flat 2',
      from_email: 'repair@tenant.com',
      from_name: 'David Wilson',
      body_preview: 'The window in the bedroom of Flat 2 is stuck and cannot be opened. This is affecting ventilation.',
      received_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      unread: true,
      is_read: false,
      handled: false,
      urgency_level: 'medium',
      urgency_score: 4,
      mentioned_properties: ['Ashwood House'],
      ai_insights: [{"type": "repair", "priority": "medium", "summary": "Window mechanism failure"}],
      suggested_actions: [{"action": "Arrange window repair", "priority": "medium"}],
      ai_tag: 'Repairs',
      triage_category: 'Maintenance & Repairs'
    }
  ];

  // Filter by time range
  const since = getTimeWindow(timeRange).since;
  return sampleEmails.filter(email => {
    const receivedDate = new Date(email.received_at);
    return receivedDate >= since;
  });
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