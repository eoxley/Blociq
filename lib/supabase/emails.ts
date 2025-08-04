import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getEmailThreadContext(emailThreadId: string) {
  try {
    const { data, error } = await supabase
      .from('incoming_emails')
      .select(`
        id,
        subject,
        from_email,
        from_name,
        body_preview,
        received_at,
        thread_id
      `)
      .eq('thread_id', emailThreadId)
      .order('received_at', { ascending: true });

    if (error) {
      console.error('Error fetching email thread context:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const threadContext = data.map(email => 
      `[${new Date(email.received_at).toLocaleDateString()}] ${email.from_name || email.from_email}: ${email.subject}\n${email.body_preview}`
    ).join('\n\n');

    return threadContext;
  } catch (error) {
    console.error('Error in getEmailThreadContext:', error);
    return null;
  }
} 