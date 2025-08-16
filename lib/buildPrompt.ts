import { getBuildingData } from '@/lib/supabase/buildings';
import { getLeaseholderData } from '@/lib/supabase/leaseholders';
import { getDocumentSummaries } from '@/lib/supabase/documents';
import { getEmailThreadContext } from '@/lib/supabase/emails';
import { getFounderGuidance } from '@/lib/ai/founder';
import { getComplianceContext } from '@/lib/supabase/compliance';
import { getMajorWorksContext, getMajorWorksProjectContext } from '@/lib/supabase/majorWorks';
import { createClient } from '@supabase/supabase-js';

// ADD: tiny detector (non-breaking)
export function detectContext(input: string, meta?: { hasAttachment?: boolean; wordCount?: number }) {
  const t = (input || "").toLowerCase();
  const wc = meta?.wordCount ?? t.split(/\s+/).length;
  if (meta?.hasAttachment || /\b(summarise|summary|document|pdf|attachment)\b/.test(t)) return "doc_summary";
  if (/\b(complain|complaint|dissatisfied|escalate|chp|ombudsman|redress)\b/.test(t)) return "complaints";
  if (wc > 300) return "auto_polish";
  return "core";
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function buildPrompt({
  contextType,
  question,
  buildingId,
  documentIds = [],
  emailThreadId,
  manualContext,
  leaseholderId,
  projectId,
}: {
  contextType: string;
  question: string;
  buildingId?: string;
  documentIds?: string[];
  emailThreadId?: string;
  manualContext?: string;
  leaseholderId?: string;
  projectId?: string;
}) {
  let contextSections: string[] = [];

  // 📘 Founder Guidance
  const ctx = detectContext(question, { wordCount: question.split(/\s+/).length });
  
  // Pick tags by context (simple, extend later)
  const founderTags =
    ctx === "complaints" ? ["tone","complaints","governance"] :
    ctx === "doc_summary" ? ["tone","governance"] :
    ctx === "auto_polish" ? ["tone"] :
    ["tone","governance"];

  const guidance = await getFounderGuidance({ 
    topicHints: [ctx], 
    contexts: [ctx], 
    tags: founderTags, 
    limit: 6 
  });

  // Build a merge block if we got anything
  let founderBlock = "";
  if (Array.isArray(guidance) && guidance.length) {
    const items = guidance.map(g => `• ${g.title || 'Guidance'}\n${(g.content || "").trim()}`).join("\n\n");
    founderBlock = `\n# Founder Knowledge (merge)\n${items}\n`;
  } else if (typeof guidance === 'string' && guidance) {
    // Backward compatibility for string format
    founderBlock = `\n# Founder Knowledge (merge)\n${guidance}\n`;
  }
  
  if (founderBlock) contextSections.push(founderBlock);

  // 🏢 Building
  if (buildingId) {
    const building = await getBuildingData(buildingId);
    if (building) contextSections.push(`Building Info:\n${JSON.stringify(building, null, 2)}`);
  }

  // 📄 Documents
  if (documentIds.length > 0) {
    const docs = await getDocumentSummaries(documentIds);
    contextSections.push(`Documents:\n${docs.map(d => `${d.name}: ${d.summary}`).join('\n\n')}`);
  }

  // 📧 Emails
  if (emailThreadId) {
    const emailContext = await getEmailThreadContext(emailThreadId);
    if (emailContext) contextSections.push(`Email History:\n${emailContext}`);
  }

  // 🧾 Leaseholder
  if (leaseholderId) {
    const lease = await getLeaseholderData(leaseholderId);
    if (lease) contextSections.push(`Leaseholder Info:\n${JSON.stringify(lease, null, 2)}`);
  }

  // ✅ Compliance Context
  if (contextType === 'compliance' && buildingId) {
    const compliance = await getComplianceContext(buildingId);
    if (compliance) contextSections.push(`Compliance Info:\n${compliance}`);
  }

  // 🏗️ Major Works Context
  if (contextType === 'major_works') {
    if (projectId) {
      // Get specific project context
      const projectContext = await getMajorWorksProjectContext(projectId);
      if (projectContext) contextSections.push(`Major Works Project Info:\n${projectContext}`);
    } else if (buildingId) {
      // Get all major works for building
      const majorWorks = await getMajorWorksContext(buildingId);
      if (majorWorks) contextSections.push(`Major Works Info:\n${majorWorks}`);
    }
  }

  // 📋 Building Todos
  if (buildingId) {
    try {
      const { data: todos } = await supabase
        .from('building_todos')
        .select('title, description, status, priority, due_date')
        .eq('building_id', buildingId)
        .order('due_date', { ascending: true })
        .limit(10);

      if (todos && todos.length > 0) {
        const todoContext = todos.map(todo => 
          `- ${todo.title} (${todo.status}, ${todo.priority} priority, due: ${todo.due_date})`
        ).join('\n');
        contextSections.push(`Building Todos:\n${todoContext}`);
      }
    } catch (error) {
      console.warn('Could not fetch building todos:', error);
    }
  }

  // ✍️ Manual override
  if (manualContext) contextSections.push(`Manual Context:\n${manualContext}`);

  // Return context sections without system prompt (handled separately)
  const contextPrompt = contextSections.length > 0 
    ? `Context Information:\n\n${contextSections.join('\n\n---\n\n')}\n\nUser question: ${question}`
    : `User question: ${question}`;

  return contextPrompt;
} 