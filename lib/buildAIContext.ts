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
          name,
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

    const context = `
=== BUILDING ===
${JSON.stringify(building, null, 2)}

=== DOCUMENTS ===
${docsText}

=== MAJOR WORKS ===
${majorWorksContext}

=== FOUNDER KNOWLEDGE ===
${founderKnowledge}
`;

    return context;

  } catch (err: any) {
    console.error('❌ Unexpected error building AI context:', err.message || err);
    return null;
  }
} 