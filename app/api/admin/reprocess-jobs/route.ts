import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to reprocess jobs'
      }, { status: 401 });
    }

    const user = session.user;

    // Get jobs stuck in QUEUED status
    const { data: stuckJobs, error: jobsError } = await supabase
      .from('document_jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'QUEUED')
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Error fetching stuck jobs:', jobsError);
      return NextResponse.json({
        error: 'Failed to fetch jobs',
        message: 'Unable to retrieve stuck jobs'
      }, { status: 500 });
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck jobs found',
        reprocessed: 0
      });
    }

    console.log(`🔄 Found ${stuckJobs.length} stuck jobs, reprocessing...`);

    let reprocessed = 0;

    for (const job of stuckJobs) {
      try {
        // Determine the correct processing endpoint based on category
        let processEndpoint = '/api/lease-lab/process'; // default
        if (job.doc_category === 'compliance') {
          processEndpoint = '/api/compliance-lab/process';
        } else if (job.doc_category === 'general') {
          processEndpoint = '/api/general-docs-lab/process';
        } else if (job.doc_category === 'major-works') {
          processEndpoint = '/api/major-works-lab/process';
        }

        // Reconstruct the file path
        const fileExt = job.filename.split('.').pop();
        const fileName = `${job.id}.${fileExt}`;
        const filePath = `${job.doc_category}-lab/${fileName}`;

        console.log(`🔄 Reprocessing job ${job.id} (${job.doc_category}) via ${processEndpoint}`);

        // Trigger processing
        const processResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${processEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: job.id,
            filePath: filePath,
            filename: job.filename,
            mime: job.mime,
            userId: job.user_id,
            category: job.doc_category
          })
        });

        if (processResponse.ok) {
          console.log(`✅ Successfully triggered reprocessing for job ${job.id}`);
          reprocessed++;
        } else {
          console.error(`❌ Failed to reprocess job ${job.id}:`, processResponse.status);
        }

      } catch (error) {
        console.error(`❌ Error reprocessing job ${job.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reprocessed ${reprocessed} out of ${stuckJobs.length} stuck jobs`,
      total_found: stuckJobs.length,
      reprocessed: reprocessed,
      jobs: stuckJobs.map(job => ({
        id: job.id,
        filename: job.filename,
        category: job.doc_category,
        created_at: job.created_at
      }))
    });

  } catch (error) {
    console.error('❌ Error in reprocess jobs:', error);
    return NextResponse.json({
      error: 'Reprocessing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}