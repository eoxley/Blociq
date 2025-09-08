import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listLeaseJobs, getCompletedAndFailedJobs } from '@/lib/server/leaseJobs';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        data: []
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    let jobs = [];
    
    if (type === 'notifications') {
      // Get completed and failed jobs for notifications
      jobs = await getCompletedAndFailedJobs(user.id, limit);
    } else {
      // Get all jobs
      jobs = await listLeaseJobs(user.id, limit);
    }

    return NextResponse.json({
      success: true,
      data: jobs
    });

  } catch (error) {
    console.error('Lease jobs API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch lease jobs',
      data: [] // Always provide fallback empty array
    }, { status: 500 });
  }
}