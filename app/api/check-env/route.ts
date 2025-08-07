import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'OUTLOOK_CLIENT_ID',
      'OUTLOOK_CLIENT_SECRET',
      'OUTLOOK_TENANT_ID',
      'OUTLOOK_REDIRECT_URI',
      'NEXT_PUBLIC_MICROSOFT_CLIENT_ID',
      'NEXT_PUBLIC_MICROSOFT_REDIRECT_URI',
      'OPENAI_API_KEY',
      'CRON_SECRET_TOKEN',
      'NEXT_PUBLIC_SITE_URL'
    ];

    const optionalEnvVars = [
      'GOOGLE_CLOUD_KEY_FILE',
      'GOOGLE_CLOUD_PROJECT_ID',
      'OUTLOOK_SCOPE',
      'OUTLOOK_SYNC_USER',
      'JWT_SECRET'
    ];

    const allEnvVars = [...requiredEnvVars, ...optionalEnvVars];

    const results = allEnvVars.map((key) => ({
      key,
      present: !!process.env[key],
      required: requiredEnvVars.includes(key),
      value: process.env[key] ? '✅ present' : '❌ missing',
      maskedValue: process.env[key] ? 
        process.env[key]!.substring(0, 4) + '...' + process.env[key]!.substring(-4) : 
        'not set'
    }));

    const missingRequired = results.filter(r => r.required && !r.present);
    const missingOptional = results.filter(r => !r.required && !r.present);

    return NextResponse.json({
      ok: missingRequired.length === 0,
      totalChecked: results.length,
      requiredCount: requiredEnvVars.length,
      optionalCount: optionalEnvVars.length,
      missingRequired: missingRequired.map(m => m.key),
      missingOptional: missingOptional.map(m => m.key),
      results,
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in check-env route:', error);
    return NextResponse.json({ 
      error: 'Failed to check environment variables',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 