import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function buildAIContext(buildingId: string) {
  try {
    // Convert string buildingId to number for database query
    const buildingIdNum = parseInt(buildingId, 10);
    
    if (isNaN(buildingIdNum)) {
      console.error('❌ Invalid building ID:', buildingId);
      return null;
    }

    // 🔍 Get building + units + leaseholders
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select(`
        id,
        name,
        address,
        access_notes,
        service_charge_start,
        service_charge_end,
        units (
          id,
          unit_number,
          floor,
          type,
          leaseholders (
            name,
            email,
            phone
          )
        )
      `)
      .eq('id', buildingIdNum)
      .single();

    if (buildingError) {
      console.error('❌ Error fetching building data:', buildingError.message);
      return null;
    }

    // 📂 Get uploaded documents + parsed text
    let docsText = 'No documents available.';
    
    try {
      const { data: documents, error: docError } = await supabase
        .from('compliance_docs')
        .select('title, doc_type, parsed_text')
        .eq('building_id', buildingIdNum);

      if (docError) {
        console.warn('⚠️ No documents found or error fetching docs:', docError.message);
      } else if (documents) {
        docsText = documents.map(doc => (
          `--- ${doc.title} (${doc.doc_type}) ---\n${doc.parsed_text || '[No text extracted]'}`)
        ).join('\n\n') || 'No documents available.';
      }
    } catch (error) {
      console.warn('⚠️ Documents table may not exist:', error);
    }

    // 🏗️ Get major works projects
    let majorWorksText = 'No major works projects available.';
    
    try {
      const { data: majorWorks, error: mwError } = await supabase
        .from('major_works_projects')
        .select(`
          title,
          description,
          status,
          consultation_stage,
          section20_notice_issued,
          estimated_start_date,
          estimated_completion_date,
          estimated_cost,
          actual_cost,
          completion_percentage,
          priority,
          project_type,
          contractor_name,
          contractor_email,
          contractor_phone,
          is_active,
          created_at,
          updated_at
        `)
        .eq('building_id', buildingIdNum)
        .order('created_at', { ascending: false });

      if (mwError) {
        console.warn('⚠️ No major works found or error fetching:', mwError.message);
      } else if (majorWorks && majorWorks.length > 0) {
        majorWorksText = majorWorks.map(project => (
          `--- Major Works Project: ${project.title} ---
Status: ${project.status}
Consultation Stage: ${project.consultation_stage || 'N/A'}
Priority: ${project.priority}
Project Type: ${project.project_type || 'N/A'}
Contractor: ${project.contractor_name || 'N/A'}
Description: ${project.description || 'No description'}
Estimated Cost: £${project.estimated_cost || 0}
Actual Cost: £${project.actual_cost || 0}
Completion: ${project.completion_percentage}%
S20 Notice Issued: ${project.section20_notice_issued || 'Not issued'}
Estimated Start: ${project.estimated_start_date || 'TBD'}
Estimated Completion: ${project.estimated_completion_date || 'TBD'}
Is Active: ${project.is_active ? 'Yes' : 'No'}
Created: ${project.created_at}
Updated: ${project.updated_at}`
        )).join('\n\n') || 'No major works projects available.';
      }
    } catch (error) {
      console.warn('⚠️ Major works table may not exist:', error);
    }

    // 🧠 Load founder knowledge
    let founderKnowledge = '';
    
    try {
      const { data: founderData, error: founderError } = await supabase
        .from('founder_knowledge')
        .select('content');

      if (founderError) {
        console.warn('⚠️ Founder knowledge fetch error:', founderError.message);
      } else if (founderData) {
        founderKnowledge = founderData.map(f => f.content).join('\n\n') || '';
      }
    } catch (error) {
      console.warn('⚠️ Founder knowledge table may not exist:', error);
    }

    // 🏗️ Load major works projects and documents
    let majorWorksContext = '';
    
    try {
      // Fetch major works projects for this building using new schema
      const { data: projects, error: projectsError } = await supabase
        .from('major_works_projects')
        .select(`
          id,
          title,
          description,
          status,
          consultation_stage,
          section20_notice_issued,
          estimated_start_date,
          actual_start_date,
          estimated_completion_date,
          actual_completion_date,
          estimated_cost,
          actual_cost,
          completion_percentage,
          priority,
          project_type,
          contractor_name,
          contractor_email,
          contractor_phone,
          is_active,
          created_at,
          updated_at
        `)
        .eq('building_id', buildingIdNum)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.warn('⚠️ Major works projects fetch error:', projectsError.message);
      } else if (projects && projects.length > 0) {
        // Fetch documents for these projects
        const projectIds = projects.map(p => p.id);
        const { data: documents, error: docsError } = await supabase
          .from('major_works_documents')
          .select('*')
          .in('project_id', projectIds);

        if (docsError) {
          console.warn('⚠️ Major works documents fetch error:', docsError.message);
        }

        // Fetch logs for these projects
        const { data: logs, error: logsError } = await supabase
          .from('major_works_logs')
          .select('*')
          .in('project_id', projectIds)
          .order('timestamp', { ascending: false });

        if (logsError) {
          console.warn('⚠️ Major works logs fetch error:', logsError.message);
        }

        const projectsText = projects.map(project => `
Project: ${project.title}
Status: ${project.status}
Consultation Stage: ${project.consultation_stage || 'N/A'}
Priority: ${project.priority}
Project Type: ${project.project_type || 'N/A'}
Contractor: ${project.contractor_name || 'N/A'}
Description: ${project.description || 'No description'}
Estimated Cost: £${project.estimated_cost || 0}
Actual Cost: £${project.actual_cost || 0}
Completion: ${project.completion_percentage}%
S20 Notice Issued: ${project.section20_notice_issued || 'Not issued'}
Estimated Start: ${project.estimated_start_date || 'TBD'}
Actual Start: ${project.actual_start_date || 'Not started'}
Estimated Completion: ${project.estimated_completion_date || 'TBD'}
Actual Completion: ${project.actual_completion_date || 'Not completed'}
Is Active: ${project.is_active ? 'Yes' : 'No'}
Created: ${project.created_at}
Updated: ${project.updated_at}
`).join('\n');

        const documentsText = documents && documents.length > 0 
          ? documents.map(doc => `
Document: ${doc.title}
Type: ${doc.document_type}
Description: ${doc.description || 'No description'}
File Size: ${doc.file_size} bytes
Uploaded: ${new Date(doc.uploaded_at).toLocaleDateString()}
Public: ${doc.is_public ? 'Yes' : 'No'}
`).join('\n')
          : 'No documents uploaded';

        const logsText = logs && logs.length > 0
          ? logs.map(log => `
Log Entry: ${log.action}
Description: ${log.description}
Timestamp: ${new Date(log.timestamp).toLocaleDateString()}
Metadata: ${log.metadata ? JSON.stringify(log.metadata) : 'None'}
`).join('\n')
          : 'No activity logs';

        majorWorksContext = `
=== MAJOR WORKS PROJECTS ===
${projectsText}

=== MAJOR WORKS DOCUMENTS ===
${documentsText}

=== MAJOR WORKS ACTIVITY LOGS ===
${logsText}
`;
      }
    } catch (error) {
      console.warn('⚠️ Major works context fetch error:', error);
    }

    // 🛡️ Load compliance data
    let complianceContext = '';
    
    try {
      // Fetch building compliance assets
      const { data: buildingAssets, error: assetsError } = await supabase
        .from('building_assets')
        .select(`
          *,
          compliance_items (
            id, item_type, category, frequency, assigned_to, notes
          )
        `)
        .eq('building_id', buildingIdNum)
        .eq('applies', true);

      if (!assetsError && buildingAssets && buildingAssets.length > 0) {
        // Fetch compliance documents
        const assetIds = buildingAssets.map(asset => asset.compliance_item_id);
        const { data: complianceDocs, error: docsError } = await supabase
          .from('compliance_docs')
          .select('*')
          .eq('building_id', buildingIdNum)
          .in('compliance_item_id', assetIds);

        // Calculate compliance status for each asset
        const assetsWithStatus = buildingAssets.map(asset => {
          const dueDate = asset.next_due ? new Date(asset.next_due) : null;
          const today = new Date();
          let status = 'missing';
          
          if (asset.next_due) {
            if (dueDate! < today) {
              status = 'overdue';
            } else if (dueDate! < new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
              status = 'due_soon';
            } else {
              status = 'compliant';
            }
          }

          return {
            ...asset,
            status,
            documents: complianceDocs?.filter(doc => doc.compliance_item_id === asset.compliance_item_id) || []
          };
        });

        const assetsText = assetsWithStatus.map(asset => 
          `- ${asset.compliance_items?.item_type || 'Unknown'}: ${asset.status} (Due: ${asset.next_due || 'Not set'}, Category: ${asset.compliance_items?.category || 'General'})`
        ).join('\n');

        const docsText = complianceDocs && complianceDocs.length > 0 ? 
          complianceDocs.map(doc => `- ${doc.doc_type || 'Document'}: ${doc.doc_url || 'No URL'}`).join('\n') : 
          'No compliance documents uploaded';

        const summary = {
          total: assetsWithStatus.length,
          compliant: assetsWithStatus.filter(a => a.status === 'compliant').length,
          overdue: assetsWithStatus.filter(a => a.status === 'overdue').length,
          due_soon: assetsWithStatus.filter(a => a.status === 'due_soon').length,
          missing: assetsWithStatus.filter(a => a.status === 'missing').length
        };

        complianceContext = `
=== COMPLIANCE ASSETS ===
Summary: ${summary.compliant}/${summary.total} Compliant | ${summary.overdue} Overdue | ${summary.due_soon} Due Soon | ${summary.missing} Missing

Assets:
${assetsText}

=== COMPLIANCE DOCUMENTS ===
${docsText}
`;
      }
    } catch (error) {
      console.warn('⚠️ Compliance context fetch error:', error);
    }

    const context = `
=== BUILDING ===
${JSON.stringify(building, null, 2)}

=== DOCUMENTS ===
${docsText}

=== MAJOR WORKS ===
${majorWorksContext}

=== COMPLIANCE ===
${complianceContext}

=== FOUNDER KNOWLEDGE ===
${founderKnowledge}
`;

    return context;

  } catch (err: any) {
    console.error('❌ Unexpected error building AI context:', err.message || err);
    return null;
  }
}

// Add compliance-specific AI instructions
export const complianceAIInstructions = `
You are an AI assistant for BlocIQ, a property management platform. You have access to building information, units, leaseholders, uploaded documents, major works projects, and compliance data. 

For compliance-related queries, you can:
- Summarise compliance status for any building (e.g., "What's overdue at Ashwood House?")
- Explain specific compliance requirements (e.g., "What is a Fire Risk Assessment and how often is it required?")
- Provide guidance on compliance documents and certificates
- Help with compliance terminology and UK building regulations

Use British English spelling (e.g., "summarise", "organisation") and provide helpful, accurate responses based on the available data. If you don't have enough information, ask for clarification or suggest what additional data might be needed.

For compliance queries, always include:
- Current status (compliant, overdue, due soon, missing)
- Due dates where available
- Category and frequency information
- Any linked documents
- Recommendations for next steps
`; 