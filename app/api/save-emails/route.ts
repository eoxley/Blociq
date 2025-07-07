import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // Optional but valid

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle the data from the request
    console.log("Saving email:", body);

    // TODO: Save email to your database (e.g., Supabase)

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving email:", error);
    return NextResponse.json(
      { error: "Failed to save email." },
      { status: 500 }
    );
  }
}
