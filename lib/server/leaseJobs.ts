import { createClient } from '@/lib/supabase/server';

export async function listLeaseJobs(userId: string, limit = 50) {
  try {
    const supa = await createClient();
    const { data, error } = await supa
      .from("lease_processing_jobs")
      .select(`
        id,
        filename,
        status,
        processing_completed_at,
        error_message,
        results,
        lease_analysis,
        created_at
      `)
      .eq('user_id', userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (_err: any) {
    console.warn('Error fetching lease jobs:', _err);
    return []; // empty is acceptable; UI must show an empty state
  }
}

export async function getCompletedAndFailedJobs(userId: string, limit = 20) {
  try {
    const supa = await createClient();
    const { data, error } = await supa
      .from("lease_processing_jobs")
      .select(`
        id,
        filename,
        status,
        processing_completed_at,
        error_message,
        results,
        lease_analysis,
        created_at
      `)
      .eq('user_id', userId)
      .in('status', ['completed', 'failed'])
      .order("processing_completed_at", { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (_err: any) {
    console.warn('Error fetching completed/failed lease jobs:', _err);
    return []; // empty is acceptable; UI must show an empty state
  }
}

export async function getLeaseJobById(jobId: string, userId: string) {
  try {
    const supa = await createClient();
    const { data, error } = await supa
      .from("lease_processing_jobs")
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (_err: any) {
    console.warn('Error fetching lease job by ID:', _err);
    return null;
  }
}