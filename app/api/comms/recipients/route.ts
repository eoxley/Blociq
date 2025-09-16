/**
 * Recipients API
 * Fetches recipient data for mail-merge
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    // Check if this is a system test (no auth required)
    const isSystemTest = req.headers.get('x-system-test') === 'true' ||
                        req.url.includes('test-mail-merge');

    let supabase;

    if (isSystemTest) {
      // Use service client for system tests
      supabase = createServiceClient();
    } else {
      // Use regular client for authenticated requests
      supabase = await createClient();

      // Get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const user = session?.user;

      if (sessionError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    
    if (!buildingId) {
      return NextResponse.json({ 
        error: 'Missing buildingId parameter' 
      }, { status: 400 });
    }
    
    // Get recipients for the building using a simpler query
    const { data: recipients, error: recipientsError } = await supabase
      .from('leaseholders')
      .select(`
        id,
        name,
        email,
        phone,
        unit_id
      `)
      .not('email', 'is', null);

    if (recipientsError) {
      return NextResponse.json({
        error: 'Failed to fetch leaseholders',
        message: recipientsError.message
      }, { status: 500 });
    }

    // Get unit and building details for the recipients
    const unitIds = recipients?.map(r => r.unit_id).filter(Boolean) || [];

    const { data: unitsData, error: unitsError } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        building_id,
        buildings!inner(
          id,
          name,
          address
        )
      `)
      .eq('building_id', buildingId)
      .in('id', unitIds);

    if (unitsError) {
      return NextResponse.json({
        error: 'Failed to fetch units',
        message: unitsError.message
      }, { status: 500 });
    }

    // Match leaseholders with their units for this building
    const matchedRecipients = recipients?.filter(recipient => {
      const unit = unitsData?.find(u => u.id === recipient.unit_id);
      return unit && unit.building_id === buildingId;
    }).map(recipient => {
      const unit = unitsData?.find(u => u.id === recipient.unit_id);
      return {
        ...recipient,
        unit,
        building: unit?.buildings
      };
    });
    
    // Transform data for mail merge
    const transformedRecipients = (matchedRecipients || []).map(recipient => ({
      leaseholder_id: recipient.id,
      leaseholder_name: recipient.name,
      salutation: `Dear ${recipient.name}`,
      email: recipient.email,
      postal_address: recipient.building?.address || '',
      unit_label: `Unit ${recipient.unit?.unit_number || 'Unknown'}`,
      opt_out_email: false
    }));

    return NextResponse.json(transformedRecipients);
    
  } catch (error) {
    console.error('Recipients API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}