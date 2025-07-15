import { createClient } from '@supabase/supabase-js';

export interface UserContext {
  agency?: {
    id: string;
    name: string;
    tone?: string;
    policies?: string;
  };
  recentEmails: Array<{
    id: string;
    subject: string;
    sender: string;
    created_at: string;
  }>;
  complianceDocs: Array<{
    id: string;
    document_type: string;
    uploaded_at: string;
  }>;
  recentEvents: Array<{
    id: string;
    title: string;
    date: string;
    category: string;
  }>;
}

export async function fetchUserContext(userId: string, supabase: any): Promise<UserContext> {
  try {
    // Fetch user's agency/profile with error handling
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('agency_id, building_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Return empty context instead of failing
      return {
        recentEmails: [],
        complianceDocs: [],
        recentEvents: [],
      };
    }

    // If no profile found, return empty context
    if (!userProfile) {
      console.warn('No user profile found for user:', userId);
      return {
        recentEmails: [],
        complianceDocs: [],
        recentEvents: [],
      };
    }

    // Fetch agency data if available
    let agency = undefined;
    if (userProfile?.agency_id) {
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .select('id, name, tone, policies')
        .eq('id', userProfile.agency_id)
        .single();
      
      if (!agencyError && agencyData) {
        agency = agencyData;
      } else if (agencyError) {
        console.error('Error fetching agency data:', agencyError);
      }
    }

    // Fetch recent emails for the user's building (3 most recent)
    let recentEmails: UserContext['recentEmails'] = [];
    if (userProfile?.building_id) {
      const { data: emails, error: emailsError } = await supabase
        .from('incoming_emails')
        .select('id, subject, sender, created_at')
        .eq('building_id', userProfile.building_id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (!emailsError && emails) {
        recentEmails = emails;
      } else if (emailsError) {
        console.error('Error fetching recent emails:', emailsError);
      }
    }

    // Fetch recent compliance documents (2 most recent)
    let complianceDocs: UserContext['complianceDocs'] = [];
    if (userProfile?.building_id) {
      const { data: docs, error: docsError } = await supabase
        .from('compliance_docs')
        .select('id, document_type, uploaded_at')
        .eq('building_id', userProfile.building_id)
        .order('uploaded_at', { ascending: false })
        .limit(2);
      
      if (!docsError && docs) {
        complianceDocs = docs;
      } else if (docsError) {
        console.error('Error fetching compliance docs:', docsError);
      }
    }

    // Fetch recent events from the last 30 days
    let recentEvents: UserContext['recentEvents'] = [];
    if (userProfile?.building_id) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: events, error: eventsError } = await supabase
        .from('property_events')
        .select('id, title, date, category')
        .eq('building_id', userProfile.building_id)
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: false })
        .limit(5);
      
      if (!eventsError && events) {
        recentEvents = events;
      } else if (eventsError) {
        console.error('Error fetching recent events:', eventsError);
      }
    }

    return {
      agency,
      recentEmails,
      complianceDocs,
      recentEvents,
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return {
      recentEmails: [],
      complianceDocs: [],
      recentEvents: [],
    };
  }
}

export function formatContextMessages(context: UserContext): Array<{ role: 'system'; content: string }> {
  const messages: Array<{ role: 'system'; content: string }> = [];

  // Add recent emails context
  if (context.recentEmails.length > 0) {
    const emailContext = context.recentEmails
      .map(email => `Recent email: "${email.subject}" from ${email.sender} on ${new Date(email.created_at).toLocaleDateString()}`)
      .join('\n');
    messages.push({ role: 'system', content: `Recent emails:\n${emailContext}` });
  }

  // Add compliance documents context
  if (context.complianceDocs.length > 0) {
    const docContext = context.complianceDocs
      .map(doc => `${doc.document_type} uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}`)
      .join('\n');
    messages.push({ role: 'system', content: `Recent compliance documents:\n${docContext}` });
  }

  // Add recent events context
  if (context.recentEvents.length > 0) {
    const eventContext = context.recentEvents
      .map(event => `${event.title} (${event.category}) on ${new Date(event.date).toLocaleDateString()}`)
      .join('\n');
    messages.push({ role: 'system', content: `Recent events:\n${eventContext}` });
  }

  return messages;
} 