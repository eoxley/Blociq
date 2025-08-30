import { NextResponse } from "next/server";
import { buildICS, createTentativeEvent, getAccessTokenForUser } from "@/lib/outlook/events";

export async function POST(request: Request) {
  try {
    const { bca, building, inbox_user_id } = await request.json();

    if (!bca || !building) {
      return NextResponse.json({ error: "BCA and building data required" }, { status: 400 });
    }

    const subject = `Compliance Reminder: ${bca.asset_name} - ${building.name}`;
    const bodyText = `This is a reminder that ${bca.asset_name} compliance is due.

Building: ${building.name}
Asset: ${bca.asset_name}
Category: ${bca.category}
Next Due Date: ${bca.next_due_date || 'Not set'}

Please ensure this compliance item is renewed before the due date.`;

    // Try to create Outlook event if we have an inbox user
    if (inbox_user_id) {
      try {
        const token = await getAccessTokenForUser(inbox_user_id);
        const dueDate = bca.next_due_date ? new Date(bca.next_due_date) : new Date();
        dueDate.setDate(dueDate.getDate() - 30); // Reminder 30 days before due date
        
        const draft = await createTentativeEvent(token, {
          subject,
          bodyText,
          startISO: dueDate.toISOString(),
          endISO: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
          location: building.name
        });

        return NextResponse.json({ 
          mode: "outlook_event", 
          draft,
          subject,
          startISO: dueDate.toISOString()
        });
      } catch (e: any) {
        // Fall back to ICS
        const dueDate = bca.next_due_date ? new Date(bca.next_due_date) : new Date();
        dueDate.setDate(dueDate.getDate() - 30);
        
        const ics = buildICS({
          subject,
          bodyText,
          startISO: dueDate.toISOString(),
          endISO: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(),
          location: building.name
        });

        return NextResponse.json({ 
          mode: "ics", 
          ics, 
          subject,
          startISO: dueDate.toISOString(),
          warning: e?.message || "Graph unavailable"
        });
      }
    }

    // Default to ICS
    const dueDate = bca.next_due_date ? new Date(bca.next_due_date) : new Date();
    dueDate.setDate(dueDate.getDate() - 30);
    
    const ics = buildICS({
      subject,
      bodyText,
      startISO: dueDate.toISOString(),
      endISO: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(),
      location: building.name
    });

    return NextResponse.json({ 
      mode: "ics", 
      ics, 
      subject,
      startISO: dueDate.toISOString()
    });

  } catch (error: any) {
    console.error("Error creating compliance reminder:", error);
    return NextResponse.json(
      { error: "Failed to create compliance reminder" },
      { status: 500 }
    );
  }
}
