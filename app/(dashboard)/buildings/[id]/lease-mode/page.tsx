import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BuildingLeaseMode from './BuildingLeaseMode';

interface BuildingLeaseModePageProps {
  params: Promise<{ id: string }>;
}

export default async function BuildingLeaseModePage({ params }: BuildingLeaseModePageProps) {
  const { id } = await params;
  const supabase = createClient(cookies());
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Fetch building details
  const { data: building, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !building) {
    redirect('/buildings');
  }

  return (
    <div className="space-y-8">
      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
        <BuildingLeaseMode building={building} />
      </Suspense>
    </div>
  );
}