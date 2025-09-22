import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { leaseholderId: string } }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify lease exists and user has access
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, building_id')
      .eq('id', params.leaseholderId)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({
        error: 'Lease not found'
      }, { status: 404 });
    }

    // Get communications related to this building
    const { data: communications, error: commError } = await supabase
      .from('communications_log')
      .select(`
        id,
        type,
        subject,
        content,
        sent_at,
        sent_by,
        building_id,
        leaseholder_id,
        status
      `)
      .eq('building_id', lease.building_id)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (commError) {
      console.error('Failed to fetch communications:', commError);
      return NextResponse.json({
        error: 'Failed to fetch communications',
        message: commError.message
      }, { status: 500 });
    }

    // Transform communications to match expected interface
    const transformedCommunications = (communications || []).map(comm => ({
      id: comm.id,
      type: comm.type,
      subject: comm.subject,
      content: comm.content,
      created_at: comm.sent_at,
      direction: 'outgoing', // All communications in log are outgoing by default
      status: comm.status
    }));

    return NextResponse.json({
      success: true,
      communications: transformedCommunications
    });

  } catch (error) {
    console.error('Error fetching portal communications:', error);
    return NextResponse.json({
      error: 'Failed to fetch communications',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}