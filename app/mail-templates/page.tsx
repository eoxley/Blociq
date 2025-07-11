import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import { Database } from '@/types/supabase';

export default async function MailTemplatesPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">📑 Mail Templates</h1>
      <p className="text-gray-600">
        Hello {session.user.email}, this is where your reusable templates will appear.
      </p>

      <div className="bg-white border rounded p-4 text-gray-400 shadow-sm">
        ✉️ No templates available yet. Build your first one soon!
      </div>
    </main>
  );
}
