import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Debug: Checking upload authentication...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiKey = process.env.NEXT_PUBLIC_BACKGROUND_PROCESSOR_API_KEY;
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
      hasApiKey: !!apiKey,
      apiKeyValue: apiKey
    });
    
    // Check headers
    const authHeader = req.headers.get('authorization');
    const apiKeyHeader = req.headers.get('x-api-key');
    
    console.log('Headers check:', {
      hasAuthHeader: !!authHeader,
      authHeaderFormat: authHeader?.substring(0, 20) + '...',
      hasApiKeyHeader: !!apiKeyHeader,
      apiKeyHeader: apiKeyHeader
    });
    
    // Test API key validation
    const validApiKey = apiKey || 'blociq-secure-background-processor-key-2025';
    const apiKeyValid = apiKeyHeader === validApiKey;
    
    console.log('API Key validation:', {
      expected: validApiKey,
      received: apiKeyHeader,
      valid: apiKeyValid
    });
    
    if (!apiKeyValid) {
      return NextResponse.json({ 
        success: false,
        error: 'API key validation failed',
        details: {
          expected: validApiKey,
          received: apiKeyHeader
        }
      }, { status: 401 });
    }
    
    // Test user token validation
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing or invalid Authorization header',
        details: {
          hasHeader: !!authHeader,
          format: authHeader?.substring(0, 20)
        }
      }, { status: 401 });
    }
    
    const supabase = createClient(supabaseUrl!, serviceKey!);
    const token = authHeader.replace('Bearer ', '');
    
    console.log('Token validation attempt...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ 
        success: false,
        error: 'Token validation failed',
        details: authError.message
      }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'No user found for token'
      }, { status: 401 });
    }
    
    console.log('✅ Authentication successful for user:', user.id);
    
    return NextResponse.json({
      success: true,
      message: 'Authentication validation successful',
      user: {
        id: user.id,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}