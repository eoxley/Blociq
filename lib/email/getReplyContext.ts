import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface EmailMessage {
  id: string;
  from_name: string;
  from_email: string;
  to: string[];
  cc: string[];
  subject: string;
  body_full?: string;
  body_preview: string;
  received_at: string;
  thread_id: string;
  building_id?: string;
}

export interface ReplyContext {
  thread_id: string;
  building_id?: string;
  participants: {
    senders: string[];
    to: string[];
    cc: string[];
  };
  lastMessage: EmailMessage;
  threadSummary: string;
  messagesForContext: EmailMessage[];
}

export async function getReplyContext(emailId: string): Promise<ReplyContext | null> {
  try {
    // Load the selected email
    const { data: selectedEmail, error: emailError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('id', emailId)
      .single();

    if (emailError || !selectedEmail) {
      console.error('Error loading selected email:', emailError);
      return null;
    }

    // Load last ~10 messages from the same thread
    const { data: threadMessages, error: threadError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('thread_id', selectedEmail.thread_id)
      .order('received_at', { ascending: true })
      .limit(10);

    if (threadError) {
      console.error('Error loading thread messages:', threadError);
      return null;
    }

    // Derive participants
    const allEmails = new Set<string>();
    const allTo = new Set<string>();
    const allCc = new Set<string>();

    threadMessages?.forEach(msg => {
      allEmails.add(msg.from_email.toLowerCase());
      msg.to?.forEach(email => allTo.add(email.toLowerCase()));
      msg.cc?.forEach(email => allCc.add(email.toLowerCase()));
    });

    // Try to infer building_id if missing
    let buildingId = selectedEmail.building_id;
    if (!buildingId) {
      const emailWithBuilding = threadMessages?.find(msg => msg.building_id);
      buildingId = emailWithBuilding?.building_id;
    }

    // Prepare messages for context (last 5 verbatim, earlier summarized)
    const sortedMessages = threadMessages?.sort((a, b) => 
      new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
    ) || [];

    const messagesForContext = sortedMessages.slice(-5);
    const earlierMessages = sortedMessages.slice(0, -5);

    // Create thread summary
    let threadSummary = '';
    if (earlierMessages.length > 0) {
      const summaryItems = earlierMessages.map(msg => {
        const date = new Date(msg.received_at).toLocaleDateString('en-GB');
        const sender = msg.from_name || msg.from_email;
        const takeaway = msg.body_preview?.substring(0, 100) || 'No content';
        return `• ${date}: ${sender} - ${takeaway}...`;
      });
      threadSummary = `Earlier messages:\n${summaryItems.join('\n')}`;
    }

    return {
      thread_id: selectedEmail.thread_id,
      building_id: buildingId,
      participants: {
        senders: Array.from(allEmails),
        to: Array.from(allTo),
        cc: Array.from(allCc)
      },
      lastMessage: selectedEmail,
      threadSummary,
      messagesForContext
    };

  } catch (error) {
    console.error('Error in getReplyContext:', error);
    return null;
  }
}
