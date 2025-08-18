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

    // Search leaseholders by name or unit
    const { data: leaseholders, error } = await supabase
      .from('leaseholders')
      .select('id, name, unit, email, phone')
      .or(`name.ilike.%${query}%,unit.ilike.%${query}%`)
      .limit(5);

    if (error) {
      console.error('Error searching leaseholders:', error);
      return NextResponse.json({ error: 'Failed to search leaseholders' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      leaseholders: leaseholders || [],
      query 
    });

  } catch (error: any) {
    console.error("Leaseholder search error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to search leaseholders" 
    }, { status: 500 });
  }
}
