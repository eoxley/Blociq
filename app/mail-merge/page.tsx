import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import { Database } from '@/lib/database.types';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';

export default async function MailMergePage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#0F5D5D]">📬 Mail Merge</h1>
        <p className="text-gray-600">
          Logged in as {session.user.email}. This is where you'll send bulk communications.
        </p>

        <div className="bg-white border rounded p-4 text-gray-400 shadow-sm">
          🧩 This will be your letter/email generation engine soon.
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
