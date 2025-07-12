import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { Home } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect('/login'); // not logged in
  }

  redirect('/');Home// logged in
}
