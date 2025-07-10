import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Database } from '@/lib/database.types';
import DashboardNavbar from '@/components/DashboardNavbar';

export default async function DashboardPage() {
  const supabase = createServerComponentClient<Database>({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return redirect('/login');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNavbar />
      <main className="flex-grow p-6 space-y-6">
        <h1 className="text-2xl font-bold">Welcome to BlocIQ Dashboard</h1>
        {/* Add tiles, assistant, etc. here */}
      </main>
    </div>
  );
}
