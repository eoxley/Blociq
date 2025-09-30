import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const formData = await req.formData();
    
    const documentType = formData.get('documentType') as string;
    const documentName = formData.get('documentName') as string;
    const expiryDate = formData.get('expiryDate') as string;
    const file = formData.get('file') as File;

    if (!documentType || !documentName || !file) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'documentType, documentName, and file are required'
      }, { status: 400 });
    }

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify contractor exists
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id, company_name')
      .eq('id', params.id)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({
        error: 'Contractor not found'
      }, { status: 404 });
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${contractor.company_name}_${documentType}_${Date.now()}.${fileExt}`;
    const filePath = `contractor-documents/${contractor.company_name}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contractor-documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({
        error: 'Failed to upload document',
        message: uploadError.message
      }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('contractor-documents')
      .getPublicUrl(filePath);

    // Determine status based on expiry date
    let status = 'valid';
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (expiry < today) {
        status = 'expired';
      } else if (daysUntilExpiry <= 30) {
        status = 'pending_renewal';
      }
    }

    // Create document record
    const { data: document, error: documentError } = await supabase
      .from('contractor_documents')
      .insert({
        contractor_id: params.id,
        document_type: documentType,
        document_name: documentName,
        file_path: publicUrl,
        expiry_date: expiryDate || null,
        status,
        created_by: session.user.id
      })
      .select()
      .single();

    if (documentError) {
      console.error('Error creating document record:', documentError);
      // Clean up uploaded file
      await supabase.storage.from('contractor-documents').remove([filePath]);
      return NextResponse.json({
        error: 'Failed to create document record',
        message: documentError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      document: document
    });

  } catch (error) {
    console.error('Error uploading contractor document:', error);
    return NextResponse.json({
      error: 'Failed to upload document',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data: documents, error } = await supabase
      .from('contractor_documents')
      .select('*')
      .eq('contractor_id', params.id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching contractor documents:', error);
      return NextResponse.json({
        error: 'Failed to fetch documents',
        message: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      documents: documents || []
    });

  } catch (error) {
    console.error('Error in contractor documents GET:', error);
    return NextResponse.json({
      error: 'Failed to fetch documents',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
