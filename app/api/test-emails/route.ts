import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Test 1: Check if incoming_emails table exists and has data
    const { data: emails, error: emailsError, count } = await supabase
      .from("incoming_emails")
      .select("*", { count: "exact", head: true });

    console.log("📧 Emails test result:", {
      count: count || 0,
      error: emailsError,
      user_id: user.id
    });

    // Test 2: Try to get actual emails for the user
    const { data: userEmails, error: userEmailsError } = await supabase
      .from("incoming_emails")
      .select("id, subject, from_email, received_at")
      .eq("user_id", user.id)
      .limit(5);

    console.log("📧 User emails test result:", {
      count: userEmails?.length || 0,
      error: userEmailsError,
      emails: userEmails
    });

    // Test 3: Check table structure
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'incoming_emails' })
      .single();

    return NextResponse.json({
      user_id: user.id,
      total_emails_count: count || 0,
      user_emails_count: userEmails?.length || 0,
      user_emails: userEmails || [],
      emails_error: emailsError,
      user_emails_error: userEmailsError,
      table_info: tableInfo,
      table_error: tableError
    });

  } catch (error) {
    console.error("❌ Test emails error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 