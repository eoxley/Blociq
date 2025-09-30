import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get('agency_id');

    if (!agencyId) {
      return NextResponse.json({
        error: 'agency_id is required'
      }, { status: 400 });
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.agency_id !== agencyId) {
      return NextResponse.json({
        error: 'Forbidden: You can only access your own agency settings'
      }, { status: 403 });
    }

    const { data: settings, error } = await supabase
      .from('agency_settings')
      .select('*')
      .eq('agency_id', agencyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({
        error: 'Failed to fetch settings',
        message: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: settings || { primary_colour: '#6366f1', logo_url: null }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch settings',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { primary_colour, logo_url } = await req.json();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', session.user.id)
      .single();

    if (!profile || !profile.agency_id) {
      return NextResponse.json({
        error: 'Forbidden: You must belong to an agency'
      }, { status: 403 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('agency_settings')
      .select('id')
      .eq('agency_id', profile.agency_id)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('agency_settings')
        .update({ primary_colour, logo_url })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('agency_settings')
        .insert({ agency_id: profile.agency_id, primary_colour, logo_url })
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json({
        error: 'Failed to update settings',
        message: result.error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: result.data
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update settings',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
