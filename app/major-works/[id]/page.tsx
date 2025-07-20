import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation';
import MajorWorksProjectClient from './MajorWorksProjectClient'

interface PageProps {
  params: {
    id?: string
  }
}

export default async function MajorWorksProjectPage({ params }: PageProps) {
  try {
    console.log('🔍 [MajorWorks] Starting page load with params:', params);
    
    // Create Supabase client with modern SSR approach
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: any[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }: any) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    const projectId = params?.id;
    
    console.log('🔍 [MajorWorks] Project ID:', projectId);

    if (!projectId) {
      console.log('❌ [MajorWorks] No project ID provided');
      return notFound();
    }

    console.log('🔍 [MajorWorks] Fetching project from database...');
    
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ [MajorWorks] Missing Supabase environment variables');
      return notFound();
    }
    
    try {
      const { data: project, error } = await supabase
        .from('major_works')
        .select(`
          *,
          buildings (
            id,
            name,
            address
          )
        `)
        .eq('id', projectId)
        .single();

      console.log('🔍 [MajorWorks] Database response - project:', project ? 'found' : 'null', 'error:', error);
      
      if (error) {
        console.error('❌ [MajorWorks] Database error:', error);
        return notFound();
      }

      if (!project) {
        console.log('❌ [MajorWorks] No project found for ID:', projectId);
        return notFound();
      }

      // Validate required project fields
      if (!project.id || !project.title) {
        console.error('❌ [MajorWorks] Invalid project data - missing required fields:', { id: project.id, title: project.title });
        return notFound();
      }

      console.log('✅ [MajorWorks] Project loaded successfully:', { id: project.id, title: project.title });

      return <MajorWorksProjectClient project={project} />
      
    } catch (dbError) {
      console.error('💥 [MajorWorks] Database query error:', dbError);
      return notFound();
    }
    
  } catch (error) {
    console.error('💥 [MajorWorks] Unexpected error in page component:', error);
    return notFound();
  }
} 