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
    // Check required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }

    const body = await req.json();
    
    // Check for email-based authentication bypass
    if (body.bypass_auth && body.email) {
      console.log('🔍 Attempting email-based authentication for:', body.email);
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            get() { return undefined },
          },
        }
      );
      
      // Look up user by email in Supabase
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', body.email.toLowerCase())
        .single();
      
      if (userError || !user) {
        // If user doesn't exist in profiles, try auth.users
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(body.email);
        
        if (authError || !authUser.user) {
          console.log('❌ User not found for email:', body.email);
          return NextResponse.json({ 
            error: 'User not found', 
            message: 'No BlocIQ account found for this email address' 
          }, { status: 404 });
        }
        
        // Use auth user data
        const authUserData = authUser.user;
        
        // Generate a temporary token for this session
        const tempToken = Buffer.from(JSON.stringify({
          user_id: authUserData.id,
          email: authUserData.email,
          timestamp: Date.now(),
          context: 'outlook_email_auth'
        })).toString('base64');
        
        return NextResponse.json({
          success: true,
          token: tempToken,
          user_id: authUserData.id,
          user: {
            id: authUserData.id,
            email: authUserData.email,
            name: authUserData.user_metadata?.full_name || body.display_name || authUserData.email.split('@')[0]
          }
        });
      } else {
        // User found in profiles
        const tempToken = Buffer.from(JSON.stringify({
          user_id: user.id,
          email: user.email,
          timestamp: Date.now(),
          context: 'outlook_email_auth'
        })).toString('base64');
        
        return NextResponse.json({
          success: true,
          token: tempToken,
          user_id: user.id,
          user: {
            id: user.id,
            email: user.email,
            name: user.full_name || body.display_name || user.email.split('@')[0]
          }
        });
      }
    }
    
    // Original token validation logic
    const { token } = body;
    
    if (!token) {
      return NextResponse.json({ error: 'Token or email required' }, { status: 400 });
    }
    
    // Check if it's a temporary email-based token
    if (token.length > 100) { // Base64 encoded token
      try {
        const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
        
        if (tokenData.context === 'outlook_email_auth' && tokenData.timestamp) {
          // Check if token is not too old (24 hours)
          const tokenAge = Date.now() - tokenData.timestamp;
          if (tokenAge > 24 * 60 * 60 * 1000) {
            return NextResponse.json({ error: 'Token expired' }, { status: 401 });
          }
          
          return NextResponse.json({
            success: true,
            user: {
              id: tokenData.user_id,
              email: tokenData.email,
              name: tokenData.email.split('@')[0]
            }
          });
        }
      } catch (e) {
        console.warn('Invalid temporary token:', e);
      }
    }
    
    // Validate the token with Supabase (original logic)
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
    console.error('Authentication error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}