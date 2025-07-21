import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      title, 
      description, 
      start_time, 
      end_time, 
      location, 
      building_id, 
      category,
      is_all_day = false,
      priority = "medium",
      notes 
    } = await req.json();

    // Validate required fields
    if (!title || !start_time) {
      return NextResponse.json({ 
        error: "Title and start time are required" 
      }, { status: 400 });
    }

    // Create the event
    const { data: event, error: insertError } = await supabase
      .from("manual_events")
      .insert({
        title,
        description,
        start_time,
        end_time: end_time || start_time,
        location,
        building_id,
        category: category || "Manual Entry",
        is_all_day,
        priority,
        notes,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json({ 
        error: "Failed to create event" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Event created successfully", 
      event 
    });

  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
} 