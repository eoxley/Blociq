import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  request: Request,
  { params }: { params: { bca_id: string } }
) {
  try {
    const bcaId = params.bca_id;
    const updates = await request.json();

    if (!bcaId) {
      return NextResponse.json({ error: "BCA ID is required" }, { status: 400 });
    }

    // Validate allowed fields
    const allowedFields = [
      'last_renewed_date', 
      'next_due_date', 
      'status', 
      'notes', 
      'contractor',
      'status_override'
    ];
    
    const filteredUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    // Update the compliance asset
    const { data, error } = await supabaseAdmin
      .from("building_compliance_assets")
      .update(filteredUpdates)
      .eq("id", bcaId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error updating compliance asset:", error);
    return NextResponse.json(
      { error: "Failed to update compliance asset" },
      { status: 500 }
    );
  }
}
