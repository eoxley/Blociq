import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all leases for testing - simplified query without scope column for now
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        id,
        leaseholder_name,
        building_id,
        unit_id,
        buildings!inner(name, address),
        units(unit_number)
      `)
      .limit(5);

    if (leasesError) {
      return NextResponse.json({
        error: 'Failed to fetch leases',
        details: leasesError.message
      }, { status: 500 });
    }

    // Generate portal URLs for testing
    const portalUrls = leases?.map(lease => ({
      lease_id: lease.id,
      leaseholder_name: lease.leaseholder_name,
      building_name: lease.buildings.name,
      unit_number: lease.units?.unit_number,
      scope: lease.unit_id ? 'unit' : 'building', // Default scope based on unit presence
      portal_url: `http://localhost:3005/portal/${lease.id}`
    })) || [];

    return NextResponse.json({
      success: true,
      portal_urls: portalUrls,
      total_leases: leases?.length || 0
    });

  } catch (error) {
    console.error('Error testing portal:', error);
    return NextResponse.json({
      error: 'Failed to test portal',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}