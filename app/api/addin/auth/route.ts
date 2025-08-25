import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { email, password, action } = body;

    if (action === 'login' && email && password) {
      // Handle login for add-in
      const supabase = createRouteHandlerClient({ cookies });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ 
          error: 'Authentication failed', 
          details: error.message 
        }, { status: 401 });
      }

      // Return a special token for the add-in
      return NextResponse.json({
        success: true,
        user: data.user,
        session: data.session,
        message: 'Add-in authenticated successfully'
      });

    } else if (action === 'verify') {
      // Verify existing session
      const supabase = createRouteHandlerClient({ cookies });
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return NextResponse.json({ 
          error: 'No valid session found' 
        }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        user,
        message: 'Session verified'
      });

    } else {
      return NextResponse.json({ 
        error: 'Invalid action or missing credentials' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Add-in auth error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  // Handle preflight request for CORS
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://outlook.office.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
