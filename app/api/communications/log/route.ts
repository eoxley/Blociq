import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("📋 Fetching communications log...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Fetch communications sent by this user with error handling
    const { data: communications, error: communicationsError } = await supabase
      .from("communications_sent")
      .select(`
        *,
        communication_templates (
          id,
          name,
          type,
          category
        ),
        buildings (
          id,
          name,
          address
        )
      `)
      .eq("sent_by", user.id)
      .order("sent_at", { ascending: false });

    if (communicationsError) {
      console.error("❌ Error fetching communications:", communicationsError);
      return NextResponse.json(
        { error: "Failed to fetch communications" },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${communications?.length || 0} communications`);

    return NextResponse.json({
      communications: communications || [],
      total: communications?.length || 0,
      success: true
    });

  } catch (error) {
    console.error("❌ Error in communications log API:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("📝 Logging new communication...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, leaseholder_id, leaseholder_name, building_name, unit_number, subject, content } = body;

    // Validate required fields
    if (!leaseholder_name || !subject) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert communication record
    const { data, error: insertError } = await supabase
      .from("communications_sent")
      .insert({
        to_email: leaseholder_name,
        subject: subject,
        message: content || '',
        sent_by: user.id,
        status: 'sent'
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error inserting communication:", insertError);
      return NextResponse.json(
        { error: "Failed to log communication" },
        { status: 500 }
      );
    }

    console.log("✅ Communication logged successfully");

    return NextResponse.json({
      success: true,
      communication: data,
      message: "Communication logged successfully"
    });

  } catch (error) {
    console.error("❌ Error in communications log POST API:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 