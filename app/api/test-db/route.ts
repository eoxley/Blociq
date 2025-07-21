import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Create a Supabase client with service role key for testing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: "Missing Supabase environment variables",
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test 1: Check if we can connect to the database
    const { data: connectionTest, error: connectionError } = await supabase
      .from('incoming_emails')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      return NextResponse.json({ 
        error: "Database connection failed",
        details: connectionError
      }, { status: 500 });
    }

    // Test 2: Get total count of emails
    const { count: totalEmails, error: countError } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ 
        error: "Failed to count emails",
        details: countError
      }, { status: 500 });
    }

    // Test 3: Get emails with user_id
    const { count: emailsWithUserId, error: userCountError } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact', head: true })
      .not('user_id', 'is', null);

    if (userCountError) {
      return NextResponse.json({ 
        error: "Failed to count emails with user_id",
        details: userCountError
      }, { status: 500 });
    }

    // Test 4: Get sample emails
    const { data: sampleEmails, error: sampleError } = await supabase
      .from('incoming_emails')
      .select('id, subject, from_email, user_id, received_at')
      .limit(5);

    return NextResponse.json({
      success: true,
      database_connected: true,
      total_emails: totalEmails || 0,
      emails_with_user_id: emailsWithUserId || 0,
      emails_without_user_id: (totalEmails || 0) - (emailsWithUserId || 0),
      sample_emails: sampleEmails || [],
      connection_error: connectionError,
      count_error: countError,
      user_count_error: userCountError,
      sample_error: sampleError
    });

  } catch (error) {
    console.error("❌ Test DB error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 