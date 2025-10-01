import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const UploadDocSchema = z.object({
  contractor_id: z.string().uuid(),
  doc_type: z.enum(['insurance', 'ram', 'method_statement', 'hmrc', 'other']),
  file_url: z.string().url(),
  valid_from: z.string(),
  valid_to: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = UploadDocSchema.parse(body);
    
    const supabase = createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify contractor exists and user has access
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select(`
        id,
        name,
        works_orders!inner (
          building_id,
          user_buildings!inner (
            user_id,
            role
          )
        )
      `)
      .eq('id', validatedData.contractor_id)
      .eq('works_orders.user_buildings.user_id', user.id)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found or access denied' }, { status: 404 });
    }

    // Create document
    const { data: document, error: docError } = await supabase
      .from('contractor_documents')
      .insert({
        contractor_id: validatedData.contractor_id,
        doc_type: validatedData.doc_type,
        file_url: validatedData.file_url,
        valid_from: validatedData.valid_from,
        valid_to: validatedData.valid_to,
      })
      .select()
      .single();

    if (docError) {
      return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }

    // Get updated contractor with all documents
    const { data: contractorWithDocs, error: fetchError } = await supabase
      .from('contractors')
      .select(`
        *,
        contractor_documents (*)
      `)
      .eq('id', validatedData.contractor_id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch updated contractor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document,
      contractor: contractorWithDocs,
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}




