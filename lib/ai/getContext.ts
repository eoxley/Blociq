import { SupabaseClient } from '@supabase/supabase-client';
import { Database } from '@/lib/database.types';

export interface ContextData {
  building?: {
    id: string;
    name: string;
    address: string | null;
    unit_count: number | null;
  };
  leaseholder?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  compliance?: Array<{
    item_name: string;
    status: string;
    next_due: string | null;
    priority: string | null;
  }>;
  documents?: Array<{
    id: string;
    doc_name: string;
    doc_type: string | null;
    upload_date: string | null;
  }>;
  emails?: Array<{
    id: string;
    subject: string;
    from_email: string;
    created_at: string;
  }>;
  sources: string[];
}

export async function getContext(
  contextHints: {
    building_id?: string;
    email_id?: string;
    document_ids?: string[];
    leaseholder_id?: string;
    unit_number?: string;
  } | undefined,
  supabase: SupabaseClient<Database>
): Promise<ContextData> {
  const context: ContextData = {
    sources: []
  };

  try {
    // 1. Fetch building context
    if (contextHints?.building_id) {
      const { data: building } = await supabase
        .from('buildings')
        .select('id, name, address, unit_count')
        .eq('id', contextHints.building_id)
        .maybeSingle();

      if (building) {
        context.building = building;
        context.sources.push(`Building: ${building.name}`);
      }
    }

    // 2. Fetch leaseholder context
    if (contextHints?.leaseholder_id) {
      const { data: leaseholder } = await supabase
        .from('leaseholders')
        .select('id, name, email, phone')
        .eq('id', contextHints.leaseholder_id)
        .maybeSingle();

      if (leaseholder) {
        context.leaseholder = leaseholder;
        context.sources.push(`Leaseholder: ${leaseholder.name}`);
      }
    }

    // 3. Fetch unit and leaseholder by unit number
    if (contextHints?.unit_number && contextHints?.building_id) {
      const { data: unit } = await supabase
        .from('units')
        .select(`
          id, 
          unit_number, 
          leaseholder_id,
          leaseholders(id, name, email, phone)
        `)
        .eq('building_id', contextHints.building_id)
        .eq('unit_number', contextHints.unit_number)
        .maybeSingle();

      if (unit?.leaseholders) {
        context.leaseholder = unit.leaseholders;
        context.sources.push(`Unit ${unit.unit_number}: ${unit.leaseholders.name}`);
      }
    }

    // 4. Fetch compliance issues for building
    if (contextHints?.building_id) {
      const { data: compliance } = await supabase
        .from('compliance_items')
        .select('item_name, status, next_due, priority')
        .eq('building_id', contextHints.building_id)
        .in('status', ['overdue', 'pending', 'due_soon'])
        .order('next_due', { ascending: true })
        .limit(10);

      if (compliance && compliance.length > 0) {
        context.compliance = compliance;
        context.sources.push(`${compliance.length} compliance items`);
      }
    }

    // 5. Fetch building documents
    if (contextHints?.building_id) {
      const { data: documents } = await supabase
        .from('building_documents')
        .select('id, file_name, type, created_at')
        .eq('building_id', contextHints.building_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (documents && documents.length > 0) {
        context.documents = documents.map(doc => ({
          id: doc.id,
          doc_name: doc.file_name,
          doc_type: doc.type,
          upload_date: doc.created_at
        }));
        context.sources.push(`${documents.length} building documents`);
      }
    }

    // 6. Fetch related emails if email_id provided
    if (contextHints?.email_id) {
      // First get the email to find building_id and thread info
      const { data: email } = await supabase
        .from('incoming_emails')
        .select('building_id, subject, message_id')
        .eq('id', contextHints.email_id)
        .maybeSingle();

      if (email?.building_id) {
        // Get other emails in the same building
        const { data: relatedEmails } = await supabase
          .from('incoming_emails')
          .select('id, subject, from_email, created_at')
          .eq('building_id', email.building_id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (relatedEmails && relatedEmails.length > 0) {
          context.emails = relatedEmails;
          context.sources.push(`${relatedEmails.length} related emails`);
        }
      }
    }

    // 7. Fetch specific documents if document_ids provided
    if (contextHints?.document_ids && contextHints.document_ids.length > 0) {
      const { data: specificDocs } = await supabase
        .from('building_documents')
        .select('id, file_name, type, created_at')
        .in('id', contextHints.document_ids);

      if (specificDocs && specificDocs.length > 0) {
        // Merge with existing documents or create new array
        if (context.documents) {
          context.documents = [...context.documents, ...specificDocs.map(doc => ({
            id: doc.id,
            doc_name: doc.file_name,
            doc_type: doc.type,
            upload_date: doc.created_at
          }))];
        } else {
          context.documents = specificDocs.map(doc => ({
            id: doc.id,
            doc_name: doc.file_name,
            doc_type: doc.type,
            upload_date: doc.created_at
          }));
        }
        context.sources.push(`${specificDocs.length} specific documents`);
      }
    }

    // 8. Fetch building todos if building context available
    if (contextHints?.building_id) {
      const { data: todos } = await supabase
        .from('building_todos')
        .select('title, description, status, priority, due_date')
        .eq('building_id', contextHints.building_id)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(5);

      if (todos && todos.length > 0) {
        context.sources.push(`${todos.length} active building todos`);
      }
    }

    // 9. Fetch major works if building context available
    if (contextHints?.building_id) {
      const { data: majorWorks } = await supabase
        .from('major_works')
        .select('title, status, start_date, end_date, total_cost')
        .eq('building_id', contextHints.building_id)
        .in('status', ['planning', 'in_progress', 'on_hold'])
        .order('start_date', { ascending: true })
        .limit(3);

      if (majorWorks && majorWorks.length > 0) {
        context.sources.push(`${majorWorks.length} active major works projects`);
      }
    }

    return context;

  } catch (error) {
    console.error('Error fetching context:', error);
    // Return partial context if available
    return context;
  }
}

// Helper function to get compact context summary
export function getContextSummary(context: ContextData): string {
  const parts: string[] = [];

  if (context.building) {
    parts.push(`${context.building.name} (${context.building.unit_count || 'Unknown'} units)`);
  }

  if (context.leaseholder) {
    parts.push(`Leaseholder: ${context.leaseholder.name}`);
  }

  if (context.compliance?.length) {
    parts.push(`${context.compliance.length} compliance items`);
  }

  if (context.documents?.length) {
    parts.push(`${context.documents.length} documents`);
  }

  if (context.emails?.length) {
    parts.push(`${context.emails.length} related emails`);
  }

  return parts.join(' • ') || 'No context available';
}
