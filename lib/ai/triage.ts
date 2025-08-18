import { triageSystem } from "./triagePrompt";
import { TriageOutput, IncomingEmail } from "./triageSchema";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Context helper functions - replace with your real implementations
// These are fallbacks if the real functions don't exist yet
async function fallback<T>(v: T): Promise<T> { return v; }

// Import these from your existing Ask BlocIQ context layer when ready
// import {
//   getBuildingContextByEmail,
//   getRecentThread,
//   getComplianceSnapshot,
//   getDocSnippets,
//   getOutstandingIssues,
//   getMajorWorksSnapshot,
//   getDocumentLibrary
// } from "@/lib/context";

// Fallback implementations - replace with real ones
const _get = {
  building: async (_e: any) => null,
  thread: async (_e: any) => null,
  comp: async (_: any) => null,
  docs: async (_: any, _k?: string[]) => null,
  issues: async (_: any) => null,
  works: async (_: any) => null,
  lib: async (_: any) => []
};

// Priority to label mapping
function mapPriorityToLabel(priority: string): string {
  switch (priority) {
    case "P1": return "urgent";
    case "P2": return "follow_up";
    case "P3": return "follow_up";
    case "P4": return "resolved";
    default: return "follow_up";
  }
}

// Enforce JSON output with schema validation
function enforceJson(text: string, schema: any) {
  try {
    const json = JSON.parse(text);
    return schema.parse(json);
  } catch (error) {
    console.error("JSON parsing/validation error:", error);
    // Return a safe fallback
    return {
      label: "follow_up",
      priority: "P3",
      reason: "Email requires follow-up",
      reply: {
        greeting: "Dear Sir/Madam",
        body_markdown: "Thank you for your email. We will review and respond accordingly.",
        subject: "Re: Your enquiry",
        signoff: "Kind regards",
        signature_block: "Property Management Team, Blociq"
      }
    };
  }
}

export async function buildTriageContext(raw: IncomingEmail) {
  const base = {
    subject: raw.subject,
    body: raw.plainText || raw.body,
    from: raw.from,
    to: raw.to,
    cc: raw.cc ?? [],
    date: raw.date ?? null
  };

  const buildingCtx = await _get.building(raw);
  const buildingId = (buildingCtx as any)?.building_id;
  const threadCtx = await _get.thread(raw);
  const complianceCtx = await _get.comp(buildingId);
  const issuesCtx = await _get.issues(buildingId);        // e.g. open tasks / tickets
  const majorWorksCtx = await _get.works(buildingId);     // e.g. S20 phases, scopes, timelines
  const docsCtx = await _get.docs(buildingId, [
    "lease_underletting", "mgmt_agreement_fees", "FRA_latest", "EICR_latest",
    "insurance_policy_current", "lift_contract", "s20_active", "major_works_scope"
  ]);
  const docLibrary = await _get.lib(buildingId);          // array of {doc_id,title,kind,url?}

  return { base, buildingCtx, threadCtx, complianceCtx, issuesCtx, majorWorksCtx, docsCtx, docLibrary };
}

export async function triageEmail(raw: IncomingEmail) {
  const context = await buildTriageContext(raw);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: triageSystem },
    {
      role: "system",
      name: "context",
      content: JSON.stringify({
        buildingCtx: context.buildingCtx,
        threadCtx: context.threadCtx,
        complianceCtx: context.complianceCtx,
        issuesCtx: context.issuesCtx,
        majorWorksCtx: context.majorWorksCtx,
        docsCtx: context.docsCtx,
        docLibrary: context.docLibrary
      }).slice(0, 60000) // Limit context size
    },
    { role: "user", content: JSON.stringify({ email: context.base }) }
  ];

  const model = process.env.OPENAI_TRIAGE_MODEL || "gpt-4o-mini";
  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages
  });

  const text = resp.choices?.[0]?.message?.content ?? "{}";
  let output = enforceJson(text, TriageOutput);

  // Keep label aligned to P-level
  const correctedLabel = mapPriorityToLabel(output.priority);
  if (output.label !== correctedLabel) {
    output = { ...output, label: correctedLabel };
  }

  // Ensure signoff is set
  if (output.reply) {
    output.reply.signoff = "Kind regards";
  }

  return output;
}

// Legacy function for backward compatibility
export async function classifyEmailForTriage(email: {
  subject: string;
  from?: string;
  preview?: string;
  body?: string;
}) {
  const raw: IncomingEmail = {
    subject: email.subject,
    body: email.body || email.preview || "",
    from: email.from || "unknown@example.com",
    to: [],
    plainText: email.body || email.preview || ""
  };

  return await triageEmail(raw);
}

// Helper function to extract JSON from response
function extractJson(s: string) {
  const m = s.match(/```json\s*([\s\S]*?)```/i);
  if (m) return m[1];
  const i = s.indexOf("{"), j = s.lastIndexOf("}");
  return i >= 0 && j > i ? s.slice(i, j + 1) : "{}";
}
