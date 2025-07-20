import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import MajorWorksProjectClient from './MajorWorksProjectClient'

interface PageProps {
  params: {
    id?: string
  }
}

export default async function MajorWorksProjectPage({ params }: PageProps) {
  const supabase = createClient();
  const projectId = params?.id;

  if (!projectId) return notFound();

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

  if (error || !project) {
    console.error('Failed to fetch project:', error);
    return notFound(); // This prevents the server crash
  }

  return <MajorWorksProjectClient project={project} />
} 