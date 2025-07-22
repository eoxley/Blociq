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
      // Fetch major works projects for this building
      const { data: projects, error: projectsError } = await supabase
        .from('major_works')
        .select('*')
        .eq('building_id', buildingIdNum);

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

        const projectsText = projects.map(project => `
Project: ${project.title}
Status: ${project.status}
Description: ${project.description || 'No description'}
Start Date: ${project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
Consultation Stage: ${project.consultation_stage || 'Not set'}
Funds Confirmed: ${project.funds_confirmed ? new Date(project.funds_confirmed).toLocaleDateString() : 'Not confirmed'}
Contractor Appointed: ${project.contractor_appointed ? new Date(project.contractor_appointed).toLocaleDateString() : 'Not appointed'}
Notice of Reason: ${project.notice_of_reason_issued ? new Date(project.notice_of_reason_issued).toLocaleDateString() : 'Not issued'}
`).join('\n');

        const documentsText = documents && documents.length > 0 
          ? documents.map(doc => `
Document: ${doc.file_name}
Type: ${doc.document_type}
Description: ${doc.description || 'No description'}
Uploaded: ${new Date(doc.uploaded_at).toLocaleDateString()}
`).join('\n')
          : 'No documents uploaded';

        majorWorksContext = `
=== MAJOR WORKS PROJECTS ===
${projectsText}

=== MAJOR WORKS DOCUMENTS ===
${documentsText}
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