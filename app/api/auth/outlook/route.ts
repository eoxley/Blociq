import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    console.log('[Outlook OAuth] Starting OAuth initiation...');
    
    // Microsoft OAuth 2.0 configuration
    const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI?.trim();
    const scope = 'openid profile email offline_access Mail.Read Mail.Send Calendars.Read Calendars.ReadWrite';
    
    console.log('[Outlook OAuth] Environment check:', {
      clientId: !!clientId,
      redirectUri: redirectUri,
      scope: scope
    });
    
    if (!clientId) {
      console.error('[Outlook OAuth] MICROSOFT_CLIENT_ID not configured');
      return NextResponse.json({ error: 'Microsoft integration not configured' }, { status: 500 });
    }

    if (!redirectUri) {
      console.error('[Outlook OAuth] MICROSOFT_REDIRECT_URI not configured');
      return NextResponse.json({ error: 'Microsoft redirect URI not configured' }, { status: 500 });
    }

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    console.log('[Outlook OAuth] Generated state:', state);
    
    // Store state in a cookie for verification (simpler than database)
    const cookieStore = await cookies();
    cookieStore.set('outlook_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });
    console.log('[Outlook OAuth] State cookie set');

    // Build the Microsoft OAuth URL
    const tenantId = process.env.AZURE_TENANT_ID || '6c00dc8f-a9ab-4339-a17d-437869997312';
    const baseAuthUrl = process.env.MICROSOFT_AUTH_URL || `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
    const authUrl = new URL(baseAuthUrl);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_mode', 'query');

    console.log('[Outlook OAuth] Redirecting to Microsoft OAuth:', authUrl.toString());
    console.log('[Outlook OAuth] Full URL parameters:', {
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      state: state
    });
    
    return NextResponse.redirect(authUrl.toString());

  } catch (error) {
    console.error('[Outlook OAuth] Error in Outlook OAuth initiation:', error);
    return NextResponse.json({ error: 'Failed to initiate Outlook connection' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Outlook Add-in Auth] Starting login...');
    
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Attempt to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Outlook Add-in Auth] Login error:', error.message);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (data.user && data.session) {
      console.log('[Outlook Add-in Auth] Login successful for:', email);
      
      // Return the session token for the add-in to use
      return NextResponse.json({
        success: true,
        token: data.session.access_token,
        user: {
          email: data.user.email,
          id: data.user.id
        }
      });
    }

    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });

  } catch (error) {
    console.error('[Outlook Add-in Auth] Error:', error);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
} 