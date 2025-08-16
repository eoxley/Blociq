// lib/suggestions/worksOrder.ts
import { detectCommunalIssue } from "@/lib/logic/communal";

export function maybeAddWorksOrderSuggestion(suggestions: any[], chatTail: string, context: any) {
  const { communalLikely, tradeHint } = detectCommunalIssue(chatTail, context?.unit_id);
  const userCommitted = /\b(arrange|instruct|book)\b.*\b(contractor|engineer|attendance|visit)\b/i.test(chatTail);
  if (!communalLikely || !userCommitted) return suggestions;

  const payload = {
    building_id: context?.building_id || null,
    property_address: context?.property?.address || context?.building?.address || "",
    access_details: context?.access || "",
    trade_hint: tradeHint,
    source: context?.source || "outlook",      // signal Outlook draft path for inbox
    resident: context?.resident || null,
    request_text: chatTail,
    attachments: context?.attachments || [],
    thread_id: context?.inbox?.thread_id || null,
    inbox_user_id: context?.user?.id || null,  // used to resolve Outlook token
    to_email: context?.contractor?.email || null
  };

  suggestions.unshift({
    id: "prepare-works-order",
    label: `Generate works order${tradeHint ? ` (${tradeHint})` : ""}`,
    rationale: "Send clear instructions to the contractor and avoid retyping.",
    action_type: "draft_email",
    payload,
    urgency: "high",
    confidence: 0.9,
    who: "Property Manager",
    due_date: null,
    risk_flags: ["safety_risk"],
    related_entities: { building_id: payload.building_id }
  });
  return suggestions;
}
