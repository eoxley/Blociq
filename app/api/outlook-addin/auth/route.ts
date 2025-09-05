import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const returnUrl = searchParams.get('return_url') || '/outlook-addin/taskpane.html';
  
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // User is authenticated, redirect to add-in with session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        // Store the session in a way the add-in can access it
        const response = NextResponse.redirect(new URL(returnUrl, req.url));
        
        // Set a cookie that the add-in can read
        response.cookies.set('blociq_outlook_token', session.access_token, {
          httpOnly: false, // Allow client-side access
          secure: true,
          sameSite: 'none', // Required for iframe context
          maxAge: 60 * 60 * 24, // 24 hours
          domain: '.blociq.co.uk'
        });
        
        response.cookies.set('blociq_outlook_user', JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email
        }), {
          httpOnly: false,
          secure: true,
          sameSite: 'none',
          maxAge: 60 * 60 * 24,
          domain: '.blociq.co.uk'
        });
        
        return response;
      }
    }
    
    // User not authenticated, redirect to login
    const loginUrl = `/auth/login?returnUrl=${encodeURIComponent(`/api/outlook-addin/auth?return_url=${encodeURIComponent(returnUrl)}`)}`;
    return NextResponse.redirect(new URL(loginUrl, req.url));
    
  } catch (error) {
    console.error('Outlook add-in auth error:', error);
    return NextResponse.json({
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }
    
    // Validate the token with Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined },
        },
      }
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email
      }
    });
    
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json({ error: 'Token validation failed' }, { status: 500 });
  }
}