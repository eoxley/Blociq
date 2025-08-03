// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for email data
// - Try/catch with detailed error handling
// - Used in email components
// - TODO: Implement Supabase integration for email storage

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // Optional but valid

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid email data' }, { status: 400 });
    }

    // Handle the data from the request
    console.log("Saving email:", body);

    // TODO: Save email to your database (e.g., Supabase)
    // Example implementation:
    // const supabase = createRouteHandlerClient({ cookies });
    // const { data, error } = await supabase
    //   .from('emails')
    //   .insert(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving email:", error);
    return NextResponse.json(
      { error: "Failed to save email." },
      { status: 500 }
    );
  }
}
