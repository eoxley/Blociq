import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface EmailMeta {
  from_email: string;
  to: string[];
  cc: string[];
  subject: string;
  thread_id: string;
}

export async function getEmailMeta(emailId: string): Promise<EmailMeta | null> {
  try {
    const { data: email, error } = await supabase
      .from('incoming_emails')
      .select('from_email, to, cc, subject, thread_id')
      .eq('id', emailId)
      .single();

    if (error || !email) {
      console.error('Error loading email metadata:', error);
      return null;
    }

    return {
      from_email: email.from_email,
      to: email.to || [],
      cc: email.cc || [],
      subject: email.subject,
      thread_id: email.thread_id
    };

  } catch (error) {
    console.error('Error in getEmailMeta:', error);
    return null;
  }
}
