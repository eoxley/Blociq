import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { processQueryDatabaseFirst } from '@/lib/ai/database-search';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    console.log('🔍 Testing specific query:', query);

    // Test the exact function that should be called
    const result = await processQueryDatabaseFirst(supabase, query);

    console.log('✅ Specific query test completed');

    return NextResponse.json({
      success: true,
      message: 'Specific query test completed',
      query,
      result,
      resultType: typeof result,
      resultLength: result ? result.length : 0,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Specific query test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Specific query test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
