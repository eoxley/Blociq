import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ComprehensiveSearchResult {
  buildings: any[];
  units: any[];
  leaseholders: any[];
  documents: any[];
  compliance: any[];
  communications: any[];
  todos: any[];
  majorWorks: any[];
  financials: any[];
  events: any[];
  assets: any[];
  maintenance: any[];
  industryKnowledge: any[];
  founderKnowledge: any[];
}

/**
 * Comprehensive search across all Supabase tables for contextual data
 */
export async function searchEntireDatabase(
  query: string, 
  userId?: string,
  maxResults: number = 50
): Promise<ComprehensiveSearchResult> {
  const searchTerm = query.toLowerCase().trim();
  console.log('🔍 Starting comprehensive database search for:', searchTerm);
  
  const results: ComprehensiveSearchResult = {
    buildings: [],
    units: [],
    leaseholders: [],
    documents: [],
    compliance: [],
    communications: [],
    todos: [],
    majorWorks: [],
    financials: [],
    events: [],
    assets: [],
    maintenance: [],
    industryKnowledge: [],
    founderKnowledge: []
  };

  try {
    // 🏢 Buildings Search
    const { data: buildings } = await supabase
      .from('buildings')
      .select(`
        id, name, address, notes, unit_count, 
        building_manager_name, building_manager_email,
        is_hrb, created_at, updated_at
      `)
      .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%,building_manager_name.ilike.%${searchTerm}%`)
      .limit(maxResults);
    
    results.buildings = buildings || [];
    console.log(`🏢 Found ${results.buildings.length} buildings`);

    // 🏠 Units Search
    const { data: units } = await supabase
      .from('units')
      .select(`
        id, unit_number, floor, type, notes, 
        building_id, leaseholder_id,
        buildings!inner(name, address),
        leaseholders!units_leaseholder_id_fkey(name, email, phone)
      `)
      .or(`unit_number.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
      .limit(maxResults);
    
    results.units = units || [];
    console.log(`🏠 Found ${results.units.length} units`);

    // 👥 Leaseholders Search
    const { data: leaseholders } = await supabase
      .from('leaseholders')
      .select(`
        id, name, email, phone, unit_number, notes,
        building_id, created_at,
        buildings!inner(name, address),
        units(unit_number, floor, type)
      `)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,unit_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
      .limit(maxResults);
    
    results.leaseholders = leaseholders || [];
    console.log(`👥 Found ${results.leaseholders.length} leaseholders`);

    // 📄 Documents Search
    const { data: documents } = await supabase
      .from('building_documents')
      .select(`
        id, file_name, type, notes, file_size,
        building_id, created_at, updated_at,
        text_content,
        buildings!inner(name, address)
      `)
      .or(`file_name.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%,text_content.ilike.%${searchTerm}%`)
      .limit(maxResults);
    
    results.documents = documents || [];
    console.log(`📄 Found ${results.documents.length} documents`);

    // ⚠️ Compliance Search
    const { data: compliance } = await supabase
      .from('building_compliance_assets')
      .select(`
        id, status, next_due_date, last_renewed_date, notes,
        building_id, created_at,
        buildings!inner(name, address),
        compliance_assets!inner(name, category, description, frequency_months)
      `)
      .or(`status.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
      .limit(maxResults);
    
    results.compliance = compliance || [];
    console.log(`⚠️ Found ${results.compliance.length} compliance items`);

    // 📧 Communications Search
    const { data: communications } = await supabase
      .from('communications_log')
      .select(`
        id, type, subject, content, method, status,
        building_id, leaseholder_name, unit_number,
        sent_at, created_at,
        buildings!inner(name, address)
      `)
      .or(`subject.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,leaseholder_name.ilike.%${searchTerm}%,unit_number.ilike.%${searchTerm}%`)
      .order('sent_at', { ascending: false })
      .limit(maxResults);
    
    results.communications = communications || [];
    console.log(`📧 Found ${results.communications.length} communications`);

    // 📋 Todos Search
    const { data: todos } = await supabase
      .from('building_todos')
      .select(`
        id, title, description, status, priority, 
        due_date, assigned_to, building_id,
        created_at, updated_at,
        buildings!inner(name, address)
      `)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,assigned_to.ilike.%${searchTerm}%`)
      .order('due_date', { ascending: true })
      .limit(maxResults);
    
    results.todos = todos || [];
    console.log(`📋 Found ${results.todos.length} todos`);

    // 🔨 Major Works Search
    const { data: majorWorks } = await supabase
      .from('major_works_projects')
      .select(`
        id, title, stage, budget_estimate, 
        s20_required, s20_stage, next_milestone,
        next_milestone_date, building_id,
        created_at, updated_at,
        buildings!inner(name, address)
      `)
      .or(`title.ilike.%${searchTerm}%,stage.ilike.%${searchTerm}%,next_milestone.ilike.%${searchTerm}%`)
      .limit(maxResults);
    
    results.majorWorks = majorWorks || [];
    console.log(`🔨 Found ${results.majorWorks.length} major works projects`);

    // 💰 Financial Data Search (Service Charges, Payments, etc.)
    try {
      const { data: financials } = await supabase
        .from('service_charges')
        .select(`
          id, amount, charge_type, due_date, status,
          building_id, unit_id, leaseholder_id,
          description, created_at,
          buildings!inner(name, address)
        `)
        .or(`charge_type.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`)
        .limit(maxResults);
      
      results.financials = financials || [];
      console.log(`💰 Found ${results.financials.length} financial records`);
    } catch (error) {
      console.warn('Financial data search failed (table may not exist):', error);
    }

    // 📅 Events/Calendar Search
    try {
      const { data: events } = await supabase
        .from('building_events')
        .select(`
          id, title, description, event_type, 
          start_date, end_date, location,
          building_id, created_at,
          buildings!inner(name, address)
        `)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,event_type.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
        .order('start_date', { ascending: false })
        .limit(maxResults);
      
      results.events = events || [];
      console.log(`📅 Found ${results.events.length} events`);
    } catch (error) {
      console.warn('Events search failed (table may not exist):', error);
    }

    // 🔧 Assets/Equipment Search
    try {
      const { data: assets } = await supabase
        .from('building_assets')
        .select(`
          id, name, type, description, location,
          status, last_service_date, next_service_date,
          building_id, created_at,
          buildings!inner(name, address)
        `)
        .or(`name.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`)
        .limit(maxResults);
      
      results.assets = assets || [];
      console.log(`🔧 Found ${results.assets.length} assets`);
    } catch (error) {
      console.warn('Assets search failed (table may not exist):', error);
    }

    // 🔧 Maintenance Records Search
    try {
      const { data: maintenance } = await supabase
        .from('maintenance_logs')
        .select(`
          id, title, description, category, status,
          completed_date, contractor, cost,
          building_id, unit_id, created_at,
          buildings!inner(name, address)
        `)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,contractor.ilike.%${searchTerm}%`)
        .order('completed_date', { ascending: false })
        .limit(maxResults);
      
      results.maintenance = maintenance || [];
      console.log(`🔧 Found ${results.maintenance.length} maintenance records`);
    } catch (error) {
      console.warn('Maintenance search failed (table may not exist):', error);
    }

    // 📚 Industry Knowledge Search
    try {
      const { data: industryKnowledge } = await supabase
        .from('industry_knowledge_chunks')
        .select(`
          chunk_text,
          industry_knowledge_documents!inner(
            title,
            category,
            subcategory
          )
        `)
        .ilike('chunk_text', `%${searchTerm}%`)
        .limit(Math.min(10, maxResults))
        .order('created_at', { ascending: false });

      results.industryKnowledge = industryKnowledge || [];
      console.log(`📚 Found ${results.industryKnowledge.length} industry knowledge chunks`);
    } catch (error) {
      console.warn('Industry knowledge search failed (table may not exist):', error);
    }

    // 👤 Founder Knowledge Search
    try {
      const { data: founderKnowledge } = await supabase
        .from('founder_knowledge')
        .select('id, title, content, tags, contexts, priority')
        .eq('is_active', true)
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .limit(Math.min(5, maxResults))
        .order('priority', { ascending: false });

      results.founderKnowledge = founderKnowledge || [];
      console.log(`👤 Found ${results.founderKnowledge.length} founder knowledge items`);
    } catch (error) {
      console.warn('Founder knowledge search failed (table may not exist):', error);
    }

    // Calculate total results
    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`✅ Comprehensive search completed: ${totalResults} total results found`);
    
    return results;

  } catch (error) {
    console.error('❌ Error in comprehensive database search:', error);
    return results; // Return partial results even if some searches fail
  }
}

/**
 * Format comprehensive search results for AI context
 */
export function formatSearchResultsForAI(results: ComprehensiveSearchResult): string {
  let context = "Comprehensive Database Search Results:\n\n";
  
  // Buildings
  if (results.buildings.length > 0) {
    context += `🏢 BUILDINGS (${results.buildings.length} found):\n`;
    results.buildings.forEach(building => {
      context += `• ${building.name} - ${building.address}\n`;
      context += `  Manager: ${building.building_manager_name || 'Not set'}\n`;
      context += `  Units: ${building.unit_count || 'Unknown'} | HRB: ${building.is_hrb ? 'Yes' : 'No'}\n`;
      if (building.notes) context += `  Notes: ${building.notes}\n`;
      context += '\n';
    });
  }

  // Units
  if (results.units.length > 0) {
    context += `🏠 UNITS (${results.units.length} found):\n`;
    results.units.forEach(unit => {
      context += `• Unit ${unit.unit_number} at ${unit.buildings?.name}\n`;
      context += `  Floor: ${unit.floor || 'Unknown'} | Type: ${unit.type || 'Unknown'}\n`;
      if (unit.leaseholders) {
        context += `  Leaseholder: ${unit.leaseholders.name} (${unit.leaseholders.email})\n`;
      }
      if (unit.notes) context += `  Notes: ${unit.notes}\n`;
      context += '\n';
    });
  }

  // Leaseholders
  if (results.leaseholders.length > 0) {
    context += `👥 LEASEHOLDERS (${results.leaseholders.length} found):\n`;
    results.leaseholders.forEach(leaseholder => {
      context += `• ${leaseholder.name} - Unit ${leaseholder.unit_number}\n`;
      context += `  Building: ${leaseholder.buildings?.name}\n`;
      context += `  Email: ${leaseholder.email || 'Not provided'}\n`;
      context += `  Phone: ${leaseholder.phone || 'Not provided'}\n`;
      if (leaseholder.notes) context += `  Notes: ${leaseholder.notes}\n`;
      context += '\n';
    });
  }

  // Documents
  if (results.documents.length > 0) {
    context += `📄 DOCUMENTS (${results.documents.length} found):\n`;
    results.documents.forEach(doc => {
      context += `• ${doc.file_name} (${doc.type || 'Unknown type'})\n`;
      context += `  Building: ${doc.buildings?.name}\n`;
      context += `  Size: ${doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}\n`;
      if (doc.notes) context += `  Notes: ${doc.notes}\n`;
      context += '\n';
    });
  }

  // Compliance
  if (results.compliance.length > 0) {
    context += `⚠️ COMPLIANCE (${results.compliance.length} found):\n`;
    results.compliance.forEach(item => {
      context += `• ${item.compliance_assets?.name} - ${item.status}\n`;
      context += `  Building: ${item.buildings?.name}\n`;
      context += `  Next Due: ${item.next_due_date ? new Date(item.next_due_date).toLocaleDateString() : 'Not set'}\n`;
      context += `  Category: ${item.compliance_assets?.category}\n`;
      if (item.notes) context += `  Notes: ${item.notes}\n`;
      context += '\n';
    });
  }

  // Communications
  if (results.communications.length > 0) {
    context += `📧 COMMUNICATIONS (${results.communications.length} found):\n`;
    results.communications.forEach(comm => {
      context += `• ${comm.subject} (${comm.type})\n`;
      context += `  Building: ${comm.buildings?.name}\n`;
      context += `  To: ${comm.leaseholder_name} (Unit ${comm.unit_number})\n`;
      context += `  Date: ${new Date(comm.sent_at).toLocaleDateString()}\n`;
      context += `  Status: ${comm.status}\n`;
      context += '\n';
    });
  }

  // Todos
  if (results.todos.length > 0) {
    context += `📋 TASKS (${results.todos.length} found):\n`;
    results.todos.forEach(todo => {
      context += `• ${todo.title} (${todo.status})\n`;
      context += `  Building: ${todo.buildings?.name}\n`;
      context += `  Priority: ${todo.priority}\n`;
      context += `  Due: ${todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'Not set'}\n`;
      if (todo.assigned_to) context += `  Assigned: ${todo.assigned_to}\n`;
      if (todo.description) context += `  Description: ${todo.description}\n`;
      context += '\n';
    });
  }

  // Major Works
  if (results.majorWorks.length > 0) {
    context += `🔨 MAJOR WORKS (${results.majorWorks.length} found):\n`;
    results.majorWorks.forEach(project => {
      context += `• ${project.title} (${project.stage})\n`;
      context += `  Building: ${project.buildings?.name}\n`;
      context += `  Budget: ${project.budget_estimate ? '£' + Number(project.budget_estimate).toLocaleString() : 'Not set'}\n`;
      context += `  Section 20: ${project.s20_required ? 'Required' : 'Not required'}\n`;
      if (project.next_milestone) context += `  Next: ${project.next_milestone}\n`;
      context += '\n';
    });
  }

  // Financials
  if (results.financials.length > 0) {
    context += `💰 FINANCIAL RECORDS (${results.financials.length} found):\n`;
    results.financials.forEach(record => {
      context += `• ${record.charge_type} - £${Number(record.amount).toLocaleString()}\n`;
      context += `  Building: ${record.buildings?.name}\n`;
      context += `  Status: ${record.status}\n`;
      context += `  Due: ${record.due_date ? new Date(record.due_date).toLocaleDateString() : 'Not set'}\n`;
      if (record.description) context += `  Description: ${record.description}\n`;
      context += '\n';
    });
  }

  // Events
  if (results.events.length > 0) {
    context += `📅 EVENTS (${results.events.length} found):\n`;
    results.events.forEach(event => {
      context += `• ${event.title} (${event.event_type})\n`;
      context += `  Building: ${event.buildings?.name}\n`;
      context += `  Date: ${new Date(event.start_date).toLocaleDateString()}\n`;
      if (event.location) context += `  Location: ${event.location}\n`;
      if (event.description) context += `  Description: ${event.description}\n`;
      context += '\n';
    });
  }

  // Assets
  if (results.assets.length > 0) {
    context += `🔧 ASSETS (${results.assets.length} found):\n`;
    results.assets.forEach(asset => {
      context += `• ${asset.name} (${asset.type})\n`;
      context += `  Building: ${asset.buildings?.name}\n`;
      context += `  Location: ${asset.location || 'Not specified'}\n`;
      context += `  Status: ${asset.status}\n`;
      if (asset.next_service_date) context += `  Next Service: ${new Date(asset.next_service_date).toLocaleDateString()}\n`;
      context += '\n';
    });
  }

  // Maintenance
  if (results.maintenance.length > 0) {
    context += `🔧 MAINTENANCE (${results.maintenance.length} found):\n`;
    results.maintenance.forEach(record => {
      context += `• ${record.title} (${record.status})\n`;
      context += `  Building: ${record.buildings?.name}\n`;
      context += `  Category: ${record.category}\n`;
      if (record.contractor) context += `  Contractor: ${record.contractor}\n`;
      if (record.cost) context += `  Cost: £${Number(record.cost).toLocaleString()}\n`;
      if (record.completed_date) context += `  Completed: ${new Date(record.completed_date).toLocaleDateString()}\n`;
      context += '\n';
    });
  }

  // Industry Knowledge
  if (results.industryKnowledge.length > 0) {
    context += `📚 INDUSTRY KNOWLEDGE (${results.industryKnowledge.length} found):\n`;
    results.industryKnowledge.forEach(item => {
      const doc = item.industry_knowledge_documents;
      context += `• ${doc.category}: ${item.chunk_text.substring(0, 150)}${item.chunk_text.length > 150 ? '...' : ''}\n`;
      context += `  Source: ${doc.title}\n`;
      if (doc.subcategory) context += `  Subcategory: ${doc.subcategory}\n`;
      context += '\n';
    });
  }

  // Founder Knowledge
  if (results.founderKnowledge.length > 0) {
    context += `👤 FOUNDER GUIDANCE (${results.founderKnowledge.length} found):\n`;
    results.founderKnowledge.forEach(item => {
      context += `• ${item.title}\n`;
      context += `  ${item.content.substring(0, 150)}${item.content.length > 150 ? '...' : ''}\n`;
      if (item.tags && item.tags.length > 0) context += `  Tags: ${item.tags.join(', ')}\n`;
      context += '\n';
    });
  }

  return context;
}

/**
 * Smart context extraction based on query type
 */
export function extractRelevantContext(
  results: ComprehensiveSearchResult, 
  query: string
): string {
  const queryLower = query.toLowerCase();
  let relevantContext = "";

  // Determine query intent and prioritize relevant data
  if (queryLower.includes('leaseholder') || queryLower.includes('tenant') || queryLower.includes('resident')) {
    // Prioritize leaseholder data
    if (results.leaseholders.length > 0) {
      relevantContext += formatLeaseholderContext(results.leaseholders);
    }
    if (results.units.length > 0) {
      relevantContext += formatUnitContext(results.units);
    }
  }

  if (queryLower.includes('compliance') || queryLower.includes('certificate') || queryLower.includes('inspection')) {
    // Prioritize compliance data
    if (results.compliance.length > 0) {
      relevantContext += formatComplianceContext(results.compliance);
    }
  }

  if (queryLower.includes('maintenance') || queryLower.includes('repair') || queryLower.includes('service')) {
    // Prioritize maintenance data
    if (results.maintenance.length > 0) {
      relevantContext += formatMaintenanceContext(results.maintenance);
    }
  }

  if (queryLower.includes('document') || queryLower.includes('file') || queryLower.includes('report')) {
    // Prioritize document data
    if (results.documents.length > 0) {
      relevantContext += formatDocumentContext(results.documents);
    }
  }

  // Always include industry knowledge and founder guidance if available
  if (results.industryKnowledge.length > 0) {
    relevantContext += formatIndustryKnowledgeContext(results.industryKnowledge);
  }

  if (results.founderKnowledge.length > 0) {
    relevantContext += formatFounderKnowledgeContext(results.founderKnowledge);
  }

  // If no specific context found, return formatted full results
  if (!relevantContext) {
    relevantContext = formatSearchResultsForAI(results);
  }

  return relevantContext;
}

// Helper formatting functions
function formatLeaseholderContext(leaseholders: any[]): string {
  let context = `👥 LEASEHOLDER INFORMATION (${leaseholders.length} found):\n`;
  leaseholders.forEach(lh => {
    context += `• ${lh.name} - Unit ${lh.unit_number}\n`;
    context += `  📧 Email: ${lh.email || 'Not provided'}\n`;
    context += `  📞 Phone: ${lh.phone || 'Not provided'}\n`;
    context += `  🏢 Building: ${lh.buildings?.name}\n`;
    if (lh.notes) context += `  📝 Notes: ${lh.notes}\n`;
    context += '\n';
  });
  return context;
}

function formatUnitContext(units: any[]): string {
  let context = `🏠 UNIT INFORMATION (${units.length} found):\n`;
  units.forEach(unit => {
    context += `• Unit ${unit.unit_number} - ${unit.buildings?.name}\n`;
    context += `  Floor: ${unit.floor || 'Unknown'} | Type: ${unit.type || 'Unknown'}\n`;
    if (unit.leaseholders) {
      context += `  Leaseholder: ${unit.leaseholders.name} (${unit.leaseholders.email})\n`;
    }
    context += '\n';
  });
  return context;
}

function formatComplianceContext(compliance: any[]): string {
  let context = `⚠️ COMPLIANCE STATUS (${compliance.length} found):\n`;
  compliance.forEach(item => {
    context += `• ${item.compliance_assets?.name} - ${item.status}\n`;
    context += `  Building: ${item.buildings?.name}\n`;
    context += `  Next Due: ${item.next_due_date ? new Date(item.next_due_date).toLocaleDateString() : 'Not set'}\n`;
    context += `  Category: ${item.compliance_assets?.category}\n`;
    context += '\n';
  });
  return context;
}

function formatMaintenanceContext(maintenance: any[]): string {
  let context = `🔧 MAINTENANCE RECORDS (${maintenance.length} found):\n`;
  maintenance.forEach(record => {
    context += `• ${record.title} (${record.status})\n`;
    context += `  Building: ${record.buildings?.name}\n`;
    context += `  Category: ${record.category}\n`;
    if (record.contractor) context += `  Contractor: ${record.contractor}\n`;
    if (record.completed_date) context += `  Completed: ${new Date(record.completed_date).toLocaleDateString()}\n`;
    context += '\n';
  });
  return context;
}

function formatDocumentContext(documents: any[]): string {
  let context = `📄 DOCUMENT RECORDS (${documents.length} found):\n`;
  documents.forEach(doc => {
    context += `• ${doc.file_name} (${doc.type || 'Unknown type'})\n`;
    context += `  Building: ${doc.buildings?.name}\n`;
    context += `  Created: ${new Date(doc.created_at).toLocaleDateString()}\n`;
    if (doc.notes) context += `  Notes: ${doc.notes}\n`;
    context += '\n';
  });
  return context;
}

function formatIndustryKnowledgeContext(industryKnowledge: any[]): string {
  let context = `📚 INDUSTRY KNOWLEDGE (${industryKnowledge.length} found):\n`;
  industryKnowledge.forEach(item => {
    const doc = item.industry_knowledge_documents;
    context += `• ${doc.category}: ${item.chunk_text.substring(0, 200)}${item.chunk_text.length > 200 ? '...' : ''}\n`;
    context += `  Source: ${doc.title}\n`;
    if (doc.subcategory) context += `  Subcategory: ${doc.subcategory}\n`;
    context += '\n';
  });
  return context;
}

function formatFounderKnowledgeContext(founderKnowledge: any[]): string {
  let context = `👤 FOUNDER GUIDANCE (${founderKnowledge.length} found):\n`;
  founderKnowledge.forEach(item => {
    context += `• ${item.title}\n`;
    context += `  ${item.content.substring(0, 200)}${item.content.length > 200 ? '...' : ''}\n`;
    if (item.tags && item.tags.length > 0) context += `  Tags: ${item.tags.join(', ')}\n`;
    if (item.contexts && item.contexts.length > 0) context += `  Contexts: ${item.contexts.join(', ')}\n`;
    context += '\n';
  });
  return context;
}
