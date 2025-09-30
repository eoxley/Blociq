import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CreateContractorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  vat_number: z.string().optional(),
  categories: z.array(z.string()).default([]),
  notes: z.string().optional(),
  documents: z.array(z.object({
    doc_type: z.enum(['insurance', 'ram', 'method_statement', 'hmrc', 'other']),
    file_url: z.string().url(),
    valid_from: z.string(),
    valid_to: z.string(),
  })).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateContractorSchema.parse(body);
    
    const supabase = createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create contractor
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .insert({
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        vat_number: validatedData.vat_number,
        categories: validatedData.categories,
        notes: validatedData.notes,
      })
      .select()
      .single();

    if (contractorError) {
      return NextResponse.json({ error: 'Failed to create contractor' }, { status: 500 });
    }

    // Create documents if provided
    if (validatedData.documents.length > 0) {
      const documents = validatedData.documents.map(doc => ({
        contractor_id: contractor.id,
        doc_type: doc.doc_type,
        file_url: doc.file_url,
        valid_from: doc.valid_from,
        valid_to: doc.valid_to,
      }));

      const { error: docsError } = await supabase
        .from('contractor_documents')
        .insert(documents);

      if (docsError) {
        // Rollback contractor creation if documents fail
        await supabase
          .from('contractors')
          .delete()
          .eq('id', contractor.id);
        
        return NextResponse.json({ error: 'Failed to create contractor documents' }, { status: 500 });
      }
    }

    // Get contractor with documents
    const { data: contractorWithDocs, error: fetchError } = await supabase
      .from('contractors')
      .select(`
        *,
        contractor_documents (*)
      `)
      .eq('id', contractor.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch contractor details' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      contractor: contractorWithDocs,
    });

  } catch (error) {
    console.error('Error creating contractor:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}


