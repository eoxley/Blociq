import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { makeGraphRequest } from '@/lib/outlookAuth';

export const maxDuration = 60; // 1 minute timeout for dashboard queries

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Fetching inbox dashboard data...');
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const authResult = await supabase.auth.getUser();
    const authData = authResult?.data || {}
    const user = authData.user || null
    const authError = authResult?.error || null
    
    if (authError || !user) {
      console.log('❌ Authentication failed for dashboard request');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log into your BlocIQ account.'
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

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

    // Check agency membership first - Handle case where user might not be in agency_members table
    const { data: agencyMember, error: agencyError } = await supabase
      .from('agency_members')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (agencyError) {
      console.error('❌ Agency query error:', agencyError);
      // If it's a "not found" error (PGRST116), that's expected for new users
      if (agencyError.code === 'PGRST116') {
        console.log('ℹ️ User not yet linked to agency - this is normal for new users');
        return NextResponse.json({
          success: true,
          data: {
            total: 0,
            unread: 0,
            handled: 0,
            urgent: 0,
            categories: {},
            propertyBreakdown: {},
            recentActivity: [],
            smartSuggestions: [],
            urgencyDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
            topProperties: [],
            aiInsightsSummary: { totalInsights: 0, criticalInsights: 0, followUps: 0, recurringIssues: 0, complianceMatters: 0 }
          },
          message: 'User not yet linked to agency - please complete setup',
          needsSetup: true
        });
      }
      
      // For other errors, return error response
      return NextResponse.json({
        error: 'Database error',
        message: 'Failed to check agency membership',
        details: agencyError.message
      }, { status: 500 });
    }

    console.log('✅ User is member of agency:', agencyMember.agency_id);

    // Fetch emails directly from Outlook via Graph API
    console.log('🔍 Attempting to query Outlook via Microsoft Graph API...');
    
    let emails = [];
    let emailsError = null;
    
    try {
      // Fetch emails directly from the inbox using the well-known name
      console.log(`📥 Fetching messages from Inbox`);
      
      const messagesResponse = await makeGraphRequest(
        `/me/mailFolders/inbox/messages?$select=id,subject,from,bodyPreview,receivedDateTime,isRead,importance&$orderby=receivedDateTime desc&$top=100`
      );
      
      if (!messagesResponse.ok) {
        console.error('❌ Error fetching messages: Status', messagesResponse.status);
        throw new Error(`Failed to fetch messages: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
      
      // Transform Outlook messages to match expected format
      const outlookEmails = messagesData.value?.map((msg: any) => ({
        id: msg.id,
        subject: msg.subject || 'No Subject',
        from_email: msg.from?.emailAddress?.address || '',
        from_name: msg.from?.emailAddress?.name || '',
        body: msg.bodyPreview || '',
        received_at: msg.receivedDateTime,
        is_read: msg.isRead || false,
        building_id: null, // Not available from Outlook
        urgency_level: msg.importance === 'high' ? 'high' : 'low',
        urgency_score: msg.importance === 'high' ? 8 : 2,
        mentioned_properties: [],
        ai_insights: [],
        suggested_actions: [],
        ai_tag: 'General',
        triage_category: 'General'
      })) || [];

      // Filter emails by time range
      emails = outlookEmails.filter((email: any) => {
        const receivedDate = new Date(email.received_at);
        return receivedDate >= startDate && receivedDate <= now;
      });

      console.log('📊 Live Outlook query result:', { 
        totalFetched: outlookEmails.length,
        emailCount: emails.length, 
        hasError: false,
        timeFiltered: `${outlookEmails.length} -> ${emails.length}`
      });

    } catch (error) {
      console.error('❌ Error fetching from Outlook:', error);
      emailsError = error;
      
      // Check if it's a "No Outlook connection" error
      if (error instanceof Error && error.message.includes('No Outlook connection found')) {
        console.log('📝 No Outlook connection found - user needs to connect');
        return NextResponse.json({
          success: true,
          data: createEmptyDashboard(),
          timeRange,
          message: 'Please connect your Outlook account to view email data',
          needsConnect: true,
          outlookConnectionRequired: true,
          generatedAt: new Date().toISOString()
        });
      }
      
      emails = [];
    }

    // Use the emails directly from Outlook (they already have AI fields populated)
    let enhancedEmails = emails;

    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError);
      
      // Handle specific Outlook connection errors gracefully
      if (emailsError.message?.includes('401') || emailsError.message?.includes('403')) {
        // Authentication error - Outlook not connected or expired
        return NextResponse.json({
          success: true,
          data: createEmptyDashboard(),
          timeRange,
          message: 'Please connect your Outlook account to view email data',
          outlookConnectionRequired: true,
          generatedAt: new Date().toISOString()
        });
      }
      
      if (emailsError.message?.includes('Failed to fetch folders') || emailsError.message?.includes('Failed to fetch messages')) {
        // Outlook API error
        return NextResponse.json({
          error: 'Outlook connection error',
          message: 'Unable to fetch emails from Outlook. Please try reconnecting your account.',
          details: emailsError.message,
          timestamp: new Date().toISOString()
        }, { status: 503 });
      }
      
      // For other errors, throw to be caught by main catch block
      throw emailsError;
    }

    console.log(`✅ Fetched ${enhancedEmails?.length || 0} emails for dashboard`);

    // No building mapping needed for live Outlook emails
    const buildingsMap = {};

    // Process data for dashboard with enhanced triage integration
    let dashboard;
    try {
      dashboard = processDashboardData(enhancedEmails || [], buildingsMap);
      console.log('✅ Dashboard data processed:', {
        total: dashboard.total,
        urgent: dashboard.urgent,
        categories: Object.keys(dashboard.categories).length,
        properties: Object.keys(dashboard.propertyBreakdown).length,
        suggestions: dashboard.smartSuggestions.length
      });
    } catch (processingError) {
      console.error('❌ Error processing dashboard data:', processingError);
      // Return a minimal dashboard with safe defaults
      dashboard = {
        total: enhancedEmails?.length || 0,
        unread: enhancedEmails?.filter(e => e?.is_read === false).length || 0,
        handled: 0, // handled field not available in current schema
        urgent: enhancedEmails?.filter(e => ['critical', 'high'].includes(e?.urgency_level || 'low')).length || 0,
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

    // Ensure all required keys are present with safe defaults
    const safeDashboard = {
      total: Number.isFinite(dashboard?.total) ? dashboard.total : 0,
      unread: Number.isFinite(dashboard?.unread) ? dashboard.unread : 0,
      handled: Number.isFinite(dashboard?.handled) ? dashboard.handled : 0,
      urgent: Number.isFinite(dashboard?.urgent) ? dashboard.urgent : 0,
      categories: dashboard?.categories && typeof dashboard.categories === 'object' ? dashboard.categories : {},
      propertyBreakdown: dashboard?.propertyBreakdown && typeof dashboard.propertyBreakdown === 'object' ? dashboard.propertyBreakdown : {},
      recentActivity: Array.isArray(dashboard?.recentActivity) ? dashboard.recentActivity : [],
      smartSuggestions: Array.isArray(dashboard?.smartSuggestions) ? dashboard.smartSuggestions : [],
      urgencyDistribution: dashboard?.urgencyDistribution && typeof dashboard.urgencyDistribution === 'object' ? dashboard.urgencyDistribution : {
        critical: 0, high: 0, medium: 0, low: 0
      },
      topProperties: Array.isArray(dashboard?.topProperties) ? dashboard.topProperties : [],
      aiInsightsSummary: dashboard?.aiInsightsSummary && typeof dashboard.aiInsightsSummary === 'object' ? dashboard.aiInsightsSummary : {
        totalInsights: 0, criticalInsights: 0, followUps: 0, recurringIssues: 0, complianceMatters: 0
      }
    };

    return NextResponse.json({
      success: true,
      data: safeDashboard,
      timeRange,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    // Provide more specific error information for debugging
    let errorMessage = 'An unexpected error occurred. Please try again.';
    let errorDetails = 'Unknown error';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      // Check for specific error types
      if (error.message.includes('column') || error.message.includes('table')) {
        errorMessage = 'Database schema error - please contact support.';
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Database connection timeout - please try again.';
      } else if (error.message.includes('permission') || error.message.includes('auth')) {
        errorMessage = 'Database permissions error - please log in again.';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: errorMessage,
      details: errorDetails,
      data: createEmptyDashboard(), // Always provide fallback data structure
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function processDashboardData(emails: any[], buildingsMap: any) {
  // Ensure inputs are safe arrays/objects
  const safeEmails = Array.isArray(emails) ? emails.filter(e => e && typeof e === 'object') : [];
  const safeBuildingsMap = buildingsMap && typeof buildingsMap === 'object' ? buildingsMap : {};
  
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

  // Group by categories using enhanced AI tags with safe fallbacks
  const categoryGroups: { [key: string]: any[] } = {};
  safeEmails.forEach(email => {
    try {
      const category = email?.ai_tag || email?.triage_category || 'General';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(email);
    } catch (error) {
      console.warn('Error processing email for categories:', error, email?.id);
    }
  });

  // Build enhanced category summary
  Object.entries(categoryGroups).forEach(([category, categoryEmails]) => {
    const properties = new Set<string>();
    const urgencyScores = categoryEmails.map(e => e.urgency_score || 0);
    const avgUrgencyScore = urgencyScores.length > 0 
      ? urgencyScores.reduce((a, b) => a + b, 0) / urgencyScores.length 
      : 0;

    // Extract properties from various sources with safe fallbacks
    categoryEmails.forEach(email => {
      try {
        // From building relationship
        if (email?.building_id && safeBuildingsMap?.[email.building_id]?.name) {
          properties.add(safeBuildingsMap[email.building_id].name);
        }
        
        // From mentioned_properties array (with safe array check)
        if (email?.mentioned_properties && Array.isArray(email.mentioned_properties)) {
          email.mentioned_properties.forEach((prop: any) => {
            if (prop && typeof prop === 'string' && prop.trim()) {
              properties.add(prop.trim());
            }
          });
        }
      } catch (error) {
        console.warn('Error extracting properties from email:', error, email?.id);
      }
    });

    dashboard.categories[category] = {
      count: categoryEmails.length,
      urgent: categoryEmails.filter(e => ['critical', 'high'].includes(e.urgency_level || 'low')).length,
      unread: categoryEmails.filter(e => e.is_read === false).length,
      handled: 0, // handled field not available in current schema
      avgUrgencyScore: Math.round(avgUrgencyScore * 10) / 10,
      properties: Array.from(properties).slice(0, 5), // Show top 5
      samples: categoryEmails.slice(0, 3).map(e => ({
        subject: e.subject || 'No Subject',
        urgencyLevel: e.urgency_level || 'low',
        received: e.received_at
      })),
      trend: calculateCategoryTrend(categoryEmails)
    };
  });

  // Enhanced property breakdown using building relationships and mentions
  const propertyGroups: { [key: string]: any[] } = {};
  safeEmails.forEach(email => {
    try {
      let propertyName = 'Unknown Property';
      
      // Primary: Use building relationship
      if (email?.building_id && safeBuildingsMap?.[email.building_id]?.name) {
        propertyName = safeBuildingsMap[email.building_id].name;
      }
      // Secondary: Use first mentioned property (with safe array check)
      else if (email?.mentioned_properties && Array.isArray(email.mentioned_properties) && email.mentioned_properties.length > 0) {
        const firstProperty = email.mentioned_properties[0];
        if (firstProperty && typeof firstProperty === 'string' && firstProperty.trim()) {
          propertyName = firstProperty.trim();
        }
      }
      
      if (!propertyGroups[propertyName]) {
        propertyGroups[propertyName] = [];
      }
      propertyGroups[propertyName].push(email);
    } catch (error) {
      console.warn('Error processing email for property groups:', error, email?.id);
    }
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
      // Sort by urgent count first, then total count
      if (b.urgent !== a.urgent) return b.urgent - a.urgent;
      return b.count - a.count;
    })
    .slice(0, 5)
    .map(([name, data]) => ({ name, ...data }));

  // Enhanced recent activity with AI context and safe fallbacks
  dashboard.recentActivity = safeEmails.slice(0, 15).map(email => {
    try {
      let propertyName = 'Unknown';
      
      if (email?.building_id && safeBuildingsMap?.[email.building_id]?.name) {
        propertyName = safeBuildingsMap[email.building_id].name;
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
        handled: false // handled field not available in current schema
      };
    } catch (error) {
      console.warn('Error processing recent activity for email:', error, email?.id);
      return {
        id: email?.id || 'error',
        time: 'Unknown',
        type: 'general',
        subject: 'Error processing email',
        property: 'Unknown',
        urgencyLevel: 'low',
        urgencyScore: 0,
        aiTag: null,
        category: null,
        unread: false,
        handled: false
      };
    }
  });

  // Process AI insights summary with safe fallbacks
  safeEmails.forEach(email => {
    try {
      if (email?.ai_insights && Array.isArray(email.ai_insights)) {
        dashboard.aiInsightsSummary.totalInsights += email.ai_insights.length;
        
        email.ai_insights.forEach((insight: any) => {
          try {
            if (insight && typeof insight === 'object') {
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
            }
          } catch (insightError) {
            console.warn('Error processing insight:', insightError);
          }
        });
      }
    } catch (error) {
      console.warn('Error processing AI insights for email:', error, email?.id);
    }
  });

  // Generate enhanced smart suggestions
  try {
    dashboard.smartSuggestions = generateSmartSuggestions(safeEmails, dashboard);
  } catch (error) {
    console.warn('Error generating smart suggestions:', error);
    dashboard.smartSuggestions = [];
  }

  return dashboard;
}

function getActivityType(email: any): string {
  try {
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
  } catch (error) {
    console.warn('Error getting activity type:', error);
    return 'general';
  }
}

function calculateCategoryTrend(categoryEmails: any[]): 'up' | 'down' | 'stable' {
  try {
    if (!categoryEmails || categoryEmails.length === 0) return 'stable';
    
    // Simple trend calculation based on recent vs older emails
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const recentCount = categoryEmails.filter(e => {
      try {
        return e?.received_at && new Date(e.received_at).getTime() > oneDayAgo;
      } catch {
        return false;
      }
    }).length;
    
    const olderCount = categoryEmails.length - recentCount;
    
    if (recentCount > olderCount * 1.5) return 'up';
    if (recentCount < olderCount * 0.5) return 'down';
    return 'stable';
  } catch (error) {
    console.warn('Error calculating category trend:', error);
    return 'stable';
  }
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
