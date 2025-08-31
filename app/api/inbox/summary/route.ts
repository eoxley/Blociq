import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    console.log('📧 Fetching inbox summary...');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.log('❌ Authentication failed for inbox summary request');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log into your BlocIQ account.'
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', session.user.id);

    // Get recent emails with enhanced triage data from incoming_emails table
    let emails = [];
    let emailsError = null;
    
    try {
      const { data: emailsData, error: emailsErrorData } = await supabase
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
          tag
        `)
        .order('received_at', { ascending: false })
        .limit(100);

      if (emailsErrorData) {
        console.error('❌ Error fetching emails:', emailsErrorData);
        emailsError = emailsErrorData;
      } else {
        emails = emailsData || [];
        console.log(`✅ Fetched ${emails.length} emails with enhanced triage data`);
      }
    } catch (error) {
      console.error('❌ Incoming emails table access error:', error);
      // Fallback to empty emails array if table doesn't exist or has RLS issues
      emails = [];
    }

    // Get building information for context
    const buildingIds = [...new Set(emails?.map(e => e.building_id).filter(Boolean) || [])];
    let buildings = {};
    
    if (buildingIds.length > 0) {
      try {
        const { data: buildingData, error: buildingError } = await supabase
          .from('buildings')
          .select('id, name, address')
          .in('id', buildingIds);
        
        if (buildingError) {
          console.error('❌ Error fetching buildings:', buildingError);
        } else {
          buildings = buildingData?.reduce((acc, building) => {
            acc[building.id] = building;
            return acc;
          }, {}) || {};
        }
      } catch (error) {
        console.error('❌ Buildings table access error:', error);
        // Continue with empty buildings object
      }
    }

    // Process emails into summary categories using enhanced triage data
    const urgent = emails?.filter(email => 
      email.urgency_level === 'critical' || 
      email.urgency_level === 'high' ||
      email.ai_tag === 'urgent' ||
      email.urgency_score >= 7
    ) || [];

    const needsAction = emails?.filter(email => 
      !email.handled && (
        email.ai_tag === 'follow_up' ||
        email.triage_category === 'complaint' ||
        email.triage_category === 'maintenance' ||
        email.urgency_level === 'medium' ||
        (email.suggested_actions && email.suggested_actions.length > 0)
      )
    ) || [];

    // Generate enhanced AI suggestions based on triage insights
    const aiSuggestions = [];
    
    if (emails && emails.length > 0) {
      // Aggregate insights from AI triage
      const allInsights = emails.flatMap(email => email.ai_insights || []);
      const criticalInsights = allInsights.filter(insight => insight.priority === 'critical');
      const highInsights = allInsights.filter(insight => insight.priority === 'high');
      
      if (criticalInsights.length > 0) {
        aiSuggestions.push(`⚠️ ${criticalInsights.length} critical compliance/legal matters need immediate attention`);
      }
      
      if (highInsights.length > 0) {
        aiSuggestions.push(`🔥 ${highInsights.length} recurring issues detected - review for systemic problems`);
      }
      
      // Check for compliance-related emails by AI tag
      const complianceEmails = emails.filter(email => 
        email.ai_tag === 'fire_safety' ||
        email.ai_tag === 'compliance' ||
        email.triage_category === 'legal'
      );
      
      if (complianceEmails.length > 0) {
        aiSuggestions.push(`📋 ${complianceEmails.length} compliance/safety emails require immediate action`);
      }

      // Check for maintenance clusters
      const maintenanceEmails = emails.filter(email => 
        email.ai_tag === 'maintenance' || email.triage_category === 'maintenance'
      );
      if (maintenanceEmails.length > 3) {
        aiSuggestions.push(`🔧 ${maintenanceEmails.length} maintenance requests - consider batch processing`);
      }

      // Check for property-specific patterns
      const propertiesWithIssues = new Set();
      emails.forEach(email => {
        if (email.mentioned_properties && email.mentioned_properties.length > 0) {
          email.mentioned_properties.forEach(prop => propertiesWithIssues.add(prop));
        }
      });
      
      if (propertiesWithIssues.size > 0) {
        aiSuggestions.push(`🏢 Issues detected across ${propertiesWithIssues.size} properties - review for patterns`);
      }

      // Check for overdue responses using enhanced data
      const overdueEmails = emails.filter(email => {
        const emailDate = new Date(email.received_at);
        const daysSince = (Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > 2 && !email.handled && email.urgency_level !== 'low';
      });
      
      if (overdueEmails.length > 0) {
        aiSuggestions.push(`⏰ ${overdueEmails.length} emails overdue for response (>2 days)`);
      }
    }

    // If no AI suggestions, provide general ones
    if (aiSuggestions.length === 0) {
      aiSuggestions.push('Review recent communications for any missed actions');
      aiSuggestions.push('Check building compliance status updates');
      aiSuggestions.push('Process any pending leaseholder requests');
    }

    // If we couldn't fetch any emails due to database issues, provide a fallback summary
    if (emails.length === 0 && emailsError) {
      console.log('⚠️ Using fallback inbox summary due to database access issues');
      
      return NextResponse.json({
        success: true,
        data: {
          urgent: [],
          needsAction: [],
          aiSuggestions: [
            'Database connection issue detected - some features may be limited',
            'Please check your connection and try refreshing',
            'Contact support if the issue persists'
          ],
          totalEmails: 0,
          lastUpdated: new Date().toISOString(),
          fallback: true,
          error: emailsError.message
        }
      });
    }

    const summary = {
      urgent: urgent.map(email => ({
        id: email.id,
        subject: email.subject || 'No subject',
        sender: email.from_email || 'Unknown sender',
        sent_at: email.received_at,
        priority: email.urgency_level,
        urgencyScore: email.urgency_score,
        building: buildings[email.building_id]?.name || null,
        aiTag: email.ai_tag,
        triageCategory: email.triage_category,
        mentionedProperties: email.mentioned_properties || []
      })),
      needsAction: needsAction.map(email => ({
        id: email.id,
        subject: email.subject || 'No subject',
        sender: email.from_email || 'Unknown sender',
        sent_at: email.received_at,
        status: email.handled ? 'handled' : 'pending',
        suggestedAction: getEnhancedSuggestedAction(email),
        building: buildings[email.building_id]?.name || null,
        urgencyLevel: email.urgency_level,
        aiInsights: email.ai_insights || [],
        suggestedActions: email.suggested_actions || []
      })),
      aiSuggestions,
      totalEmails: emails?.length || 0,
      lastUpdated: new Date().toISOString(),
      enhancedTriageEnabled: true
    };

    console.log('✅ Inbox summary generated:', {
      urgent: summary.urgent.length,
      needsAction: summary.needsAction.length,
      aiSuggestions: summary.aiSuggestions.length,
      totalEmails: summary.totalEmails
    });

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Inbox summary API error:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch inbox summary',
      message: 'An unexpected error occurred. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Enhanced helper function using AI triage data
function getEnhancedSuggestedAction(email: any): string {
  // Use AI-generated suggested actions if available
  if (email.suggested_actions && email.suggested_actions.length > 0) {
    return email.suggested_actions[0]; // Return the first/most important action
  }
  
  // Fallback to AI insights
  if (email.ai_insights && email.ai_insights.length > 0) {
    const highPriorityInsight = email.ai_insights.find(insight => insight.priority === 'critical' || insight.priority === 'high');
    if (highPriorityInsight) {
      return highPriorityInsight.action;
    }
    return email.ai_insights[0].action;
  }
  
  // Fallback to AI tag-based suggestions
  switch (email.ai_tag) {
    case 'urgent':
      return 'PRIORITY: Handle immediately';
    case 'fire_safety':
      return 'Schedule fire safety assessment and update compliance records';
    case 'maintenance':
      return 'Create work order and assign contractor';
    case 'complaint':
      return 'Acknowledge receipt and schedule investigation';
    case 'compliance':
      return 'Review compliance requirements and escalate if needed';
    case 'legal':
      return 'Review with legal team and prepare formal response';
    default:
      return 'Review and respond within 24 hours';
  }
}

// Legacy function kept for backwards compatibility
function getSuggestedAction(email: any): string {
  return getEnhancedSuggestedAction(email);
}
