import { NextResponse } from "next/server";
import { getUnitsLeaseholders } from "@/lib/queries/getUnitsLeaseholders";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const buildingId = params.id;
    
    if (!buildingId) {
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    const units = await getUnitsLeaseholders(buildingId);
    
    return NextResponse.json({ units });
  } catch (error: any) {
    console.error("Error fetching units:", error);
    return NextResponse.json(
      { error: "Failed to fetch units" },
      { status: 500 }
    );
  }
}
