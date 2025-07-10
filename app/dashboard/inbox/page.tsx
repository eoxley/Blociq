import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Database } from '@/lib/database.types';

import InboxList from '@/components/inbox-list';
import DashboardNavbar from '@/components/DashboardNavbar';
import DebugUserId from '@/components/DebugUserId';

export default async function InboxPage() {
  const supabase = createServerComponentClient<Database>({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return redirect('/');
  }

  const { data: emails, error } = await supabase
    .from('incoming_emails')
    .select(`
      id,
      subject,
      from_email,
      body_preview,
      received_at,
      handled,
      building_id,
      unit,
      email_drafts!email_id(draft_text)
    `)
    .eq('user_id', session.user.id)
    .order('received_at', { ascending: false });

  if (error) {
    console.error('[InboxPage] Failed to fetch emails:', error.message);
  }

  const cleanEmails = (emails || []).map((email) => ({
    id: email.id,
    subject: email.subject ?? '',
    from_email: email.from_email ?? '',
    body_preview: email.body_preview ?? '',
    received_at: email.received_at ?? '',
    handled: email.handled ?? false,
    building_id: email.building_id ?? 0,
    unit: email.unit ?? '',
    email_draft: email.email_drafts?.[0] ?? { draft_text: '' },
  }));

  return (
    <div className="flex flex-col h-full">
      <DashboardNavbar />
      <DebugUserId />
      <InboxList emails={cleanEmails} />
    </div>
  );
}
