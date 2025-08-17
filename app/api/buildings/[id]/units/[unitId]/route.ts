import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  try {
    const { unit_number, apportionment_percent } = await request.json();

    const { data, error } = await supabaseAdmin
      .from('units')
      .update({
        unit_number,
        apportionment_percent,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.unitId)
      .select()
      .single();

    if (error) {
      console.error('Error updating unit:', error);
      return NextResponse.json({ error: 'Failed to update unit' }, { status: 500 });
    }

    return NextResponse.json({ unit: data });
  } catch (error) {
    console.error('Error in unit update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
