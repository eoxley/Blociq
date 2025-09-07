/**
 * Recipients API
 * Fetches recipient data for mail-merge
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'User not linked to agency' }, { status: 400 });
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
      .from('v_building_recipients')
      .select(`
        leaseholder_id,
        leaseholder_name,
        salutation,
        salutation_fallback,
        email,
        postal_address,
        unit_label,
        unit_number,
        unit_type,
        building_name,
        opt_out_email,
        uses_unit_as_postal
      `)
      .eq('building_id', buildingId)
      .eq('agency_id', profile.agency_id);
    
    if (recipientsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch recipients',
        message: recipientsError.message
      }, { status: 500 });
    }
    
    // Group recipients by lease for joint letters
    const recipientsByLease = groupRecipientsByLease(recipients || []);
    
    // Convert to simplified format for UI
    const simplifiedRecipients = Array.from(recipientsByLease.values()).map(leaseRecipients => {
      const primary = leaseRecipients[0];
      return {
        leaseholder_id: primary.leaseholder_id,
        leaseholder_name: primary.leaseholder_name,
        salutation: primary.salutation || primary.salutation_fallback,
        email: primary.email,
        postal_address: primary.postal_address,
        unit_label: primary.unit_label,
        unit_number: primary.unit_number,
        unit_type: primary.unit_type,
        building_name: primary.building_name,
        opt_out_email: primary.opt_out_email,
        uses_unit_as_postal: primary.uses_unit_as_postal,
        joint_leaseholders: leaseRecipients.map(r => r.leaseholder_name)
      };
    });
    
    return NextResponse.json(simplifiedRecipients);
    
  } catch (error) {
    console.error('Recipients API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Group recipients by lease for joint letters
 */
function groupRecipientsByLease(recipients: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  for (const recipient of recipients) {
    const leaseId = recipient.lease_id;
    if (!groups.has(leaseId)) {
      groups.set(leaseId, []);
    }
    groups.get(leaseId)!.push(recipient);
  }
  
  return groups;
}
