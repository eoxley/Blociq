import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { leaseholderId: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify lease exists and user has access
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, building_id, file_path, analysis_json, metadata')
      .eq('id', params.leaseholderId)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({
        error: 'Lease not found'
      }, { status: 404 });
    }

    const documents = [];

    // Add the lease document itself
    if (lease.file_path) {
      documents.push({
        id: lease.id,
        name: `Lease Document`,
        type: 'lease',
        file_path: lease.file_path,
        category: 'Legal Documents',
        uploaded_at: lease.metadata?.linked_at || new Date().toISOString(),
        size: null,
        description: 'Primary lease agreement'
      });
    }

    // Get building documents
    const { data: buildingDocs } = await supabase
      .from('building_documents')
      .select(`
        id,
        filename,
        file_path,
        document_type,
        uploaded_at,
        file_size,
        description,
        building_id
      `)
      .eq('building_id', lease.building_id)
      .order('uploaded_at', { ascending: false });

    if (buildingDocs) {
      buildingDocs.forEach(doc => {
        documents.push({
          id: doc.id,
          name: doc.filename,
          type: 'building',
          file_path: doc.file_path,
          category: doc.document_type || 'Building Documents',
          uploaded_at: doc.uploaded_at,
          size: doc.file_size,
          description: doc.description
        });
      });
    }

    // Get compliance documents
    const { data: complianceDocs } = await supabase
      .from('compliance_documents')
      .select(`
        id,
        filename,
        file_path,
        document_type,
        upload_date,
        file_size,
        description,
        expiry_date,
        building_id
      `)
      .eq('building_id', lease.building_id)
      .order('upload_date', { ascending: false });

    if (complianceDocs) {
      complianceDocs.forEach(doc => {
        documents.push({
          id: doc.id,
          name: doc.filename,
          type: 'compliance',
          file_path: doc.file_path,
          category: 'Compliance',
          uploaded_at: doc.upload_date,
          size: doc.file_size,
          description: doc.description,
          expiry_date: doc.expiry_date
        });
      });
    }

    // Get related document jobs (other lease analyses)
    const { data: documentJobs } = await supabase
      .from('document_jobs')
      .select(`
        id,
        filename,
        file_path,
        status,
        created_at,
        summary_json,
        building_id
      `)
      .eq('building_id', lease.building_id)
      .neq('id', lease.document_job_id) // Exclude the current lease's document job
      .order('created_at', { ascending: false });

    if (documentJobs) {
      documentJobs.forEach(job => {
        if (job.status === 'completed' && job.file_path) {
          documents.push({
            id: job.id,
            name: job.filename,
            type: 'analysis',
            file_path: job.file_path,
            category: 'Document Analysis',
            uploaded_at: job.created_at,
            size: null,
            description: 'AI-analyzed document'
          });
        }
      });
    }

    // Group documents by category
    const categorizedDocuments = documents.reduce((acc, doc) => {
      const category = doc.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(doc);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      documents: categorizedDocuments,
      total: documents.length
    });

  } catch (error) {
    console.error('Error fetching portal documents:', error);
    return NextResponse.json({
      error: 'Failed to fetch documents',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}