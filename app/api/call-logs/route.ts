import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const {
      building_id,
      unit_id,
      leaseholder_id,
      call_type,
      duration_minutes,
      notes,
      follow_up_required,
      follow_up_date,
      logged_by
    } = await request.json();

    if (!building_id || !call_type) {
      return NextResponse.json({ error: "Building ID and call type are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("call_logs")
      .insert({
        building_id,
        unit_id,
        leaseholder_id,
        call_type,
        duration_minutes,
        notes,
        follow_up_required,
        follow_up_date,
        logged_by
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error logging call:", error);
    return NextResponse.json(
      { error: "Failed to log call" },
      { status: 500 }
    );
  }
}
