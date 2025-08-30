import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { filters } = await req.json();

  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Build query based on filters
    let query = supabase
      .from('building_compliance_assets')
      .select(`
        id,
        status,
        next_due_date,
        last_updated,
        buildings (
          id,
          name,
          address
        ),
        compliance_assets (
          id,
          name,
          category
        )
      `)
      .order('buildings(name)', { ascending: true })

    // Apply status filter if provided
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'overdue') {
        query = query.lt('next_due_date', new Date().toISOString())
      } else if (filters.status === 'due-soon') {
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        query = query
          .gte('next_due_date', new Date().toISOString())
          .lte('next_due_date', thirtyDaysFromNow.toISOString())
      } else {
        query = query.eq('status', filters.status)
      }
    }

    // Apply category filter if provided
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('compliance_assets.category', filters.category)
    }

    const { data: complianceData, error } = await query;

    if (error) {
      console.error('Error fetching compliance data:', error);
      return NextResponse.json({ error: 'Failed to fetch compliance data' }, { status: 500 });
    }

    // Generate CSV content
    const headers = [
      'Building Name',
      'Building Address', 
      'Asset Name',
      'Category',
      'Status',
      'Next Due Date',
      'Last Updated',
      'Days Until Due'
    ];

    const rows = complianceData?.map(item => {
      const building = item.buildings
      const asset = item.compliance_assets
      
      // Calculate days until due
      let daysUntilDue = null
      if (item.next_due_date) {
        const dueDate = new Date(item.next_due_date)
        const today = new Date()
        const diffTime = dueDate.getTime() - today.getTime()
        daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      return [
        building?.name || 'Unknown Building',
        building?.address || '',
        asset?.name || 'Unknown Asset',
        asset?.category || 'Unknown',
        item.status || 'Not Started',
        item.next_due_date ? new Date(item.next_due_date).toLocaleDateString() : 'Not Set',
        item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'Unknown',
        daysUntilDue !== null ? daysUntilDue.toString() : 'N/A'
      ];
    }) || [];

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return NextResponse.json({
      success: true,
      csvContent,
      recordCount: rows.length,
      filename: `compliance-report-${new Date().toISOString().split('T')[0]}.csv`
    });

  } catch (error) {
    console.error('Error in compliance export:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 