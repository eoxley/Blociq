import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check available environment variables (without exposing actual values)
    const hasBackgroundKey = !!process.env.NEXT_PUBLIC_BACKGROUND_PROCESSOR_API_KEY;
    const hasCronSecret = !!process.env.CRON_SECRET;
    
    const backgroundKey = process.env.NEXT_PUBLIC_BACKGROUND_PROCESSOR_API_KEY;
    const cronSecret = process.env.CRON_SECRET;
    const fallback = 'blociq-secure-background-processor-key-2025';
    
    const finalKey = backgroundKey || cronSecret || fallback;
    
    return NextResponse.json({
      success: true,
      environment_check: {
        has_background_key: hasBackgroundKey,
        has_cron_secret: hasCronSecret,
        background_key_length: backgroundKey?.length || 0,
        cron_secret_length: cronSecret?.length || 0,
        final_key_length: finalKey?.length || 0,
        final_key_source: backgroundKey ? 'BACKGROUND_KEY' : cronSecret ? 'CRON_SECRET' : 'FALLBACK',
        final_key_preview: finalKey?.substring(0, 10) + '...'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}