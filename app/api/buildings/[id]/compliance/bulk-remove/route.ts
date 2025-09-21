import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    const { asset_ids } = await req.json();
    
    if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid asset_ids array' }, { status: 400 });
    }

    const buildingId = params.id;

    // Delete the building compliance assets
    const { error: deleteError } = await supabase
      .from('building_compliance_assets')
      .delete()
      .eq('building_id', buildingId)
      .in('asset_id', asset_ids);

    if (deleteError) {
      console.error('Error deleting compliance assets:', deleteError);
      return NextResponse.json({ error: 'Failed to delete compliance assets' }, { status: 500 });
    }

    console.log(`Successfully removed ${asset_ids.length} compliance assets from building ${buildingId}`);

    return NextResponse.json({ 
      success: true, 
      message: `Removed ${asset_ids.length} compliance assets`,
      removed_count: asset_ids.length
    });

  } catch (error) {
    console.error('Error in bulk-remove compliance assets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
