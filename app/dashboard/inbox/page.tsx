import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import InboxList from '../../../components/inbox-list';
import DashboardNavbar from '../../../components/DashboardNavbar';

export default async function InboxPage() {
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookies(),
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

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
      unread,
      tag,
      pinned,
      buildings (
        name
      ),
      email_drafts!email_drafts_email_id_fkey (
        draft_text
      )
    `)
    .eq('user_id', session?.user.id)
    .order('received_at', { ascending: false });

  if (error) {
    console.error('Error loading emails:', error);
    return <div>Error loading emails</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardNavbar />
      <InboxList emails={emails || []} />
    </div>
  );
}
