import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { asset_ids } = await req.json();
    
    if (!Array.isArray(asset_ids) || asset_ids.length === 0) {
      return NextResponse.json({ inserted: 0 });
    }

    const rows = asset_ids.map((cid: string) => ({
      building_id: params.id,
      compliance_asset_id: cid
    }));

    const { error } = await supabase
      .from("building_compliance_assets")
      .insert(rows);

    if (error) {
      console.error('Error bulk-adding compliance assets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ inserted: rows.length });
  } catch (error) {
    console.error('Error in compliance bulk-add API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
