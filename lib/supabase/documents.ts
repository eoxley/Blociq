import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getDocumentSummaries(documentIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('building_documents')
      .select(`
        id,
        file_name,
        document_type,
        extracted_text,
        document_analysis,
        created_at
      `)
      .in('id', documentIds);

    if (error) {
      console.error('Error fetching document summaries:', error);
      return [];
    }

    return data?.map(doc => ({
      id: doc.id,
      name: doc.file_name,
      type: doc.document_type,
      summary: doc.document_analysis?.summary || doc.extracted_text?.substring(0, 500) || 'No summary available',
      uploadedAt: doc.created_at
    })) || [];
  } catch (error) {
    console.error('Error in getDocumentSummaries:', error);
    return [];
  }
} 