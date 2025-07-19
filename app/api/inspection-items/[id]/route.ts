import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface InspectionItemUpdateData {
  status?: 'OK' | 'Issue Found' | 'Not Inspected' | 'Needs Attention';
  notes?: string | null;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      status, 
      notes 
    } = body;

    const updateData: InspectionItemUpdateData = {};
    
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('inspection_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating inspection item:', error);
      return NextResponse.json({ error: 'Failed to update inspection item' }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });

  } catch (error) {
    console.error('Inspection item PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 