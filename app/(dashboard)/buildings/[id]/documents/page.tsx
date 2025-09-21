import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BuildingDocumentLibrary from './BuildingDocumentLibrary';

interface BuildingDocumentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuildingDocumentsPage({ params }: BuildingDocumentsPageProps) {
  const { id } = await params;
  const supabase = createClient();
  
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
        <BuildingDocumentLibrary building={building} />
      </Suspense>
    </div>
  );
}