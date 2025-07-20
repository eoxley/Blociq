import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    id?: string
  }
}

export default async function MajorWorksProjectPage({ params }: PageProps) {
  try {
    console.log('🔍 [MajorWorks] Starting page load with params:', params);
    
    const projectId = params?.id;
    console.log('🔍 [MajorWorks] Project ID:', projectId);

    if (!projectId) {
      console.log('❌ [MajorWorks] No project ID provided');
      return notFound();
    }

    // Return a simple test page without any database calls
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Test Page - No Database</h1>
        <p className="text-gray-600 mb-4">Project ID: {projectId}</p>
        <p className="text-gray-600 mb-4">This is a test page to isolate the issue.</p>
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Environment Check:</h2>
          <p>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}</p>
          <p>SUPABASE_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}</p>
        </div>
      </div>
    );
    
  } catch (error) {
    console.error('💥 [MajorWorks] Unexpected error in page component:', error);
    return notFound();
  }
} 