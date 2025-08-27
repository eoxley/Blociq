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

    // Get recent emails from the communications system
    const { data: emails, error: emailsError } = await supabase
      .from('communications')
      .select(`
        id,
        subject,
        content,
        from_email,
        to_email,
        sent_at,
        type,
        status,
        priority,
        building_id,
        unit_id,
        leaseholder_id
      `)
      .eq('user_email', session.user.email)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError);
      throw emailsError;
    }

    // Get building information for context
    const buildingIds = [...new Set(emails?.map(e => e.building_id).filter(Boolean) || [])];
    let buildings = {};
    
    if (buildingIds.length > 0) {
      const { data: buildingData } = await supabase
        .from('buildings')
        .select('id, name, address')
        .in('id', buildingIds);
      
      buildings = buildingData?.reduce((acc, building) => {
        acc[building.id] = building;
        return acc;
      }, {}) || {};
    }

    // Process emails into summary categories
    const urgent = emails?.filter(email => 
      email.priority === 'high' || 
      email.subject?.toLowerCase().includes('urgent') ||
      email.subject?.toLowerCase().includes('emergency') ||
      email.subject?.toLowerCase().includes('asap')
    ) || [];

    const needsAction = emails?.filter(email => 
      email.status === 'pending' || 
      email.status === 'needs_response' ||
      email.subject?.toLowerCase().includes('action') ||
      email.subject?.toLowerCase().includes('required') ||
      email.subject?.toLowerCase().includes('please')
    ) || [];

    // Generate AI suggestions based on email content
    const aiSuggestions = [];
    
    if (emails && emails.length > 0) {
      // Check for compliance-related emails
      const complianceEmails = emails.filter(email => 
        email.subject?.toLowerCase().includes('compliance') ||
        email.subject?.toLowerCase().includes('section 20') ||
        email.subject?.toLowerCase().includes('fire safety') ||
        email.subject?.toLowerCase().includes('gas safety')
      );
      
      if (complianceEmails.length > 0) {
        aiSuggestions.push(`Review ${complianceEmails.length} compliance-related emails for urgent actions`);
      }

      // Check for building-specific emails
      const buildingEmails = emails.filter(email => email.building_id);
      if (buildingEmails.length > 0) {
        aiSuggestions.push(`Process ${buildingEmails.length} building-specific communications`);
      }

      // Check for leaseholder inquiries
      const leaseholderEmails = emails.filter(email => email.leaseholder_id);
      if (leaseholderEmails.length > 0) {
        aiSuggestions.push(`Address ${leaseholderEmails.length} leaseholder inquiries`);
      }

      // Check for overdue responses
      const overdueEmails = emails.filter(email => {
        const emailDate = new Date(email.sent_at);
        const daysSince = (Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > 3 && email.status !== 'handled';
      });
      
      if (overdueEmails.length > 0) {
        aiSuggestions.push(`Follow up on ${overdueEmails.length} emails that may need attention`);
      }
    }

    // If no AI suggestions, provide general ones
    if (aiSuggestions.length === 0) {
      aiSuggestions.push('Review recent communications for any missed actions');
      aiSuggestions.push('Check building compliance status updates');
      aiSuggestions.push('Process any pending leaseholder requests');
    }

    const summary = {
      urgent: urgent.map(email => ({
        id: email.id,
        subject: email.subject || 'No subject',
        sender: email.from_email || 'Unknown sender',
        sent_at: email.sent_at,
        priority: email.priority,
        building: buildings[email.building_id]?.name || null
      })),
      needsAction: needsAction.map(email => ({
        id: email.id,
        subject: email.subject || 'No subject',
        sender: email.from_email || 'Unknown sender',
        sent_at: email.sent_at,
        status: email.status,
        suggestedAction: getSuggestedAction(email),
        building: buildings[email.building_id]?.name || null
      })),
      aiSuggestions,
      totalEmails: emails?.length || 0,
      lastUpdated: new Date().toISOString()
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

// Helper function to suggest actions based on email content
function getSuggestedAction(email: any): string {
  const subject = email.subject?.toLowerCase() || '';
  const content = email.content?.toLowerCase() || '';
  
  if (subject.includes('compliance') || content.includes('compliance')) {
    return 'Review compliance requirements and schedule inspections';
  }
  
  if (subject.includes('section 20') || content.includes('section 20')) {
    return 'Process Section 20 consultation and notify leaseholders';
  }
  
  if (subject.includes('fire safety') || content.includes('fire safety')) {
    return 'Schedule fire safety assessment and update records';
  }
  
  if (subject.includes('gas safety') || content.includes('gas safety')) {
    return 'Arrange gas safety inspection and certificate renewal';
  }
  
  if (subject.includes('maintenance') || content.includes('maintenance')) {
    return 'Assess maintenance request and assign contractor';
  }
  
  if (subject.includes('complaint') || content.includes('complaint')) {
    return 'Investigate complaint and respond within 24 hours';
  }
  
  if (subject.includes('payment') || content.includes('payment')) {
    return 'Review payment details and update accounts';
  }
  
  return 'Review and respond appropriately';
}
