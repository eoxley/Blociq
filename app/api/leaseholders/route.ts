import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unitId');

    if (!unitId) {
      return NextResponse.json(
        { error: 'Unit ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('leaseholders')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching leaseholders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaseholders' },
        { status: 500 }
      );
    }

    return NextResponse.json({ leaseholders: data || [] });
  } catch (error) {
    console.error('Error in leaseholders GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { unit_id, full_name, email, phone_number, correspondence_address } = body;

    if (!unit_id || !full_name) {
      return NextResponse.json(
        { error: 'Unit ID and full name are required' },
        { status: 400 }
      );
    }

    const leaseholderData = {
      unit_id,
      full_name: full_name.trim(),
      email: email?.trim() || null,
      phone_number: phone_number?.trim() || null,
      correspondence_address: correspondence_address?.trim() || null
    };

    const { data, error } = await supabase
      .from('leaseholders')
      .insert([leaseholderData])
      .select()
      .single();

    if (error) {
      console.error('Error creating leaseholder:', error);
      return NextResponse.json(
        { error: 'Failed to create leaseholder' },
        { status: 500 }
      );
    }

    return NextResponse.json({ leaseholder: data });
  } catch (error) {
    console.error('Error in leaseholders POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, full_name, email, phone_number, correspondence_address } = body;

    if (!id || !full_name) {
      return NextResponse.json(
        { error: 'ID and full name are required' },
        { status: 400 }
      );
    }

    const updateData = {
      full_name: full_name.trim(),
      email: email?.trim() || null,
      phone_number: phone_number?.trim() || null,
      correspondence_address: correspondence_address?.trim() || null
    };

    const { data, error } = await supabase
      .from('leaseholders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating leaseholder:', error);
      return NextResponse.json(
        { error: 'Failed to update leaseholder' },
        { status: 500 }
      );
    }

    return NextResponse.json({ leaseholder: data });
  } catch (error) {
    console.error('Error in leaseholders PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Leaseholder ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('leaseholders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting leaseholder:', error);
      return NextResponse.json(
        { error: 'Failed to delete leaseholder' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in leaseholders DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 