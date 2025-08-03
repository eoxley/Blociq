// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for buildingId, inspectedBy
// - Supabase queries with proper .eq() filters
// - Try/catch with detailed error handling
// - Used in site inspection components
// - Includes both GET and POST endpoints

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const status = searchParams.get('status');

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('site_inspections')
      .select(`
        *,
        inspection_items (
          id,
          asset_type,
          asset_name,
          status,
          notes,
          location,
          priority
        )
      `)
      .eq('building_id', buildingId)
      .order('inspection_date', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching site inspections:', error);
      return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 });
    }

    return NextResponse.json({ success: true, inspections: data });

  } catch (error) {
    console.error('Site inspections GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      buildingId, 
      inspectedBy, 
      inspectionDate, 
      notes 
    } = body;

    if (!buildingId || !inspectedBy) {
      return NextResponse.json({ error: 'Building ID and inspector are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('site_inspections')
      .insert({
        building_id: buildingId,
        inspected_by: inspectedBy,
        inspection_date: inspectionDate || new Date().toISOString().split('T')[0],
        notes: notes || null,
        status: 'In Progress'
      })
      .select(`
        *,
        inspection_items (
          id,
          asset_type,
          asset_name,
          status,
          notes,
          location,
          priority
        )
      `)
      .single();

    if (error) {
      console.error('Error creating site inspection:', error);
      return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 });
    }

    return NextResponse.json({ success: true, inspection: data });

  } catch (error) {
    console.error('Site inspections POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 