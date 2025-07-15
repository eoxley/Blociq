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
          leaseholder:leaseholder_id (
            full_name,
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

    const context = `
=== BUILDING ===
${JSON.stringify(building, null, 2)}

=== DOCUMENTS ===
${docsText}

=== FOUNDER KNOWLEDGE ===
${founderKnowledge}
`;

    return context;

  } catch (err: any) {
    console.error('❌ Unexpected error building AI context:', err.message || err);
    return null;
  }
} 