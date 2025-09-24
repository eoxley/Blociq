import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');
    const leaseholderId = searchParams.get('leaseholder_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Return empty communications log array for now since table doesn't exist
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
      message: 'Communications log feature not yet available'
    });

  } catch (error) {
    console.error('L Communications log API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}