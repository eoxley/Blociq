import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch all available compliance assets
    const { data: assets, error: assetsError } = await supabase
      .from('compliance_assets')
      .select(`
        id,
        title,
        name,
        category,
        description,
        frequency_months,
        frequency,
        created_at,
        updated_at
      `)
      .order('category', { ascending: true })
      .order('title', { ascending: true });

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError);
      return NextResponse.json({ 
        error: 'Failed to fetch compliance assets',
        details: assetsError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      assets: assets || [],
      count: assets?.length || 0
    });

  } catch (error) {
    console.error('Error in compliance assets API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch compliance assets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
