import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    const supabase = createClient(cookies());

    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's agency_id first to filter search results
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', session.user.id)
      .single()

    if (profileError || !userProfile?.agency_id) {
      return NextResponse.json({ error: 'User agency not found' }, { status: 403 })
    }

    // Search buildings by name or address - only within user's agency
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name, address, property_manager, manager')
      .eq('agency_id', userProfile.agency_id)
      .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
      .limit(5);

    if (error) {
      console.error('Error searching buildings:', error);
      return NextResponse.json({ error: 'Failed to search buildings' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      buildings: buildings || [],
      query 
    });

  } catch (error: any) {
    console.error("Building search error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to search buildings" 
    }, { status: 500 });
  }
}
