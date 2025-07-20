import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fromEmail = searchParams.get('from_email')

  if (!fromEmail) {
    return NextResponse.json(
      { error: "from_email parameter is required" },
      { status: 400 }
    )
  }

  try {
    // Fetch emails from the same sender, ordered by date (oldest first)
    const { data: emails, error } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('from_email', fromEmail)
      .order('received_at', { ascending: true })

    if (error) {
      console.error('Error fetching email history:', error)
      return NextResponse.json(
        { error: "Failed to fetch email history", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      emails: emails || [],
      count: emails?.length || 0
    })

  } catch (error: any) {
    console.error('Email history error:', error)
    return NextResponse.json(
      {
        error: "Failed to fetch email history",
        details: error.message,
      },
      { status: 500 }
    )
  }
} 