import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(cookies());
    
    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("building_compliance_assets")
      .select("compliance_asset_id")
      .eq("building_id", params.id);

    if (error) {
      console.error('Error fetching selected compliance assets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      asset_ids: (data || []).map(d => d.compliance_asset_id) 
    });
  } catch (error) {
    console.error('Error in compliance selected API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
