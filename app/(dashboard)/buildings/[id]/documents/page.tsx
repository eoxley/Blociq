import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BuildingDocumentLibrary from './BuildingDocumentLibrary';

interface BuildingDocumentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuildingDocumentsPage({ params }: BuildingDocumentsPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Fetch building details with better error handling
  try {
    console.log(`🏢 Fetching building details for ID: ${id}`);

    const { data: building, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🏢 Building query result:', { building, error });

    if (error) {
      console.error('❌ Error fetching building:', error);

      // Show a proper error page instead of redirecting
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Building Not Found</h2>
            <p className="text-gray-600 mb-4">We couldn't find the building you're looking for.</p>
            <p className="text-sm text-gray-500 mb-4">Building ID: {id}</p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90"
              >
                Try Again
              </button>
              <a
                href="/buildings"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:opacity-90 inline-block"
              >
                Back to Buildings
              </a>
              <a
                href="/"
                className="text-gray-600 hover:text-gray-800 inline-block"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (!building) {
      console.warn('⚠️ Building not found for ID:', id);

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Building Not Found</h2>
            <p className="text-gray-600 mb-4">We couldn't find the building you're looking for.</p>
            <p className="text-sm text-gray-500 mb-4">Building ID: {id}</p>
            <div className="space-x-4">
              <a
                href="/buildings"
                className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 inline-block"
              >
                Back to Buildings
              </a>
              <a
                href="/"
                className="text-gray-600 hover:text-gray-800 inline-block"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    console.log('✅ Building found:', building.name || 'Unnamed building');

    return (
      <div className="space-y-8">
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
          <BuildingDocumentLibrary building={building} />
        </Suspense>
      </div>
    );

  } catch (fetchError) {
    console.error('❌ Exception fetching building:', fetchError);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Building</h2>
          <p className="text-gray-600 mb-4">An error occurred while loading the building details.</p>
          <p className="text-sm text-gray-500 mb-4">Building ID: {id}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90"
            >
              Try Again
            </button>
            <a
              href="/buildings"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:opacity-90 inline-block"
            >
              Back to Buildings
            </a>
          </div>
        </div>
      </div>
    );
  }
}