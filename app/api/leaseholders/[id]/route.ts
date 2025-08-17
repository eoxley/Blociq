import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { 
      full_name, 
      email, 
      phone, 
      is_director, 
      director_role, 
      director_since, 
      director_notes 
    } = await request.json();

    const updateData: any = {
      full_name,
      email,
      phone,
      is_director,
      updated_at: new Date().toISOString()
    };

    // Only include director fields if is_director is true
    if (is_director) {
      updateData.director_role = director_role;
      updateData.director_since = director_since;
      updateData.director_notes = director_notes;
    } else {
      // Clear director fields if not a director
      updateData.director_role = null;
      updateData.director_since = null;
      updateData.director_notes = null;
    }

    const { data, error } = await supabaseAdmin
      .from('leaseholders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating leaseholder:', error);
      return NextResponse.json({ error: 'Failed to update leaseholder' }, { status: 500 });
    }

    return NextResponse.json({ leaseholder: data });
  } catch (error) {
    console.error('Error in leaseholder update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
