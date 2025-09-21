import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { leaseholderId: string } }
) {
  try {
    const supabase = await createClient();

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

    const upcomingItems = [];

    // Get upcoming calendar events
    const { data: events } = await supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        start_time,
        description,
        event_type,
        building_id
      `)
      .eq('building_id', lease.building_id)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5);

    if (events) {
      events.forEach(event => {
        upcomingItems.push({
          id: event.id,
          type: event.event_type || 'meeting',
          title: event.title,
          date: event.start_time,
          priority: 'medium',
          description: event.description
        });
      });
    }

    // Get upcoming major works
    const { data: majorWorks } = await supabase
      .from('major_works')
      .select(`
        id,
        project_name,
        start_date,
        description,
        priority,
        building_id
      `)
      .eq('building_id', lease.building_id)
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .limit(3);

    if (majorWorks) {
      majorWorks.forEach(work => {
        upcomingItems.push({
          id: work.id,
          type: 'maintenance',
          title: work.project_name,
          date: work.start_date,
          priority: work.priority || 'medium',
          description: work.description
        });
      });
    }

    // Get upcoming compliance deadlines
    const { data: compliance } = await supabase
      .from('compliance_documents')
      .select(`
        id,
        document_type,
        expiry_date,
        building_id
      `)
      .eq('building_id', lease.building_id)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Next 90 days
      .order('expiry_date', { ascending: true })
      .limit(3);

    if (compliance) {
      compliance.forEach(doc => {
        const daysUntilExpiry = Math.ceil(
          (new Date(doc.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        upcomingItems.push({
          id: doc.id,
          type: 'inspection',
          title: `${doc.document_type} Renewal`,
          date: doc.expiry_date,
          priority: daysUntilExpiry <= 30 ? 'high' : 'medium',
          description: `${doc.document_type} expires in ${daysUntilExpiry} days`
        });
      });
    }

    // Sort by date and limit results
    upcomingItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      success: true,
      items: upcomingItems.slice(0, 10)
    });

  } catch (error) {
    console.error('Error fetching upcoming items:', error);
    return NextResponse.json({
      error: 'Failed to fetch upcoming items',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}