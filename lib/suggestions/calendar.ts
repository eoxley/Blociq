import { extractEvent } from "@/lib/extract/event";

export function maybeAddCalendarSuggestion(suggestions: any[], emailText: string, ctx: any) {
  const ev = extractEvent(emailText, { address: ctx?.building?.address });
  if (!ev.startISO || !ev.endISO) return suggestions;

  const payload = {
    source: ctx?.source || "outlook",  // inbox path creates Outlook event
    email: { subject: ctx?.email?.subject || "", body: emailText },
    context: { building: { address: ctx?.building?.address || "" } },
    inbox_user_id: ctx?.user?.id || null
  };

  suggestions.unshift({
    id: "add-calendar-event",
    label: `Add calendar event (${ev.title})`,
    rationale: "Draft a tentative event in Outlook without sending invites.",
    action_type: "open_route",
    payload: { route: "/api/calendar/prepare", method: "POST", body: payload },
    urgency: "medium",
    confidence: 0.85,
    who: "Property Manager",
    related_entities: { building_id: ctx?.building_id || null }
  });

  return suggestions;
}
