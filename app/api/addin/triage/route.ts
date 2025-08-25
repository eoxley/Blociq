import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { subject = "", itemId = "", userEmail = "" } = await req.json();
    const lower = String(subject).toLowerCase();

    const category =
      lower.includes("leak") ? "Leak/Water Ingress" :
      lower.includes("lift") ? "Lift Outage" :
      lower.includes("insurance") ? "Insurance" :
      lower.includes("section 20") ? "Section 20" :
      "General";

    const action =
      category === "Leak/Water Ingress" ? "Log incident, notify contractor, acknowledge within 2 hours" :
      category === "Lift Outage" ? "Notify lift contractor, post notice, update residents" :
      category === "Insurance" ? "Send policy + schedule, confirm claim route" :
      category === "Section 20" ? "Confirm consultation stage and next notice" :
      "Acknowledge and triage";

    const draft =
`Hi,

Thanks for your email regarding ${subject || "this matter"}.
${category === "Leak/Water Ingress" ? "Please confirm if water is still active and share photos if safe." :
 category === "Lift Outage" ? "We've raised with the lift contractor and will update you shortly." :
 category === "Insurance" ? "Please find the policy schedule attached. We can initiate a claim if needed." :
 category === "Section 20" ? "Here's an update on the consultation stage and next steps." :
 "We'll review and come back shortly."}

Kind regards,
BlocIQ`;

    return NextResponse.json({ category, action, draft, itemId, userEmail });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Bad request" }, { status: 400 });
  }
}
