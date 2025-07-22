import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

interface AssignEmailRequest {
  emailId: string;
  buildingId?: number | null;
  unitId?: number | null;
  leaseholderId?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { emailId, buildingId, unitId, leaseholderId }: AssignEmailRequest = await req.json();
    
    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the email with assignment data
    const updateData: any = {};
    
    if (buildingId !== undefined) {
      updateData.building_id = buildingId;
    }
    
    if (unitId !== undefined) {
      updateData.unit_id = unitId;
    }
    
    if (leaseholderId !== undefined) {
      updateData.leaseholder_id = leaseholderId;
    }

    const { data, error } = await supabase
      .from('incoming_emails')
      .update(updateData)
      .eq('id', emailId)
      .select(`
        *,
        buildings (name),
        units (unit_number),
        leaseholders (name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating email assignment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create assignment label
    let assignmentLabel = 'Unassigned';
    if (data.unit_id && data.leaseholder_id && data.units && data.leaseholders) {
      assignmentLabel = `Flat ${data.units.unit_number} – ${data.leaseholders.name}`;
    } else if (data.unit_id && data.units) {
      assignmentLabel = `Flat ${data.units.unit_number} – Unassigned`;
    }

    return NextResponse.json({
      success: true,
      email: data,
      assignmentLabel
    });

  } catch (error: any) {
    console.error('Error assigning email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint to fetch available buildings, units, and leaseholders
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const unitId = searchParams.get('unitId');

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch buildings
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, name')
      .order('name');

    // Fetch units for the selected building
    let units: any[] = [];
    if (buildingId) {
      const { data: unitsData } = await supabase
        .from('units')
        .select('id, unit_number, leaseholder_id, leaseholders(name)')
        .eq('building_id', buildingId)
        .order('unit_number');
      units = unitsData || [];
    }

    // Fetch leaseholders for the selected unit
    let leaseholders: any[] = [];
    if (unitId) {
      const { data: leaseholdersData } = await supabase
        .from('leaseholders')
        .select('id, name, email')
        .eq('unit_id', parseInt(unitId))
        .order('name');
      leaseholders = leaseholdersData || [];
    }

    return NextResponse.json({
      buildings: buildings || [],
      units,
      leaseholders
    });

  } catch (error: any) {
    console.error('Error fetching assignment data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 