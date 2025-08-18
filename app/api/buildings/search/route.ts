import { NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Search buildings by name or address
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name, address, property_manager, manager')
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
