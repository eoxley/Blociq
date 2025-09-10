/**
 * Recipients API
 * Fetches recipient data for mail-merge
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (sessionError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    
    if (!buildingId) {
      return NextResponse.json({ 
        error: 'Missing buildingId parameter' 
      }, { status: 400 });
    }
    
    // Get recipients for the building
    const { data: recipients, error: recipientsError } = await supabase
      .from('leaseholders')
      .select(`
        id as leaseholder_id,
        name as leaseholder_name,
        email,
        phone,
        units!inner(
          id as unit_id,
          unit_number,
          building_id,
          buildings!inner(
            id,
            name as building_name,
            address
          )
        )
      `)
      .eq('units.building_id', buildingId)
      .not('email', 'is', null);
    
    if (recipientsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch recipients',
        message: recipientsError.message
      }, { status: 500 });
    }
    
    // Transform data for mail merge
    const transformedRecipients = (recipients || []).map(recipient => ({
      leaseholder_id: recipient.leaseholder_id,
      leaseholder_name: recipient.leaseholder_name,
      salutation: `Dear ${recipient.leaseholder_name}`,
      email: recipient.email,
      postal_address: recipient.units?.buildings?.address || '',
      unit_label: `Unit ${recipient.units?.unit_number}`,
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