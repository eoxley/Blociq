import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // Check leaseholders table
    const { data: leaseholders, error: leaseholdersError } = await supabaseAdmin
      .from("leaseholders")
      .select("*")
      .limit(5);

    if (leaseholdersError) {
      console.error("Error fetching leaseholders:", leaseholdersError);
      return NextResponse.json({ error: "Failed to fetch leaseholders" }, { status: 500 });
    }

    // Check units table
    const { data: units, error: unitsError } = await supabaseAdmin
      .from("units")
      .select("*")
      .limit(5);

    if (unitsError) {
      console.error("Error fetching units:", unitsError);
      return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
    }

    // Check the view
    const { data: viewData, error: viewError } = await supabaseAdmin
      .from("vw_units_leaseholders")
      .select("*")
      .limit(5);

    if (viewError) {
      console.error("Error fetching view data:", viewError);
      return NextResponse.json({ error: "Failed to fetch view data" }, { status: 500 });
    }

    return NextResponse.json({
      leaseholders: leaseholders || [],
      units: units || [],
      viewData: viewData || [],
      leaseholdersCount: leaseholders?.length || 0,
      unitsCount: units?.length || 0,
      viewDataCount: viewData?.length || 0
    });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
