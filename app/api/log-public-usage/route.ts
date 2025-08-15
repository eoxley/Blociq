import { NextRequest, NextResponse } from 'next/server';

interface LogRequest {
  email: string;
  query: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LogRequest = await request.json();
    const { email, query } = body;

    // Validate input
    if (!email || !query) {
      return NextResponse.json(
        { error: 'Email and query are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Log the usage
    const logEntry = {
      email: email.toLowerCase().trim(),
      query: query.trim(),
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
    };

    // Try to log to Supabase if available
    try {
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const { error } = await supabase
          .from('public_ask_logs')
          .insert([logEntry]);
        
        if (error) {
          console.error('Supabase logging error:', error);
          // Fall back to console logging
          console.log('Public AskBlocIQ Usage:', logEntry);
        } else {
          console.log('Successfully logged to Supabase:', logEntry);
        }
      } else {
        // No Supabase credentials, log to console
        console.log('Public AskBlocIQ Usage:', logEntry);
      }
    } catch (error) {
      // Supabase not available, log to console
      console.log('Public AskBlocIQ Usage:', logEntry);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging public usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
