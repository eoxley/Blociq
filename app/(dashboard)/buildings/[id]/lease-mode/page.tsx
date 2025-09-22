import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BuildingLeaseMode from './BuildingLeaseMode';

interface BuildingLeaseModePageProps {
  params: Promise<{ id: string }>;
}

export default async function BuildingLeaseModePage({ params }: BuildingLeaseModePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Fetch building details with error handling
  let building = null;
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('id, name, address')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching building:', error);
      redirect('/buildings');
    }

    building = data;
  } catch (error) {
    console.error('Exception fetching building:', error);
    redirect('/buildings');
  }

  if (!building) {
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