import { detectDocType } from "@/lib/docs/docTypes";

export function maybeAddProvideDocSuggestion(suggestions: any[], text: string, ctx: any) {
  const { doc_type, confidence } = detectDocType(text);
  if (!doc_type || confidence < 0.5) return suggestions;

  const building_query = ctx?.building?.name || ctx?.building_name || text; // fallbacks
  const building_id = ctx?.building_id || null;

  suggestions.unshift({
    id: "provide-doc",
    label: `Provide latest ${doc_type.replace(/_/g," ")}`,
    rationale: "Finds the latest file and drafts a reply with a secure link.",
    action_type: "open_route",
    payload: {
      route: "/api/docs/find-latest",
      method: "POST",
      body: { building_query, building_id, doc_query: text }
    },
    urgency: "medium",
    confidence,
    who: "Property Manager",
    related_entities: { building_id }
  });

  return suggestions;
}
