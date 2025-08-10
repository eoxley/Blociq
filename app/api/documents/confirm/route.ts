import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { sanitizeHtml } from '@/lib/ai/sanitizeHtml';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ConfirmDocumentRequest {
  document_id: string;
  accepted: boolean;
  override?: {
    building_id?: string;
    unit_id?: string;
    leaseholder_id?: string;
  };
  apply_actions?: string[];
}

interface ConfirmDocumentResponse {
  document_id: string;
  linked: boolean;
  updates_summary: {
    compliance_updated?: boolean;
    tasks_created?: number;
    emails_sent?: number;
    actions_executed: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ConfirmDocumentRequest = await request.json();
    const { document_id, accepted, override, apply_actions = [] } = body;

    // Get user from auth
    const cookieStore = await cookies();
    const supabaseAuth = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabaseAuth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!document_id) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    // Get the document
    const { data: document, error: docError } = await supabase
      .from('building_documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!accepted) {
      // Mark as unlinked and return
      const { error: updateError } = await supabase
        .from('building_documents')
        .update({ is_unlinked: true })
        .eq('id', document_id);

      if (updateError) {
        console.error('Error updating document:', updateError);
        return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
      }

      return NextResponse.json({
        document_id,
        linked: false,
        updates_summary: { actions_executed: [] }
      });
    }

    // Link document to override values or existing values
    const finalBuildingId = override?.building_id || document.building_id;
    const finalUnitId = override?.unit_id || document.unit_id;
    const finalLeaseholderId = override?.leaseholder_id || document.leaseholder_id;

    const updatesSummary = {
      compliance_updated: false,
      tasks_created: 0,
      emails_sent: 0,
      actions_executed: [] as string[]
    };

    // Update document linking
    const { error: linkError } = await supabase
      .from('building_documents')
      .update({
        building_id: finalBuildingId,
        unit_id: finalUnitId,
        leaseholder_id: finalLeaseholderId,
        is_unlinked: false
      })
      .eq('id', document_id);

    if (linkError) {
      console.error('Error linking document:', linkError);
      return NextResponse.json({ error: 'Failed to link document' }, { status: 500 });
    }

    // Handle compliance documents
    if (document.extracted?.classification === 'compliance' && finalBuildingId) {
      const extracted = document.extracted;
      const guesses = extracted.guesses || {};
      const extractedFields = extracted.extracted_fields || {};

      // Upsert compliance_documents
      const { data: complianceDoc, error: complianceError } = await supabase
        .from('compliance_documents')
        .upsert({
          building_id: finalBuildingId,
          compliance_asset_id: guesses.compliance_asset_id || 'unknown',
          document_url: document.file_url,
          title: document.file_name,
          summary: document.content_summary,
          extracted_date: new Date().toISOString()
        })
        .select()
        .single();

      if (!complianceError && complianceDoc) {
        // Update building_compliance_assets
        const nextDueDate = extractedFields.next_due_date || 
          (extractedFields.last_renewed_date && extractedFields.expiry_date ? extractedFields.expiry_date : null);

        const { error: assetError } = await supabase
          .from('building_compliance_assets')
          .upsert({
            building_id: finalBuildingId,
            asset_id: guesses.compliance_asset_id || 'unknown',
            latest_document_id: complianceDoc.id,
            last_renewed_date: extractedFields.last_renewed_date || extractedFields.issued_date,
            next_due_date: nextDueDate,
            last_updated: new Date().toISOString()
          });

        if (!assetError) {
          updatesSummary.compliance_updated = true;
          updatesSummary.actions_executed.push('compliance_updated');
        }
      }
    }

    // Execute selected actions
    const suggestedActions = document.extracted?.suggested_actions || [];
    
    for (const action of suggestedActions) {
      if (!apply_actions.includes(action.type)) continue;

      try {
        if (action.type === 'update_compliance_dates') {
          // Already handled above
          continue;
        } else if (action.type === 'create_task' && finalBuildingId) {
          const { error: taskError } = await supabase
            .from('building_todos')
            .insert({
              building_id: finalBuildingId,
              title: action.args?.title || `Review ${document.file_name}`,
              description: document.content_summary,
              priority: 'Medium',
              created_at: new Date().toISOString()
            });

          if (!taskError) {
            updatesSummary.tasks_created++;
            updatesSummary.actions_executed.push('task_created');
          }
        } else if (action.type === 'email_notice') {
          // Call send-email tool
          const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || 'http://localhost:3000'}/api/tools/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || ''
            },
            body: JSON.stringify({
              to: action.args?.to || [],
              subject: action.args?.subject || `Document: ${document.file_name}`,
              html_body: sanitizeHtml(document.content_summary),
              save_to_drafts: true
            })
          });

          if (emailResponse.ok) {
            updatesSummary.emails_sent++;
            updatesSummary.actions_executed.push('email_sent');
          }
        }
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
      }
    }

    // Log tool calls
    if (updatesSummary.actions_executed.length > 0) {
      const toolCalls = updatesSummary.actions_executed.map(action => ({
        tool_name: action,
        args: { document_id, action },
        result: { success: true },
        status: 'success'
      }));

      await supabase
        .from('ai_tool_calls')
        .insert(toolCalls);
    }

    const response: ConfirmDocumentResponse = {
      document_id,
      linked: true,
      updates_summary: updatesSummary
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in document confirm route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
