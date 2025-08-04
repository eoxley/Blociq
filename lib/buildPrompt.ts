import { getBuildingData } from '@/lib/supabase/buildings';
import { getLeaseholderData } from '@/lib/supabase/leaseholders';
import { getDocumentSummaries } from '@/lib/supabase/documents';
import { getEmailThreadContext } from '@/lib/supabase/emails';
import { getFounderGuidance } from '@/lib/ai/founder';
import { getComplianceContext } from '@/lib/supabase/compliance';
import { getMajorWorksContext, getMajorWorksProjectContext } from '@/lib/supabase/majorWorks';

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
  const founder = await getFounderGuidance(question);
  if (founder) contextSections.push(`Founder Guidance:\n${founder}`);

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

  // ✍️ Manual override
  if (manualContext) contextSections.push(`Manual Context:\n${manualContext}`);

  // 🧠 System Prompt
  const systemPrompt = `You are BlocIQ, an AI assistant for UK leasehold property managers. Use British English. Be legally accurate and cite documents or founder guidance where relevant. If unsure, advise the user to refer to legal documents or professional advice.`;

  const finalPrompt = [
    systemPrompt,
    `\n\n---\n\n` + contextSections.join('\n\n---\n\n'),
    `\n\nUser question: ${question}`
  ].join('\n');

  return finalPrompt;
} 